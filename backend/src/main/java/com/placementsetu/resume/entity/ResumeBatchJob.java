package com.placementsetu.resume.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "resume_batch_jobs")
@EntityListeners(AuditingEntityListener.class)
public class ResumeBatchJob {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "job_name", nullable = false, length = 150)
    private String jobName;

    @Column(name = "submitted_by_user_id")
    private UUID submittedByUserId;

    @Column(name = "total_resumes", nullable = false)
    @Builder.Default
    private int totalResumes = 0;

    @Column(name = "processed_count", nullable = false)
    @Builder.Default
    private int processedCount = 0;

    @Column(name = "success_count", nullable = false)
    @Builder.Default
    private int successCount = 0;

    @Column(name = "failed_count", nullable = false)
    @Builder.Default
    private int failedCount = 0;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING, PROCESSING, COMPLETED, FAILED

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreatedDate
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
