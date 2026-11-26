package com.placementsetu.auth.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Student registration request with NIST-aligned validation rules:
 * - Email format & length
 * - Password complexity (8-128 chars, upper, lower, digit, special symbol, must not contain email)
 * - Name alphabet-only and length (2-50 chars)
 * - Phone exactly 10 digits
 * - Enrollment / APPAR ID format and length
 */
@Getter
@Setter
public class StudentRegisterRequest {

    @NotBlank(message = "Institutional email is required")
    @Size(min = 3, max = 120, message = "Institutional email must be between 3 and 120 characters")
    @Email(message = "Institutional email must be valid")
    @Pattern(
            regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
            message = "Institutional email must only contain valid characters and match standard format"
    )
    private String email;

    @NotBlank(message = "Personal email is required")
    @Size(min = 3, max = 120, message = "Personal email must be between 3 and 120 characters")
    @Email(message = "Personal email must be valid")
    @Pattern(
            regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
            message = "Personal email must only contain valid characters and match standard format"
    )
    private String personalEmail;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters long")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?~`]).{8,128}$",
            message = "Password must include at least one uppercase letter, one lowercase letter, one digit, and one special character"
    )
    private String password;

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 50, message = "Full name must be between 2 and 50 characters")
    @Pattern(
            regexp = "^[a-zA-Z\\s]+$",
            message = "Full name can only contain alphabets and spaces"
    )
    private String fullName;

    @NotBlank(message = "Mobile number is required")
    @Size(min = 10, max = 10, message = "Mobile number must be exactly 10 digits")
    @Pattern(
            regexp = "^[0-9]{10}$",
            message = "Mobile number must be exactly 10 digits"
    )
    private String phone;

    @NotBlank(message = "Course selection is required")
    private String course;

    @Size(max = 50, message = "Enrollment number must not exceed 50 characters")
    @Pattern(
            regexp = "^[a-zA-Z0-9\\-_]*$",
            message = "Enrollment number can only contain alphanumeric characters, hyphens, or underscores"
    )
    private String enrollmentNumber;

    public String getApparId() {
        return enrollmentNumber;
    }

    public void setApparId(String apparId) {
        this.enrollmentNumber = apparId;
    }

    @AssertTrue(message = "Password must not contain the email address")
    public boolean isPasswordNotContainEmail() {
        if (password == null || email == null) return true;
        String normalizedEmail = email.trim().toLowerCase();
        String normalizedPassword = password.toLowerCase();
        if (normalizedPassword.contains(normalizedEmail)) return false;
        String localPart = normalizedEmail.contains("@") ? normalizedEmail.substring(0, normalizedEmail.indexOf('@')) : normalizedEmail;
        return localPart.length() < 3 || !normalizedPassword.contains(localPart);
    }
}
