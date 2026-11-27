package com.placementsetu.placement.entity;

import com.placementsetu.common.enums.DriveStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.GenericGenerator;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** Foundation entity for Section 21 items 14-18 (job creation, approval, matching). Not yet exposed via API. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "placement_drives")
@EntityListeners(AuditingEntityListener.class)
public class PlacementDrive {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Column(name = "job_title", nullable = false, length = 200)
    private String jobTitle;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "location", length = 150)
    private String location;

    @Column(name = "ctc")
    private BigDecimal ctc;

    @Column(name = "vacancies", nullable = false)
    private Integer vacancies;

    @Column(name = "minimum_cgpa")
    private BigDecimal minimumCgpa;

    @Column(name = "maximum_backlogs")
    private Integer maximumBacklogs;

    @Column(name = "required_course", length = 100)
    private String requiredCourse;

    @Column(name = "graduation_year")
    private Short graduationYear;

    @Column(name = "registration_start", nullable = false)
    private LocalDateTime registrationStart;

    @Column(name = "registration_end", nullable = false)
    private LocalDateTime registrationEnd;

    @Column(name = "drive_type", length = 50)
    @Builder.Default
    private String driveType = "FULL_TIME"; // FULL_TIME, PAID_INTERNSHIP, INTERNSHIP_TO_PPO

    @Column(name = "stipend")
    private BigDecimal stipend;

    @Column(name = "maximum_age")
    private Integer maximumAge;

    @Column(name = "is_dream_offer")
    @Builder.Default
    private Boolean isDreamOffer = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private DriveStatus status = DriveStatus.DRAFT;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "review_remarks", columnDefinition = "TEXT")
    private String reviewRemarks;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreatedDate
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
