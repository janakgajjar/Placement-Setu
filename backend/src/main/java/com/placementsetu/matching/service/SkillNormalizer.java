package com.placementsetu.matching.service;

import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class SkillNormalizer {

    private static final Map<String, String> ALIASES = new HashMap<>();

    static {
        // JavaScript / TypeScript ecosystem
        ALIASES.put("js", "javascript");
        ALIASES.put("javascript", "javascript");
        ALIASES.put("ts", "typescript");
        ALIASES.put("typescript", "typescript");
        ALIASES.put("react", "react");
        ALIASES.put("reactjs", "react");
        ALIASES.put("react.js", "react");
        ALIASES.put("node", "nodejs");
        ALIASES.put("nodejs", "nodejs");
        ALIASES.put("node.js", "nodejs");
        ALIASES.put("express", "expressjs");
        ALIASES.put("expressjs", "expressjs");
        ALIASES.put("express.js", "expressjs");
        ALIASES.put("next", "nextjs");
        ALIASES.put("nextjs", "nextjs");
        ALIASES.put("next.js", "nextjs");
        ALIASES.put("vue", "vuejs");
        ALIASES.put("vuejs", "vuejs");
        ALIASES.put("vue.js", "vuejs");
        ALIASES.put("angular", "angular");
        ALIASES.put("angularjs", "angular");

        // Python
        ALIASES.put("py", "python");
        ALIASES.put("python", "python");
        ALIASES.put("python3", "python");
        ALIASES.put("django", "django");
        ALIASES.put("flask", "flask");
        ALIASES.put("fastapi", "fastapi");

        // Java & JVM
        ALIASES.put("java", "java");
        ALIASES.put("java8", "java");
        ALIASES.put("java11", "java");
        ALIASES.put("java17", "java");
        ALIASES.put("spring", "springboot");
        ALIASES.put("spring boot", "springboot");
        ALIASES.put("springboot", "springboot");
        ALIASES.put("spring-boot", "springboot");
        ALIASES.put("hibernate", "hibernate");

        // Databases
        ALIASES.put("sql", "sql");
        ALIASES.put("postgres", "postgresql");
        ALIASES.put("postgresql", "postgresql");
        ALIASES.put("psql", "postgresql");
        ALIASES.put("mysql", "mysql");
        ALIASES.put("mongo", "mongodb");
        ALIASES.put("mongodb", "mongodb");
        ALIASES.put("redis", "redis");

        // Cloud & DevOps
        ALIASES.put("k8s", "kubernetes");
        ALIASES.put("kubernetes", "kubernetes");
        ALIASES.put("docker", "docker");
        ALIASES.put("aws", "aws");
        ALIASES.put("amazon web services", "aws");
        ALIASES.put("gcp", "gcp");
        ALIASES.put("google cloud", "gcp");
        ALIASES.put("azure", "azure");

        // C / C++ / C# / .NET
        ALIASES.put("c", "c");
        ALIASES.put("cpp", "c++");
        ALIASES.put("c++", "c++");
        ALIASES.put("cplusplus", "c++");
        ALIASES.put("cs", "c#");
        ALIASES.put("c#", "c#");
        ALIASES.put("csharp", "c#");
        ALIASES.put("dotnet", ".net");
        ALIASES.put(".net", ".net");

        // Web fundamentals
        ALIASES.put("html", "html");
        ALIASES.put("html5", "html");
        ALIASES.put("css", "css");
        ALIASES.put("css3", "css");
        ALIASES.put("tailwind", "tailwindcss");
        ALIASES.put("tailwindcss", "tailwindcss");

        // Go / Rust / PHP
        ALIASES.put("golang", "go");
        ALIASES.put("go", "go");
        ALIASES.put("rust", "rust");
        ALIASES.put("php", "php");
    }

    public String normalize(String skill) {
        if (skill == null) return "";
        String cleaned = skill.trim().toLowerCase();
        return ALIASES.getOrDefault(cleaned, cleaned);
    }

    public Set<String> normalizeAll(Collection<String> skills) {
        if (skills == null || skills.isEmpty()) return Collections.emptySet();
        Set<String> normalized = new HashSet<>();
        for (String s : skills) {
            if (s != null && !s.isBlank()) {
                normalized.add(normalize(s));
            }
        }
        return normalized;
    }
}
