package com.placementsetu.user.service.impl;

import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.user.dto.UpdateProfileRequest;
import com.placementsetu.user.dto.UserProfileResponse;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.mapper.UserMapper;
import com.placementsetu.user.repository.UserRepository;
import com.placementsetu.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Override
    public UserProfileResponse getProfile(UUID userId) {
        User user = findActiveUser(userId);
        return userMapper.toProfileResponse(user);
    }

    @Override
    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = findActiveUser(userId);

        if (request.getPhone() != null
                && !request.getPhone().equals(user.getPhone())
                && userRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("This phone number is already in use by another account");
        }

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setProfilePhoto(request.getProfilePhoto());

        user = userRepository.save(user);
        return userMapper.toProfileResponse(user);
    }

    private User findActiveUser(UUID userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
