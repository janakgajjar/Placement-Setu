package com.placementsetu.notification.service;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * Deterministic HTML and Plain-Text email template rendering.
 * All dynamic parameters are escaped with HtmlUtils.htmlEscape to eliminate HTML injection.
 */
@Service
public class EmailTemplateService {

    @Value("${app.mail.app-base-url:http://localhost:5173}")
    private String appBaseUrl;

    @Value("${app.mail.from:noreply@placementsetu.gujaratvidyapith.edu}")
    private String supportEmail;

    @Getter
    @AllArgsConstructor
    public static class RenderedEmail {
        private final String subject;
        private final String textBody;
        private final String htmlBody;
    }

    public RenderedEmail renderCompanyApproved(String companyName, String recipientName) {
        String safeCompany = escape(companyName);
        String safeName = escape(recipientName != null ? recipientName : "Placement Partner");
        String subject = "[Placement Setu] Company Account Approved - " + companyName;
        String actionUrl = appBaseUrl + "/login";

        String text = "Dear " + safeName + ",\n\n"
                + "We are pleased to inform you that the onboarding request for " + companyName + " has been approved by the Placement Cell at Gujarat Vidyapith.\n\n"
                + "You can now log in to the Placement Setu portal and publish placement drives, manage eligibility, and review student applications:\n"
                + actionUrl + "\n\n"
                + "Regards,\nPlacement Cell, Gujarat Vidyapith\nPlacement Setu Automated Notification";

        String bodyHtml = "<p>Dear <strong>" + safeName + "</strong>,</p>"
                + "<p>We are pleased to inform you that your company profile for <strong>" + safeCompany + "</strong> has been verified and approved by the Placement Cell at Gujarat Vidyapith.</p>"
                + "<p>You now have full access to create placement drives, define eligibility criteria, and evaluate registered students.</p>";

        return new RenderedEmail(subject, text, buildHtmlWrapper(subject, bodyHtml, "Access Placement Portal", actionUrl));
    }

    public RenderedEmail renderCompanyRejected(String companyName, String recipientName, String reason) {
        String safeCompany = escape(companyName);
        String safeName = escape(recipientName != null ? recipientName : "Applicant");
        String safeReason = escape(reason != null && !reason.isBlank() ? reason : "Information provided does not meet our verification criteria.");
        String subject = "[Placement Setu] Company Registration Update - " + companyName;

        String text = "Dear " + safeName + ",\n\n"
                + "Thank you for your interest in partnering with Gujarat Vidyapith. Following a review of the company onboarding submission for " + companyName + ", the Placement Cell was unable to approve the registration at this time.\n\n"
                + "Reason noted: " + safeReason + "\n\n"
                + "If you have questions or wish to provide updated documentation, please contact the Placement Cell.\n\n"
                + "Regards,\nPlacement Cell, Gujarat Vidyapith\nPlacement Setu Automated Notification";

        String bodyHtml = "<p>Dear <strong>" + safeName + "</strong>,</p>"
                + "<p>Thank you for your interest in partnering with Gujarat Vidyapith. After reviewing the registration details for <strong>" + safeCompany + "</strong>, the Placement Cell was unable to approve the account at this time.</p>"
                + "<div style=\"background:#fff2f0;border-left:4px solid #ff4d4f;padding:12px 16px;margin:16px 0;border-radius:4px;\">"
                + "<strong>Reviewer Notes:</strong><br/>" + safeReason + "</div>"
                + "<p>If you believe this is in error or wish to submit updated verification documents, please reach out to the Placement Cell.</p>";

        return new RenderedEmail(subject, text, buildHtmlWrapper(subject, bodyHtml, null, null));
    }

