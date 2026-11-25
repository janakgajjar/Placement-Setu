package com.placementsetu.notification.repository;

import com.placementsetu.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByRecipientUserId(UUID recipientUserId);

    Page<Notification> findByRecipientUserId(UUID recipientUserId, Pageable pageable);

    Page<Notification> findByRecipientUserIdAndIsRead(UUID recipientUserId, boolean isRead, Pageable pageable);

    Optional<Notification> findByIdAndRecipientUserId(UUID id, UUID recipientUserId);

    long countByRecipientUserIdAndIsReadFalse(UUID recipientUserId);

    boolean existsByRecipientUserIdAndIdempotencyKey(UUID recipientUserId, String idempotencyKey);
}
