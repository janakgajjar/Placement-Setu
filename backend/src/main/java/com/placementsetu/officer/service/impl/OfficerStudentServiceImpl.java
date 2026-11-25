package com.placementsetu.officer.service.impl;

import com.placementsetu.audit.service.AuditService;
import com.placementsetu.common.enums.NotificationType;
import com.placementsetu.common.enums.ProfileApprovalStatus;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.notification.service.NotificationService;
import com.placementsetu.officer.service.OfficerStudentService;
import com.placementsetu.student.dto.StudentProfileResponse;
import com.placementsetu.student.entity.StudentProfile;
import com.placementsetu.student.repository.StudentProfileRepository;
import com.placementsetu.student.service.StudentProfileService;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OfficerStudentServiceImpl implements OfficerStudentService {

    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final StudentProfileService studentProfileService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Override
    @Transactional(readOnly = true)
    public Page<StudentProfileResponse> getStudentProfiles(ProfileApprovalStatus status, Pageable pageable) {
        ProfileApprovalStatus filter = status != null ? status : ProfileApprovalStatus.SUBMITTED;
        return studentProfileRepository.findByApprovalStatus(filter, pageable)
                .map(profile -> {
                    String email = userRepository.findById(profile.getUserId()).map(User::getEmail).orElse(null);
                    return studentProfileService.toResponse(profile, email);
                });
    }

    @Override
    @Transactional
    public StudentProfileResponse approveStudentProfile(UUID officerUserId, UUID profileId) {
        StudentProfile profile = studentProfileRepository.findById(profileId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found: " + profileId));

        if (profile.getApprovalStatus() != ProfileApprovalStatus.SUBMITTED) {
            throw new BadRequestException("Only profiles in SUBMITTED status can be approved. Current status: " + profile.getApprovalStatus());
        }

        profile.setApprovalStatus(ProfileApprovalStatus.APPROVED);
        profile.setReviewedBy(officerUserId);
        profile.setReviewedAt(LocalDateTime.now());
        profile.setReviewRemarks(null);
        profile = studentProfileRepository.save(profile);

        if (auditService != null) {
            auditService.logEvent(officerUserId, "PROFILE_APPROVED", "STUDENT_PROFILE", profile.getId(),
                    java.util.Map.of("studentUserId", profile.getUserId().toString()));
        }

        notificationService.notifyUser(
                profile.getUserId(),
                NotificationType.PROFILE_APPROVED,
                "Student Profile Approved",
                "Your student placement profile has been approved by the Placement Officer.",
                "STUDENT_PROFILE",
                profile.getId(),
                "PROFILE_APPROVED:" + profile.getId() + ":" + System.currentTimeMillis()
        );

        String email = userRepository.findById(profile.getUserId()).map(User::getEmail).orElse(null);
        return studentProfileService.toResponse(profile, email);
    }

    @Override
    @Transactional
    public StudentProfileResponse requestProfileChanges(UUID officerUserId, UUID profileId, String remarks) {
        if (remarks == null || remarks.trim().length() < 5) {
            throw new BadRequestException("Review remarks must be at least 5 characters.");
        }

        StudentProfile profile = studentProfileRepository.findById(profileId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found: " + profileId));

        if (profile.getApprovalStatus() != ProfileApprovalStatus.SUBMITTED) {
            throw new BadRequestException("Changes can only be requested for profiles in SUBMITTED status. Current status: " + profile.getApprovalStatus());
        }

        String trimmedRemarks = remarks.trim();
        profile.setApprovalStatus(ProfileApprovalStatus.CHANGES_REQUESTED);
        profile.setReviewedBy(officerUserId);
        profile.setReviewedAt(LocalDateTime.now());
        profile.setReviewRemarks(trimmedRemarks);
        profile = studentProfileRepository.save(profile);

        if (auditService != null) {
            auditService.logEvent(officerUserId, "PROFILE_CHANGES_REQUESTED", "STUDENT_PROFILE", profile.getId(),
                    java.util.Map.of("studentUserId", profile.getUserId().toString()));
        }

        if (auditService != null) {
            auditService.logEvent(officerUserId, "PROFILE_APPROVED", "STUDENT_PROFILE", profile.getId(),
                    java.util.Map.of("studentUserId", profile.getUserId().toString()));
        }

        notificationService.notifyUser(
                profile.getUserId(),
                NotificationType.PROFILE_CHANGES_REQUESTED,
                "Changes Requested on Student Profile",
                "The Placement Officer requested changes to your profile: " + trimmedRemarks,
                "STUDENT_PROFILE",
                profile.getId(),
                "PROFILE_CHANGES_REQUESTED:" + profile.getId() + ":" + System.currentTimeMillis()
        );

        String email = userRepository.findById(profile.getUserId()).map(User::getEmail).orElse(null);
        return studentProfileService.toResponse(profile, email);
    }
}
