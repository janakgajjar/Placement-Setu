package com.placementsetu.shortlist.repository;

import com.placementsetu.shortlist.entity.Shortlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShortlistRepository extends JpaRepository<Shortlist, UUID> {
    Optional<Shortlist> findByPlacementDriveId(UUID placementDriveId);
}
