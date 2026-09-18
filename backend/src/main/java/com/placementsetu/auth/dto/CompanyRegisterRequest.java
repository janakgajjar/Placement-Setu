package com.placementsetu.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** Section 8 of the workflow doc: full company info collected at registration; status starts PENDING. */
@Getter
@Setter
public class CompanyRegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
            message = "Password must contain at least one uppercase letter, one lowercase letter, and one digit"
    )
    private String password;

    @NotBlank(message = "Company name is required")
    private String companyName;

    @NotBlank(message = "GSTIN is required")
    private String gstin;

    private String phone;

    private String website;

    @NotBlank(message = "Address is required")
    private String address;
}
