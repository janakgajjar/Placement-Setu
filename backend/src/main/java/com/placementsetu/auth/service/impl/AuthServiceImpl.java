package com.placementsetu.auth.service.impl;

import com.placementsetu.auth.dto.*;
import com.placementsetu.auth.entity.PasswordResetToken;
import com.placementsetu.auth.entity.RefreshToken;
import com.placementsetu.auth.repository.PasswordResetTokenRepository;
import com.placementsetu.auth.repository.RefreshTokenRepository;
import com.placementsetu.auth.service.AuthService;
import com.placementsetu.common.enums.AccountStatus;
import com.placementsetu.common.enums.UserRole;
import com.placementsetu.exception.AccountLockedException;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.exception.UnauthorizedException;
import com.placementsetu.notification.service.EmailAgentService;
import com.placementsetu.security.JwtService;
import com.placementsetu.student.service.StudentProfileService;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_DURATION_MINUTES = 15;
    private static final int RESET_TOKEN_EXPIRY_MINUTES = 30;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final StudentProfileService studentProfileService;
    private final EmailAgentService emailAgentService;

    @Value("${app.mail.app-base-url:http://localhost:5173}")
    private String appBaseUrl;

    @Override
    @Transactional
    public AuthResponse registerStudent(StudentRegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            log.warn("[SECURITY_AUDIT] event=REGISTER_FAILED reason=EMAIL_EXISTS email={}", maskEmail(normalizedEmail));
            throw new BadRequestException("An account with this email already exists");
        }

        // Validate password does not contain email
        if (request.getPassword() != null) {
            String lowerPass = request.getPassword().toLowerCase();
            String emailUser = normalizedEmail.split("@")[0];
            if (lowerPass.contains(normalizedEmail) || (emailUser.length() >= 3 && lowerPass.contains(emailUser))) {
                log.warn("[SECURITY_AUDIT] event=REGISTER_FAILED reason=PASSWORD_CONTAINS_EMAIL email={}", maskEmail(normalizedEmail));
                throw new BadRequestException("Password must not contain the email address");
            }
        }

        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .mustChangePassword(false)
                .emailVerified(true)
                .failedAttemptCount(0)
                .build();
        user = userRepository.save(user);

        studentProfileService.createForUser(user.getId(), request.getFullName().trim(), request.getPhone().trim(), request.getCourse());

        log.info("[SECURITY_AUDIT] event=REGISTER_SUCCESS userId={} email={} role=STUDENT", user.getId(), maskEmail(normalizedEmail));
        return buildAuthResponse(user);
    }

    @Override
    @Transactional(noRollbackFor = { UnauthorizedException.class, AccountLockedException.class })
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElse(null);

        if (user == null) {
            log.warn("[SECURITY_AUDIT] event=LOGIN_FAILED reason=USER_NOT_FOUND email={}", maskEmail(normalizedEmail));
            throw new UnauthorizedException("Invalid email or password");
        }

        // 1. Account Lockout check
        if (user.isLockedOut()) {
            long minutesRemaining = Duration.between(LocalDateTime.now(), user.getLockoutUntil()).toMinutes() + 1;
            log.warn("[SECURITY_AUDIT] event=LOGIN_BLOCKED reason=ACCOUNT_LOCKED userId={} email={} minutesRemaining={}",
                    user.getId(), maskEmail(normalizedEmail), minutesRemaining);
            throw new AccountLockedException("Account is temporarily locked due to multiple failed login attempts. Please try again after " + minutesRemaining + " minutes.");
        }

        // 2. Password verification & failure tracking
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            user.incrementFailedAttempts();
            if (user.getFailedAttemptCount() >= MAX_FAILED_ATTEMPTS) {
                user.setLockoutUntil(LocalDateTime.now().plusMinutes(LOCKOUT_DURATION_MINUTES));
                userRepository.saveAndFlush(user);
                log.warn("[SECURITY_AUDIT] event=ACCOUNT_LOCKED userId={} email={} attempts={}",
                        user.getId(), maskEmail(normalizedEmail), user.getFailedAttemptCount());
                throw new AccountLockedException("Account is locked for 15 minutes due to 5 consecutive failed login attempts.");
            } else {
                userRepository.saveAndFlush(user);
                log.warn("[SECURITY_AUDIT] event=LOGIN_FAILED reason=BAD_CREDENTIALS userId={} email={} failedAttempts={}",
                        user.getId(), maskEmail(normalizedEmail), user.getFailedAttemptCount());
                throw new UnauthorizedException("Invalid email or password");
            }
        }

        // 3. Status checks
        if (user.getAccountStatus() == AccountStatus.SUSPENDED) {
            log.warn("[SECURITY_AUDIT] event=LOGIN_REJECTED reason=ACCOUNT_SUSPENDED userId={}", user.getId());
            throw new UnauthorizedException("This account has been suspended. Contact the placement office.");
        }

        if (user.getRole() == UserRole.COMPANY) {
            if (user.getAccountStatus() == AccountStatus.PENDING) {
                log.warn("[SECURITY_AUDIT] event=LOGIN_REJECTED reason=COMPANY_PENDING userId={}", user.getId());
                throw new UnauthorizedException("Your company registration is awaiting Officer/Admin approval.");
            }
            if (user.getAccountStatus() == AccountStatus.REJECTED) {
                log.warn("[SECURITY_AUDIT] event=LOGIN_REJECTED reason=COMPANY_REJECTED userId={}", user.getId());
                throw new UnauthorizedException("Your company registration was rejected. Contact the placement office.");
            }
        }

        // 4. Successful login: reset lockout counters
        if (user.getFailedAttemptCount() > 0 || user.getLockoutUntil() != null) {
            user.resetLockout();
            userRepository.save(user);
        }

        log.info("[SECURITY_AUDIT] event=LOGIN_SUCCESS userId={} email={} role={}", user.getId(), maskEmail(normalizedEmail), user.getRole());
        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        if (!jwtService.isTokenValid(rawRefreshToken) || !jwtService.isRefreshToken(rawRefreshToken)) {
            log.warn("[SECURITY_AUDIT] event=TOKEN_REFRESH_FAILED reason=INVALID_OR_EXPIRED_JWT");
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        String tokenHash = jwtService.hashToken(rawRefreshToken);
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElse(null);

        // Security reuse detection: if a revoked refresh token is presented, suspect token theft
        if (storedToken != null && storedToken.isRevoked()) {
            User user = storedToken.getUser();
            log.error("[SECURITY_AUDIT] event=REFRESH_TOKEN_REUSE_DETECTED userId={} email={} - Revoking all active sessions!",
                    user.getId(), maskEmail(user.getEmail()));
            refreshTokenRepository.revokeAllForUser(user);
            throw new UnauthorizedException("Revoked refresh token presented. All active sessions have been invalidated for security.");
        }

        if (storedToken == null || storedToken.isExpired()) {
            log.warn("[SECURITY_AUDIT] event=TOKEN_REFRESH_FAILED reason=TOKEN_NOT_FOUND_OR_EXPIRED");
            throw new UnauthorizedException("Refresh token is invalid or expired. Please sign in again.");
        }

        User user = storedToken.getUser();
        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new UnauthorizedException("User account is inactive or suspended.");
        }

        // Issue new tokens & rotate
        String newAccessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String newRefreshToken = jwtService.generateRefreshToken(user.getId());
        String newHash = jwtService.hashToken(newRefreshToken);

        // Revoke the old token and link to replacement
        storedToken.setRevoked(true);
        storedToken.setRevokedAt(LocalDateTime.now());
        storedToken.setReplacedByTokenHash(newHash);
        refreshTokenRepository.save(storedToken);

        // Save new active refresh token
        RefreshToken newTokenEntity = RefreshToken.builder()
                .user(user)
                .tokenHash(newHash)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();
        refreshTokenRepository.save(newTokenEntity);

        log.info("[SECURITY_AUDIT] event=TOKEN_ROTATED userId={}", user.getId());

        return AuthResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .accountStatus(user.getAccountStatus())
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .mustChangePassword(user.isMustChangePassword())
                .build();
    }

    @Override
    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            log.warn("[SECURITY_AUDIT] event=PASSWORD_CHANGE_FAILED reason=INCORRECT_OLD_PASSWORD userId={}", userId);
            throw new BadRequestException("Current temporary password is incorrect.");
        }

        if (request.getOldPassword().equals(request.getNewPassword())) {
            throw new BadRequestException("New password must be different from current password.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        user.resetLockout();
        userRepository.save(user);

        // Invalidate all existing refresh tokens so other sessions must re-authenticate
        refreshTokenRepository.revokeAllForUser(user);

        log.info("[SECURITY_AUDIT] event=PASSWORD_CHANGED_SUCCESS userId={}", userId);
    }

    @Override
    @Transactional
    public void logout(UUID userId, String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String tokenHash = jwtService.hashToken(rawRefreshToken);
            refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
                token.setRevoked(true);
                token.setRevokedAt(LocalDateTime.now());
                refreshTokenRepository.save(token);
            });
        }
        if (userId != null) {
            userRepository.findById(userId).ifPresent(user -> {
                refreshTokenRepository.revokeAllForUser(user);
                log.info("[SECURITY_AUDIT] event=LOGOUT userId={}", userId);
            });
        }
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);

        // To prevent account enumeration, return success even if user not found
        if (user == null) {
            log.info("[SECURITY_AUDIT] event=FORGOT_PASSWORD_REQUEST email={} status=USER_NOT_FOUND_SILENT", maskEmail(normalizedEmail));
            return;
        }

        // Delete any existing reset tokens
        passwordResetTokenRepository.deleteAllByUser(user);

        // Generate high-entropy reset token
        String rawToken = UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString();
        String tokenHash = jwtService.hashToken(rawToken);

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES))
                .used(false)
                .build();
        passwordResetTokenRepository.save(resetToken);

        String resetLink = appBaseUrl + "/reset-password?token=" + rawToken;
        String emailBodyText = "Hello,\n\nA password reset was requested for your Placement-Setu account.\n"
                + "Click the link below or copy it to your browser to set a new password:\n"
                + resetLink + "\n\nThis link expires in 30 minutes. If you did not request this, please ignore this email.";

        String emailBodyHtml = "<div style='font-family:sans-serif;padding:20px;color:#333;'>"
                + "<h2>Placement-Setu Password Reset</h2>"
                + "<p>A password reset was requested for your account at Gujarat Vidyapith Placement Portal.</p>"
                + "<p><a href='" + resetLink + "' style='display:inline-block;padding:10px 20px;background:#563828;color:#fff;text-decoration:none;border-radius:4px;'>Reset Your Password</a></p>"
                + "<p>Or copy this link: <br/><code>" + resetLink + "</code></p>"
                + "<p style='color:#777;font-size:0.9em;'>This link is valid for 30 minutes only.</p>"
                + "</div>";

        emailAgentService.enqueueEmail(
                user.getEmail(),
                user.getId(),
                "Placement-Setu: Password Reset Request",
                emailBodyText,
                emailBodyHtml,
                "password-reset-" + resetToken.getId()
        );

        log.info("[SECURITY_AUDIT] event=FORGOT_PASSWORD_EMAIL_QUEUED userId={} email={}", user.getId(), maskEmail(normalizedEmail));
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String tokenHash = jwtService.hashToken(request.getToken().trim());
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BadRequestException("Invalid or expired password reset token."));

        if (!resetToken.isValid()) {
            throw new BadRequestException("Password reset token is already used or has expired.");
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.resetLockout();
        user.setMustChangePassword(false);
        userRepository.save(user);

        resetToken.setUsed(true);
        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);

        // Invalidate all existing refresh tokens
        refreshTokenRepository.revokeAllForUser(user);

        log.info("[SECURITY_AUDIT] event=PASSWORD_RESET_SUCCESS userId={} email={}", user.getId(), maskEmail(user.getEmail()));
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtService.generateRefreshToken(user.getId());
        String refreshHash = jwtService.hashToken(refreshToken);

        // Store new active refresh token
        RefreshToken tokenEntity = RefreshToken.builder()
                .user(user)
                .tokenHash(refreshHash)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();
        refreshTokenRepository.save(tokenEntity);

        return AuthResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .accountStatus(user.getAccountStatus())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .mustChangePassword(user.isMustChangePassword())
                .build();
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int atIndex = email.indexOf("@");
        String name = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        if (name.length() <= 2) return name.charAt(0) + "***" + domain;
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + domain;
    }
}
