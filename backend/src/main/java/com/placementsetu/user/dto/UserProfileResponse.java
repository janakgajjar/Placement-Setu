package com.placementsetu.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String profilePhoto;
    private String status;
    private boolean emailVerified;
    private Set<String> roles;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt;
}
