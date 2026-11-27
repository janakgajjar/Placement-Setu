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
        return getCompanies(status, null, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CompanyProfileResponse> getCompanies(String status, String search, Pageable pageable) {
        AccountStatus accountStatus = null;
        if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
            try {
                accountStatus = AccountStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }

        boolean hasSearch = (search != null && !search.isBlank());
        String cleanSearch = hasSearch ? search.trim() : null;

        Page<Company> page;
        if (accountStatus != null && hasSearch) {
            page = companyRepository.findByAccountStatusAndSearch(accountStatus, cleanSearch, pageable);
        } else if (accountStatus != null) {
            page = companyRepository.findByAccountStatus(accountStatus, pageable);
        } else if (hasSearch) {
            page = companyRepository.findBySearch(cleanSearch, pageable);
        } else {
            page = companyRepository.findAll(pageable);
        }

        return page.map(company -> {
            User user = userRepository.findById(company.getUserId()).orElse(null);
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

    @Override
    @Transactional
    public CompanyProfileResponse activateCompany(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + companyId));
        User user = userRepository.findById(company.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found for company"));

        user.setAccountStatus(AccountStatus.ACTIVE);
        user = userRepository.save(user);

        return toResponse(company, user);
    }

    @Override
    @Transactional
    public CompanyProfileResponse deactivateCompany(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + companyId));
        User user = userRepository.findById(company.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found for company"));

        user.setAccountStatus(AccountStatus.SUSPENDED);
        user = userRepository.save(user);

        return toResponse(company, user);
    }

    @Override
    @Transactional
    public CompanyProfileResponse resetCompanyPassword(UUID companyId, String newPassword) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + companyId));
        User user = userRepository.findById(company.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found for company"));

        String tempPassword = (newPassword != null && !newPassword.isBlank()) ? newPassword : "Temp@" + UUID.randomUUID().toString().substring(0, 8);
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setMustChangePassword(true);
        user = userRepository.save(user);

        CompanyProfileResponse response = toResponse(company, user);
        return CompanyProfileResponse.builder()
                .id(response.getId())
                .userId(response.getUserId())
                .companyName(response.getCompanyName())
                .contactPerson(response.getContactPerson())
                .email(response.getEmail())
                .gstin(response.getGstin())
                .phone(response.getPhone())
                .website(response.getWebsite())
                .address(response.getAddress())
                .accountStatus(response.getAccountStatus())
                .mustChangePassword(true)
                .temporaryPassword(tempPassword)
                .build();
    }

    @Override
    @Transactional
    public void deleteCompany(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + companyId));
        UUID userId = company.getUserId();
        companyRepository.delete(company);
        if (userId != null) {
            userRepository.deleteById(userId);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private CompanyProfileResponse toResponse(Company company, User user) {
        return CompanyProfileResponse.builder()
                .id(company.getId())
                .userId(company.getUserId())
                .companyName(company.getCompanyName())
                .contactPerson(company.getContactPerson())
                .email(user != null ? user.getEmail() : "N/A")
                .gstin(company.getGstin())
                .phone(company.getPhone())
                .website(company.getWebsite())
                .address(company.getAddress())
                .accountStatus(user != null ? user.getAccountStatus() : AccountStatus.PENDING)
                .build();
    }
}
