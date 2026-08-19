package com.placementsetu.resume.service;

import com.placementsetu.resume.ai.AiResumeParser;
import com.placementsetu.resume.dto.ResumeResponseDto;
import com.placementsetu.resume.entity.Resume;
import com.placementsetu.resume.repository.ResumeRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;


@Service
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final AiResumeParser aiResumeParser;

    public ResumeService(ResumeRepository resumeRepository, AiResumeParser aiResumeParser) {
        this.resumeRepository = resumeRepository;
        this.aiResumeParser = aiResumeParser;
    }

    public ResumeResponseDto uploadAndParse(MultipartFile file) throws Exception {
        String text = extractText(file);

        Resume resume = new Resume();
        resume.setOriginalFileName(file.getOriginalFilename());
        resume.setRawText(text);
        resume.setParsedData(aiResumeParser.parse(text));

        Resume saved = resumeRepository.save(resume);
        return toDto(saved);
    }

    public ResumeResponseDto getById(UUID id) {
        Resume resume = resumeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resume not found: " + id));
        return toDto(resume);
    }

    private String extractText(MultipartFile file) throws Exception {
        String fileName = file.getOriginalFilename();
        if (fileName != null && fileName.toLowerCase().endsWith(".pdf")) {
           
            try (PDDocument document = Loader.loadPDF(file.getBytes())) {
                return new PDFTextStripper().getText(document);
            }
        }
        return new String(file.getBytes());
    }

    private ResumeResponseDto toDto(Resume resume) {
        ResumeResponseDto dto = new ResumeResponseDto();
        dto.setId(resume.getId());
        dto.setOriginalFileName(resume.getOriginalFileName());
        dto.setParsedData(resume.getParsedData());
        dto.setUploadedAt(resume.getUploadedAt());
        return dto;
    }
}