    public RenderedEmail renderCompanySubmitted(String companyName, String officerName) {
        String safeCompany = escape(companyName);
        String safeOfficer = escape(officerName != null ? officerName : "Placement Officer");
        String subject = "[Placement Setu Action Required] New Company Registration - " + companyName;
        String actionUrl = appBaseUrl + "/admin/companies";

        String text = "Dear " + safeOfficer + ",\n\n"
                + "A new company, " + companyName + ", has submitted an onboarding request on Placement Setu and is awaiting administrative review.\n\n"
                + "Please review their credentials and approve or reject the request via the dashboard:\n"
                + actionUrl + "\n\n"
                + "Regards,\nPlacement Setu Automated Notification System";

        String bodyHtml = "<p>Dear <strong>" + safeOfficer + "</strong>,</p>"
                + "<p>A new recruiter, <strong>" + safeCompany + "</strong>, has registered on Placement Setu and submitted their company profile for review.</p>"
                + "<p>Please inspect their company credentials, domain verification, and contact information to authorize portal access.</p>";

        return new RenderedEmail(subject, text, buildHtmlWrapper(subject, bodyHtml, "Review Company Profile", actionUrl));
    }

    public RenderedEmail renderResumeProcessed(String studentName, boolean hasMissingFields) {
        String safeStudent = escape(studentName != null ? studentName : "Student");
        String subject = "[Placement Setu] Resume Processing Completed";
        String actionUrl = appBaseUrl + "/student/profile";

        String text = "Dear " + safeStudent + ",\n\n"
                + "Your resume has been processed by the automated parser.\n"
                + (hasMissingFields
                    ? "Some required academic or personal fields could not be extracted automatically. Please visit your profile to review and complete the missing information.\n"
                    : "Extracted information has been populated into your student profile. Please review and verify accuracy.\n")
                + "\nView Profile: " + actionUrl + "\n\n"
                + "Regards,\nPlacement Cell, Gujarat Vidyapith";

        String bodyHtml = "<p>Dear <strong>" + safeStudent + "</strong>,</p>"
                + "<p>Your uploaded resume has been analyzed by the placement parser.</p>"
                + (hasMissingFields
                    ? "<div style=\"background:#fffbe6;border-left:4px solid #faad14;padding:12px 16px;margin:16px 0;border-radius:4px;\">"
                      + "<strong>Action Needed:</strong> Certain profile details (such as APAAR ID or specific semester grades) require manual completion before your profile can be submitted for review.</div>"
                    : "<p>Your skills, education, and experience were extracted successfully. Please inspect your profile to confirm everything is accurate.</p>")
                + "<p>Keeping your profile complete and accurate ensures you match with campus placement opportunities.</p>";

        return new RenderedEmail(subject, text, buildHtmlWrapper(subject, bodyHtml, "Review Student Profile", actionUrl));
    }

    public RenderedEmail renderResumeFailed(String studentName, String failureReason) {
        String safeStudent = escape(studentName != null ? studentName : "Student");
        String safeReason = escape(failureReason != null ? failureReason : "Could not read text content from the uploaded file.");
        String subject = "[Placement Setu] Resume Processing Notice";
        String actionUrl = appBaseUrl + "/student/resume";

        String text = "Dear " + safeStudent + ",\n\n"
                + "We encountered an issue while processing your uploaded resume.\n"
                + "Issue details: " + safeReason + "\n\n"
                + "Please ensure your document is a valid, readable PDF or DOCX file (under 10MB) and try uploading again:\n"
                + actionUrl + "\n\n"
                + "Regards,\nPlacement Cell, Gujarat Vidyapith";

        String bodyHtml = "<p>Dear <strong>" + safeStudent + "</strong>,</p>"
                + "<p>We were unable to complete automated processing for your uploaded resume file.</p>"
                + "<div style=\"background:#fff2f0;border-left:4px solid #ff4d4f;padding:12px 16px;margin:16px 0;border-radius:4px;\">"
                + "<strong>Error Details:</strong><br/>" + safeReason + "</div>"
                + "<p>Please ensure your file is text-based (not a scanned image without OCR), formatted as .pdf or .docx, and does not exceed 10MB.</p>";

        return new RenderedEmail(subject, text, buildHtmlWrapper(subject, bodyHtml, "Re-upload Resume", actionUrl));
    }

