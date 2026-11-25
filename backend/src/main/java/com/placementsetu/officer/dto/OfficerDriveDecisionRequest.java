package com.placementsetu.officer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request body for Placement Officer approval or rejection of a submitted placement drive.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OfficerDriveDecisionRequest {

    @NotBlank(message = "Review remarks are required")
    @Size(max = 1000, message = "Review remarks must not exceed 1000 characters")
    private String remarks;
}
