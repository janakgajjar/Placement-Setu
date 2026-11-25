package com.placementsetu.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationSummaryResponse {
    private long totalApplied;
    private long underReview;
    private long shortlisted;
    private long interviewScheduled;
    private long selected;
    private long rejected;
    private long withdrawn;
}
