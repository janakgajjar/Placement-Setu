package com.placementsetu.student.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CertificationRequest {
    @NotBlank(message = "Certification name is required")
    private String name;
    private String issuingOrganization;
    private LocalDate issueDate;
    private String credentialUrl;
}
