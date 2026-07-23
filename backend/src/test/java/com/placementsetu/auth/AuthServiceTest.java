package com.placementsetu.auth;

import com.placementsetu.auth.dto.AuthResponse;
import com.placementsetu.auth.dto.LoginRequest;
import com.placementsetu.auth.dto.RegisterRequest;
import com.placementsetu.auth.service.impl.AuthServiceImpl;
import com.placementsetu.common.enums.UserStatus;
import com.placementsetu.exception.AccountLockedException;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.UnauthorizedException;
import com.placementsetu.security.JwtService;
import com.placementsetu.user.entity.RefreshToken;
import com.placementsetu.user.entity.Role;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.RefreshTokenRepository;
import com.placementsetu.user.repository.RoleRepository;
import com.placementsetu.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;

    @InjectMocks
    private AuthServiceImpl authService;

    private Role studentRole;
    private User activeUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "maxFailedLoginAttempts", 3);
        ReflectionTestUtils.setField(authService, "accountLockMinutes", 15);

        studentRole = Role.builder().id(UUID.randomUUID()).name(Role.STUDENT).build();

        Set<Role> roles = new HashSet<>();
        roles.add(studentRole);

        activeUser = User.builder()
                .id(UUID.randomUUID())
                .email("student@example.com")
                .password("hashed-password")
                .firstName("Mit")
                .lastName("Patel")
                .status(UserStatus.ACTIVE)
                .failedLoginAttempts(0)
                .roles(roles)
                .build();
    }

    @Test
    void register_throwsWhenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("student@example.com");
        request.setPassword("Passw0rd123");
        request.setFirstName("Mit");
        request.setLastName("Patel");
        request.setRole("STUDENT");

        when(userRepository.existsByEmail("student@example.com")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_createsUserWithHashedPasswordAndRole() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@example.com");
        request.setPassword("Passw0rd123");
        request.setFirstName("Rahul");
        request.setLastName("Shah");
        request.setRole("STUDENT");

        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(roleRepository.findByName("STUDENT")).thenReturn(Optional.of(studentRole));
        when(passwordEncoder.encode("Passw0rd123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateAccessToken(any(), anyString(), any())).thenReturn("access-token");
        when(jwtService.generateRawRefreshToken()).thenReturn("raw-refresh-token");
        when(jwtService.refreshTokenExpiry()).thenReturn(Instant.now().plusSeconds(3600));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        AuthResponse response = authService.register(request);

        assertEquals("new@example.com", response.getEmail());
        assertTrue(response.getRoles().contains("STUDENT"));
        assertEquals("access-token", response.getAccessToken());
        verify(userRepository).save(argThat(u -> u.getPassword().equals("hashed") && !u.isEmailVerified()));
    }

    @Test
    void login_incrementsFailedAttemptsOnWrongPassword() {
        LoginRequest request = new LoginRequest();
        request.setEmail("student@example.com");
        request.setPassword("wrong-password");

        when(userRepository.findByEmailAndIsDeletedFalse("student@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrong-password", "hashed-password")).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> authService.login(request));

        assertEquals(1, activeUser.getFailedLoginAttempts());
        verify(userRepository).save(activeUser);
    }

    @Test
    void login_locksAccountAfterMaxFailedAttempts() {
        activeUser.setFailedLoginAttempts(2); // one more failure should trip the lock

        LoginRequest request = new LoginRequest();
        request.setEmail("student@example.com");
        request.setPassword("wrong-password");

        when(userRepository.findByEmailAndIsDeletedFalse("student@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrong-password", "hashed-password")).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> authService.login(request));

        assertEquals(3, activeUser.getFailedLoginAttempts());
        assertNotNull(activeUser.getLockedUntil());
        assertTrue(activeUser.isAccountLocked());
    }

    @Test
    void login_rejectsWhenAccountIsCurrentlyLocked() {
        activeUser.setLockedUntil(LocalDateTime.now().plusMinutes(10));

        LoginRequest request = new LoginRequest();
        request.setEmail("student@example.com");
        request.setPassword("whatever");

        when(userRepository.findByEmailAndIsDeletedFalse("student@example.com")).thenReturn(Optional.of(activeUser));

        assertThrows(AccountLockedException.class, () -> authService.login(request));
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    void login_successResetsFailedAttemptsAndIssuesTokens() {
        activeUser.setFailedLoginAttempts(2);

        LoginRequest request = new LoginRequest();
        request.setEmail("student@example.com");
        request.setPassword("correct-password");

        when(userRepository.findByEmailAndIsDeletedFalse("student@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("correct-password", "hashed-password")).thenReturn(true);
        when(jwtService.generateAccessToken(any(), anyString(), any())).thenReturn("access-token");
        when(jwtService.generateRawRefreshToken()).thenReturn("raw-refresh-token");
        when(jwtService.refreshTokenExpiry()).thenReturn(Instant.now().plusSeconds(3600));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        AuthResponse response = authService.login(request);

        assertEquals(0, activeUser.getFailedLoginAttempts());
        assertNull(activeUser.getLockedUntil());
        assertNotNull(activeUser.getLastLogin());
        assertEquals("access-token", response.getAccessToken());
        assertEquals("raw-refresh-token", response.getRefreshToken());
    }

    @Test
    void refresh_throwsForUnknownToken() {
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());
        assertThrows(UnauthorizedException.class, () -> authService.refresh("unknown-token"));
    }

    @Test
    void refresh_throwsForExpiredToken() {
        RefreshToken expired = RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(activeUser)
                .tokenHash("some-hash")
                .expiresAt(LocalDateTime.now().minusDays(1))
                .revoked(false)
                .build();

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(expired));

        assertThrows(UnauthorizedException.class, () -> authService.refresh("expired-token"));
    }

    @Test
    void refresh_rotatesTokenAndIssuesNewAccessToken() {
        RefreshToken valid = RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(activeUser)
                .tokenHash("some-hash")
                .expiresAt(LocalDateTime.now().plusDays(1))
                .revoked(false)
                .build();

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(valid));
        when(jwtService.generateAccessToken(any(), anyString(), any())).thenReturn("new-access-token");
        when(jwtService.generateRawRefreshToken()).thenReturn("new-raw-refresh-token");
        when(jwtService.refreshTokenExpiry()).thenReturn(Instant.now().plusSeconds(3600));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        AuthResponse response = authService.refresh("raw-token");

        assertTrue(valid.isRevoked(), "old refresh token must be revoked after rotation");
        assertEquals("new-access-token", response.getAccessToken());
    }
}
