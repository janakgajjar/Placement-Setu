package com.placementsetu.matching.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateProjectDto {
    private UUID id;
    private String title;
    private String description;
    private String projectUrl;
}
