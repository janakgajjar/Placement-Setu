package com.placementsetu.officer.service;

import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.placement.dto.DriveResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Service contract for Placement Officer review and approval/rejection of placement drives.
 */
public interface OfficerDriveService {

    /**
     * List placement drives with optional status filter.
     */
    Page<DriveResponse> getDrives(DriveStatus status, Pageable pageable);

    /**
     * List all placement drives awaiting Placement Officer approval.
     */
    Page<DriveResponse> getPendingDrives(Pageable pageable);

    /**
     * Fetch full details of a placement drive for Placement Officer review.
     */
    DriveResponse getDriveDetails(UUID driveId);

    /**
     * Approve a PENDING_APPROVAL drive with mandatory nonblank remarks, transitioning it to PUBLISHED.
     */
    DriveResponse approveDrive(UUID officerUserId, UUID driveId, String remarks);

    /**
     * Reject a PENDING_APPROVAL drive with mandatory nonblank remarks, transitioning it to REJECTED.
     */
    DriveResponse rejectDrive(UUID officerUserId, UUID driveId, String remarks);
}
