package com.placementsetu.user.service;

import com.placementsetu.user.dto.UpdateProfileRequest;
import com.placementsetu.user.dto.UserProfileResponse;

import java.util.UUID;

public interface UserService {

    UserProfileResponse getProfile(UUID userId);

    UserProfileResponse updateProfile(UUID userId, UpdateProfileRequest request);
}
