package com.placementsetu.user.controller;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.security.CustomUserDetails;
import com.placementsetu.user.dto.UpdateProfileRequest;
import com.placementsetu.user.dto.UserProfileResponse;
import com.placementsetu.user.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "User", description = "Authenticated user's own profile")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ApiResponse<UserProfileResponse> getProfile(@AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.success("Profile fetched successfully", userService.getProfile(principal.getId()));
    }

    @PutMapping("/profile")
    public ApiResponse<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.success("Profile updated successfully", userService.updateProfile(principal.getId(), request));
    }
}
