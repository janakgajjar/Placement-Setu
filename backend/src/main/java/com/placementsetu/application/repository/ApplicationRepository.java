package com.placementsetu.application.repository;

import com.placementsetu.application.entity.Application;
import com.placementsetu.common.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {
    List<Application> findByStudentProfileId(UUID studentProfileId);
    List<Application> findByStudentProfileIdOrderByAppliedAtDesc(UUID studentProfileId);
    List<Application> findByPlacementDriveId(UUID placementDriveId);
    List<Application> findByPlacementDriveIdOrderByAppliedAtDesc(UUID placementDriveId);
    Optional<Application> findByStudentProfileIdAndPlacementDriveId(UUID studentProfileId, UUID placementDriveId);
    long countByStudentProfileId(UUID studentProfileId);
    long countByStudentProfileIdAndStatus(UUID studentProfileId, ApplicationStatus status);
    long countByPlacementDriveId(UUID placementDriveId);
    long countByStatus(ApplicationStatus status);

    @org.springframework.data.jpa.repository.Query("""
            SELECT a FROM Application a
            JOIN com.placementsetu.placement.entity.PlacementDrive d ON d.id = a.placementDriveId
            WHERE a.studentProfileId = :profileId AND d.companyId = :companyId
            """)
    List<Application> findByStudentProfileIdAndCompanyId(
            @org.springframework.data.repository.query.Param("profileId") UUID profileId,
            @org.springframework.data.repository.query.Param("companyId") UUID companyId);
}
