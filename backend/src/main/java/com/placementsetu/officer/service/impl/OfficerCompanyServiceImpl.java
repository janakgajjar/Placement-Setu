package com.placementsetu.officer.service.impl;

import com.placementsetu.common.enums.AccountStatus;
import com.placementsetu.common.enums.UserRole;
import com.placementsetu.company.dto.CompanyProfileResponse;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.BadRequestException;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.officer.dto.ProvisionCompanyRequest;
import com.placementsetu.officer.dto.UpdateCompanyByOfficerRequest;
import com.placementsetu.officer.service.OfficerCompanyService;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Implementation of OfficerCompanyService.
 *
 * Provisioning creates a User (role=COMPANY, status=ACTIVE) and a Company profile
 * in a single transaction. The officer-provisioned account is immediately ACTIVE,
 * unlike the self-registration flow (which starts in PENDING).
 */
@Service
@RequiredArgsConstructor
public class OfficerCompanyServiceImpl implements OfficerCompanyService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;

    // ─────────────────────────────────────────────────────────────────────────
    // POST /placement-officers/me/companies
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public CompanyProfileResponse provisionCompany(ProvisionCompanyRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BadRequestException("An account with this email already exists.");
        }

        // Officer-provisioned accounts are ACTIVE immediately.
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getTemporaryPassword()))
                .role(UserRole.COMPANY)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
        user = userRepository.save(user);

        Company company = Company.builder()
                .userId(user.getId())
                .companyName(request.getCompanyName())
                .gstin(request.getGstin())
                .phone(request.getPhone())
                .website(request.getWebsite())
                .address(request.getAddress())
                .build();
        company = companyRepository.save(company);

        return toResponse(company, user);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /placement-officers/me/companies
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<CompanyProfileResponse> getCompanies(String status, Pageable pageable) {
        return companyRepository.findAllWithStatus(status, pageable)
                .map(company -> {
                    User user = userRepository.findById(company.getUserId())
                            .orElseThrow(() -> new ResourceNotFoundException("User not found for company"));
                    return toResponse(company, user);
                });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /placement-officers/me/companies/{companyId}
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public CompanyProfileResponse getCompany(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
        User user = userRepository.findById(company.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found for company"));
        return toResponse(company, user);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /placement-officers/me/companies/{companyId}
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public CompanyProfileResponse updateCompany(UUID companyId, UpdateCompanyByOfficerRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found"));

        if (request.getCompanyName() != null) company.setCompanyName(request.getCompanyName());
        if (request.getGstin() != null)       company.setGstin(request.getGstin());
        if (request.getPhone() != null)        company.setPhone(request.getPhone());
        if (request.getWebsite() != null)      company.setWebsite(request.getWebsite());
        if (request.getAddress() != null)      company.setAddress(request.getAddress());

        company = companyRepository.save(company);

        User user = userRepository.findById(company.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found for company"));

        return toResponse(company, user);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

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
}
