package com.placementsetu.auth.service;

import com.placementsetu.auth.dto.AuthResponse;
import com.placementsetu.auth.dto.CompanyRegisterRequest;
import com.placementsetu.auth.dto.LoginRequest;
import com.placementsetu.auth.dto.StudentRegisterRequest;

public interface AuthService {

    AuthResponse registerStudent(StudentRegisterRequest request);

    AuthResponse registerCompany(CompanyRegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refresh(String rawRefreshToken);
}
