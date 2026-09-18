package com.placementsetu.shortlist.repository;

import com.placementsetu.shortlist.entity.ShortlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ShortlistItemRepository extends JpaRepository<ShortlistItem, UUID> {
    List<ShortlistItem> findByShortlistId(UUID shortlistId);
}
