package com.placementsetu.officer.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Request DTO used by a Placement Officer to provision a new company account.
 * POST /api/v1/placement-officers/me/companies
 *
 * The officer provides all company details; the service creates the user account
 * with a temporary password and the company profile in a single transaction.
 */
@Getter
@Setter
public class ProvisionCompanyRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    private String email;

    @NotBlank(message = "A temporary password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String temporaryPassword;

    @NotBlank(message = "Company name is required")
    @Size(max = 200)
    private String companyName;

    @Size(max = 20)
    private String gstin;

    @Size(max = 15)
    private String phone;

    private String website;

    private String address;
}
