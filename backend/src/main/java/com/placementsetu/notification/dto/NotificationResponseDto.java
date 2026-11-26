package com.placementsetu.notification.dto;

import com.placementsetu.common.enums.NotificationType;
import com.placementsetu.notification.entity.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponseDto {

    private UUID id;
    private NotificationType type;
    private String subject;
    private String message;
    private boolean isRead;
    private LocalDateTime readAt;
    private String relatedEntityType;
    private UUID relatedEntityId;
    private LocalDateTime createdAt;

    public static NotificationResponseDto fromEntity(Notification entity) {
        return NotificationResponseDto.builder()
                .id(entity.getId())
                .type(entity.getType())
                .subject(entity.getSubject())
                .message(entity.getMessage())
                .isRead(entity.isRead())
                .readAt(entity.getReadAt())
                .relatedEntityType(entity.getRelatedEntityType())
                .relatedEntityId(entity.getRelatedEntityId())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
