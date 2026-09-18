package com.placementsetu.resume.dto;

import com.placementsetu.common.enums.ResumeProcessingStatus;
import com.placementsetu.student.dto.StudentProfileResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeResponseDto {
    private UUID id;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private ResumeProcessingStatus processingStatus;
    private LocalDateTime uploadedAt;
    /** Returned so the frontend can immediately show the AI-updated profile/skills without a second call. */
    private StudentProfileResponse updatedProfile;
}
