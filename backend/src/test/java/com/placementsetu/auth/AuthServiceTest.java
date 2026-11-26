package com.placementsetu.auth;

import com.placementsetu.auth.dto.AuthResponse;
import com.placementsetu.auth.dto.LoginRequest;
import com.placementsetu.auth.dto.StudentRegisterRequest;
import com.placementsetu.auth.entity.RefreshToken;
import com.placementsetu.auth.repository.PasswordResetTokenRepository;
import com.placementsetu.auth.repository.RefreshTokenRepository;
import com.placementsetu.auth.service.impl.AuthServiceImpl;
import com.placementsetu.common.enums.AccountStatus;
import com.placementsetu.common.enums.UserRole;
import com.placementsetu.company.service.CompanyProfileService;
import com.placementsetu.exception.AccountLockedException;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.UnauthorizedException;
import com.placementsetu.notification.service.EmailAgentService;
import com.placementsetu.security.JwtService;
import com.placementsetu.student.entity.StudentProfile;
import com.placementsetu.student.service.StudentProfileService;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private StudentProfileService studentProfileService;
    @Mock private EmailAgentService emailAgentService;

    @InjectMocks
    private AuthServiceImpl authService;

    private User activeStudentUser;
    private User pendingCompanyUser;

    @BeforeEach
    void setUp() {
        activeStudentUser = User.builder()
                .id(UUID.randomUUID())
                .email("student@example.com")
                .passwordHash("hashed-password")
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .failedAttemptCount(0)
                .lockoutUntil(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        pendingCompanyUser = User.builder()
                .id(UUID.randomUUID())
                .email("company@example.com")
                .passwordHash("hashed-password")
                .role(UserRole.COMPANY)
                .accountStatus(AccountStatus.PENDING)
                .failedAttemptCount(0)
                .lockoutUntil(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void registerStudent_createsUserAndProfile_whenEmailIsNew() {
        StudentRegisterRequest request = new StudentRegisterRequest();
        request.setEmail("newstudent@example.com");
        request.setPassword("Passw0rd123");
        request.setFullName("New Student");
        request.setPhone("9876543210");
        request.setCourse("MCA");

        when(userRepository.existsByEmailIgnoreCase(request.getEmail().toLowerCase())).thenReturn(false);
        when(passwordEncoder.encode(request.getPassword())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(studentProfileService.createForUser(any(), any(), any(), any()))
                .thenReturn(StudentProfile.builder().id(UUID.randomUUID()).build());
        when(jwtService.generateAccessToken(any(), anyString(), any())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh-token");
        when(jwtService.hashToken(anyString())).thenReturn("hashed-refresh-token");

        AuthResponse response = authService.registerStudent(request);

        assertEquals(UserRole.STUDENT, response.getRole());
        assertEquals(AccountStatus.ACTIVE, response.getAccountStatus());
        assertEquals("access-token", response.getAccessToken());
        verify(studentProfileService).createForUser(any(), eq("New Student"), eq("9876543210"), eq("MCA"));
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void registerStudent_throwsBadRequest_whenEmailAlreadyExists() {
        StudentRegisterRequest request = new StudentRegisterRequest();
        request.setEmail(activeStudentUser.getEmail());
        request.setPassword("Passw0rd123");
        request.setFullName("Existing Student");

        when(userRepository.existsByEmailIgnoreCase(request.getEmail().toLowerCase())).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.registerStudent(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_succeeds_forActiveUserWithCorrectPassword() {
        LoginRequest request = new LoginRequest();
        request.setEmail(activeStudentUser.getEmail());
        request.setPassword("correct-password");

        when(userRepository.findByEmailIgnoreCase(request.getEmail().toLowerCase())).thenReturn(Optional.of(activeStudentUser));
        when(passwordEncoder.matches(request.getPassword(), activeStudentUser.getPasswordHash())).thenReturn(true);
        when(jwtService.generateAccessToken(any(), anyString(), any())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh-token");
        when(jwtService.hashToken(anyString())).thenReturn("hashed-refresh-token");

        AuthResponse response = authService.login(request);

        assertEquals(activeStudentUser.getEmail(), response.getEmail());
        assertEquals("access-token", response.getAccessToken());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void login_throwsUnauthorized_whenPasswordIsWrong_andIncrementsFailedAttempts() {
        LoginRequest request = new LoginRequest();
        request.setEmail(activeStudentUser.getEmail());
        request.setPassword("wrong-password");

        when(userRepository.findByEmailIgnoreCase(request.getEmail().toLowerCase())).thenReturn(Optional.of(activeStudentUser));
        when(passwordEncoder.matches(request.getPassword(), activeStudentUser.getPasswordHash())).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> authService.login(request));
        assertEquals(1, activeStudentUser.getFailedAttemptCount());
        verify(userRepository).saveAndFlush(activeStudentUser);
    }

    @Test
    void login_locksAccount_afterFiveFailedAttempts() {
        LoginRequest request = new LoginRequest();
        request.setEmail(activeStudentUser.getEmail());
        request.setPassword("wrong-password");

        activeStudentUser.setFailedAttemptCount(4); // 5th failure incoming

        when(userRepository.findByEmailIgnoreCase(request.getEmail().toLowerCase())).thenReturn(Optional.of(activeStudentUser));
        when(passwordEncoder.matches(request.getPassword(), activeStudentUser.getPasswordHash())).thenReturn(false);

        assertThrows(AccountLockedException.class, () -> authService.login(request));
        assertEquals(5, activeStudentUser.getFailedAttemptCount());
        assertNotNull(activeStudentUser.getLockoutUntil());
        verify(userRepository).saveAndFlush(activeStudentUser);
    }

    @Test
    void login_throwsAccountLocked_whenUserIsCurrentlyLockedOut() {
        LoginRequest request = new LoginRequest();
        request.setEmail(activeStudentUser.getEmail());
        request.setPassword("any-password");

        activeStudentUser.setLockoutUntil(LocalDateTime.now().plusMinutes(10));

        when(userRepository.findByEmailIgnoreCase(request.getEmail().toLowerCase())).thenReturn(Optional.of(activeStudentUser));

        assertThrows(AccountLockedException.class, () -> authService.login(request));
    }

    @Test
    void login_throwsUnauthorized_forPendingCompany() {
        LoginRequest request = new LoginRequest();
        request.setEmail(pendingCompanyUser.getEmail());
        request.setPassword("correct-password");

        when(userRepository.findByEmailIgnoreCase(request.getEmail().toLowerCase())).thenReturn(Optional.of(pendingCompanyUser));
        when(passwordEncoder.matches(request.getPassword(), pendingCompanyUser.getPasswordHash())).thenReturn(true);

        assertThrows(UnauthorizedException.class, () -> authService.login(request));
    }

    @Test
    void login_returnsGenericMessage_whenUserNotFound() {
        LoginRequest request = new LoginRequest();
        request.setEmail("unknown@example.com");
        request.setPassword("any-password");

        when(userRepository.findByEmailIgnoreCase(request.getEmail().toLowerCase())).thenReturn(Optional.empty());

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> authService.login(request));
        assertEquals("Invalid email or password", ex.getMessage());
    }

    @Test
    void login_returnsGenericMessage_whenPasswordIsWrong() {
        LoginRequest request = new LoginRequest();
        request.setEmail(activeStudentUser.getEmail());
        request.setPassword("wrong-password");

        when(userRepository.findByEmailIgnoreCase(request.getEmail().toLowerCase())).thenReturn(Optional.of(activeStudentUser));
        when(passwordEncoder.matches(request.getPassword(), activeStudentUser.getPasswordHash())).thenReturn(false);

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> authService.login(request));
        assertEquals("Invalid email or password", ex.getMessage());
    }

    @Test
    void registerStudent_rejectsPassword_whenPasswordContainsEmail() {
        StudentRegisterRequest request = new StudentRegisterRequest();
        request.setEmail("student@example.com");
        request.setPassword("student123!A");
        request.setFullName("Student Name");
        request.setPhone("9876543210");
        request.setCourse("MCA");

        when(userRepository.existsByEmailIgnoreCase(request.getEmail().toLowerCase())).thenReturn(false);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.registerStudent(request));
        assertTrue(ex.getMessage().contains("Password must not contain the email address"));
    }

    @Test
    void refresh_rotatesTokenSuccessfully_andRevokesOldToken() {
        String oldRefreshToken = "valid-old-refresh-token";
        String oldHash = "hash-of-old-token";
        String newAccessToken = "new-access-token";
        String newRefreshToken = "new-refresh-token";
        String newHash = "hash-of-new-token";

        RefreshToken storedToken = RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(activeStudentUser)
                .tokenHash(oldHash)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();

        when(jwtService.isTokenValid(oldRefreshToken)).thenReturn(true);
        when(jwtService.isRefreshToken(oldRefreshToken)).thenReturn(true);
        when(jwtService.hashToken(oldRefreshToken)).thenReturn(oldHash);
        when(refreshTokenRepository.findByTokenHash(oldHash)).thenReturn(Optional.of(storedToken));
        when(jwtService.generateAccessToken(eq(activeStudentUser.getId()), eq(activeStudentUser.getEmail()), eq(activeStudentUser.getRole())))
                .thenReturn(newAccessToken);
        when(jwtService.generateRefreshToken(eq(activeStudentUser.getId()))).thenReturn(newRefreshToken);
        when(jwtService.hashToken(newRefreshToken)).thenReturn(newHash);

        AuthResponse response = authService.refresh(oldRefreshToken);

        assertNotNull(response);
        assertEquals(newAccessToken, response.getAccessToken());
        assertEquals(newRefreshToken, response.getRefreshToken());
        assertTrue(storedToken.isRevoked());
        assertNotNull(storedToken.getRevokedAt());
        assertEquals(newHash, storedToken.getReplacedByTokenHash());
        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
    }

    @Test
    void refresh_detectsTheft_andRevokesAllTokens_whenRevokedTokenPresented() {
        String compromisedToken = "compromised-revoked-token";
        String compromisedHash = "compromised-hash";

        RefreshToken revokedToken = RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(activeStudentUser)
                .tokenHash(compromisedHash)
                .expiresAt(LocalDateTime.now().plusDays(5))
                .revoked(true)
                .build();

        when(jwtService.isTokenValid(compromisedToken)).thenReturn(true);
        when(jwtService.isRefreshToken(compromisedToken)).thenReturn(true);
        when(jwtService.hashToken(compromisedToken)).thenReturn(compromisedHash);
        when(refreshTokenRepository.findByTokenHash(compromisedHash)).thenReturn(Optional.of(revokedToken));

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> authService.refresh(compromisedToken));
        assertTrue(ex.getMessage().contains("Revoked refresh token presented"));
        verify(refreshTokenRepository).revokeAllForUser(activeStudentUser);
    }

    @Test
    void logout_revokesRefreshToken_andInvalidatesUserSessions() {
        String rawToken = "my-active-refresh-token";
        String tokenHash = "my-token-hash";

        RefreshToken token = RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(activeStudentUser)
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();

        when(jwtService.hashToken(rawToken)).thenReturn(tokenHash);
        when(refreshTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));
        when(userRepository.findById(activeStudentUser.getId())).thenReturn(Optional.of(activeStudentUser));

        authService.logout(activeStudentUser.getId(), rawToken);

        assertTrue(token.isRevoked());
        assertNotNull(token.getRevokedAt());
        verify(refreshTokenRepository).save(token);
        verify(refreshTokenRepository).revokeAllForUser(activeStudentUser);
    }
}
