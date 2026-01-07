# Environment & Connectivity Setup

This document lists the environment variables required by each service and how they connect.

Services and example default ports (set unique values if running all locally):
- Algocode-Evaluator-Service: 3000
- Algocode-Problem-Service: 3002
- AlgoCode-Socket-Service: 3001
- AlgoCode-Submission-Service: 3003

Common dependencies

1) Redis
- Used by: Evaluator (BullMQ queues), Submission (queues/cache), Socket (simple KV for userId -> socketId).
- Quick start (Docker):
  - docker run -p 6379:6379 --name redis -d redis:6.2
- Set REDIS_HOST and REDIS_PORT in each service `.env`.

2) MongoDB (Atlas or local)
- Used by: Problem-Service (stores problems), Submission-Service (if persisting submissions/logs).
- Provide a Mongo connection string in `ATLAS_DB_URL` (and `LOG_DB_URL` if used).
- Example (Atlas): mongodb+srv://<user>:<pass>@cluster0.mongodb.net/<dbname>?retryWrites=true&w=majority

3) Docker daemon (for Evaluator)
- The Evaluator service runs code inside Docker containers using `dockerode`.
- Requirements:
  - Docker Desktop (Windows) running with Linux containers.
  - The account running the service must have access to the Docker daemon.
- Optionally set `DOCKER_HOST` environment variable if using remote Docker.

4) Service-to-service connectivity
- Submission -> Problem: `PROBLEM_ADMIN_SERVICE_URL` (e.g. http://localhost:3002)
- Submission -> Socket: `SOCKET_SERVICE_URL` to POST payloads for real-time notifications (socket service provides `/sendPayload`).
- Evaluator uses Redis for queueing; ensure the same Redis is reachable by producer and workers.

How to use the `.env.example` files
1. For each service folder, copy `.env.example` to `.env`:

   # Windows PowerShell
   cp .env.example .env

2. Edit `.env` and set real credentials/URLs.
3. Start dependencies (Redis, Mongo, Docker).
4. Start services (in their folders):
   - npm install
   - npm run start (or the script specified in package.json)

Verification steps
- Redis: `redis-cli -h <host> -p <port> ping` should return PONG.
- Mongo: connect with `mongo` or via Atlas UI to confirm the database is accessible.
- Evaluator: with Docker running, submit a quick job and check the worker logs and Bull Board at /ui (if configured) to verify queues can connect.
- Socket: open the frontend (sample-socket-frontend/index.html) and check console; or use curl/postman to POST to `/sendPayload`.

Notes and recommendations
- Do not commit real secrets to version control. Keep `.env` in `.gitignore` and only check in `.env.example` and this `ENV_SETUP.md`.
- Pick non-conflicting ports when running multiple services locally.
- For production, prefer managed Redis and MongoDB, and secure your service endpoints with authentication.

If you'd like, I can:
- Create a docker-compose.yml to run Redis, Mongo (optional), and start the services for local dev (suggested next step).
- Add checks in each service to fail fast if required env vars are missing.
