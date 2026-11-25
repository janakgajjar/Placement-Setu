package com.placementsetu.officer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProfileChangesRequest {

    @NotBlank(message = "Review remarks are required when requesting changes")
    @Size(min = 5, max = 500, message = "Remarks must be between 5 and 500 characters")
    private String remarks;
}
