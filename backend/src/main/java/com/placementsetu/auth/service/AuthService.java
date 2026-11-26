package com.placementsetu.auth.service;

import com.placementsetu.auth.dto.*;

import java.util.UUID;

public interface AuthService {

    AuthResponse registerStudent(StudentRegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refresh(String rawRefreshToken);

    void changePassword(UUID userId, ChangePasswordRequest request);

    void logout(UUID userId, String rawRefreshToken);

    void forgotPassword(ForgotPasswordRequest request);

    void resetPassword(ResetPasswordRequest request);
}
