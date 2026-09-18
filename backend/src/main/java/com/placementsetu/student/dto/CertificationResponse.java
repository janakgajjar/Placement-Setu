package com.placementsetu.student.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificationResponse {
    private UUID id;
    private String name;
    private String issuingOrganization;
    private LocalDate issueDate;
    private String credentialUrl;
}
