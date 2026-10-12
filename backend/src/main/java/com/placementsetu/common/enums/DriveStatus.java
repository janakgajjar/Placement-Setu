package com.placementsetu.common.enums;

/**
 * Lifecycle states for a placement drive.
 *
 * Company-managed transitions (Section 12 of the API spec):
 *   DRAFT ──publish──▶ PUBLISHED ──close──▶ CLOSED
 *
 * Legacy / officer-approval values preserved for backward compatibility:
 *   PENDING_APPROVAL, OPEN, REJECTED
 */
public enum DriveStatus {
    DRAFT,
    PUBLISHED,
    PENDING_APPROVAL,
    OPEN,
    CLOSED,
    REJECTED
}
