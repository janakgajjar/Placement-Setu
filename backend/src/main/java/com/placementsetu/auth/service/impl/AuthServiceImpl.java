package com.placementsetu.auth.service.impl;

import com.placementsetu.auth.dto.AuthResponse;
import com.placementsetu.auth.dto.LoginRequest;
import com.placementsetu.auth.dto.PasswordDtos;
import com.placementsetu.auth.dto.RegisterRequest;
import com.placementsetu.auth.service.AuthService;
import com.placementsetu.common.enums.UserStatus;
import com.placementsetu.exception.AccountLockedException;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.exception.UnauthorizedException;
import com.placementsetu.security.JwtService;
import com.placementsetu.user.entity.RefreshToken;
import com.placementsetu.user.entity.Role;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.RefreshTokenRepository;
import com.placementsetu.user.repository.RoleRepository;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${app.security.max-failed-login-attempts}")
    private int maxFailedLoginAttempts;

    @Value("${app.security.account-lock-minutes}")
    private int accountLockMinutes;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("An account with this email already exists");
        }
        if (request.getPhone() != null && userRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("An account with this phone number already exists");
        }

        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + request.getRole()));

        Set<Role> roles = new HashSet<>();
        roles.add(role);

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhone())
                .status(UserStatus.ACTIVE)
                .emailVerified(false)
                .emailVerificationToken(generateOpaqueToken())
                .emailVerificationExpiresAt(LocalDateTime.now().plusHours(24))
                .roles(roles)
                .build();

        user = userRepository.save(user);

        // Notification module (Phase 6) will replace this with a real email send via the
        // centralized Notification Service. For now we log so the verification flow is testable.
        log.info("Email verification token for {}: {}", user.getEmail(), user.getEmailVerificationToken());

        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailAndIsDeletedFalse(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (user.isAccountLocked()) {
            throw new AccountLockedException(
                    "Account is temporarily locked due to repeated failed login attempts. Try again later.");
        }

        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new UnauthorizedException("This account has been blocked. Contact the placement office.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            handleFailedLogin(user);
            throw new UnauthorizedException("Invalid email or password");
        }

        // Successful login — reset failure counter, clear any lock, stamp last login.
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    private void handleFailedLogin(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);

        if (attempts >= maxFailedLoginAttempts) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(accountLockMinutes));
            log.warn("Account locked after {} failed attempts: {}", attempts, user.getEmail());
        }

        userRepository.save(user);
    }

    @Override
    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        String hash = hash(rawRefreshToken);

        RefreshToken existing = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (!existing.isValid()) {
            throw new UnauthorizedException("Refresh token has expired or was revoked. Please log in again.");
        }

        // Rotate: revoke the used token and issue a new one, so a leaked/stolen token has a short shelf life.
        existing.setRevoked(true);
        refreshTokenRepository.save(existing);

        User user = existing.getUser();
        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public void logout(String rawRefreshToken) {
        String hash = hash(rawRefreshToken);
        refreshTokenRepository.findByTokenHash(hash).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    @Override
    @Transactional
    public void verifyEmail(PasswordDtos.VerifyEmailRequest request) {
        User user = userRepository.findByEmailVerificationToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("Invalid or expired verification token"));

        if (user.getEmailVerificationExpiresAt() == null
                || user.getEmailVerificationExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Verification link has expired. Please request a new one.");
        }

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiresAt(null);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void forgotPassword(PasswordDtos.ForgotPasswordRequest request) {
        userRepository.findByEmailAndIsDeletedFalse(request.getEmail()).ifPresent(user -> {
            user.setPasswordResetToken(generateOpaqueToken());
            user.setPasswordResetExpiresAt(LocalDateTime.now().plusMinutes(30));
            userRepository.save(user);
            // Phase 6 Notification module sends the real email; logged here for now.
            log.info("Password reset token for {}: {}", user.getEmail(), user.getPasswordResetToken());
        });
        // Deliberately do not reveal whether the email exists — same response either way.
    }

    @Override
    @Transactional
    public void resetPassword(PasswordDtos.ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset token"));

        if (user.getPasswordResetExpiresAt() == null
                || user.getPasswordResetExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Reset link has expired. Please request a new one.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiresAt(null);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        // Resetting the password invalidates every existing session for safety.
        refreshTokenRepository.revokeAllForUser(user.getId());
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private AuthResponse buildAuthResponse(User user) {
        Set<String> roleNames = user.getRoles().stream().map(Role::getName).collect(Collectors.toSet());
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), roleNames);

        String rawRefreshToken = jwtService.generateRawRefreshToken();
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(hash(rawRefreshToken))
                .expiresAt(LocalDateTime.ofInstant(jwtService.refreshTokenExpiry(), java.time.ZoneOffset.UTC))
                .build();
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .roles(roleNames)
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .tokenType("Bearer")
                .build();
    }

    private String generateOpaqueToken() {
        return UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    }

    private String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
