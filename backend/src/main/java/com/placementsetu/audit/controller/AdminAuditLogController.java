package com.placementsetu.audit.controller;

import com.placementsetu.audit.dto.AuditLogResponse;
import com.placementsetu.audit.service.AuditService;
import com.placementsetu.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Tag(name = "Admin Audit Logs", description = "System-wide audit log inspection (ADMIN only)")
@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAuditLogController {

    private final AuditService auditService;

    @Operation(summary = "List system-wide audit logs with pagination and optional filters")
    @GetMapping
    public ApiResponse<Page<AuditLogResponse>> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) UUID userId,
            @PageableDefault(size = 20, sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success("Audit logs fetched successfully",
                auditService.getAuditLogs(action, entityType, userId, pageable));
    }

    @Operation(summary = "Get single audit log entry by ID")
    @GetMapping("/{logId}")
    public ApiResponse<AuditLogResponse> getAuditLog(@PathVariable UUID logId) {
        return ApiResponse.success("Audit log fetched successfully",
                auditService.getAuditLog(logId));
    }
}
