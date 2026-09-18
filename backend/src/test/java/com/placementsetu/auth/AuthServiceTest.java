package com.placementsetu.auth;

import com.placementsetu.auth.dto.AuthResponse;
import com.placementsetu.auth.dto.LoginRequest;
import com.placementsetu.auth.dto.StudentRegisterRequest;
import com.placementsetu.auth.service.impl.AuthServiceImpl;
import com.placementsetu.common.enums.AccountStatus;
import com.placementsetu.common.enums.UserRole;
import com.placementsetu.company.service.CompanyProfileService;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.UnauthorizedException;
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
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private StudentProfileService studentProfileService;
    @Mock private CompanyProfileService companyProfileService;

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
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        pendingCompanyUser = User.builder()
                .id(UUID.randomUUID())
                .email("company@example.com")
                .passwordHash("hashed-password")
                .role(UserRole.COMPANY)
                .accountStatus(AccountStatus.PENDING)
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

        when(userRepository.existsByEmailIgnoreCase(request.getEmail())).thenReturn(false);
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

        AuthResponse response = authService.registerStudent(request);

        assertEquals(UserRole.STUDENT, response.getRole());
        assertEquals(AccountStatus.ACTIVE, response.getAccountStatus());
        assertEquals("access-token", response.getAccessToken());
        verify(studentProfileService).createForUser(any(), eq("New Student"), eq("9876543210"), eq("MCA"));
    }

    @Test
    void registerStudent_throwsBadRequest_whenEmailAlreadyExists() {
        StudentRegisterRequest request = new StudentRegisterRequest();
        request.setEmail(activeStudentUser.getEmail());
        request.setPassword("Passw0rd123");
        request.setFullName("Existing Student");

        when(userRepository.existsByEmailIgnoreCase(request.getEmail())).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.registerStudent(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_succeeds_forActiveUserWithCorrectPassword() {
        LoginRequest request = new LoginRequest();
        request.setEmail(activeStudentUser.getEmail());
        request.setPassword("correct-password");

        when(userRepository.findByEmailIgnoreCase(request.getEmail())).thenReturn(Optional.of(activeStudentUser));
        when(passwordEncoder.matches(request.getPassword(), activeStudentUser.getPasswordHash())).thenReturn(true);
        when(jwtService.generateAccessToken(any(), anyString(), any())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh-token");

        AuthResponse response = authService.login(request);

        assertEquals(activeStudentUser.getEmail(), response.getEmail());
        assertEquals("access-token", response.getAccessToken());
    }

    @Test
    void login_throwsUnauthorized_whenPasswordIsWrong() {
        LoginRequest request = new LoginRequest();
        request.setEmail(activeStudentUser.getEmail());
        request.setPassword("wrong-password");

        when(userRepository.findByEmailIgnoreCase(request.getEmail())).thenReturn(Optional.of(activeStudentUser));
        when(passwordEncoder.matches(request.getPassword(), activeStudentUser.getPasswordHash())).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> authService.login(request));
    }

    @Test
    void login_throwsUnauthorized_forPendingCompany() {
        LoginRequest request = new LoginRequest();
        request.setEmail(pendingCompanyUser.getEmail());
        request.setPassword("correct-password");

        when(userRepository.findByEmailIgnoreCase(request.getEmail())).thenReturn(Optional.of(pendingCompanyUser));
        when(passwordEncoder.matches(request.getPassword(), pendingCompanyUser.getPasswordHash())).thenReturn(true);

        assertThrows(UnauthorizedException.class, () -> authService.login(request));
    }
}
