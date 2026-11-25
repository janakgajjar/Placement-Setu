package com.placementsetu.audit.dto;

import com.placementsetu.audit.entity.AuditLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private UUID id;
    private UUID userId;
    private String action;
    private String entityType;
    private UUID entityId;
    private LocalDateTime timestamp;
    private String ipAddress;
    private Map<String, Object> metadata;

    public static AuditLogResponse fromEntity(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .userId(log.getUserId())
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .timestamp(log.getTimestamp())
                .ipAddress(log.getIpAddress())
                .metadata(log.getMetadata())
                .build();
    }
}
