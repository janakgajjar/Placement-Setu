package com.placementsetu.resume.dto;

import com.placementsetu.resume.entity.ResumeBatchJob;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeBatchResponseDto {

    private UUID batchId;
    private String jobName;
    private int totalResumes;
    private int processedCount;
    private int successCount;
    private int failedCount;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private List<ResumeBatchItemDto> items;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResumeBatchItemDto {
        private UUID itemId;
        private String fileName;
        private UUID studentUserId;
        private String status;
        private String errorMessage;
        private LocalDateTime processedAt;
    }

    public static ResumeBatchResponseDto fromEntity(ResumeBatchJob job, List<ResumeBatchItemDto> items) {
        return ResumeBatchResponseDto.builder()
                .batchId(job.getId())
                .jobName(job.getJobName())
                .totalResumes(job.getTotalResumes())
                .processedCount(job.getProcessedCount())
                .successCount(job.getSuccessCount())
                .failedCount(job.getFailedCount())
                .status(job.getStatus())
                .createdAt(job.getCreatedAt())
                .completedAt(job.getCompletedAt())
                .items(items)
                .build();
    }
}
