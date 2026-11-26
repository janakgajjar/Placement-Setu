package com.placementsetu.demo;

import com.placementsetu.application.entity.Application;
import com.placementsetu.application.entity.ApplicationStatusHistory;
import com.placementsetu.application.repository.ApplicationRepository;
import com.placementsetu.application.repository.ApplicationStatusHistoryRepository;
import com.placementsetu.common.enums.*;
import com.placementsetu.company.entity.Company;
import com.placementsetu.company.repository.CompanyRepository;
import com.placementsetu.placement.entity.DriveSkill;
import com.placementsetu.placement.entity.DriveSkillId;
import com.placementsetu.placement.entity.PlacementDrive;
import com.placementsetu.placement.repository.DriveSkillRepository;
import com.placementsetu.placement.repository.PlacementDriveRepository;
import com.placementsetu.resume.entity.Resume;
import com.placementsetu.resume.repository.ResumeRepository;
import com.placementsetu.student.entity.*;
import com.placementsetu.student.repository.*;
import com.placementsetu.user.entity.User;
import com.placementsetu.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * High-fidelity demo data seeder activated strictly under the "demo" Spring profile.
 * Prepares the entire application for live HOD / Dean presentations with:
 * - 1 Placement Officer
 * - 2 Active Companies with rich recruiter profiles
 * - 5 Students with varied skill portfolios (Java/Spring, React, Python/ML, General, and 1 blank for live KYC demo)
 * - 6 Placement Drives across DRAFT, PENDING_APPROVAL, PUBLISHED, REJECTED, and CLOSED statuses
 * - Multi-stage candidate application pipeline (APPLIED, UNDER_REVIEW, SHORTLISTED, INTERVIEW_SCHEDULED, SELECTED)
 *
 * Idempotent: Can be executed repeatedly without duplicating records or corrupting database constraints.
 */
