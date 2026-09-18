package com.placementsetu.officer.repository;

import com.placementsetu.officer.entity.PlacementOfficer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlacementOfficerRepository extends JpaRepository<PlacementOfficer, UUID> {
    Optional<PlacementOfficer> findByUserId(UUID userId);
}
