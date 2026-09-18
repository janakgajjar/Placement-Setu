package com.placementsetu.company.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateCompanyProfileRequest {
    private String phone;
    private String website;
    private String address;
}
