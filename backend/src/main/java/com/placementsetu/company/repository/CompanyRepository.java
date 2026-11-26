package com.placementsetu.company.repository;

import com.placementsetu.common.enums.AccountStatus;
import com.placementsetu.company.entity.Company;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {

    Optional<Company> findByUserId(UUID userId);

    boolean existsByGstin(String gstin);

    /**
     * Paginated listing of companies with optional account-status filter and search.
     * Used by officer GET /placement-officers/me/companies
     */
    @Query("""
            SELECT c FROM Company c
              JOIN com.placementsetu.user.entity.User u ON u.id = c.userId
            WHERE (:accountStatus IS NULL OR u.accountStatus = :accountStatus)
              AND (:search IS NULL OR :search = '' 
                   OR LOWER(c.companyName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(c.contactPerson) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(c.gstin) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<Company> searchCompanies(
            @Param("accountStatus") AccountStatus accountStatus,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("""
            SELECT c FROM Company c
              JOIN com.placementsetu.user.entity.User u ON u.id = c.userId
            WHERE (:status IS NULL OR CAST(u.accountStatus AS string) = :status)
            """)
    Page<Company> findAllWithStatus(@Param("status") String status, Pageable pageable);

    @Query("""
            SELECT c FROM Company c
              JOIN com.placementsetu.user.entity.User u ON u.id = c.userId
            WHERE u.accountStatus = com.placementsetu.common.enums.AccountStatus.ACTIVE
              AND (:search IS NULL OR :search = ''
                   OR LOWER(c.companyName) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<Company> findActiveCompanies(@Param("search") String search, Pageable pageable);

    @Query("""
            SELECT count(c) FROM Company c
              JOIN com.placementsetu.user.entity.User u ON u.id = c.userId
            WHERE u.accountStatus = com.placementsetu.common.enums.AccountStatus.ACTIVE
            """)
    long countActiveCompanies();
}
