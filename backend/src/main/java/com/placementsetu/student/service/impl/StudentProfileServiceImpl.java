package com.placementsetu.student.service.impl;

import com.placementsetu.audit.service.AuditService;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.common.enums.NotificationType;
import com.placementsetu.common.enums.ProfileApprovalStatus;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.notification.service.NotificationService;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.policy.dto.PolicyValidationResult;
import com.placementsetu.policy.service.PlacementPolicyService;
import com.placementsetu.profilevalidation.ProfileValidationService;
import com.placementsetu.resume.entity.Resume;
import com.placementsetu.resume.repository.ResumeRepository;
import com.placementsetu.student.dto.*;
import com.placementsetu.student.entity.*;
import com.placementsetu.student.repository.*;
import com.placementsetu.student.service.StudentProfileService;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentProfileServiceImpl implements StudentProfileService {

    private final StudentProfileRepository studentProfileRepository;
    private final SkillRepository skillRepository;
    private final StudentSkillRepository studentSkillRepository;
    private final ProjectRepository projectRepository;
    private final CertificationRepository certificationRepository;
    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    private final ProfileValidationService profileValidationService;
    private final com.placementsetu.application.repository.ApplicationRepository applicationRepository;
    private final NotificationService notificationService;
    private final PlacementDriveRepository placementDriveRepository;
    private final DriveSkillRepository driveSkillRepository;
    private final CompanyRepository companyRepository;
    private final PlacementPolicyService placementPolicyService;
    private final AuditService auditService;

    @Override
    @Transactional
    public StudentProfile createForUser(UUID userId, String fullName, String phone, String course) {
        StudentProfile profile = StudentProfile.builder()
                .userId(userId)
                .fullName(fullName)
                .phone(phone)
                .course(course)
                .build();
        return studentProfileRepository.save(profile);
    }

    @Override
    public StudentProfileResponse getProfile(UUID userId) {
        StudentProfile profile = findByUserId(userId);
        String email = userRepository.findById(userId).map(com.placementsetu.user.entity.User::getEmail).orElse(null);
        return toResponse(profile, email);
    }

    @Override
    public StudentDashboardResponse getDashboard(UUID userId) {
        StudentProfile profile = findByUserId(userId);
        String email = userRepository.findById(userId)
                .map(u -> u.getEmail())
                .orElse(null);

        long appliedCount = applicationRepository.countByStudentProfileId(profile.getId());
        int completion = profileValidationService.computeCompletionPercentage(profile);

        return StudentDashboardResponse.builder()
                .profile(toResponse(profile, email))
                .resumeUploadRequired(!profileValidationService.hasCompletedResumeUpload(profile))
                .visibleToCompanies(profileValidationService.isVisibleToCompanies(profile))
                .missingFields(profileValidationService.missingFields(profile))
                .completionPercentage(completion)
                .totalAppliedDrives(appliedCount)
                .build();
    }

    @Override
    @Transactional
    public StudentProfileResponse updateProfile(UUID userId, UpdateStudentProfileRequest request) {
        StudentProfile profile = findByUserId(userId);

        if (request.getFullName() != null) profile.setFullName(request.getFullName());
        if (request.getPhone() != null) profile.setPhone(request.getPhone());
        if (request.getGender() != null) profile.setGender(request.getGender());
        if (request.getCourse() != null) profile.setCourse(request.getCourse());
        if (request.getInstitution() != null) profile.setInstitution(request.getInstitution());
        if (request.getGraduationYear() != null) profile.setGraduationYear(request.getGraduationYear());
        if (request.getApparId() != null) profile.setApparId(request.getApparId());
        if (request.getCgpa() != null) profile.setCgpa(request.getCgpa());
        if (request.getBacklogs() != null) profile.setBacklogs(request.getBacklogs());
        if (request.getAddress() != null) profile.setAddress(request.getAddress());
        if (request.getLinkedinUrl() != null) profile.setLinkedinUrl(request.getLinkedinUrl());
        if (request.getGithubUrl() != null) profile.setGithubUrl(request.getGithubUrl());

        profile.setProfileStatus(profileValidationService.computeProfileStatus(profile));
        profile = studentProfileRepository.save(profile);

        if (auditService != null) {
            auditService.logEvent(userId, "PROFILE_UPDATED", "STUDENT_PROFILE", profile.getId(),
                    java.util.Map.of("profileStatus", profile.getProfileStatus().name()));
        }

        String email = userRepository.findById(userId).map(u -> u.getEmail()).orElse(null);
        return toResponse(profile, email);
    }

    @Override
    @Transactional
    public StudentProfileResponse submitProfile(UUID userId) {
        StudentProfile profile = findByUserId(userId);

        if (!profileValidationService.isProfileComplete(profile)) {
            throw new BadRequestException("Please complete all required profile fields before submitting for officer review.");
        }

        if (profile.getApprovalStatus() != ProfileApprovalStatus.DRAFT
                && profile.getApprovalStatus() != ProfileApprovalStatus.CHANGES_REQUESTED) {
            throw new BadRequestException("Profile can only be submitted from DRAFT or CHANGES_REQUESTED status. Current status: " + profile.getApprovalStatus());
        }

        profile.setApprovalStatus(ProfileApprovalStatus.SUBMITTED);
        profile.setReviewRemarks(null);
        profile = studentProfileRepository.save(profile);

        if (auditService != null) {
            auditService.logEvent(userId, "PROFILE_SUBMITTED", "STUDENT_PROFILE", profile.getId(),
                    java.util.Map.of("approvalStatus", ProfileApprovalStatus.SUBMITTED.name()));
        }

        notificationService.notifyOfficersAndAdmins(
                NotificationType.PROFILE_SUBMITTED,
                "Student Profile Submitted for Review: " + profile.getFullName(),
                profile.getFullName() + " submitted their placement profile for verification.",
                "STUDENT_PROFILE",
                profile.getId(),
                "PROFILE_SUBMITTED:" + profile.getId() + ":" + System.currentTimeMillis()
        );

        String email = userRepository.findById(userId).map(u -> u.getEmail()).orElse(null);
        return toResponse(profile, email);
    }

    @Override
    @Transactional
    public StudentProfileResponse addSkill(UUID userId, SkillRequest request) {
        StudentProfile profile = findByUserId(userId);
        Skill skill = skillRepository.findByNameIgnoreCase(request.getName().trim())
                .orElseGet(() -> skillRepository.save(Skill.builder().name(request.getName().trim()).build()));

        boolean alreadyLinked = studentSkillRepository.findByStudentProfileId(profile.getId()).stream()
                .anyMatch(ss -> ss.getSkill().getId().equals(skill.getId()));
        if (!alreadyLinked) {
            studentSkillRepository.save(new StudentSkill(profile, skill));
            invalidateApprovalAndSave(profile);
        }

        String email = userRepository.findById(userId).map(u -> u.getEmail()).orElse(null);
        return toResponse(profile, email);
    }

    @Override
    @Transactional
    public void removeSkill(UUID userId, UUID skillId) {
        StudentProfile profile = findByUserId(userId);
        studentSkillRepository.deleteByStudentProfileIdAndSkillId(profile.getId(), skillId);
        invalidateApprovalAndSave(profile);
    }

    @Override
    @Transactional
    public ProjectResponse addProject(UUID userId, ProjectRequest request) {
        StudentProfile profile = findByUserId(userId);
        Project project = Project.builder()
                .studentProfileId(profile.getId())
                .title(request.getTitle())
                .description(request.getDescription())
                .projectUrl(request.getProjectUrl())
                .build();
        project = projectRepository.save(project);
        invalidateApprovalAndSave(profile);
        return toProjectResponse(project);
    }

    @Override
    @Transactional
    public void removeProject(UUID userId, UUID projectId) {
        StudentProfile profile = findByUserId(userId);
        projectRepository.deleteByIdAndStudentProfileId(projectId, profile.getId());
        invalidateApprovalAndSave(profile);
    }

    @Override
    @Transactional
    public CertificationResponse addCertification(UUID userId, CertificationRequest request) {
        StudentProfile profile = findByUserId(userId);
        Certification certification = Certification.builder()
                .studentProfileId(profile.getId())
                .name(request.getName())
                .issuingOrganization(request.getIssuingOrganization())
                .issueDate(request.getIssueDate())
                .credentialUrl(request.getCredentialUrl())
                .build();
        certification = certificationRepository.save(certification);
        invalidateApprovalAndSave(profile);
        return toCertificationResponse(certification);
    }

    @Override
    @Transactional
    public void removeCertification(UUID userId, UUID certificationId) {
        StudentProfile profile = findByUserId(userId);
        certificationRepository.deleteByIdAndStudentProfileId(certificationId, profile.getId());
        invalidateApprovalAndSave(profile);
    }

    private void invalidateApprovalAndSave(StudentProfile profile) {
        if (profile.getApprovalStatus() == ProfileApprovalStatus.APPROVED) {
            profileValidationService.invalidateApprovalIfApproved(profile);
            studentProfileRepository.save(profile);
        }
    }

    @Override
    public StudentProfileResponse toResponse(StudentProfile profile, String email) {
        List<String> skills = studentSkillRepository.findByStudentProfileId(profile.getId()).stream()
                .map(ss -> ss.getSkill().getName())
                .collect(Collectors.toList());

        List<ProjectResponse> projects = projectRepository.findByStudentProfileId(profile.getId()).stream()
                .map(this::toProjectResponse)
                .collect(Collectors.toList());

        List<CertificationResponse> certifications = certificationRepository.findByStudentProfileId(profile.getId()).stream()
                .map(this::toCertificationResponse)
                .collect(Collectors.toList());

        Resume resume = resumeRepository.findByStudentProfileId(profile.getId()).orElse(null);

        List<String> missing = profileValidationService.missingFields(profile);
        int percentage = profileValidationService.computeCompletionPercentage(profile);

        return StudentProfileResponse.builder()
                .id(profile.getId())
                .apparId(profile.getApparId())
                .fullName(profile.getFullName())
                .email(email)
                .phone(profile.getPhone())
                .gender(profile.getGender())
                .course(profile.getCourse())
                .institution(profile.getInstitution())
                .graduationYear(profile.getGraduationYear())
                .cgpa(profile.getCgpa())
                .backlogs(profile.getBacklogs())
                .address(profile.getAddress())
                .linkedinUrl(profile.getLinkedinUrl())
                .githubUrl(profile.getGithubUrl())
                .profileStatus(profile.getProfileStatus())
                .approvalStatus(profile.getApprovalStatus())
                .reviewRemarks(profile.getReviewRemarks())
                .reviewedBy(profile.getReviewedBy())
                .reviewedAt(profile.getReviewedAt())
                .placementLocked(profile.isPlacementLocked())
                .skills(skills)
                .projects(projects)
                .certifications(certifications)
                .resumeUploaded(resume != null)
                .resumeProcessingStatus(resume == null ? null : resume.getProcessingStatus().name())
                .missingFields(missing)
                .completionPercentage(percentage)
                .build();
    }

    private ProjectResponse toProjectResponse(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .title(project.getTitle())
                .description(project.getDescription())
                .projectUrl(project.getProjectUrl())
                .build();
    }

    private CertificationResponse toCertificationResponse(Certification certification) {
        return CertificationResponse.builder()
                .id(certification.getId())
                .name(certification.getName())
                .issuingOrganization(certification.getIssuingOrganization())
                .issueDate(certification.getIssueDate())
                .credentialUrl(certification.getCredentialUrl())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StudentDriveDto> getEligibleDrives(UUID userId, Pageable pageable) {
        StudentProfile profile = findByUserId(userId);
        List<String> candidateSkills = studentSkillRepository.findByStudentProfileId(profile.getId()).stream()
                .map(ss -> ss.getSkill().getName())
                .collect(Collectors.toList());

        return placementDriveRepository.findByStatus(DriveStatus.PUBLISHED, pageable)
                .map(drive -> {
                    Company company = companyRepository.findById(drive.getCompanyId()).orElse(null);
                    List<String> requiredSkills = driveSkillRepository.findByDriveId(drive.getId()).stream()
                            .map(ds -> skillRepository.findById(ds.getId().getSkillId()).map(Skill::getName).orElse(null))
                            .filter(Objects::nonNull)
                            .collect(Collectors.toList());

                    PolicyValidationResult policyResult = placementPolicyService.evaluateStudentApplication(
                            profile, drive, candidateSkills, requiredSkills);

                    return StudentDriveDto.builder()
                            .id(drive.getId())
                            .companyName(company != null ? company.getCompanyName() : "Verified Partner Recruiter")
                            .companyWebsite(company != null ? company.getWebsite() : null)
                            .jobTitle(drive.getJobTitle())
                            .description(drive.getDescription())
                            .location(drive.getLocation())
                            .ctc(drive.getCtc())
                            .stipend(drive.getStipend())
                            .vacancies(drive.getVacancies())
                            .minimumCgpa(drive.getMinimumCgpa())
                            .maximumBacklogs(drive.getMaximumBacklogs())
                            .requiredCourse(drive.getRequiredCourse())
                            .graduationYear(drive.getGraduationYear())
                            .maximumAge(drive.getMaximumAge())
                            .driveType(drive.getDriveType())
                            .isDreamOffer(drive.getIsDreamOffer())
                            .requiredSkills(requiredSkills)
                            .status(drive.getStatus())
                            .registrationStart(drive.getRegistrationStart())
                            .registrationEnd(drive.getRegistrationEnd())
                            .eligible(policyResult.isEligible())
                            .ineligibilityReasons(policyResult.getRejectionReasons())
                            .build();
                });
    }

    private StudentProfile findByUserId(UUID userId) {
        return studentProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
    }
}
