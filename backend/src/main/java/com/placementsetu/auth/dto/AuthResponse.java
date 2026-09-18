package com.placementsetu.auth.dto;

import com.placementsetu.common.enums.AccountStatus;
import com.placementsetu.common.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private UUID userId;
    private String email;
    private UserRole role;
    private AccountStatus accountStatus;
    private String accessToken;
    private String refreshToken;
    private String tokenType;
}
