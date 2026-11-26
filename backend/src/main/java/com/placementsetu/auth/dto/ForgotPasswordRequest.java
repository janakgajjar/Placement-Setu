package com.placementsetu.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ForgotPasswordRequest {

    @NotBlank(message = "Email is required")
    @Size(min = 3, max = 120, message = "Email must be between 3 and 120 characters")
    @Email(message = "Email must be valid")
    private String email;
}
