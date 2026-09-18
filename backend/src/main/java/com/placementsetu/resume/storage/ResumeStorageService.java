package com.placementsetu.resume.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Local-disk implementation of the "storage_key" reference described in
 * Section 18 of the architecture doc ("resume files should be represented
 * through controlled storage/reference metadata"). Swap this out for S3/MinIO
 * behind the same interface when Docker/object storage is introduced
 * (Section 21 item 27) without touching ResumeService.
 */
@Component
public class ResumeStorageService {

    private final Path baseDir;

    public ResumeStorageService(@Value("${app.storage.resume-dir}") String resumeDir) {
        this.baseDir = Paths.get(resumeDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(baseDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create resume storage directory: " + baseDir, e);
        }
    }

    /** Stores the file and returns the storage_key to persist on the Resume row. */
    public String store(MultipartFile file) throws IOException {
        String originalName = file.getOriginalFilename() == null ? "resume" : file.getOriginalFilename();
        String extension = originalName.contains(".") ? originalName.substring(originalName.lastIndexOf('.')) : "";
        String storageKey = UUID.randomUUID() + extension;

        Path target = baseDir.resolve(storageKey);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return storageKey;
    }

    public void delete(String storageKey) {
        try {
            Files.deleteIfExists(baseDir.resolve(storageKey));
        } catch (IOException ignored) {
            // Best-effort cleanup — a leftover file on disk is not worth failing the request for.
        }
    }
}
