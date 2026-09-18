package com.placementsetu.placement.repository;

import com.placementsetu.placement.entity.DriveSkill;
import com.placementsetu.placement.entity.DriveSkillId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DriveSkillRepository extends JpaRepository<DriveSkill, DriveSkillId> {
}
