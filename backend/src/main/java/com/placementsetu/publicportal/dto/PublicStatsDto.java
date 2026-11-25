package com.placementsetu.publicportal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicStatsDto {
    private long activeDrivesCount;
    private long partnerCompaniesCount;
    private long placedStudentsCount;
    private long totalDrivesCount;
}
