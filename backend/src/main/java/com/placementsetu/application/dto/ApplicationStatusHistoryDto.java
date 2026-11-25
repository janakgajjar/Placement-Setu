package com.placementsetu.application.dto;

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
public class ApplicationStatusHistoryDto {
    private UUID id;
    private String fromStatus;
    private String toStatus;
    private String remarks;
    private String changedByName;
    private LocalDateTime createdAt;
}
