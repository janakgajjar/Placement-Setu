package com.placementsetu.matching.service.impl;

import com.placementsetu.application.entity.Application;
import com.placementsetu.application.repository.ApplicationRepository;
import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.common.enums.ProfileApprovalStatus;
import com.placementsetu.common.enums.ProfileStatus;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.matching.dto.CandidateMatchResult;
import com.placementsetu.matching.dto.CandidateProfileDto;
import com.placementsetu.matching.dto.CandidateProjectDto;
import com.placementsetu.matching.service.CandidateMatchingService;
import com.placementsetu.matching.service.CompanyCandidateService;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.profilevalidation.ProfileValidationService;
import com.placementsetu.student.entity.Project;
import com.placementsetu.student.entity.Skill;
import com.placementsetu.student.entity.StudentProfile;
import com.placementsetu.student.entity.StudentSkill;
import com.placementsetu.student.repository.ProjectRepository;
import com.placementsetu.student.repository.SkillRepository;
import com.placementsetu.student.repository.StudentProfileRepository;
import com.placementsetu.student.repository.StudentSkillRepository;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyCandidateServiceImpl implements CompanyCandidateService {

    private final StudentProfileRepository studentProfileRepository;
    private final StudentSkillRepository studentSkillRepository;
    private final ProjectRepository projectRepository;
    private final SkillRepository skillRepository;
    private final CompanyRepository companyRepository;
    private final PlacementDriveRepository driveRepository;
    private final DriveSkillRepository driveSkillRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final CandidateMatchingService matchingService;
    private final ProfileValidationService profileValidationService;

    @Override
    @Transactional(readOnly = true)
    public Page<CandidateProfileDto> searchCandidates(
            UUID companyUserId,
            String skills,
            String course,
            BigDecimal minCgpa,
            Integer maxBacklogs,
            Pageable pageable) {

        Company company = resolveCompany(companyUserId);

        // Filter: only completed profiles
        Specification<StudentProfile> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

            // 1. Only include students with completed and officer-approved profiles
            predicates.add(cb.equal(root.get("profileStatus"), ProfileStatus.COMPLETE));
            predicates.add(cb.equal(root.get("approvalStatus"), ProfileApprovalStatus.APPROVED));
            predicates.add(cb.isFalse(root.get("placementLocked")));

            // 2. Course filter
            if (course != null && !course.trim().isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("course")), course.trim().toLowerCase()));
            }

            // 3. Min CGPA filter
            if (minCgpa != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("cgpa"), minCgpa));
            }

            // 4. Max Backlogs filter
            if (maxBacklogs != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("backlogs"), maxBacklogs));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        List<StudentProfile> allMatchingProfiles = studentProfileRepository.findAll(spec);

        // Filter out any that fail validation or approval checks
        List<StudentProfile> completedProfiles = allMatchingProfiles.stream()
                .filter(p -> p.getProfileStatus() == ProfileStatus.COMPLETE
                        && p.getApprovalStatus() == ProfileApprovalStatus.APPROVED
                        && !p.isPlacementLocked())
                .toList();

        List<String> querySkills = parseSkills(skills);

        List<CandidateProfileDto> dtos = completedProfiles.stream()
                .map(profile -> {
                    List<String> candidateSkills = getCandidateSkills(profile.getId());
                    List<CandidateProjectDto> topProjects = getCandidateProjects(profile.getId(), 3);
                    int completion = profileValidationService.computeCompletionPercentage(profile);

                    // Privacy check: student must have applied to this company's drives
                    List<Application> companyApps = applicationRepository.findByStudentProfileIdAndCompanyId(profile.getId(), company.getId());
                    boolean applied = !companyApps.isEmpty();

                    String email = null;
                    String phone = null;
                    String address = null;
                    if (applied) {
                        email = userRepository.findById(profile.getUserId())
                                .map(com.placementsetu.user.entity.User::getEmail)
                                .orElse(null);
                        phone = profile.getPhone();
                        address = profile.getAddress();
                    }

                    CandidateProfileDto.CandidateProfileDtoBuilder builder = CandidateProfileDto.builder()
                            .id(profile.getId())
                            .userId(profile.getUserId())
                            .fullName(profile.getFullName())
                            .course(profile.getCourse())
                            .institution(profile.getInstitution())
                            .graduationYear(profile.getGraduationYear())
                            .cgpa(profile.getCgpa())
                            .backlogs(profile.getBacklogs())
                            .gender(profile.getGender())
                            .linkedinUrl(profile.getLinkedinUrl())
                            .githubUrl(profile.getGithubUrl())
                            .skills(candidateSkills)
                            .topProjects(topProjects)
                            .profileCompletionPercentage(completion)
                            .applied(applied)
                            .email(email)
                            .phone(phone)
                            .address(address);

                    // Calculate score against searched skill keywords if provided
                    if (!querySkills.isEmpty()) {
                        CandidateMatchResult match = matchingService.calculateSkillSearchMatch(candidateSkills, querySkills);
                        builder.matchScore(match.getMatchScore())
                                .matchedSkills(match.getMatchedSkills())
                                .missingSkills(match.getMissingSkills());
                    }

                    return builder.build();
                })
                .filter(dto -> querySkills.isEmpty() || (dto.getMatchScore() != null && dto.getMatchScore() > 0))
                .sorted((a, b) -> {
                    if (!querySkills.isEmpty()) {
                        int cmp = Integer.compare(
                                b.getMatchScore() != null ? b.getMatchScore() : 0,
                                a.getMatchScore() != null ? a.getMatchScore() : 0);
                        if (cmp != 0) return cmp;
                    }
                    BigDecimal cgpaA = a.getCgpa() != null ? a.getCgpa() : BigDecimal.ZERO;
                    BigDecimal cgpaB = b.getCgpa() != null ? b.getCgpa() : BigDecimal.ZERO;
                    return cgpaB.compareTo(cgpaA);
                })
                .collect(Collectors.toList());

        return paginate(dtos, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CandidateProfileDto> getDriveMatchedCandidates(
            UUID companyUserId,
            UUID driveId,
            Pageable pageable) {

        Company company = resolveCompany(companyUserId);

        PlacementDrive drive = driveRepository.findById(driveId)
                .orElseThrow(() -> new ResourceNotFoundException("Placement drive not found with id: " + driveId));

        // IDOR Check: Ensure the drive belongs to the authenticated company
        if (!drive.getCompanyId().equals(company.getId()) && !drive.getCompanyId().equals(company.getUserId())) {
            log.warn("[SECURITY_AUDIT] IDOR_ATTEMPT companyUserId={} attempted driveId={} belonging to companyId={}",
                    companyUserId, driveId, drive.getCompanyId());
            throw new AccessDeniedException("Access denied: You do not own this placement drive");
        }

        // Company can access drive applicants/matched candidates only after registration closes
        if (drive.getStatus() != DriveStatus.CLOSED
                && drive.getRegistrationEnd() != null
                && LocalDateTime.now().isBefore(drive.getRegistrationEnd())) {
            throw new BadRequestException("Applicants and matched candidates can only be accessed after registration closes.");
        }

        List<String> requiredSkills = getDriveSkillNames(drive.getId());

        // Fetch completed and officer-approved profiles
        boolean isDreamDrive = Boolean.TRUE.equals(drive.getIsDreamOffer())
                || (drive.getCtc() != null && drive.getCtc().compareTo(new BigDecimal("800000.00")) >= 0);

        List<StudentProfile> allProfiles = studentProfileRepository.findAll();
        List<StudentProfile> completedProfiles = allProfiles.stream()
                .filter(p -> p.getProfileStatus() == ProfileStatus.COMPLETE
                        && p.getApprovalStatus() == ProfileApprovalStatus.APPROVED
                        && (!p.isPlacementLocked() || isDreamDrive))
                .toList();

        List<CandidateProfileDto> ranked = completedProfiles.stream()
                .map(profile -> {
                    List<String> candidateSkills = getCandidateSkills(profile.getId());
                    List<CandidateProjectDto> topProjects = getCandidateProjects(profile.getId(), 3);
                    int completion = profileValidationService.computeCompletionPercentage(profile);

                    // Check drive matching & criteria
                    CandidateMatchResult match = matchingService.calculateMatch(candidateSkills, requiredSkills, profile, drive);

                    // Check if candidate applied for this specific drive
                    Optional<Application> driveApp = applicationRepository.findByStudentProfileIdAndPlacementDriveId(profile.getId(), drive.getId());
                    boolean applied = driveApp.isPresent();
                    UUID applicationId = driveApp.map(Application::getId).orElse(null);
                    String applicationStatus = driveApp.map(a -> a.getStatus().name()).orElse(null);

                    // Also check if applied to any other drive of this company
                    if (!applied) {
                        List<Application> companyApps = applicationRepository.findByStudentProfileIdAndCompanyId(profile.getId(), company.getId());
                        applied = !companyApps.isEmpty();
                    }

                    // Contact details: exposed ONLY if student applied to this company's drive
                    String email = null;
                    String phone = null;
                    String address = null;
                    if (applied) {
                        email = userRepository.findById(profile.getUserId())
                                .map(com.placementsetu.user.entity.User::getEmail)
                                .orElse(null);
                        phone = profile.getPhone();
                        address = profile.getAddress();
                    }

                    return CandidateProfileDto.builder()
                            .id(profile.getId())
                            .userId(profile.getUserId())
                            .fullName(profile.getFullName())
                            .course(profile.getCourse())
                            .institution(profile.getInstitution())
                            .graduationYear(profile.getGraduationYear())
                            .cgpa(profile.getCgpa())
                            .backlogs(profile.getBacklogs())
                            .gender(profile.getGender())
                            .linkedinUrl(profile.getLinkedinUrl())
                            .githubUrl(profile.getGithubUrl())
                            .skills(candidateSkills)
                            .topProjects(topProjects)
                            .profileCompletionPercentage(completion)
                            .applied(applied)
                            .applicationId(applicationId)
                            .applicationStatus(applicationStatus)
                            .email(email)
                            .phone(phone)
                            .address(address)
                            .matchScore(match.getMatchScore())
                            .matchedSkills(match.getMatchedSkills())
                            .missingSkills(match.getMissingSkills())
                            .eligible(match.isEligible())
                            .meetsMinCgpa(match.isMeetsMinCgpa())
                            .backlogsWithinLimit(match.isBacklogsWithinLimit())
                            .courseEligible(match.isCourseEligible())
                            .build();
                })
                .filter(dto -> Boolean.TRUE.equals(dto.getEligible()))
                .sorted((a, b) -> {
                    // Ranking priority:
                    // 1. Eligible first
                    int eligibleCmp = Boolean.compare(Boolean.TRUE.equals(b.getEligible()), Boolean.TRUE.equals(a.getEligible()));
                    if (eligibleCmp != 0) return eligibleCmp;

                    // 2. Highest match score first
                    int scoreA = a.getMatchScore() != null ? a.getMatchScore() : 0;
                    int scoreB = b.getMatchScore() != null ? b.getMatchScore() : 0;
                    int scoreCmp = Integer.compare(scoreB, scoreA);
                    if (scoreCmp != 0) return scoreCmp;

                    // 3. Highest CGPA first
                    BigDecimal cgpaA = a.getCgpa() != null ? a.getCgpa() : BigDecimal.ZERO;
                    BigDecimal cgpaB = b.getCgpa() != null ? b.getCgpa() : BigDecimal.ZERO;
                    return cgpaB.compareTo(cgpaA);
                })
                .collect(Collectors.toList());

        return paginate(ranked, pageable);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────────────────

    private Company resolveCompany(UUID companyUserId) {
        return companyRepository.findByUserId(companyUserId)
                .orElseGet(() -> companyRepository.findById(companyUserId)
                        .orElseThrow(() -> new ResourceNotFoundException("Company profile not found for user: " + companyUserId)));
    }

    private List<String> parseSkills(String skills) {
        if (skills == null || skills.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return Arrays.stream(skills.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    private List<String> getCandidateSkills(UUID profileId) {
        List<StudentSkill> studentSkills = studentSkillRepository.findByStudentProfileId(profileId);
        List<String> names = new ArrayList<>();
        for (StudentSkill ss : studentSkills) {
            UUID skillId = ss.getId().getSkillId();
            skillRepository.findById(skillId).ifPresent(s -> names.add(s.getName()));
        }
        return names;
    }

    private List<CandidateProjectDto> getCandidateProjects(UUID profileId, int limit) {
        List<Project> projects = projectRepository.findByStudentProfileId(profileId);
        return projects.stream()
                .limit(limit)
                .map(p -> CandidateProjectDto.builder()
                        .id(p.getId())
                        .title(p.getTitle())
                        .description(p.getDescription())
                        .projectUrl(p.getProjectUrl())
                        .build())
                .collect(Collectors.toList());
    }

    private List<String> getDriveSkillNames(UUID driveId) {
        return driveSkillRepository.findByDriveId(driveId).stream()
                .map(ds -> skillRepository.findById(ds.getId().getSkillId())
                        .map(Skill::getName).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private <T> Page<T> paginate(List<T> list, Pageable pageable) {
        int pageNumber = pageable.getPageNumber();
        int pageSize = pageable.getPageSize();
        int fromIndex = pageNumber * pageSize;

        if (fromIndex >= list.size()) {
            return new PageImpl<>(Collections.emptyList(), pageable, list.size());
        }

        int toIndex = Math.min(fromIndex + pageSize, list.size());
        List<T> pageContent = list.subList(fromIndex, toIndex);
        return new PageImpl<>(pageContent, pageable, list.size());
    }
}
