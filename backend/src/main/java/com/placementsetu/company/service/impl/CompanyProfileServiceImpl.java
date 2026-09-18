package com.placementsetu.company.service.impl;

import com.placementsetu.company.dto.CompanyProfileResponse;
import com.placementsetu.company.dto.UpdateCompanyProfileRequest;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.company.service.CompanyProfileService;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompanyProfileServiceImpl implements CompanyProfileService {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public Company createForUser(UUID userId, String companyName, String gstin, String phone, String website, String address) {
        Company company = Company.builder()
                .userId(userId)
                .companyName(companyName)
                .gstin(gstin)
                .phone(phone)
                .website(website)
                .address(address)
                .build();
        return companyRepository.save(company);
    }

    @Override
    public CompanyProfileResponse getMyProfile(UUID userId) {
        Company company = findByUserId(userId);
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toResponse(company, user);
    }

    @Override
    @Transactional
    public CompanyProfileResponse updateProfile(UUID userId, UpdateCompanyProfileRequest request) {
        Company company = findByUserId(userId);
        if (request.getPhone() != null) company.setPhone(request.getPhone());
        if (request.getWebsite() != null) company.setWebsite(request.getWebsite());
        if (request.getAddress() != null) company.setAddress(request.getAddress());
        company = companyRepository.save(company);

        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toResponse(company, user);
    }

    private CompanyProfileResponse toResponse(Company company, User user) {
        return CompanyProfileResponse.builder()
                .id(company.getId())
                .companyName(company.getCompanyName())
                .email(user.getEmail())
                .gstin(company.getGstin())
                .phone(company.getPhone())
                .website(company.getWebsite())
                .address(company.getAddress())
                .accountStatus(user.getAccountStatus())
                .build();
    }

    private Company findByUserId(UUID userId) {
        return companyRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));
    }
}
