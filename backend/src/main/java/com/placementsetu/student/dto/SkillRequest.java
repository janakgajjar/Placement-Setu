package com.placementsetu.student.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SkillRequest {
    @NotBlank(message = "Skill name is required")
    private String name;
}
