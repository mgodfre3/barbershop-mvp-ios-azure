# API Scaffold

Azure-first backend scaffold for BarberShop MVP.

## Stack

- Node.js + TypeScript
- Express
- Zod validation

## Endpoints scaffolded

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /services`
- `GET /barbers`
- `GET /availability`
- `GET /appointments`
- `POST /appointments`
- `PATCH /appointments/:id`
- `GET /rewards/summary`
- `POST /square/webhooks`

## Run locally

```bash
cd api
npm install
npm run dev
```

Then test:

```bash
curl http://localhost:8080/health
```

## Azure deployment target

- Primary target: Azure App Service (Linux)
- Alternate target: Azure Container Apps
