package com.placementsetu.resume.repository;

import com.placementsetu.resume.entity.ResumeBatchItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ResumeBatchItemRepository extends JpaRepository<ResumeBatchItem, UUID> {
    List<ResumeBatchItem> findByBatchJobId(UUID batchJobId);
}
