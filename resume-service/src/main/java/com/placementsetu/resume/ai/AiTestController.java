package com.placementsetu.resume.ai;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AiTestController {

    private final GeminiClient geminiClient;

    public AiTestController(GeminiClient geminiClient) {
        this.geminiClient = geminiClient;
    }

    @GetMapping("/api/v1/ai/test")
    public String test(@RequestParam(defaultValue = "Say hello in one short sentence.") String prompt) {
        return geminiClient.generateText(prompt);
    }
}