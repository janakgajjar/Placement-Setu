package com.placementsetu.audit.service;

import com.placementsetu.audit.dto.AuditLogResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Map;
import java.util.UUID;

public interface AuditService {

    void logEvent(UUID userId, String action, String entityType, UUID entityId, Map<String, Object> metadata);

    Page<AuditLogResponse> getAuditLogs(String action, String entityType, UUID userId, Pageable pageable);

    AuditLogResponse getAuditLog(UUID logId);
}
