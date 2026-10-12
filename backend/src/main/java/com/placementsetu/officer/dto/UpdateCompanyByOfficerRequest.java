package com.placementsetu.officer.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request DTO used by a Placement Officer to update an existing company.
 * PUT /api/v1/placement-officers/me/companies/{companyId}
 *
 * All fields are optional — only non-null values are applied.
 */
@Getter
@Setter
public class UpdateCompanyByOfficerRequest {

    @Size(max = 200)
    private String companyName;

    @Size(max = 20)
    private String gstin;

    @Size(max = 15)
    private String phone;

    private String website;

    private String address;
}
