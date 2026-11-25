package com.placementsetu.publicportal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicCompanyDto {
    private UUID id;
    private String companyName;
    private String website;
    private String address;
    private LocalDateTime createdAt;
}
