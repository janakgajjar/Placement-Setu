package com.placementsetu.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedNotificationResponse {

    private List<NotificationResponseDto> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private long unreadCount;
    private boolean last;
}
