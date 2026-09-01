package com.placementsetu.auth.service;

import com.placementsetu.auth.dto.AuthResponse;
import com.placementsetu.auth.dto.LoginRequest;
import com.placementsetu.auth.dto.PasswordDtos;
import com.placementsetu.auth.dto.RegisterRequest;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refresh(String rawRefreshToken);

    void logout(String rawRefreshToken);

    void verifyEmail(PasswordDtos.VerifyEmailRequest request);

    void forgotPassword(PasswordDtos.ForgotPasswordRequest request);

    void resetPassword(PasswordDtos.ResetPasswordRequest request);
}
