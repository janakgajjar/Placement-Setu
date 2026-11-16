package com.placementsetu.resume.repository;

import com.placementsetu.resume.entity.ResumeBatchJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ResumeBatchJobRepository extends JpaRepository<ResumeBatchJob, UUID> {
    List<ResumeBatchJob> findBySubmittedByUserIdOrderByCreatedAtDesc(UUID userId);
}