@Slf4j
@Component
@Profile("demo")
@RequiredArgsConstructor
public class DemoDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SkillRepository skillRepository;
    private final StudentSkillRepository studentSkillRepository;
    private final ProjectRepository projectRepository;
    private final CertificationRepository certificationRepository;
    private final PlacementDriveRepository placementDriveRepository;
    private final DriveSkillRepository driveSkillRepository;
    private final ApplicationRepository applicationRepository;
    private final ApplicationStatusHistoryRepository statusHistoryRepository;
    private final ResumeRepository resumeRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.demo.default-password:Demo@12345}")
    private String demoPassword;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("====================================================================");
        log.info("  [DEMO_SEED] Initializing Gujarat Vidyapith Placement-Setu Demo Data");
        log.info("====================================================================");

        if (userRepository.findByEmailIgnoreCase("officer@vidyapith.edu").isPresent()) {
            log.info("[DEMO_SEED] Demo officer (officer@vidyapith.edu) already exists. Skipping duplicate seeding.");
            return;
        }

        String encodedPassword = passwordEncoder.encode(demoPassword);

        // 1. Placement Officer
        User officerUser = seedOfficer(encodedPassword);

        // 2. Companies & Profiles
        Map<String, Company> companies = seedCompanies(encodedPassword);

        // 3. Baseline Skills Catalogue
        Map<String, Skill> skills = seedSkills();

        // 4. Students, Profiles, Skills, Projects, Certifications
        Map<String, StudentProfile> students = seedStudents(encodedPassword, skills, officerUser.getId());

        // 5. Placement Drives & Drive Skills
        Map<String, PlacementDrive> drives = seedDrives(companies, skills, officerUser.getId());

        // 6. Applications across Pipeline Stages
        seedApplications(students, drives, officerUser.getId());

        log.info("====================================================================");
        log.info("  [DEMO_SEED] Demo environment successfully initialized!");
        log.info("  Universal Demo Password: {}", demoPassword);
        log.info("  Officer: officer@vidyapith.edu");
        log.info("  Companies: tcs@recruiter.com, infosys@recruiter.com");
        log.info("  Students: student1@vidyapith.edu ... student5@vidyapith.edu");
        log.info("====================================================================");
    }

    private User seedOfficer(String encodedPassword) {
        User officer = User.builder()
                .email("officer@vidyapith.edu")
                .passwordHash(encodedPassword)
                .role(UserRole.PLACEMENT_OFFICER)
                .accountStatus(AccountStatus.ACTIVE)
                .mustChangePassword(false)
                .emailVerified(true)
                .failedAttemptCount(0)
                .build();
        officer = userRepository.save(officer);
        log.info("[DEMO_SEED] Created Placement Officer: officer@vidyapith.edu");
        return officer;
    }

    private Map<String, Company> seedCompanies(String encodedPassword) {
        Map<String, Company> map = new HashMap<>();

        // Company 1: Tata Consultancy Services
        User tcsUser = User.builder()
                .email("tcs@recruiter.com")
                .passwordHash(encodedPassword)
                .role(UserRole.COMPANY)
                .accountStatus(AccountStatus.ACTIVE)
                .mustChangePassword(false)
                .emailVerified(true)
                .failedAttemptCount(0)
                .build();
        tcsUser = userRepository.save(tcsUser);

        Company tcs = Company.builder()
                .userId(tcsUser.getId())
                .companyName("Tata Consultancy Services")
                .contactPerson("Rajesh Mehta (Senior Lead Recruiter)")
                .gstin("24AAACT1234A1Z5")
                .phone("9825012345")
                .website("https://www.tcs.com")
                .address("Infocity, Tower 1, Gandhinagar, Gujarat 382007")
                .build();
        tcs = companyRepository.save(tcs);
        map.put("TCS", tcs);
        log.info("[DEMO_SEED] Created Company: TCS (tcs@recruiter.com)");

        // Company 2: Infosys Limited
        User infyUser = User.builder()
                .email("infosys@recruiter.com")
                .passwordHash(encodedPassword)
                .role(UserRole.COMPANY)
                .accountStatus(AccountStatus.ACTIVE)
                .mustChangePassword(false)
                .emailVerified(true)
                .failedAttemptCount(0)
                .build();
        infyUser = userRepository.save(infyUser);

        Company infosys = Company.builder()
                .userId(infyUser.getId())
                .companyName("Infosys Limited")
                .contactPerson("Priya Nair (Talent Acquisition Specialist)")
                .gstin("24AAACI5678B1Z2")
                .phone("9825098765")
                .website("https://www.infosys.com")
                .address("GIFT City Tech Park, Tower B, Gandhinagar, Gujarat 382355")
                .build();
        infosys = companyRepository.save(infosys);
        map.put("INFOSYS", infosys);
        log.info("[DEMO_SEED] Created Company: Infosys (infosys@recruiter.com)");

        return map;
    }

    private Map<String, Skill> seedSkills() {
        List<String> skillNames = List.of(
                "Java", "Spring Boot", "React", "Python", "SQL", "PostgreSQL",
                "JavaScript", "TypeScript", "HTML", "CSS", "Docker", "AWS",
                "Git", "MySQL", "MongoDB", "C++", "C", "Node.js", "REST APIs",
                "Machine Learning", "Kubernetes", "Tailwind CSS"
        );

        Map<String, Skill> skillMap = new HashMap<>();
        for (String name : skillNames) {
            Skill skill = skillRepository.findByNameIgnoreCase(name)
                    .orElseGet(() -> skillRepository.save(Skill.builder().name(name).build()));
            skillMap.put(name.toLowerCase(), skill);
        }
        return skillMap;
    }

    private Map<String, StudentProfile> seedStudents(String encodedPassword, Map<String, Skill> skillMap, UUID officerId) {
        Map<String, StudentProfile> studentMap = new HashMap<>();

        // Student 1: Aarav Patel (Backend Java Specialist)
        StudentProfile s1 = createStudent(
                "student1@vidyapith.edu",
                "Aarav Patel",
                "9876543201",
                "APPAR-2026-001",
                "Master of Computer Applications (MCA)",
                "Gujarat Vidyapith, Ahmedabad",
                (short) 2026,
                new BigDecimal("8.85"),
                0,
                "https://linkedin.com/in/aarav-patel-demo",
                "https://github.com/aarav-patel",
                encodedPassword,
                ProfileStatus.COMPLETE,
                ProfileApprovalStatus.APPROVED,
                officerId,
                false
        );
        attachSkills(s1, skillMap, List.of("Java", "Spring Boot", "PostgreSQL", "REST APIs", "Docker", "Git"));
        createProject(s1, "Placement-Setu Campus Monolith", "Architected campus placement system with Spring Boot 3.2, JWT auth, and Flyway.", "https://github.com/aarav-patel/setu");
        createProject(s1, "Hospital Queue Microservice", "Docker-based outpatient appointment booking engine with PostgreSQL.", "https://github.com/aarav-patel/queue-service");
        createCertification(s1, "Oracle Certified Professional: Java SE 17", "Oracle", LocalDate.of(2024, 2, 15), "https://oracle.com/cert/12345");
        attachMockResume(s1, "aarav_patel_resume.pdf");
        studentMap.put("student1", s1);

        // Student 2: Diya Shah (Frontend / Full Stack React Specialist)
        StudentProfile s2 = createStudent(
                "student2@vidyapith.edu",
                "Diya Shah",
                "9876543202",
                "APPAR-2026-002",
                "Master of Computer Applications (MCA)",
                "Gujarat Vidyapith, Ahmedabad",
                (short) 2026,
                new BigDecimal("8.50"),
                0,
                "https://linkedin.com/in/diya-shah-demo",
                "https://github.com/diya-shah",
                encodedPassword,
                ProfileStatus.COMPLETE,
                ProfileApprovalStatus.APPROVED,
                officerId,
                false
        );
        attachSkills(s2, skillMap, List.of("React", "JavaScript", "TypeScript", "Node.js", "HTML", "CSS", "Tailwind CSS"));
        createProject(s2, "Institutional Design System", "Component library built with React 18, Vite, and accessible Tailwind tokens.", "https://github.com/diya-shah/gv-ui");
        createProject(s2, "E-Commerce Progressive Web App", "Online retail storefront with offline caching and state management.", "https://github.com/diya-shah/ecommerce-pwa");
        createCertification(s2, "Meta Certified Front-End Developer", "Meta", LocalDate.of(2024, 4, 10), "https://coursera.org/verify/meta-front-end");
        attachMockResume(s2, "diya_shah_resume.pdf");
        studentMap.put("student2", s2);

        // Student 3: Rohan Joshi (Python / Machine Learning Specialist - placed/locked via TCS_JAVA)
        StudentProfile s3 = createStudent(
                "student3@vidyapith.edu",
                "Rohan Joshi",
                "9876543203",
                "APPAR-2026-003",
                "M.Sc. Information Technology",
                "Gujarat Vidyapith, Ahmedabad",
                (short) 2026,
                new BigDecimal("8.20"),
                0,
                "https://linkedin.com/in/rohan-joshi-demo",
                "https://github.com/rohan-joshi",
                encodedPassword,
                ProfileStatus.COMPLETE,
                ProfileApprovalStatus.APPROVED,
                officerId,
                true
        );
        attachSkills(s3, skillMap, List.of("Python", "Machine Learning", "SQL", "PostgreSQL", "REST APIs"));
        createProject(s3, "Resume Entity Extraction AI", "NLP pipeline automatically extracting applicant skills and project history.", "https://github.com/rohan-joshi/resume-ai");
        createProject(s3, "Campus Placement Predictive Model", "Ensemble model analyzing student readiness against job requisitions.", "https://github.com/rohan-joshi/placement-predictor");
        createCertification(s3, "IBM Certified AI Specialist", "IBM", LocalDate.of(2024, 1, 20), "https://ibm.com/verify/ai-cert");
        attachMockResume(s3, "rohan_joshi_resume.pdf");
        studentMap.put("student3", s3);

        // Student 4: Neha Desai (BCA Graduate with 1 backlog, SUBMITTED for officer review)
        StudentProfile s4 = createStudent(
                "student4@vidyapith.edu",
                "Neha Desai",
                "9876543204",
                "APPAR-2026-004",
                "Bachelor of Computer Applications (BCA)",
                "Gujarat Vidyapith, Ahmedabad",
                (short) 2026,
                new BigDecimal("7.60"),
                1,
                "https://linkedin.com/in/neha-desai-demo",
                "https://github.com/neha-desai",
                encodedPassword,
                ProfileStatus.COMPLETE,
                ProfileApprovalStatus.SUBMITTED,
                null,
                false
        );
        attachSkills(s4, skillMap, List.of("Java", "SQL", "HTML", "CSS", "Git"));
        createProject(s4, "Biometric Student Attendance App", "Desktop & web attendance dashboard for faculty and staff.", "https://github.com/neha-desai/attendance");
        createCertification(s4, "Responsive Web Design Certification", "freeCodeCamp", LocalDate.of(2023, 11, 12), "https://freecodecamp.org/certification/neha/responsive-web-design");
        attachMockResume(s4, "neha_desai_resume.pdf");
        studentMap.put("student4", s4);

        // Student 5: Kavya Trivedi (Fresh Profile - NO RESUME, NO APPLICATIONS for Live KYC Demo!)
        StudentProfile s5 = createStudent(
                "student5@vidyapith.edu",
                "Kavya Trivedi",
                "9876543205",
                null, // ApparId left blank for live resume parsing
                "Master of Computer Applications (MCA)",
                "Gujarat Vidyapith, Ahmedabad",
                (short) 2026,
                new BigDecimal("9.10"),
                0,
                null, // LinkedIn left blank for live resume parsing
                null, // GitHub left blank for live resume parsing
                encodedPassword,
                ProfileStatus.INCOMPLETE, // Initial state for live demo
                ProfileApprovalStatus.DRAFT,
                null,
                false
        );
        // NO resume and NO applications attached intentionally!
        studentMap.put("student5", s5);

        log.info("[DEMO_SEED] Created 5 Students (student1..student3 approved; student4 submitted; student5 draft)");
        return studentMap;
    }

    private StudentProfile createStudent(
            String email, String fullName, String phone, String apparId,
            String course, String institution, Short gradYear, BigDecimal cgpa,
            Integer backlogs, String linkedin, String github, String encodedPassword,
            ProfileStatus status, ProfileApprovalStatus approvalStatus, UUID reviewedBy, boolean placementLocked) {

        User user = User.builder()
                .email(email)
                .passwordHash(encodedPassword)
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .mustChangePassword(false)
                .emailVerified(true)
                .failedAttemptCount(0)
                .build();
        user = userRepository.save(user);

        StudentProfile profile = StudentProfile.builder()
                .userId(user.getId())
                .fullName(fullName)
                .phone(phone)
                .apparId(apparId)
                .course(course)
                .institution(institution)
                .graduationYear(gradYear)
                .cgpa(cgpa)
                .backlogs(backlogs)
                .dateOfBirth(LocalDate.of(2002, 5, 15))
                .address("Gujarat Vidyapith Ashram Road, Ahmedabad - 380014")
                .linkedinUrl(linkedin)
                .githubUrl(github)
                .gender("Unspecified")
                .profileStatus(status)
                .approvalStatus(approvalStatus)
                .reviewedBy(reviewedBy)
                .reviewedAt(reviewedBy != null ? LocalDateTime.now().minusDays(2) : null)
                .placementLocked(placementLocked)
                .build();
        return studentProfileRepository.save(profile);
    }

    private void attachSkills(StudentProfile profile, Map<String, Skill> skillMap, List<String> skillNames) {
        for (String name : skillNames) {
            Skill skill = skillMap.get(name.toLowerCase());
            if (skill != null) {
                studentSkillRepository.save(new StudentSkill(profile, skill));
            }
        }
    }

    private void createProject(StudentProfile profile, String title, String desc, String url) {
        projectRepository.save(Project.builder()
                .studentProfileId(profile.getId())
                .title(title)
                .description(desc)
                .projectUrl(url)
                .build());
    }

    private void createCertification(StudentProfile profile, String name, String org, LocalDate date, String url) {
        certificationRepository.save(Certification.builder()
                .studentProfileId(profile.getId())
                .name(name)
                .issuingOrganization(org)
                .issueDate(date)
                .credentialUrl(url)
                .build());
    }

    private void attachMockResume(StudentProfile profile, String fileName) {
        resumeRepository.save(Resume.builder()
                .studentProfileId(profile.getId())
                .fileName(fileName)
                .fileType("application/pdf")
                .fileSize(245760L)
                .storageKey("demo/resumes/" + profile.getId() + "_" + fileName)
                .processingStatus(ResumeProcessingStatus.COMPLETED)
                .build());
    }

    private Map<String, PlacementDrive> seedDrives(Map<String, Company> companies, Map<String, Skill> skills, UUID officerId) {
        Map<String, PlacementDrive> map = new HashMap<>();
        Company tcs = companies.get("TCS");
        Company infosys = companies.get("INFOSYS");

        // Drive 1: TCS - Software Engineer (Java Backend) [PUBLISHED]
        PlacementDrive drive1 = PlacementDrive.builder()
                .companyId(tcs.getId())
                .jobTitle("Software Engineer - Java Backend")
                .description("Join TCS Digital Center of Excellence building distributed enterprise services in Java, Spring Boot, and PostgreSQL.")
                .location("Gandhinagar / Ahmedabad")
                .ctc(new BigDecimal("700000.00"))
                .vacancies(15)
                .minimumCgpa(new BigDecimal("7.00"))
                .maximumBacklogs(1)
                .requiredCourse("Master of Computer Applications (MCA)")
                .graduationYear((short) 2026)
                .registrationStart(LocalDateTime.now().minusDays(5))
                .registrationEnd(LocalDateTime.now().plusDays(20))
                .driveType("FULL_TIME")
                .status(DriveStatus.PUBLISHED)
                .submittedAt(LocalDateTime.now().minusDays(6))
                .reviewRemarks("Approved for MCA 2026 batch.")
                .reviewedBy(officerId)
                .reviewedAt(LocalDateTime.now().minusDays(5))
                .build();
        drive1 = placementDriveRepository.save(drive1);
        attachDriveSkills(drive1, skills, List.of("Java", "Spring Boot", "PostgreSQL", "REST APIs"));
        map.put("TCS_JAVA", drive1);
        log.info("[DEMO_SEED] Created Drive 1: TCS Java Backend [PUBLISHED]");

        // Drive 2: Infosys - Systems Associate (Full Stack React & Node) [PUBLISHED]
        PlacementDrive drive2 = PlacementDrive.builder()
                .companyId(infosys.getId())
                .jobTitle("Systems Associate - Full Stack Web")
                .description("Engineer client-side architectures, real-time UI components, and REST services using React, TypeScript, and Node.js.")
                .location("GIFT City, Gandhinagar")
                .ctc(new BigDecimal("650000.00"))
                .vacancies(20)
                .minimumCgpa(new BigDecimal("7.50"))
                .maximumBacklogs(0)
                .requiredCourse("Master of Computer Applications (MCA)")
                .graduationYear((short) 2026)
                .registrationStart(LocalDateTime.now().minusDays(3))
                .registrationEnd(LocalDateTime.now().plusDays(25))
                .driveType("FULL_TIME")
                .status(DriveStatus.PUBLISHED)
                .submittedAt(LocalDateTime.now().minusDays(4))
                .reviewRemarks("Approved — aligned with curriculum.")
                .reviewedBy(officerId)
                .reviewedAt(LocalDateTime.now().minusDays(3))
                .build();
        drive2 = placementDriveRepository.save(drive2);
        attachDriveSkills(drive2, skills, List.of("React", "JavaScript", "Node.js", "SQL"));
        map.put("INFY_FULLSTACK", drive2);
        log.info("[DEMO_SEED] Created Drive 2: Infosys Full Stack [PUBLISHED]");

        // Drive 3: TCS - Data Analyst & AI Intern [CLOSED]
        PlacementDrive drive3 = PlacementDrive.builder()
                .companyId(tcs.getId())
                .jobTitle("Data Analyst & AI Intern")
                .description("Explore data analytics and machine learning model validation for automated financial document processing.")
                .location("Ahmedabad")
                .ctc(new BigDecimal("500000.00"))
                .stipend(new BigDecimal("25000.00"))
                .vacancies(8)
                .minimumCgpa(new BigDecimal("7.50"))
                .maximumBacklogs(0)
                .requiredCourse("M.Sc. Information Technology")
                .graduationYear((short) 2026)
                .registrationStart(LocalDateTime.now().minusDays(20))
                .registrationEnd(LocalDateTime.now().minusDays(2))
                .driveType("PAID_INTERNSHIP")
                .status(DriveStatus.CLOSED)
                .submittedAt(LocalDateTime.now().minusDays(22))
                .reviewRemarks("Approved paid internship drive.")
                .reviewedBy(officerId)
                .reviewedAt(LocalDateTime.now().minusDays(21))
                .build();
        drive3 = placementDriveRepository.save(drive3);
        attachDriveSkills(drive3, skills, List.of("Python", "Machine Learning", "SQL"));
        map.put("TCS_AI", drive3);
        log.info("[DEMO_SEED] Created Drive 3: TCS AI Intern [CLOSED]");

        // Drive 4: Infosys - Cloud & DevOps Specialist [DRAFT for Company Edit Demo]
        PlacementDrive drive4 = PlacementDrive.builder()
                .companyId(infosys.getId())
                .jobTitle("Associate Cloud & DevOps Engineer")
                .description("Manage automated deployment pipelines, container orchestration, and cloud infrastructure monitoring.")
                .location("Bengaluru / Pune")
                .ctc(new BigDecimal("800000.00"))
                .vacancies(5)
                .minimumCgpa(new BigDecimal("8.00"))
                .maximumBacklogs(0)
                .requiredCourse("Master of Computer Applications (MCA)")
                .graduationYear((short) 2026)
                .registrationStart(LocalDateTime.now())
                .registrationEnd(LocalDateTime.now().plusDays(30))
                .driveType("FULL_TIME")
                .status(DriveStatus.DRAFT) // Draft status
                .build();
        drive4 = placementDriveRepository.save(drive4);
        attachDriveSkills(drive4, skills, List.of("Docker", "Kubernetes", "AWS"));
        map.put("INFY_CLOUD", drive4);
        log.info("[DEMO_SEED] Created Drive 4: Infosys Cloud Engineer [DRAFT]");

        // Drive 5: TCS - Cyber Security Analyst [PENDING_APPROVAL]
        PlacementDrive drive5 = PlacementDrive.builder()
                .companyId(tcs.getId())
                .jobTitle("Cyber Security Analyst")
                .description("Application security testing, vulnerability assessment, and SOC monitoring.")
                .location("Gandhinagar")
                .ctc(new BigDecimal("720000.00"))
                .vacancies(6)
                .minimumCgpa(new BigDecimal("7.00"))
                .maximumBacklogs(0)
                .requiredCourse("Master of Computer Applications (MCA)")
                .graduationYear((short) 2026)
                .registrationStart(LocalDateTime.now().plusDays(1))
                .registrationEnd(LocalDateTime.now().plusDays(25))
                .driveType("FULL_TIME")
                .status(DriveStatus.PENDING_APPROVAL)
                .submittedAt(LocalDateTime.now().minusHours(6))
                .build();
        drive5 = placementDriveRepository.save(drive5);
        attachDriveSkills(drive5, skills, List.of("Python", "REST APIs"));
        map.put("TCS_SEC", drive5);
        log.info("[DEMO_SEED] Created Drive 5: TCS Cyber Security Analyst [PENDING_APPROVAL]");

        // Drive 6: Infosys - QA Automation Engineer [REJECTED]
        PlacementDrive drive6 = PlacementDrive.builder()
                .companyId(infosys.getId())
                .jobTitle("QA Automation Engineer")
                .description("Automated regression testing for enterprise web applications.")
                .location("Pune")
                .ctc(new BigDecimal("550000.00"))
                .vacancies(10)
                .minimumCgpa(new BigDecimal("6.50"))
                .maximumBacklogs(1)
                .requiredCourse("B.Tech Mechanical Engineering")
                .graduationYear((short) 2026)
                .registrationStart(LocalDateTime.now().plusDays(2))
                .registrationEnd(LocalDateTime.now().plusDays(20))
                .driveType("FULL_TIME")
                .status(DriveStatus.REJECTED)
                .submittedAt(LocalDateTime.now().minusDays(2))
                .reviewRemarks("Required course B.Tech Mechanical Engineering is not offered at our institution. Please update to MCA / M.Sc. IT.")
                .rejectionReason("Required course B.Tech Mechanical Engineering is not offered at our institution. Please update to MCA / M.Sc. IT.")
                .reviewedBy(officerId)
                .reviewedAt(LocalDateTime.now().minusDays(1))
                .build();
        drive6 = placementDriveRepository.save(drive6);
        attachDriveSkills(drive6, skills, List.of("Java", "SQL"));
        map.put("INFY_QA", drive6);
        log.info("[DEMO_SEED] Created Drive 6: Infosys QA Automation Engineer [REJECTED]");

        return map;
    }

    private void attachDriveSkills(PlacementDrive drive, Map<String, Skill> skills, List<String> skillNames) {
        for (String name : skillNames) {
            Skill skill = skills.get(name.toLowerCase());
            if (skill != null) {
                driveSkillRepository.save(new DriveSkill(new DriveSkillId(drive.getId(), skill.getId())));
            }
        }
    }

    private void seedApplications(
            Map<String, StudentProfile> students,
            Map<String, PlacementDrive> drives,
            UUID officerUserId) {

        StudentProfile s1 = students.get("student1");
        StudentProfile s2 = students.get("student2");
        StudentProfile s3 = students.get("student3");
        StudentProfile s4 = students.get("student4");
        // s5 intentionally left with 0 applications!

        PlacementDrive tcsJava = drives.get("TCS_JAVA");
        PlacementDrive infyFullstack = drives.get("INFY_FULLSTACK");

        // 1. Student 1 -> TCS Java Backend: SHORTLISTED
        createApplication(s1, tcsJava, ApplicationStatus.SHORTLISTED, "Shortlisted based on high skill match (100%) and 8.85 CGPA.", officerUserId);

        // 2. Student 1 -> Infosys Full Stack: APPLIED
        createApplication(s1, infyFullstack, ApplicationStatus.APPLIED, "Initial application submitted.", null);

        // 3. Student 2 -> Infosys Full Stack: INTERVIEW_SCHEDULED
        createApplication(s2, infyFullstack, ApplicationStatus.INTERVIEW_SCHEDULED, "Technical round 1 scheduled for next Tuesday at 10:30 AM.", officerUserId);

        // 4. Student 2 -> TCS Java Backend: UNDER_REVIEW
        createApplication(s2, tcsJava, ApplicationStatus.UNDER_REVIEW, "Profile undergoing recruiter preliminary screening.", officerUserId);

        // 5. Student 3 -> TCS Java Backend: SELECTED (Offer Extended!)
        createApplication(s3, tcsJava, ApplicationStatus.SELECTED, "Candidate cleared final executive interview round and offered position.", officerUserId);

        // 6. Student 4 -> TCS Java Backend: APPLIED
        createApplication(s4, tcsJava, ApplicationStatus.APPLIED, "Application received.", null);

        log.info("[DEMO_SEED] Created applications across APPLIED, UNDER_REVIEW, SHORTLISTED, INTERVIEW_SCHEDULED, and SELECTED");
    }

    private void createApplication(
            StudentProfile profile,
            PlacementDrive drive,
            ApplicationStatus status,
            String remarks,
            UUID changedBy) {

        Application app = Application.builder()
                .studentProfileId(profile.getId())
                .placementDriveId(drive.getId())
                .status(status)
                .appliedAt(LocalDateTime.now().minusDays(3))
                .build();
        app = applicationRepository.save(app);

        // Audit Trail entry
        statusHistoryRepository.save(ApplicationStatusHistory.builder()
                .applicationId(app.getId())
                .changedByUserId(changedBy)
                .fromStatus(status == ApplicationStatus.APPLIED ? null : "APPLIED")
                .toStatus(status.name())
                .remarks(remarks)
                .build());
    }
}
