package com.placementsetu.student.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Section 6/7 of the workflow doc: the dashboard tells the student whether
 * they are recruiter-visible yet, and if not, exactly what is missing.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDashboardResponse {
    private StudentProfileResponse profile;
    private boolean resumeUploadRequired;
    private boolean visibleToCompanies;
    private List<String> missingFields;
}
