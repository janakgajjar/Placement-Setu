package com.placementsetu.application.repository;

import com.placementsetu.application.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {
    List<Application> findByStudentProfileId(UUID studentProfileId);
    List<Application> findByPlacementDriveId(UUID placementDriveId);
}
