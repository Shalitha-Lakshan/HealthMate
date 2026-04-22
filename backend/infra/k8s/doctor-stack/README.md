# Kubernetes Doctor Stack

This folder contains Kubernetes manifests for doctor-related services required by the assignment:

- auth-service
- doctor-service
- appointment-service
- prescription-service
- telemedicine-service

## 1) Build images

Use Docker image names referenced in manifests:

- healthmate/auth-service:latest
- healthmate/doctor-service:latest
- healthmate/appointment-service:latest
- healthmate/prescription-service:latest
- healthmate/telemedicine-service:latest

Example:

```bash
docker build -t healthmate/auth-service:latest ./backend/services/auth-service
docker build -t healthmate/doctor-service:latest ./backend/services/doctor-service
docker build -t healthmate/appointment-service:latest ./backend/services/appointment-service
docker build -t healthmate/prescription-service:latest ./backend/services/prescription-service
docker build -t healthmate/telemedicine-service:latest ./backend/services/telemedicine-service
```

If using Minikube:

```bash
minikube image load healthmate/auth-service:latest
minikube image load healthmate/doctor-service:latest
minikube image load healthmate/appointment-service:latest
minikube image load healthmate/prescription-service:latest
minikube image load healthmate/telemedicine-service:latest
```

## 2) Update secrets

Edit these files with real values before deployment:

- 10-auth-secret.yaml
- 20-doctor-secret.yaml
- 30-appointment-secret.yaml
- 40-prescription-secret.yaml
- 50-telemedicine-secret.yaml

Important values:

- MONGO_URI per service
- JWT_SECRET
- AGORA_APP_ID
- AGORA_APP_CERTIFICATE
- APPOINTMENT_SERVICE_URL
- APPOINTMENT_INTERNAL_TOKEN
- internal tokens (same value across services that trust each other)

Telemedicine production variable mapping:

- `JWT_SECRET` -> `50-telemedicine-secret.yaml`
- `AGORA_APP_ID` -> `50-telemedicine-secret.yaml`
- `AGORA_APP_CERTIFICATE` -> `50-telemedicine-secret.yaml`
- `APPOINTMENT_SERVICE_URL` -> `50-telemedicine-secret.yaml` (injected into deployment)
- `APPOINTMENT_INTERNAL_TOKEN` -> `50-telemedicine-secret.yaml` (injected into deployment)

Telemedicine variable verification commands:

```bash
kubectl get secret telemedicine-service-secret -n healthmate -o yaml
kubectl describe deploy telemedicine-service -n healthmate
kubectl logs deploy/telemedicine-service -n healthmate
```

## 3) Deploy

```bash
kubectl apply -k ./backend/infra/k8s/doctor-stack
```

## 4) Verify

```bash
kubectl get pods -n healthmate
kubectl get svc -n healthmate
kubectl get ingress -n healthmate
```

## 5) Notes

- Ingress host is `healthmate.local`; configure local DNS/hosts file if required.
- appointment-service references notification-service URL, but notification is not included in this doctor-only bundle.
- These manifests are intentionally minimal for assignment deployment and viva demonstration.
