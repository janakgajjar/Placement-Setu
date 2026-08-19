package com.placementsetu.resume.controller;

import com.placementsetu.resume.dto.ResumeResponseDto;
import com.placementsetu.resume.service.ResumeService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/resumes")
@CrossOrigin(origins = "*")
public class ResumeController {

    private final ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    // POST /api/v1/resumes/upload  
    @PostMapping("/upload")
    public ResumeResponseDto upload(@RequestParam("file") MultipartFile file) throws Exception {
        return resumeService.uploadAndParse(file);
    }

    // GET /api/v1/resumes/{id}
    @GetMapping("/{id}")
    public ResumeResponseDto get(@PathVariable UUID id) {
        return resumeService.getById(id);
    }
}
