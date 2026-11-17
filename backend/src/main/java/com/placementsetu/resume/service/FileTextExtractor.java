package com.placementsetu.resume.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Component
public class FileTextExtractor {

    public String extractText(MultipartFile file) throws IOException {

        String fileName = file.getOriginalFilename();

        if (fileName == null) {
            throw new IllegalArgumentException("File name is missing");
        }

        String lowerFileName = fileName.toLowerCase();

        // ============================
        // TXT FILE
        // ============================
        if (lowerFileName.endsWith(".txt")) {

            return new String(
                    file.getBytes(),
                    StandardCharsets.UTF_8
            );
        }


        // ============================
        // PDF FILE
        // ============================
        if (lowerFileName.endsWith(".pdf")) {

            try (InputStream inputStream = file.getInputStream()) {

                var document = Loader.loadPDF(
                        inputStream.readAllBytes()
                );

                PDFTextStripper stripper =
                        new PDFTextStripper();

                return stripper.getText(document);
            }
        }


        // ============================
        // DOCX FILE
        // ============================
        if (lowerFileName.endsWith(".docx")) {

            try (
                    InputStream inputStream =
                            file.getInputStream();

                    XWPFDocument document =
                            new XWPFDocument(inputStream)
            ) {

                StringBuilder text =
                        new StringBuilder();

                document.getParagraphs()
                        .forEach(paragraph ->
                                text.append(
                                        paragraph.getText()
                                ).append("\n")
                        );

                // Also extract text from tables
                document.getTables()
                        .forEach(table ->
                                table.getRows()
                                        .forEach(row ->
                                                row.getTableCells()
                                                        .forEach(cell ->
                                                                text.append(
                                                                        cell.getText()
                                                                ).append("\n")
                                                        )
                                        )
                        );

                return text.toString();
            }
        }


        // ============================
        // UNSUPPORTED FILE
        // ============================
        throw new IllegalArgumentException(
                "Unsupported file type: " + fileName
        );
    }
}