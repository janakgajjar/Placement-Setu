package com.placementsetu.user.dto;

import com.placementsetu.common.enums.AccountStatus;
import com.placementsetu.common.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/** Minimal, role-agnostic account info — the frontend uses this to decide which dashboard to route to. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryResponse {
    private UUID id;
    private String email;
    private UserRole role;
    private AccountStatus accountStatus;
    private LocalDateTime createdAt;
}
