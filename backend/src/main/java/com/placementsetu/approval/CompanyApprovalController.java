package com.placementsetu.approval;

import com.placementsetu.common.ApiResponse;
import com.placementsetu.common.enums.AccountStatus;
import com.placementsetu.common.enums.UserRole;
import com.placementsetu.company.dto.CompanyProfileResponse;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.exception.ResourceNotFoundException;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Section 8/11 of the workflow doc: Officer/Admin reviews and approves or
 * rejects company onboarding. "Approved" and "rejected" map directly onto
 * USERS.account_status — there is no separate approvals table in the
 * approved schema.
 */
@Tag(name = "Admin - Company Approval", description = "Officer/Admin review of pending company registrations")
@RestController
@RequestMapping("/api/v1/admin/companies")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'PLACEMENT_OFFICER')")
public class CompanyApprovalController {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    @GetMapping("/pending")
    public ApiResponse<List<CompanyProfileResponse>> pending() {
        List<CompanyProfileResponse> companies = companyRepository.findAll().stream()
                .filter(company -> userRepository.findById(company.getUserId())
                        .map(u -> u.getAccountStatus() == AccountStatus.PENDING)
                        .orElse(false))
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ApiResponse.success("Pending companies fetched successfully", companies);
    }

    @PostMapping("/{companyId}/approve")
    public ApiResponse<CompanyProfileResponse> approve(@PathVariable UUID companyId) {
        return ApiResponse.success("Company approved successfully", updateStatus(companyId, AccountStatus.ACTIVE));
    }

    @PostMapping("/{companyId}/reject")
    public ApiResponse<CompanyProfileResponse> reject(@PathVariable UUID companyId) {
        return ApiResponse.success("Company rejected successfully", updateStatus(companyId, AccountStatus.REJECTED));
    }

    private CompanyProfileResponse updateStatus(UUID companyId, AccountStatus status) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
        User user = userRepository.findById(company.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Company's user account not found"));

        if (user.getRole() != UserRole.COMPANY) {
            throw new ResourceNotFoundException("Company not found");
        }

        user.setAccountStatus(status);
        userRepository.save(user);
        return toResponse(company, user);
    }

    private CompanyProfileResponse toResponse(Company company) {
        User user = userRepository.findById(company.getUserId()).orElse(null);
        return toResponse(company, user);
    }

    private CompanyProfileResponse toResponse(Company company, User user) {
        return CompanyProfileResponse.builder()
                .id(company.getId())
                .companyName(company.getCompanyName())
                .email(user == null ? null : user.getEmail())
                .gstin(company.getGstin())
                .phone(company.getPhone())
                .website(company.getWebsite())
                .address(company.getAddress())
                .accountStatus(user == null ? null : user.getAccountStatus())
                .build();
    }
}
