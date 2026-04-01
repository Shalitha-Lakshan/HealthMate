# HealthMate

HealthMate is a microservices-based healthcare platform with a React frontend, Node.js backend services, and an API gateway.

## Run with Docker

### Prerequisites
- Docker Desktop installed and running
- Ports `5000-5010` and `5173` available

### Start the full stack
From the project root:

```bash
docker compose up --build -d
```

### Check service status
```bash
docker compose ps
```

### View logs
- All services:

```bash
docker compose logs -f
```

- Single service (example: frontend):

```bash
docker compose logs -f frontend
```

### Stop the stack
```bash
docker compose down
```

### Stop and remove volumes
```bash
docker compose down -v
```

## Access URLs
- Frontend: `http://localhost:5173`
- API Gateway: `http://localhost:5000`

## Rebuild one service
```bash
docker compose up --build -d admin-service
```

## Useful cleanup
```bash
docker compose down --remove-orphans
docker image prune -f
```
