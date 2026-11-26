package com.placementsetu.student.repository;

import com.placementsetu.common.enums.ProfileApprovalStatus;
import com.placementsetu.student.entity.StudentProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, UUID>, JpaSpecificationExecutor<StudentProfile> {
    Optional<StudentProfile> findByUserId(UUID userId);
    Page<StudentProfile> findByApprovalStatus(ProfileApprovalStatus approvalStatus, Pageable pageable);
}
