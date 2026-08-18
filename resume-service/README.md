# Resume Upload & Parse Service

A single Spring Boot app: upload a resume, it gets parsed into key-value JSON
and saved to a database.

## What's inside

```
resume-service/
├── pom.xml                     ← Maven dependency list
├── src/main/resources/
│   └── application.properties  ← database + server settings
├── src/main/java/com/placementsetu/resume/
│   ├── ResumeApplication.java  ← starts the app
│   ├── controller/              ← REST API endpoints (the "waiter")
│   ├── service/                 ← business logic (the "chef")
│   ├── repository/              ← talks to the database
│   ├── entity/                  ← database table blueprint
│   ├── dto/                     ← what the API sends back
│   ├── parser/                  ← extracts email/phone/skills from text
│   └── converter/               ← Map <-> JSON string translator
└── frontend/
    └── index.html               ← plain HTML upload form (no build tools)
```

## How to run

You need **Java 17+** and **Maven** installed.

1. Open a terminal in the `resume-service` folder.
2. Start the backend:
   ```
   mvn spring-boot:run
   ```
   Wait until you see `Started ResumeApplication` in the logs. It's running
   on `http://localhost:8080`.
3. Open `frontend/index.html` directly in your browser (double-click it, or
   right-click → Open With → your browser).
4. Pick a `.pdf` or `.txt` resume file, click **Upload & Parse**.
5. You'll see the extracted JSON (name, email, phone, skills) appear on the page.

## Where the data goes

It's saved in an H2 database file at `./data/resumedb` (created automatically
the first time you run the app). To browse it visually:
- Go to `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:file:./data/resumedb`
- Username: `sa`, Password: (leave blank)
- Click Connect, then run: `SELECT * FROM RESUMES;`

You'll see the `PARSED_DATA` column holding your key-value JSON as text.

## What to try next (in order)

1. **Add more fields to the parser** — e.g. extract LinkedIn URL, years of
   experience. This is just adding more regex patterns to `ResumeParser.java`.
2. **Add validation** — reject files over a certain size, or non-PDF/TXT
   files, using `@RequestParam` + a custom check in the controller.
3. **Swap the parser for real AI** — instead of regex, send the resume text
   to Gemini via Spring AI and get back richer, smarter JSON. The rest of
   the app (controller, service, database) doesn't need to change at all —
   that's the whole point of keeping parsing behind its own class.
4. **Split into two services** — once step 3 works, pull the AI parsing out
   into its own Spring Boot app, and have this one call it over HTTP. *Now*
   Service Discovery, Circuit Breakers, and distributed tracing will
   actually mean something, because you'll have a real failure to protect
   against (what happens when the AI service is down or slow?).
