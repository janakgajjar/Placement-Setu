package com.placementsetu.resume.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
public class ResumeResponseDto {
    private UUID id;
    private String originalFileName;
    private Map<String, Object> parsedData;
    private LocalDateTime uploadedAt;
}
