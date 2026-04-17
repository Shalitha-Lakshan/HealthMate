# HealthMate Kubernetes Deployment Guide

This document explains how to run the **HealthMate microservices platform** on Kubernetes using **Docker Desktop Kubernetes**.

## 1) Prerequisites

- Windows 10/11 with Docker Desktop installed
- Kubernetes enabled in Docker Desktop
- `kubectl` available in terminal
- Project opened at repository root
- Internet access for pulling base images (first build only)

## 2) Enable Kubernetes (Docker Desktop)

1. Open Docker Desktop
2. Go to **Settings → Kubernetes**
3. Enable **Kubernetes**
4. Use **kubeadm** provisioning (recommended for this project)
5. Click **Apply & Restart**

## 3) Verify Cluster Access

Run from project root:

```powershell
kubectl config use-context docker-desktop
kubectl get nodes
```

Expected: one node in `Ready` state.

## 4) Install NGINX Ingress Controller (one-time)

```powershell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
kubectl -n ingress-nginx rollout status deploy/ingress-nginx-controller
```

## 5) Build Local Docker Images

Run from project root:

```powershell
$images = @(
  "auth-service=backend/services/auth-service",
  "patient-service=backend/services/patient-service",
  "doctor-service=backend/services/doctor-service",
  "appointment-service=backend/services/appointment-service",
  "payment-service=backend/services/payment-service",
  "notification-service=backend/services/notification-service",
  "telemedicine-service=backend/services/telemedicine-service",
  "prescription-service=backend/services/prescription-service",
  "admin-service=backend/services/admin-service",
  "ai-service=backend/services/ai-service",
  "gateway=backend/gateway",
  "frontend=frontend"
)

foreach ($i in $images) {
  $p = $i -split "="
  docker build -t "healthmate/$($p[0]):latest" $p[1]
}
```

## 6) Deploy Kubernetes Manifests

```powershell
kubectl apply -k backend/infra/k8s
```

This deploys:

- Namespace: `healthmate`
- ConfigMaps and Secrets
- Deployments + Services for all microservices
- Ingress: `healthmate-ingress`

## 7) Verify Deployment

```powershell
kubectl get pods,svc,ingress -n healthmate
```

Expected:

- All pods should become `1/1 Running`
- Ingress host should show `healthmate.local`

## 8) Configure Local Hostname (Windows)

Add this to hosts file (`C:\Windows\System32\drivers\etc\hosts`):

```text
127.0.0.1 healthmate.local
```

Then flush DNS:

```powershell
ipconfig /flushdns
```

Test access:

```powershell
curl.exe -i http://healthmate.local/
```

Open in browser:

- http://healthmate.local/

## 9) Useful Runtime Checks

### Pod status

```powershell
kubectl get pods -n healthmate -w
```

### Service logs

```powershell
kubectl logs deployment/gateway -n healthmate --tail=200
kubectl logs deployment/notification-service -n healthmate --tail=200
```

### Ingress details

```powershell
kubectl describe ingress healthmate-ingress -n healthmate
```

## 10) WhatsApp Notifications (Optional Channel)

Notification service exposes:

- `GET /api/notifications/whatsapp/status`
- `GET /api/notifications/whatsapp/qr`

Example check:

```powershell
curl.exe -s -H "Host: healthmate.local" http://127.0.0.1/api/notifications/whatsapp/status
```

If WhatsApp is enabled but not ready, retrieve QR and scan using the WhatsApp mobile app to link the session.

## 11) Troubleshooting

### A) `curl http://healthmate.local` fails with host resolution error

- Ensure hosts file contains `127.0.0.1 healthmate.local`
- Run `ipconfig /flushdns`

### B) `kubectl` fails with `kubernetes.docker.internal: no such host`

- Ensure Docker Desktop is running
- Restart Docker Desktop
- Confirm context:

```powershell
kubectl config use-context docker-desktop
kubectl get nodes
```

### C) Pods stuck in `ImagePullBackOff`

- Ensure all local images were built with expected tags `healthmate/<service>:latest`
- Restart affected deployment:

```powershell
kubectl rollout restart deployment/<name> -n healthmate
```

### D) Frontend loads but API calls fail

- Verify gateway deployment is running
- Check ingress rules and gateway logs

## 12) Clean Up

Delete application resources:

```powershell
kubectl delete -k backend/infra/k8s
```

If needed, remove ingress controller:

```powershell
kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
```

## 13) Security Note (Important)

This repository currently includes plain-text secret material in Kubernetes secret templates for local development convenience.
For production or public repositories:

- Rotate exposed credentials
- Move secrets to secure secret management (e.g., sealed secrets, external secret store, CI/CD secret injection)
- Avoid committing real API keys/passwords to source control
