package com.placementsetu.resume.repository;

import com.placementsetu.resume.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ResumeRepository extends JpaRepository<Resume, UUID> {
}
