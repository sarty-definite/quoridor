Railway container deployment guide (backend)
=========================================

This file explains how to build the two-stage Docker image for the backend and deploy it to Railway as a container.

Prerequisites
- Install Docker Desktop and ensure it's running.
- Install Railway CLI and login (optional) or have access to a container registry.

Build locally (PowerShell)

1. From the `backend` folder build the image:

```powershell
cd 'C:\Users\sarth\OneDrive\Desktop\quoridor\backend'
docker build -t quoridor-backend:latest .
```

2. Run locally to smoke test (maps container port 3000 to host 3000):

```powershell
docker run --rm -p 3000:3000 -e PORT=3000 quoridor-backend:latest
# then in another shell:
Invoke-RestMethod -Uri 'http://localhost:3000/health'
```

Deploy to Railway as a container (recommended)

Railway supports deploying container images. Two common approaches:

- Push to Docker Hub or GitHub Container Registry (GHCR) and create a Railway service that pulls the image.
- Use Railway's Docker build by connecting your repo and configuring a Dockerfile — Railway will build the container for you.

Example: push to Docker Hub (PowerShell)

```powershell
# tag and push (replace <your-docker-username>)
docker tag quoridor-backend:latest <your-docker-username>/quoridor-backend:latest
docker push <your-docker-username>/quoridor-backend:latest
```

Then in Railway:
- Create new project -> Deploy -> Container -> provide the image `<your-docker-username>/quoridor-backend:latest`.
- Set environment variables: `FRONTEND_ORIGIN=https://quoridor.domain.com`, `NODE_ENV=production`.
- Add custom domain `socket.quoridor.domain.com` (Railway will show DNS instructions).

Or: let Railway build your Dockerfile directly

- When connecting your GitHub repo, choose container deployment and Railway will use the Dockerfile in `backend/` to build and run your service.

Notes
- The Dockerfile runs the TypeScript build inside the container and only copies production `node_modules` into the runtime image.
- If you change how local packages are referenced (monorepo layout), ensure the Docker build context includes the referenced packages.
