package com.placementsetu.company.dto;

import com.placementsetu.common.enums.AccountStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyProfileResponse {
    private UUID id;
    private String companyName;
    private String email;
    private String gstin;
    private String phone;
    private String website;
    private String address;
    private AccountStatus accountStatus;
}
