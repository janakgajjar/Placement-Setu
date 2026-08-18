package com.placementsetu.resume.parser;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ResumeParser {

    private static final List<String> KNOWN_SKILLS = List.of(
            "Java", "Spring Boot", "React", "Python", "SQL", "Docker",
            "PostgreSQL", "JavaScript", "AWS", "Git", "HTML", "CSS", "MySQL"
    );

    public Map<String, Object> parse(String text) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("name", extractName(text));
        result.put("email", extractEmail(text));
        result.put("phone", extractPhone(text));
        result.put("skills", extractSkills(text));
        return result;
    }

    private String extractEmail(String text) {
        Matcher m = Pattern.compile("[\\w.+-]+@[\\w-]+\\.[\\w.-]+").matcher(text);
        return m.find() ? m.group() : null;
    }

    private String extractPhone(String text) {
        Matcher m = Pattern.compile("(\\+?\\d{1,3}[- ]?)?\\d{10}").matcher(text);
        return m.find() ? m.group() : null;
    }

    private List<String> extractSkills(String text) {
        List<String> found = new ArrayList<>();
        String lower = text.toLowerCase();
        for (String skill : KNOWN_SKILLS) {
            if (lower.contains(skill.toLowerCase())) {
                found.add(skill);
            }
        }
        return found;
    }

    private String extractName(String text) {
        // Naive assumption: the first non-empty line of the resume is the name
        String[] lines = text.strip().split("\\r?\\n");
        for (String line : lines) {
            if (!line.isBlank()) {
                return line.trim();
            }
        }
        return "Unknown";
    }
}
