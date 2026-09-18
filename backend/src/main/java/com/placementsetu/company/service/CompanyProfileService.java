package com.placementsetu.company.service;

import com.placementsetu.company.dto.CompanyProfileResponse;
import com.placementsetu.company.dto.UpdateCompanyProfileRequest;
import com.placementsetu.company.entity.Company;

import java.util.UUID;

public interface CompanyProfileService {

    Company createForUser(UUID userId, String companyName, String gstin, String phone, String website, String address);

    CompanyProfileResponse getMyProfile(UUID userId);

    CompanyProfileResponse updateProfile(UUID userId, UpdateCompanyProfileRequest request);
}
