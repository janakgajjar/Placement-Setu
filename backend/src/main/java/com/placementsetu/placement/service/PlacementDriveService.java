package com.placementsetu.placement.service;

import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.placement.dto.CreateDriveRequest;
import com.placementsetu.placement.dto.DriveResponse;
import com.placementsetu.placement.dto.UpdateDriveRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Service contract for Company Placement Drive APIs (Section 12 of the API spec).
 *
 * All mutating operations enforce that the authenticated company owns the drive.
 */
public interface PlacementDriveService {

    /**
     * Create a new drive in DRAFT state.
     * POST /api/v1/companies/me/drives
     */
    DriveResponse createDrive(UUID companyId, CreateDriveRequest request);

    /**
     * Paginated listing of drives owned by the company with optional status filter.
     * GET /api/v1/companies/me/drives
     */
    Page<DriveResponse> getCompanyDrives(UUID companyId, DriveStatus status, Pageable pageable);

    /**
     * Fetch a single drive owned by the company.
     * GET /api/v1/companies/me/drives/{driveId}
     */
    DriveResponse getDrive(UUID companyId, UUID driveId);

    /**
     * Update drive fields while it is still in DRAFT state.
     * PUT /api/v1/companies/me/drives/{driveId}
     */
    DriveResponse updateDrive(UUID companyId, UUID driveId, UpdateDriveRequest request);

    /**
     * Transition a DRAFT drive to PUBLISHED.
     * POST /api/v1/companies/me/drives/{driveId}/publish
     */
    DriveResponse publishDrive(UUID companyId, UUID driveId);

    /**
     * Transition a PUBLISHED drive to CLOSED.
     * POST /api/v1/companies/me/drives/{driveId}/close
     */
    DriveResponse closeDrive(UUID companyId, UUID driveId);
}
