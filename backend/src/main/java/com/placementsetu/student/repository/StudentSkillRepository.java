package com.placementsetu.student.repository;

import com.placementsetu.student.entity.StudentSkill;
import com.placementsetu.student.entity.StudentSkillId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StudentSkillRepository extends JpaRepository<StudentSkill, StudentSkillId> {
    List<StudentSkill> findByStudentProfileId(UUID studentProfileId);
    void deleteByStudentProfileIdAndSkillId(UUID studentProfileId, UUID skillId);
}
