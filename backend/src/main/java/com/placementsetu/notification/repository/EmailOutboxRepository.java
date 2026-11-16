package com.placementsetu.notification.repository;

import com.placementsetu.notification.entity.EmailOutbox;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface EmailOutboxRepository extends JpaRepository<EmailOutbox, UUID> {

    @Query("SELECT e FROM EmailOutbox e WHERE e.status = :status AND (e.nextRetryAt IS NULL OR e.nextRetryAt <= :cutoffTime) ORDER BY e.createdAt ASC")
    List<EmailOutbox> findDueRecords(@Param("status") String status, @Param("cutoffTime") LocalDateTime cutoffTime, Pageable pageable);

    boolean existsByRecipientEmailAndIdempotencyKey(String recipientEmail, String idempotencyKey);
}
