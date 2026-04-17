# HealthMate

HealthMate is an AI-enabled smart healthcare platform built with a microservices architecture. It supports patient registration, doctor discovery, appointment booking, telemedicine sessions, digital prescriptions, payments, admin operations, and multi-channel notifications.

## Project Highlights

- Microservices-based backend (Node.js + Express)
- API Gateway for unified ingress to backend services
- React frontend (Vite) for asynchronous web client interactions
- Docker Compose support for local full-stack execution
- Kubernetes manifests for Docker Desktop Kubernetes deployment
- Role-based access (Patient / Doctor / Admin)
- Optional AI symptom checker integration

## High-Level Architecture

Core components:

- `frontend` (React/Vite)
- `gateway` (API aggregation/proxy)
- Domain services:
	- `auth-service`
	- `patient-service`
	- `doctor-service`
	- `appointment-service`
	- `payment-service`
	- `notification-service`
	- `telemedicine-service`
	- `prescription-service`
	- `admin-service`
	- `ai-service`
- `mongodb` (service data storage)

## Repository Structure

```text
backend/
	gateway/
	services/
	infra/
		k8s/
frontend/
docker-compose.yml
README.md
```

## Prerequisites

- Docker Desktop installed and running
- For Kubernetes flow: Docker Desktop Kubernetes enabled
- Node.js only required if running services outside Docker
- Recommended free ports:
	- `5000-5010`
	- `5173`

## Run with Docker Compose

From the project root:

```bash
docker compose up --build -d
```

### Check status

```bash
docker compose ps
```

### View logs

All services:

```bash
docker compose logs -f
```

Single service:

```bash
docker compose logs -f frontend
```

### Stop

```bash
docker compose down
```

Remove volumes:

```bash
docker compose down -v
```

## Access URLs (Docker Compose)

- Frontend: `http://localhost:5173`
- Gateway: `http://localhost:5000`

## Kubernetes Deployment

For full Docker Desktop Kubernetes setup and deployment commands, see:

- [backend/infra/k8s/README.md](backend/infra/k8s/README.md)

### Kubernetes Quick Start

```powershell
kubectl config use-context docker-desktop
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
kubectl apply -k backend/infra/k8s
kubectl get pods,svc,ingress -n healthmate
```

Expected ingress URL:

- `http://healthmate.local/`

If hostname fails, add to Windows hosts file:

```text
127.0.0.1 healthmate.local
```

## Key Functional Flows

- Patient registration/login and profile management
- Doctor discovery and appointment booking
- Payment processing for consultation flow
- Consultation lifecycle updates and digital prescription creation
- Email/SMS/WhatsApp notification dispatch (based on configuration)
- AI symptom checker recommendations (optional)

## Security and Auth

- JWT-based authentication across protected routes
- Role-based authorization for patient, doctor, and admin actions
- Internal service token validation for service-to-service notification and workflow events

## Useful Operational Commands

Rebuild one Docker service:

```bash
docker compose up --build -d admin-service
```

Kubernetes rollout restart (example):

```bash
kubectl rollout restart deployment/gateway -n healthmate
```

Tail Kubernetes logs (example):

```bash
kubectl logs deployment/notification-service -n healthmate --tail=200
```

Cleanup local Docker artifacts:

```bash
docker compose down --remove-orphans
docker image prune -f
```

## Troubleshooting

- Browser cannot open `healthmate.local`:
	- Verify hosts entry (`127.0.0.1 healthmate.local`)
	- Run `ipconfig /flushdns`
- API route returns 404 through ingress:
	- Confirm gateway deployment is updated and running
- WhatsApp notifications not sent:
	- Verify notification service WhatsApp configuration and readiness endpoints
- Kubernetes command cannot connect to cluster:
	- Check Docker Desktop is running and current context is `docker-desktop`

## Notes for Academic Submission

- Keep all architecture and workflow details in `report.pdf`
- Include deployment steps in `readme.txt` / project documentation
- Rotate any real credentials before publishing repository links

## License

This project is developed for academic purposes (SE3020 Distributed Systems assignment context).
