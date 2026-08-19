package com.placementsetu.resume.entity;

import com.placementsetu.resume.converter.JsonMapConverter;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "resumes")
@Data
public class Resume {

    @Id
    @GeneratedValue
    private UUID id;                       

    private String originalFileName;       

    @Convert(converter = JsonMapConverter.class)
    @Column(columnDefinition = "TEXT") // Stored a long value text in database.
    private Map<String, Object> parsedData; 

    @Column(columnDefinition = "TEXT")
    private String rawText;               

    private LocalDateTime uploadedAt;

    @PrePersist
    public void prePersist() {
        this.uploadedAt = LocalDateTime.now();
    }
}
