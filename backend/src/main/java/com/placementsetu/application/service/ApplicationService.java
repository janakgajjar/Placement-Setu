package com.placementsetu.application.service;

import com.placementsetu.application.dto.ApplicationRequest;
import com.placementsetu.application.dto.ApplicationResponse;
import com.placementsetu.application.dto.ApplicationStatusUpdateRequest;
import com.placementsetu.application.dto.ApplicationSummaryResponse;

import java.util.List;
import java.util.UUID;

public interface ApplicationService {
    ApplicationResponse apply(UUID studentUserId, UUID driveId);
    List<ApplicationResponse> getMyApplications(UUID studentUserId);
    ApplicationSummaryResponse getMySummary(UUID studentUserId);
    ApplicationResponse withdraw(UUID studentUserId, UUID applicationId);
    ApplicationResponse updateStatus(UUID applicationId, UUID changedByUserId, ApplicationStatusUpdateRequest request);
    List<ApplicationResponse> getDriveApplications(UUID driveId, UUID requesterUserId);
    void recalculatePlacementLock(UUID studentProfileId);
}
