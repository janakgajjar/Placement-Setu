package com.placementsetu.resume.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class AiResumeParser {

    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiResumeParser(GeminiClient geminiClient) {
        this.geminiClient = geminiClient;
    }

    public Map<String, Object> parse(String resumeText) {
        String prompt = buildPrompt(resumeText);
        String rawReply = geminiClient.generateText(prompt);
        String cleanJson = stripMarkdownFences(rawReply);
        return parseJsonSafely(cleanJson);
    }

    private String buildPrompt(String resumeText) {
        return """
                You are a resume parsing engine. Read the resume text below and
                extract information into a JSON object with EXACTLY these fields:

                - name (string)
                - email (string or null)
                - phone (string or null)
                - linkedin (string or null)
                - github (string or null)
                - skills (array of strings)
                - project (array of strings or null)
                - languages (array of strings, spoken/written languages the person knows)
                - education (string, short summary)
                - work_experience (string, short summary)

                Rules:
                - Return ONLY the JSON object. No explanation, no markdown, no ```json fences.
                - If a field is missing in the resume, use null (or an empty array for lists).

                Resume text:
                %s
                """.formatted(resumeText);
    }

    private String stripMarkdownFences(String text) {
        return text.replace("```json", "").replace("```", "").trim();
    }

    private Map<String, Object> parseJsonSafely(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("error", "AI response could not be parsed");
            fallback.put("raw_response", json);
            return fallback;
        }
    }
}