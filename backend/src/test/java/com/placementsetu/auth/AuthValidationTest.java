package com.placementsetu.auth;

import com.placementsetu.auth.dto.LoginRequest;
import com.placementsetu.auth.dto.StudentRegisterRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class AuthValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void loginRequest_acceptsAnyPasswordFormat_asLongAsNotBlank() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@vidyapith.edu");
        request.setPassword("short"); // Should NOT fail validation on login (no length rules on login)

        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty(), "Login password must not enforce complexity or length rules");
    }

    @Test
    void loginRequest_rejectsBlankFields_andInvalidEmail() {
        LoginRequest request = new LoginRequest();
        request.setEmail("not-an-email");
        request.setPassword("");

        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);
        assertEquals(2, violations.size());
    }

    @Test
    void studentRegisterRequest_acceptsValidInput() {
        StudentRegisterRequest request = new StudentRegisterRequest();
        request.setEmail("student@gujaratvidyapith.org");
        request.setPersonalEmail("student.personal@gmail.com");
        request.setFullName("Janakkumar Gajjar");
        request.setPhone("9876543210");
        request.setCourse("MCA");
        request.setPassword("Vidyapith@2026");
        request.setEnrollmentNumber("GVP-MCA-2026-001");

        Set<ConstraintViolation<StudentRegisterRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty(), "Valid registration request should have no violations");
    }

    @Test
    void studentRegisterRequest_rejectsWeakPasswords() {
        // Missing special symbol
        StudentRegisterRequest r1 = createValidRequest();
        r1.setPassword("WeakPass123");
        assertFalse(validator.validate(r1).isEmpty());

        // Missing digit
        StudentRegisterRequest r2 = createValidRequest();
        r2.setPassword("WeakPassword@");
        assertFalse(validator.validate(r2).isEmpty());

        // Too short (< 8 chars)
        StudentRegisterRequest r3 = createValidRequest();
        r3.setPassword("W1@a");
        assertFalse(validator.validate(r3).isEmpty());

        // Missing uppercase
        StudentRegisterRequest r4 = createValidRequest();
        r4.setPassword("weakpass123@");
        assertFalse(validator.validate(r4).isEmpty());
    }

    @Test
    void studentRegisterRequest_rejectsPasswordContainingEmail() {
        StudentRegisterRequest r = createValidRequest();
        r.setEmail("janak@vidyapith.org");
        r.setPassword("janak@vidyapith.org123!A");

        Set<ConstraintViolation<StudentRegisterRequest>> violations = validator.validate(r);
        boolean hasPasswordEmailViolation = violations.stream()
                .anyMatch(v -> v.getMessage().contains("Password must not contain the email address"));
        assertTrue(hasPasswordEmailViolation, "Should violate password containing email rule");
    }

    @Test
    void studentRegisterRequest_rejectsInvalidPhoneAndFullName() {
        StudentRegisterRequest r = createValidRequest();
        r.setPhone("12345"); // Invalid phone length
        r.setFullName("User 123"); // Numbers not allowed in name

        Set<ConstraintViolation<StudentRegisterRequest>> violations = validator.validate(r);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("phone")));
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("fullName")));
    }

    private StudentRegisterRequest createValidRequest() {
        StudentRegisterRequest request = new StudentRegisterRequest();
        request.setEmail("valid.student@gujaratvidyapith.org");
        request.setPersonalEmail("valid.student@gmail.com");
        request.setFullName("Valid Student");
        request.setPhone("9876543210");
        request.setCourse("MCA");
        request.setPassword("SecureP@ssw0rd2026");
        request.setEnrollmentNumber("GVP-2026-001");
        return request;
    }
}
