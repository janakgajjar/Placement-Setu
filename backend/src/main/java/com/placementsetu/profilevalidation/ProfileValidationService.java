package com.placementsetu.profilevalidation;

import com.placementsetu.common.enums.ProfileStatus;
import com.placementsetu.resume.entity.Resume;
import com.placementsetu.resume.repository.ResumeRepository;
import com.placementsetu.student.entity.StudentProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Section 7 of the workflow doc — the mandatory business rule: registration
 * alone never makes a student recruiter-visible. A resume must be uploaded
 * AND the profile must be complete. This is deliberately its own service
 * (not folded into StudentProfileService) because Company/Matching services
 * will call it too once they exist (Section 21 items 15-16).
 */
@Service
@RequiredArgsConstructor
public class ProfileValidationService {

    private final ResumeRepository resumeRepository;

    public List<String> missingFields(StudentProfile profile) {
        List<String> missing = new ArrayList<>();
        if (isBlank(profile.getFullName())) missing.add("fullName");
        if (isBlank(profile.getPhone())) missing.add("phone");
        if (isBlank(profile.getCourse())) missing.add("course");
        if (isBlank(profile.getInstitution())) missing.add("institution");
        if (profile.getGraduationYear() == null) missing.add("graduationYear");
        if (profile.getCgpa() == null) missing.add("cgpa");
        return missing;
    }

    public boolean hasCompletedResumeUpload(StudentProfile profile) {
        return resumeRepository.findByStudentProfileId(profile.getId())
                .map(Resume::getProcessingStatus)
                .filter(status -> status == com.placementsetu.common.enums.ResumeProcessingStatus.COMPLETED)
                .isPresent();
    }

    public boolean isProfileComplete(StudentProfile profile) {
        return missingFields(profile).isEmpty();
    }

    /** Recomputes and returns the profile_status the entity should be saved with. */
    public ProfileStatus computeProfileStatus(StudentProfile profile) {
        return isProfileComplete(profile) ? ProfileStatus.COMPLETE : ProfileStatus.INCOMPLETE;
    }

    /** Section 7 rule: visible only when resume is uploaded/parsed AND the profile is complete. */
    public boolean isVisibleToCompanies(StudentProfile profile) {
        return hasCompletedResumeUpload(profile) && isProfileComplete(profile) && !profile.isPlacementLocked();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
