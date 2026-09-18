package com.placementsetu.user.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.security.CustomUserDetails;
import com.placementsetu.user.dto.UserSummaryResponse;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Role-agnostic "who am I" endpoint. Role-specific profile data (student
 * profile, company profile, etc.) lives in their own modules.
 */
@Tag(name = "User", description = "Authenticated user's own account summary")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ApiResponse<UserSummaryResponse> me(@AuthenticationPrincipal CustomUserDetails principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return ApiResponse.success("Account fetched successfully", UserSummaryResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .accountStatus(user.getAccountStatus())
                .createdAt(user.getCreatedAt())
                .build());
    }
}
