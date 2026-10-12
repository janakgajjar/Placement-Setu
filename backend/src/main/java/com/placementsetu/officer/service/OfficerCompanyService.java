package com.placementsetu.officer.service;

import com.placementsetu.company.dto.CompanyProfileResponse;
import com.placementsetu.officer.dto.ProvisionCompanyRequest;
import com.placementsetu.officer.dto.UpdateCompanyByOfficerRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Service contract for Placement Officer → Company APIs (Section 10 of the API spec).
 */
public interface OfficerCompanyService {

    /**
     * Create/provision a new company account on behalf of a placement officer.
     * POST /api/v1/placement-officers/me/companies
     */
    CompanyProfileResponse provisionCompany(ProvisionCompanyRequest request);

    /**
     * Paginated list of all companies, with optional status filter.
     * GET /api/v1/placement-officers/me/companies
     */
    Page<CompanyProfileResponse> getCompanies(String status, Pageable pageable);

    /**
     * View a single company.
     * GET /api/v1/placement-officers/me/companies/{companyId}
     */
    CompanyProfileResponse getCompany(UUID companyId);

    /**
     * Update a company's information.
     * PUT /api/v1/placement-officers/me/companies/{companyId}
     */
    CompanyProfileResponse updateCompany(UUID companyId, UpdateCompanyByOfficerRequest request);
}
