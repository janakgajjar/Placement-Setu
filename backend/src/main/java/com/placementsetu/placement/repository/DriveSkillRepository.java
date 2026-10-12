package com.placementsetu.placement.repository;

import com.placementsetu.placement.entity.DriveSkill;
import com.placementsetu.placement.entity.DriveSkillId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DriveSkillRepository extends JpaRepository<DriveSkill, DriveSkillId> {

    /** Fetch all skill associations for a given drive. */
    @Query("SELECT ds FROM DriveSkill ds WHERE ds.id.placementDriveId = :driveId")
    List<DriveSkill> findByDriveId(@Param("driveId") UUID driveId);

    /** Remove all skill associations for a given drive (used when replacing skills on update). */
    @Modifying
    @Query("DELETE FROM DriveSkill ds WHERE ds.id.placementDriveId = :driveId")
    void deleteByDriveId(@Param("driveId") UUID driveId);
}
