package com.placementsetu.audit;

import com.placementsetu.audit.controller.AdminAuditLogController;
import com.placementsetu.audit.dto.AuditLogResponse;
import com.placementsetu.audit.entity.AuditLog;
import com.placementsetu.audit.repository.AuditLogRepository;
import com.placementsetu.audit.service.impl.AuditServiceImpl;
import com.placementsetu.exception.ResourceNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditModuleTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditServiceImpl auditService;

    @Test
    @DisplayName("AdminAuditLogController is restricted strictly to ADMIN and exposes no mutation endpoints")
    void testAdminOnlyAndImmutableController() {
        PreAuthorize preAuth = AdminAuditLogController.class.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuth);
        assertEquals("hasRole('ADMIN')", preAuth.value());

        for (Method m : AdminAuditLogController.class.getDeclaredMethods()) {
            assertNull(m.getAnnotation(PutMapping.class));
            assertNull(m.getAnnotation(PatchMapping.class));
            assertNull(m.getAnnotation(DeleteMapping.class));
        }
    }

    @Test
    @DisplayName("Audit logging records actor, entity, timestamp and strips sensitive fields")
    void testLogEventSanitizesSensitiveMetadata() {
        UUID userId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("jobTitle", "Software Engineer");
        metadata.put("password", "Secret@123");
        metadata.put("accessToken", "eyJhbGciOi...");
        metadata.put("refreshToken", "rt-123");

        auditService.logEvent(userId, "DRIVE_CREATED", "PLACEMENT_DRIVE", entityId, metadata);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog saved = captor.getValue();
        assertEquals(userId, saved.getUserId());
        assertEquals("DRIVE_CREATED", saved.getAction());
        assertEquals("PLACEMENT_DRIVE", saved.getEntityType());
        assertEquals(entityId, saved.getEntityId());
        assertNotNull(saved.getTimestamp());
        assertEquals("Software Engineer", saved.getMetadata().get("jobTitle"));
        assertFalse(saved.getMetadata().containsKey("password"));
        assertFalse(saved.getMetadata().containsKey("accessToken"));
        assertFalse(saved.getMetadata().containsKey("refreshToken"));
    }

    @Test
    @DisplayName("Audit persistence failure does not propagate or break caller business operation")
    void testAuditFailureDoesNotPropagate() {
        when(auditLogRepository.save(any(AuditLog.class))).thenThrow(new RuntimeException("DB unavailable"));

        assertDoesNotThrow(() -> auditService.logEvent(
                UUID.randomUUID(), "APPLICATION_SUBMITTED", "APPLICATION", UUID.randomUUID(), Map.of("k", "v")));
    }

    @Test
    @DisplayName("Admin retrieves paginated audit logs and single audit log detail")
    void testGetAuditLogsAndDetail() {
        UUID logId = UUID.randomUUID();
        AuditLog entry = AuditLog.builder()
                .id(logId)
                .userId(UUID.randomUUID())
                .action("PROFILE_APPROVED")
                .entityType("STUDENT_PROFILE")
                .entityId(UUID.randomUUID())
                .timestamp(LocalDateTime.now())
                .build();

        when(auditLogRepository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(entry)));
        when(auditLogRepository.findById(logId)).thenReturn(Optional.of(entry));

        Page<AuditLogResponse> page = auditService.getAuditLogs("PROFILE_APPROVED", null, null, PageRequest.of(0, 20));
        assertEquals(1, page.getTotalElements());
        assertEquals("PROFILE_APPROVED", page.getContent().get(0).getAction());

        AuditLogResponse detail = auditService.getAuditLog(logId);
        assertEquals(logId, detail.getId());

        UUID missingId = UUID.randomUUID();
        when(auditLogRepository.findById(missingId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> auditService.getAuditLog(missingId));
    }
}
