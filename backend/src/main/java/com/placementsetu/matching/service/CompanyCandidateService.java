package com.placementsetu.matching.service;

import com.placementsetu.matching.dto.CandidateProfileDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.UUID;

public interface CompanyCandidateService {

    /**
     * Search verified students with completed profiles.
     * Query params: skills (comma separated), course, minCgpa, maxBacklogs, pageable.
     * Privacy: contact details hidden unless student applied to this company's drive.
     */
    Page<CandidateProfileDto> searchCandidates(
            UUID companyUserId,
            String skills,
            String course,
            BigDecimal minCgpa,
            Integer maxBacklogs,
            Pageable pageable);

    /**
     * Get candidates ranked by match score for a specific drive owned by the company.
     * Enforces ownership (403/404 if drive does not belong to logged-in company).
     */
    Page<CandidateProfileDto> getDriveMatchedCandidates(
            UUID companyUserId,
            UUID driveId,
            Pageable pageable);
}
