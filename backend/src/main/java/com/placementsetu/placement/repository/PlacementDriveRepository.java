package com.placementsetu.placement.repository;

import com.placementsetu.common.enums.DriveStatus;
import com.placementsetu.placement.entity.PlacementDrive;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlacementDriveRepository extends JpaRepository<PlacementDrive, UUID> {

    /** Legacy list — kept for any existing internal usages. */
    List<PlacementDrive> findByCompanyId(UUID companyId);

    /**
     * Paginated listing with optional status filter.
     * Used by GET /companies/me/drives?page=&size=&sort=&status=
     */
    @Query("""
            SELECT d FROM PlacementDrive d
            WHERE d.companyId = :companyId
              AND (:status IS NULL OR d.status = :status)
            """)
    Page<PlacementDrive> findByCompanyIdAndStatus(
            @Param("companyId") UUID companyId,
            @Param("status") DriveStatus status,
            Pageable pageable
    );

    /**
     * Ownership-aware fetch: returns the drive only if it belongs to the given company.
     * Used by GET, PUT, POST publish/close on /companies/me/drives/{driveId}.
     */
    Optional<PlacementDrive> findByIdAndCompanyId(UUID id, UUID companyId);
}
