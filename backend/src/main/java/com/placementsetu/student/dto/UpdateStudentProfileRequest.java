package com.placementsetu.student.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/** Every field is optional — only fields provided in the request are updated (see StudentProfileServiceImpl). */
@Getter
@Setter
public class UpdateStudentProfileRequest {
    private String fullName;
    private String phone;
    private String gender;
    private String course;
    private String institution;
    private Short graduationYear;
    private String apparId;

    @DecimalMin(value = "0.0", message = "CGPA cannot be negative")
    @DecimalMax(value = "10.0", message = "CGPA cannot exceed 10")
    private BigDecimal cgpa;

    @Min(value = 0, message = "Backlogs cannot be negative")
    private Integer backlogs;

    private String address;
    private String linkedinUrl;
    private String githubUrl;
}
