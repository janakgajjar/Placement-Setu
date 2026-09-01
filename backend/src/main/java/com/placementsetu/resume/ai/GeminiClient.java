package com.placementsetu.resume.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class GeminiClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    public GeminiClient(
            RestClient.Builder builder,
            ObjectMapper objectMapper
    ) {
        this.restClient = builder.build();
        this.objectMapper = objectMapper;
    }

    public String generateText(String prompt) {

        // Request body sent to Gemini
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of(
                                                "text", prompt
                                        )
                                )
                        )
                )
        );

        try {

            // Call Gemini API
            String response = restClient.post()
                    .uri(apiUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("x-goog-api-key", apiKey.trim())
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            // Convert Gemini response String into JSON
            JsonNode root = objectMapper.readTree(response);


            // ========================================
            //          GEMINI TOKEN USAGE
            // ========================================

            JsonNode usage = root.path("usageMetadata");

            int promptTokens =
                    usage.path("promptTokenCount").asInt(0);

            int outputTokens =
                    usage.path("candidatesTokenCount").asInt(0);

            int thoughtsTokens =
                    usage.path("thoughtsTokenCount").asInt(0);

            int totalTokens =
                    usage.path("totalTokenCount").asInt(0);


            // Print token usage in Spring Boot terminal
            System.out.println();
            System.out.println("========================================");
            System.out.println("         GEMINI TOKEN USAGE");
            System.out.println("========================================");
            System.out.println("Prompt Tokens   : " + promptTokens);
            System.out.println("Output Tokens   : " + outputTokens);
            System.out.println("Thought Tokens  : " + thoughtsTokens);
            System.out.println("----------------------------------------");
            System.out.println("Total Tokens    : " + totalTokens);
            System.out.println("========================================");
            System.out.println();


            // ========================================
            //       EXTRACT GEMINI GENERATED TEXT
            // ========================================

            JsonNode textNode = root
                    .path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text");


            // Check if Gemini returned valid text
            if (textNode.isMissingNode()
                    || textNode.asText().isBlank()) {

                throw new RuntimeException(
                        "Gemini returned no text. Full response: "
                                + response
                );
            }


            // Return only Gemini's generated text
            return textNode.asText();


        } catch (Exception e) {

            System.err.println();
            System.err.println("========================================");
            System.err.println("          GEMINI API ERROR");
            System.err.println("========================================");
            System.err.println(e.getMessage());
            System.err.println("========================================");

            throw new RuntimeException(
                    "Gemini AI service failed: " + e.getMessage(),
                    e
            );
        }
    }
}