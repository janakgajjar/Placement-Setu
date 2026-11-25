package com.placementsetu.officer.service;

import com.placementsetu.common.enums.ProfileApprovalStatus;
import com.placementsetu.student.dto.StudentProfileResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface OfficerStudentService {

    Page<StudentProfileResponse> getStudentProfiles(ProfileApprovalStatus status, Pageable pageable);

    StudentProfileResponse approveStudentProfile(UUID officerUserId, UUID profileId);

    StudentProfileResponse requestProfileChanges(UUID officerUserId, UUID profileId, String remarks);
}