    public RenderedEmail renderDrivePublished(String driveTitle, String companyName, String recipientName) {
        String safeDrive = escape(driveTitle);
        String safeCompany = escape(companyName);
        String safeRecipient = escape(recipientName != null ? recipientName : "Student");
        String subject = "[Placement Setu] New Placement Drive: " + driveTitle + " (" + companyName + ")";
        String actionUrl = appBaseUrl + "/drives";

        String text = "Dear " + safeRecipient + ",\n\n"
                + "A new placement drive has been published on Placement Setu!\n"
                + "Company: " + companyName + "\n"
                + "Drive Title: " + driveTitle + "\n\n"
                + "Check the drive details, eligibility criteria, and application deadlines on the portal:\n"
                + actionUrl + "\n\n"
                + "Regards,\nPlacement Cell, Gujarat Vidyapith";

        String bodyHtml = "<p>Dear <strong>" + safeRecipient + "</strong>,</p>"
                + "<p>A new campus recruitment drive has been announced on Placement Setu:</p>"
                + "<table style=\"width:100%;margin:16px 0;border-collapse:collapse;\">"
                + "<tr><td style=\"padding:8px;border:1px solid #e8e8e8;background:#fafafa;font-weight:600;width:30%;\">Company</td>"
                + "<td style=\"padding:8px;border:1px solid #e8e8e8;\">" + safeCompany + "</td></tr>"
                + "<tr><td style=\"padding:8px;border:1px solid #e8e8e8;background:#fafafa;font-weight:600;\">Drive Title</td>"
                + "<td style=\"padding:8px;border:1px solid #e8e8e8;\">" + safeDrive + "</td></tr>"
                + "</table>"
                + "<p>Visit the drives dashboard to review prerequisites and submit your application before the closing date.</p>";

        return new RenderedEmail(subject, text, buildHtmlWrapper(subject, bodyHtml, "View Placement Drive", actionUrl));
    }

    public RenderedEmail renderDriveClosed(String driveTitle, String companyName, String recipientName) {
        String safeDrive = escape(driveTitle);
        String safeCompany = escape(companyName);
        String safeRecipient = escape(recipientName != null ? recipientName : "Student");
        String subject = "[Placement Setu] Drive Applications Closed: " + driveTitle;
        String actionUrl = appBaseUrl + "/drives";

        String text = "Dear " + safeRecipient + ",\n\n"
                + "Applications for the placement drive '" + driveTitle + "' by " + companyName + " are now closed.\n"
                + "The recruiting team will evaluate candidate submissions and announce next steps shortly.\n\n"
                + actionUrl + "\n\n"
                + "Regards,\nPlacement Cell, Gujarat Vidyapith";

        String bodyHtml = "<p>Dear <strong>" + safeRecipient + "</strong>,</p>"
                + "<p>Applications for the placement drive <strong>" + safeDrive + "</strong> (" + safeCompany + ") have concluded.</p>"
                + "<p>Shortlisted candidates and interview schedules will be updated on the platform once evaluation is complete.</p>";

        return new RenderedEmail(subject, text, buildHtmlWrapper(subject, bodyHtml, "Track Drive Status", actionUrl));
    }

    public RenderedEmail renderSecurityAlert(String recipientName, String alertTitle, String details) {
        String safeName = escape(recipientName != null ? recipientName : "Account Holder");
        String safeAlert = escape(alertTitle);
        String safeDetails = escape(details != null ? details : "A security-sensitive action occurred on your account.");
        String subject = "[Placement Setu Security Alert] " + alertTitle;
        String actionUrl = appBaseUrl + "/login";

        String text = "Dear " + safeName + ",\n\n"
                + "Security Notification: " + alertTitle + "\n"
                + safeDetails + "\n\n"
                + "If you did not initiate this action, please secure your account immediately or notify the Placement Administrator.\n\n"
                + actionUrl + "\n\n"
                + "Regards,\nPlacement Setu Security Team";

        String bodyHtml = "<p>Dear <strong>" + safeName + "</strong>,</p>"
                + "<div style=\"background:#fff2f0;border-left:4px solid #ff4d4f;padding:12px 16px;margin:16px 0;border-radius:4px;\">"
                + "<strong style=\"color:#cf1322;\">" + safeAlert + "</strong><br/>"
                + "<p style=\"margin:8px 0 0 0;\">" + safeDetails + "</p>"
                + "</div>"
                + "<p>If you did not perform this activity, please change your credentials immediately or contact the system administrator.</p>";

        return new RenderedEmail(subject, text, buildHtmlWrapper(subject, bodyHtml, "Review Account Security", actionUrl));
    }

