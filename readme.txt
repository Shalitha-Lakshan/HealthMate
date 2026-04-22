HealthMate Deployment Steps (Doctor-Side + Core Dependencies)

Prerequisites:
1. Docker + Docker Compose installed
2. Node.js 20+ (for local test runs)
3. (Optional) Kubernetes cluster + kubectl if deploying k8s manifests

A) Run with Docker Compose
1. Open terminal at project root:
   D:\SLIIT\Y3 S1\DS\Assignment\HealthMate
2. Ensure .env files exist in each backend service folder.
3. Start services:
   docker-compose up -d
4. Verify containers:
   docker-compose ps

B) Run Doctor-Side Test Evidence
1. Appointment service tests:
   cd backend/services/appointment-service
   npm install
   npm test
2. Telemedicine service tests:
   cd ../telemedicine-service
   npm install
   npm test

C) Access URLs (default)
1. Frontend: http://localhost:5173
2. Auth API: http://localhost:5001
3. Doctor API: http://localhost:5003
4. Appointment API: http://localhost:5004
5. Telemedicine API: http://localhost:5007
6. Prescription API: http://localhost:5008

D) Optional Kubernetes Deployment (Doctor Stack)
1. Review and update secret values in:
   backend/infra/k8s/doctor-stack/*.yaml
2. Apply manifests:
   kubectl apply -k ./backend/infra/k8s/doctor-stack
3. Verify:
   kubectl get pods -n healthmate
   kubectl get svc -n healthmate

E) Telemedicine Production Environment Variables (Required)
Set and verify these values before production deployment:

1. JWT_SECRET
   - Used to verify bearer tokens in telemedicine-service.
2. AGORA_APP_ID
   - Agora application identifier used for RTC token generation.
3. AGORA_APP_CERTIFICATE
   - Agora certificate used to sign RTC tokens.
4. APPOINTMENT_SERVICE_URL
   - Internal appointment API base URL used by telemedicine-service.
   - Example: http://appointment-service:5004/api/appointments
5. APPOINTMENT_INTERNAL_TOKEN
   - Shared internal token for telemedicine-service -> appointment-service internal calls.

Validation checklist:
- JWT_SECRET is non-empty and matches auth token signing environment.
- AGORA_APP_ID and AGORA_APP_CERTIFICATE are set to valid production values.
- APPOINTMENT_SERVICE_URL resolves from telemedicine container/pod network.
- APPOINTMENT_INTERNAL_TOKEN matches appointment-service internal token.

F) Key Documentation Files
1. backend/DOCTOR_REPORT_BUNDLE.md
2. backend/DOCTOR_TEST_PROOF.md
3. backend/infra/k8s/doctor-stack/README.md

Important:
- Replace placeholder values in submission.txt and members.txt.
- Ensure report.pdf is the final version before zipping.
