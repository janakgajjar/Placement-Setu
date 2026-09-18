package com.placementsetu.resume.entity;

import com.placementsetu.common.enums.ResumeProcessingStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Mirrors the approved RESUMES table: file metadata + a storage_key
 * reference only. Extracted text and AI-parsed fields are NOT stored here
 * (the approved schema has no resume_parsed_data table) — they flow
 * directly into StudentProfile/Skill/Project/Certification, see
 * ResumeService.uploadAndParse().
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "resumes")
@EntityListeners(AuditingEntityListener.class)
public class Resume {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "student_profile_id", nullable = false, unique = true)
    private UUID studentProfileId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "storage_key", nullable = false, unique = true)
    private String storageKey;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "processing_status", nullable = false, columnDefinition = "resume_processing_status")
    @Builder.Default
    private ResumeProcessingStatus processingStatus = ResumeProcessingStatus.PENDING;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    @CreatedDate
    private LocalDateTime uploadedAt;

    @Column(name = "updated_at", nullable = false)
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
