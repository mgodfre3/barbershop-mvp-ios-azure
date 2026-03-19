# Admin Web Portal - Square Integrated

Next.js admin portal for BarberShop operations, with direct integrations to Square and Azure APIs.

## MVP Views

- **Dashboard** — Overview of appointments, revenue, rewards redeemed
- **Appointments** — Calendar/list, status updates, customer notes
- **Customers (CRM)** — Search, view history, add notes, manage preferences
- **Rewards** — Adjust points, view ledger, set promotions
- **Schedules** — Barber work hours, time off, availability rules
- **Square Sync** — Webhook health, customer/order sync status

## Architecture

### Data Sources
- **Appointments** — Azure API (`/appointments`, `/crm/notes`)
- **Customers** — Square Customers API (synced to local cache)
- **Payments** — Square Payments API (via webhooks)
- **Services** — Square Catalog API
- **Rewards** — Azure API (`/rewards/summary`, `/rewards/ledger`)

### Square Integration
This admin portal uses:
- **Square Customers API** — Fetch and manage customer profiles
- **Square Catalog API** — View services and pricing
- **Square Orders API** — View fulfillment status
- **Square Webhooks** — Monitor payment/order events in real-time

## Local Development

```bash
cd admin-web
npm install
npm run dev
```

Portal runs on `http://localhost:3000`.

## Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_SQUARE_APP_ID=your-square-app-id
NEXT_PUBLIC_SQUARE_LOCATION_ID=your-location-id
AZURE_TENANT_ID=your-entra-tenant
AZURE_CLIENT_ID=your-entra-client
AZURE_CLIENT_SECRET=your-entra-secret
AZURE_REDIRECT_URI=http://localhost:3000
```

### Get Square Credentials

1. Go to https://developer.squareup.com/apps
2. Select your app
3. Copy **Application ID** (for `NEXT_PUBLIC_SQUARE_APP_ID`)
4. Go to **Locations** and copy your location ID (for `NEXT_PUBLIC_SQUARE_LOCATION_ID`)

## Features

### Appointments Management
- View upcoming appointments
- Update status (requested → confirmed → completed → cancelled)
- Add internal notes
- Send customer notifications (future)

### Customer CRM
- Search customers (from Square or local cache)
- View full history (appointments, payments, rewards)
- Add notes and tags
- Track no-show risk
- Set follow-up reminders

### Rewards Dashboard
- View customer point balances
- Manual point adjustments (with audit trail)
- View reward ledger transactions
- Create promotions (e.g., "double points this week")

### Schedule Management
- Set barber work hours
- Block time for breaks, lunch, PTO
- View appointment conflicts
- Adjust availability rules

### Square Sync Monitor
- View webhook delivery status
- Retry failed syncs
- Monitor customer/order reconciliation
- Debug Square API integration issues

## Azure Deployment

Deploy to **Azure Static Web Apps**:

```bash
az staticwebapp create \
  --resource-group rg-barbershop-dev \
  --name barbershop-admin-web \
  --source https://github.com/<your-user>/barbershop-mvp-ios-azure \
  --location eastus \
  --branch main
```

Set environment variables in Azure portal:

```bash
az staticwebapp appsettings set \
  --resource-group rg-barbershop-dev \
  --name barbershop-admin-web \
  --setting-names \
    NEXT_PUBLIC_API_BASE_URL="https://barbershop-api-dev.azurewebsites.net" \
    NEXT_PUBLIC_SQUARE_APP_ID="your-app-id"
```

## Authentication (Future)

This portal will eventually authenticate staff via **Microsoft Entra External ID** with role-based access (admin, barber, manager). MVP uses mock auth.

## Next Steps

1. **Wire auth to Entra** — Protect routes and API calls
2. **Build appointment calendar UI** — Real-time updates via WebSockets
3. **Connect to Azure SQL** — Fetch real appointments and CRM notes
4. **Sync Square Catalog** — Display services from Square
5. **Add customer communication** — SMS/email notifications to clients
6. **Build reporting dashboards** — Revenue, utilization, loyalty metrics
