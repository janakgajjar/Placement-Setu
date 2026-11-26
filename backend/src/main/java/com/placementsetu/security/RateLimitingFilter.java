package com.placementsetu.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.placementsetu.common.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Universal project-wide in-memory rate limiting filter.
 * Applies tiered rate limiting to EVERY request across the entire /api/v1 platform:
 * 1. Global per-IP rate limit (120 req/min) for all requests.
 * 2. Strict auth rate limit (15 req/min) preventing credential brute-forcing.
 * 3. File & resume processing limit (5 req/min) guarding CPU & AI parsing.
 * 4. General mutation rate limit (40 req/min) for state-changing POST/PUT/PATCH/DELETE.
 */
@Component
@lombok.RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    // Rate limit thresholds (per 1-minute window)
    private static final int GLOBAL_MAX_REQUESTS_PER_MINUTE = 120;
    private static final int MUTATION_MAX_REQUESTS_PER_MINUTE = 40;
    private static final int AUTH_MAX_REQUESTS_PER_MINUTE = 15;
    private static final int RESUME_MAX_REQUESTS_PER_MINUTE = 5;
    private static final int PUBLIC_MAX_REQUESTS_PER_MINUTE = 60;
    private static final long WINDOW_MS = 60_000L;

    // Thread-safe request timestamp tracking per (IP + action scope)
    private final Map<String, ConcurrentLinkedDeque<Long>> requestHistory = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod().toUpperCase();

        // Only enforce rate limits on API routes (/api/v1/*)
        if (path.startsWith("/api/v1/")) {
            String clientIp = resolveClientIp(request);

            // Tier 1: Global Rate Limit (Every request per IP)
            int globalRemaining = getRemainingRequests(clientIp + ":global", GLOBAL_MAX_REQUESTS_PER_MINUTE);
            if (globalRemaining <= 0) {
                sendRateLimitResponse(response, "Global API rate limit exceeded. Maximum 120 requests per minute allowed.", 120);
                return;
            }

            // Tier 2: Specific Sensitive Action Limits
            if (path.startsWith("/api/v1/auth/")) {
                int authRemaining = getRemainingRequests(clientIp + ":auth", AUTH_MAX_REQUESTS_PER_MINUTE);
                if (authRemaining <= 0) {
                    sendRateLimitResponse(response, "Too many authentication attempts. Please wait 1 minute before trying again.", AUTH_MAX_REQUESTS_PER_MINUTE);
                    return;
                }
                response.setHeader("X-RateLimit-Limit", String.valueOf(AUTH_MAX_REQUESTS_PER_MINUTE));
                response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, authRemaining - 1)));
            } else if (path.startsWith("/api/v1/resumes")) {
                int resumeRemaining = getRemainingRequests(clientIp + ":resume", RESUME_MAX_REQUESTS_PER_MINUTE);
                if (resumeRemaining <= 0) {
                    sendRateLimitResponse(response, "Resume upload/parsing rate limit exceeded. Maximum 5 operations per minute allowed.", RESUME_MAX_REQUESTS_PER_MINUTE);
                    return;
                }
                response.setHeader("X-RateLimit-Limit", String.valueOf(RESUME_MAX_REQUESTS_PER_MINUTE));
                response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, resumeRemaining - 1)));
            } else if (path.startsWith("/api/v1/public/")) {
                int publicRemaining = getRemainingRequests(clientIp + ":public", PUBLIC_MAX_REQUESTS_PER_MINUTE);
                if (publicRemaining <= 0) {
                    sendRateLimitResponse(response, "Public browsing rate limit exceeded. Maximum 60 requests per minute allowed.", PUBLIC_MAX_REQUESTS_PER_MINUTE);
                    return;
                }
                response.setHeader("X-RateLimit-Limit", String.valueOf(PUBLIC_MAX_REQUESTS_PER_MINUTE));
                response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, publicRemaining - 1)));
            } else if ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method)) {
                int mutationRemaining = getRemainingRequests(clientIp + ":mutation", MUTATION_MAX_REQUESTS_PER_MINUTE);
                if (mutationRemaining <= 0) {
                    sendRateLimitResponse(response, "Mutation rate limit exceeded. Maximum 40 state-changing requests per minute allowed.", MUTATION_MAX_REQUESTS_PER_MINUTE);
                    return;
                }
                response.setHeader("X-RateLimit-Limit", String.valueOf(MUTATION_MAX_REQUESTS_PER_MINUTE));
                response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, mutationRemaining - 1)));
            } else {
                response.setHeader("X-RateLimit-Limit", String.valueOf(GLOBAL_MAX_REQUESTS_PER_MINUTE));
                response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, globalRemaining - 1)));
            }

            // Record request hit for global tracker
            recordHit(clientIp + ":global");
            if (path.startsWith("/api/v1/auth/")) recordHit(clientIp + ":auth");
            if (path.startsWith("/api/v1/public/")) recordHit(clientIp + ":public");
            if (path.startsWith("/api/v1/resumes")) recordHit(clientIp + ":resume");
            if ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method)) {
                recordHit(clientIp + ":mutation");
            }
        }

        filterChain.doFilter(request, response);
    }

    private int getRemainingRequests(String key, int maxRequests) {
        long now = System.currentTimeMillis();
        long windowStart = now - WINDOW_MS;

        ConcurrentLinkedDeque<Long> timestamps = requestHistory.computeIfAbsent(
                key, k -> new ConcurrentLinkedDeque<>()
        );

        // Evict expired timestamps from the head of the deque
        while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
            timestamps.pollFirst();
        }

        return maxRequests - timestamps.size();
    }

    private void recordHit(String key) {
        long now = System.currentTimeMillis();
        ConcurrentLinkedDeque<Long> timestamps = requestHistory.computeIfAbsent(
                key, k -> new ConcurrentLinkedDeque<>()
        );
        timestamps.addLast(now);

        // Periodic map cleanup if it grows large
        if (requestHistory.size() > 5000) {
            cleanupOldKeys(now - WINDOW_MS);
        }
    }

    private void cleanupOldKeys(long windowStart) {
        Iterator<Map.Entry<String, ConcurrentLinkedDeque<Long>>> it = requestHistory.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, ConcurrentLinkedDeque<Long>> entry = it.next();
            ConcurrentLinkedDeque<Long> dq = entry.getValue();
            if (dq.isEmpty() || dq.peekLast() < windowStart) {
                it.remove();
            }
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void sendRateLimitResponse(HttpServletResponse response, String message, int limit) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", "60");
        response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
        response.setHeader("X-RateLimit-Remaining", "0");

        ApiResponse<Void> apiResponse = ApiResponse.error(429, "Too Many Requests", message, null, null);
        response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
    }
}
