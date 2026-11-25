package com.placementsetu.audit.service.impl;

import com.placementsetu.audit.dto.AuditLogResponse;
import com.placementsetu.audit.entity.AuditLog;
import com.placementsetu.audit.repository.AuditLogRepository;
import com.placementsetu.audit.service.AuditService;
import com.placementsetu.exception.ResourceNotFoundException;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {

    private static final List<String> SENSITIVE_KEY_FRAGMENTS = List.of(
            "password", "token", "secret", "jwt", "authorization", "credential"
    );

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logEvent(UUID userId, String action, String entityType, UUID entityId, Map<String, Object> metadata) {
        try {
            Map<String, Object> sanitized = sanitizeMetadata(metadata);
            AuditLog entry = AuditLog.builder()
                    .userId(userId)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .timestamp(LocalDateTime.now())
                    .metadata(sanitized)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception ex) {
            log.warn("Audit logging failed for action={} entityType={} entityId={}: {}",
                    action, entityType, entityId, ex.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogs(String action, String entityType, UUID userId, Pageable pageable) {
        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (action != null && !action.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("action")), action.trim().toUpperCase()));
            }
            if (entityType != null && !entityType.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("entityType")), entityType.trim().toUpperCase()));
            }
            if (userId != null) {
                predicates.add(cb.equal(root.get("userId"), userId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return auditLogRepository.findAll(spec, pageable).map(AuditLogResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public AuditLogResponse getAuditLog(UUID logId) {
        AuditLog entry = auditLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("Audit log not found: " + logId));
        return AuditLogResponse.fromEntity(entry);
    }

    private Map<String, Object> sanitizeMetadata(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return null;
        }
        Map<String, Object> clean = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : metadata.entrySet()) {
            String key = entry.getKey();
            if (key == null) continue;
            String lower = key.toLowerCase(Locale.ROOT);
            boolean sensitive = SENSITIVE_KEY_FRAGMENTS.stream().anyMatch(lower::contains);
            if (!sensitive) {
                clean.put(key, entry.getValue());
            }
        }
        return clean.isEmpty() ? null : clean;
    }
}
