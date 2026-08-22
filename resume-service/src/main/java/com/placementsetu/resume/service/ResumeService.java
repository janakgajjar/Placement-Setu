package com.placementsetu.resume.service;

import com.placementsetu.resume.ai.AiResumeParser;
import com.placementsetu.resume.dto.ResumeResponseDto;
import com.placementsetu.resume.entity.Resume;
import com.placementsetu.resume.repository.ResumeRepository;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final AiResumeParser aiResumeParser;
    private final FileTextExtractor fileTextExtractor;


    // ============================================
    // CONSTRUCTOR INJECTION
    // ============================================

    public ResumeService(
            ResumeRepository resumeRepository,
            AiResumeParser aiResumeParser,
            FileTextExtractor fileTextExtractor
    ) {
        this.resumeRepository = resumeRepository;
        this.aiResumeParser = aiResumeParser;
        this.fileTextExtractor = fileTextExtractor;
    }


    // ============================================
    // UPLOAD + EXTRACT + PARSE + SAVE
    // ============================================

    public ResumeResponseDto uploadAndParse(
            MultipartFile file
    ) throws Exception {

        // STEP 1: Extract text from PDF / TXT / DOCX
        String resumeText = fileTextExtractor.extractText(file);


        // Check extracted text
        if (resumeText == null || resumeText.isBlank()) {
            throw new IllegalArgumentException(
                    "No readable text found in the uploaded file: "
                            + file.getOriginalFilename()
            );
        }


        // DEBUG - CHECK EXTRACTED TEXT
        System.out.println();
        System.out.println("========================================");
        System.out.println("      RESUME TEXT EXTRACTED");
        System.out.println("========================================");
        System.out.println(resumeText);
        System.out.println("========================================");
        System.out.println(
                "TEXT LENGTH: " + resumeText.length()
        );
        System.out.println("========================================");
        System.out.println();


        // STEP 2: Send extracted text to Gemini AI
        System.out.println(
                "Sending resume to Gemini AI..."
        );

        var parsedData =
                aiResumeParser.parse(resumeText);


        System.out.println(
                "Gemini parsing completed successfully"
        );


        // STEP 3: Create Resume entity
        Resume resume = new Resume();

        resume.setOriginalFileName(
                file.getOriginalFilename()
        );

        resume.setRawText(
                resumeText
        );

        resume.setParsedData(
                parsedData
        );


        // STEP 4: Save into H2 database
        Resume saved =
                resumeRepository.save(resume);


        System.out.println(
                "Resume saved successfully. ID: "
                        + saved.getId()
        );


        // STEP 5: Return response DTO
        return toDto(saved);
    }


    // ============================================
    // GET RESUME BY ID
    // ============================================

    public ResumeResponseDto getById(UUID id) {

        Resume resume =
                resumeRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Resume not found: " + id
                                )
                        );

        return toDto(resume);
    }


    // ============================================
    // ENTITY → DTO
    // ============================================

    private ResumeResponseDto toDto(
            Resume resume
    ) {

        ResumeResponseDto dto =
                new ResumeResponseDto();

        dto.setId(
                resume.getId()
        );

        dto.setOriginalFileName(
                resume.getOriginalFileName()
        );

        dto.setParsedData(
                resume.getParsedData()
        );

        dto.setUploadedAt(
                resume.getUploadedAt()
        );

        return dto;
    }
}