    public RenderedEmail renderGeneral(String recipientName, String subject, String message, String actionPath, String actionButtonText) {
        String safeName = escape(recipientName != null ? recipientName : "Placement Setu User");
        String safeSubject = escape(subject);
        String safeMessage = escape(message);
        String actionUrl = actionPath != null ? (actionPath.startsWith("http") ? actionPath : appBaseUrl + actionPath) : null;

        String text = "Dear " + safeName + ",\n\n"
                + subject + "\n\n"
                + message + "\n\n"
                + (actionUrl != null ? "Action: " + actionUrl + "\n\n" : "")
                + "Regards,\nPlacement Cell, Gujarat Vidyapith";

        String bodyHtml = "<p>Dear <strong>" + safeName + "</strong>,</p>"
                + "<p>" + safeMessage + "</p>";

        return new RenderedEmail(subject, text, buildHtmlWrapper(safeSubject, bodyHtml, actionButtonText, actionUrl));
    }

    private String escape(String raw) {
        if (raw == null) return "";
        return HtmlUtils.htmlEscape(raw.trim());
    }

    private String buildHtmlWrapper(String heading, String innerContentHtml, String buttonText, String buttonUrl) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset=\"utf-8\">")
          .append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">")
          .append("<title>").append(escape(heading)).append("</title></head>")
          .append("<body style=\"margin:0;padding:24px;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.6;\">")
          .append("<table align=\"center\" width=\"100%\" style=\"max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);border:1px solid #e2e8f0;border-collapse:collapse;\">")
          // Header
          .append("<tr><td style=\"background:#0f172a;padding:24px 32px;text-align:left;\">")
          .append("<h1 style=\"margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;\">Placement Setu</h1>")
          .append("<div style=\"margin-top:4px;font-size:12px;color:#94a3b8;\">Gujarat Vidyapith Campus Placement Platform</div>")
          .append("</td></tr>")
          // Main Body
          .append("<tr><td style=\"padding:32px;\">")
          .append("<h2 style=\"margin-top:0;font-size:18px;color:#0f172a;font-weight:600;\">").append(escape(heading)).append("</h2>")
          .append(innerContentHtml);

        // Optional CTA Button
        if (buttonText != null && buttonUrl != null) {
            sb.append("<div style=\"margin:32px 0 16px 0;text-align:center;\">")
              .append("<a href=\"").append(escape(buttonUrl)).append("\" style=\"display:inline-block;padding:12px 28px;background-color:#1e40af;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;box-shadow:0 2px 4px rgba(30,64,175,0.25);\">")
              .append(escape(buttonText))
              .append("</a></div>")
              .append("<div style=\"font-size:12px;color:#64748b;word-break:break-all;text-align:center;margin-top:8px;\">")
              .append("Or paste this link into your browser: <br/>").append(escape(buttonUrl))
              .append("</div>");
        }

        // Footer
        sb.append("<hr style=\"border:none;border-top:1px solid #e2e8f0;margin:32px 0 20px 0;\"/>")
          .append("<div style=\"font-size:12px;color:#64748b;text-align:center;\">")
          .append("<p style=\"margin:0 0 4px 0;\">Placement Cell, Gujarat Vidyapith, Ahmedabad, Gujarat</p>")
          .append("<p style=\"margin:0 0 8px 0;\">This is an automated operational notification. For queries, contact: ").append(escape(supportEmail)).append("</p>")
          .append("<p style=\"margin:0;color:#94a3b8;\">&copy; ").append(java.time.Year.now().getValue()).append(" Placement Setu. All rights reserved.</p>")
          .append("</div></td></tr></table></body></html>");

        return sb.toString();
    }
}
