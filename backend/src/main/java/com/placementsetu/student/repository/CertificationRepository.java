package com.placementsetu.student.repository;

import com.placementsetu.student.entity.Certification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CertificationRepository extends JpaRepository<Certification, UUID> {
    List<Certification> findByStudentProfileId(UUID studentProfileId);
    void deleteByIdAndStudentProfileId(UUID id, UUID studentProfileId);
}
