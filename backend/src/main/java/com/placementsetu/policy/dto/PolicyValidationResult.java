package com.placementsetu.policy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyValidationResult {

    private boolean eligible;
    @Builder.Default
    private List<String> rejectionReasons = new ArrayList<>();
    private String policyCategory; // SELECTION_RULE, PAID_INTERNSHIP, AGE_LIMIT, SHORTLIST

    public static PolicyValidationResult pass() {
        return PolicyValidationResult.builder()
                .eligible(true)
                .rejectionReasons(new ArrayList<>())
                .build();
    }

    public static PolicyValidationResult fail(String category, String reason) {
        List<String> reasons = new ArrayList<>();
        reasons.add(reason);
        return PolicyValidationResult.builder()
                .eligible(false)
                .rejectionReasons(reasons)
                .policyCategory(category)
                .build();
    }
}
