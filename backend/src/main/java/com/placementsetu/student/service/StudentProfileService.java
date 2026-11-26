package com.placementsetu.student.service;

import com.placementsetu.student.dto.*;
import com.placementsetu.student.entity.StudentProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface StudentProfileService {

    StudentProfile createForUser(UUID userId, String fullName, String phone, String course);

    StudentDashboardResponse getDashboard(UUID userId);

    StudentProfileResponse getProfile(UUID userId);

    StudentProfileResponse updateProfile(UUID userId, UpdateStudentProfileRequest request);

    StudentProfileResponse submitProfile(UUID userId);

    StudentProfileResponse addSkill(UUID userId, SkillRequest request);

    void removeSkill(UUID userId, UUID skillId);

    ProjectResponse addProject(UUID userId, ProjectRequest request);

    void removeProject(UUID userId, UUID projectId);

    CertificationResponse addCertification(UUID userId, CertificationRequest request);

    void removeCertification(UUID userId, UUID certificationId);

    StudentProfileResponse toResponse(StudentProfile profile, String email);

    Page<StudentDriveDto> getEligibleDrives(UUID userId, Pageable pageable);
}
