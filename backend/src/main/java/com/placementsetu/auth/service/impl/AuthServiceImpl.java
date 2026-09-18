package com.placementsetu.auth.service.impl;

import com.placementsetu.auth.dto.AuthResponse;
import com.placementsetu.auth.dto.CompanyRegisterRequest;
import com.placementsetu.auth.dto.LoginRequest;
import com.placementsetu.auth.dto.StudentRegisterRequest;
import com.placementsetu.auth.service.AuthService;
import com.placementsetu.common.enums.AccountStatus;
import com.placementsetu.common.enums.UserRole;
import com.placementsetu.company.service.CompanyProfileService;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.UnauthorizedException;
import com.placementsetu.security.JwtService;
import com.placementsetu.student.service.StudentProfileService;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final StudentProfileService studentProfileService;
    private final CompanyProfileService companyProfileService;

    @Override
    @Transactional
    public AuthResponse registerStudent(StudentRegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BadRequestException("An account with this email already exists");
        }

        // Students are recruiter-*invisible* until resume + profile are complete (Section 7),
        // but the account itself is usable right away — no officer approval needed to log in.
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
        user = userRepository.save(user);

        studentProfileService.createForUser(user.getId(), request.getFullName(), request.getPhone(), request.getCourse());

        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse registerCompany(CompanyRegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BadRequestException("An account with this email already exists");
        }

        // Section 8: company status starts PENDING and cannot log in to recruitment
        // features until an Officer/Admin approves it (see CompanyApprovalController).
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.COMPANY)
                .accountStatus(AccountStatus.PENDING)
                .build();
        user = userRepository.save(user);

        companyProfileService.createForUser(
                user.getId(), request.getCompanyName(), request.getGstin(),
                request.getPhone(), request.getWebsite(), request.getAddress());

        return buildAuthResponse(user);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (user.getAccountStatus() == AccountStatus.SUSPENDED) {
            throw new UnauthorizedException("This account has been suspended. Contact the placement office.");
        }

        // Section 8: "Only an approved/active company can log in and use recruitment features."
        if (user.getRole() == UserRole.COMPANY) {
            if (user.getAccountStatus() == AccountStatus.PENDING) {
                throw new UnauthorizedException("Your company registration is awaiting Officer/Admin approval.");
            }
            if (user.getAccountStatus() == AccountStatus.REJECTED) {
                throw new UnauthorizedException("Your company registration was rejected. Contact the placement office.");
            }
        }

        return buildAuthResponse(user);
    }

    @Override
    public AuthResponse refresh(String rawRefreshToken) {
        if (!jwtService.isTokenValid(rawRefreshToken) || !jwtService.isRefreshToken(rawRefreshToken)) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        User user = userRepository.findById(jwtService.extractUserId(rawRefreshToken))
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtService.generateRefreshToken(user.getId());

        return AuthResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .accountStatus(user.getAccountStatus())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .build();
    }
}
