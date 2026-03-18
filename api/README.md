# BarberShop API - Square-First Architecture

Azure-backed REST API for barbershop operations, with Square as the source of truth for customers, catalog, and payments.

## Architecture

### What Square Owns
- **Customers**: Create, update, and manage customer profiles
- **Catalog/Services**: Define and price services
- **Payments**: Process payments via In-App Payments SDK or web checkout
- **Orders**: Track fulfilled orders
- **Webhooks**: Send real-time payment and order events

### What Azure Owns
- **Scheduling**: Barber work hours, appointment slots, conflict prevention
- **Appointments**: Booking workflow (requested → confirmed → completed → cancelled)
- **CRM**: Customer notes, tags, follow-ups, no-show tracking
- **Rewards Ledger**: Barbershop-specific loyalty points accrual and redemption
- **Business Logic**: Custom barber assignment, reward tiers, cancellation policies

### Data Flows
1. **Customer registers** in iOS app → stored in Square Customers API
2. **Customer books appointment** → stored in Azure appointments table
3. **Appointment completed + payment confirmed** → Square webhook triggers Azure reward accrual
4. **Reward points displayed** in iOS app → fetched from Azure rewards ledger

## Stack

- Node.js + TypeScript
- Express
- Zod validation
- Square SDK (`squareup`)
- Azure SQL Database (future phase)
- Microsoft Entra External ID (future auth)

## Endpoints

### Health & Auth
- `GET /health` — API status and architecture info
- `POST /auth/register` — Register customer (scaffold, wire to Entra)
- `POST /auth/login` — Login customer (scaffold, wire to Entra)

### Catalog & Services (Square-backed)
- `GET /services` — List services (from Square Catalog API)

### Barbers (Azure-owned)
- `GET /barbers` — List active barbers

### Scheduling (Azure-owned)
- `GET /availability` — Get available appointment slots

### Appointments (Azure-owned)
- `GET /appointments` — List appointments
- `POST /appointments` — Create appointment request
- `PATCH /appointments/:id` — Update appointment status

### Customers (Square sync)
- `POST /customers/sync` — Sync customer to Square

### Payments (Square-backed)
- `GET /payments/:squarePaymentId` — Fetch payment status from Square

### Rewards (Azure-owned)
- `GET /rewards/summary` — Get customer reward balance
- `POST /rewards/ledger` — Create reward transaction (internal ledger)

### CRM (Azure-owned)
- `POST /crm/notes` — Add customer notes

### Square Webhooks (Square → Azure)
- `POST /square/webhooks` — Receive payment/order events, trigger Azure workflows

## Local Development

```bash
cd api
npm install
npm run dev
```

Server runs on `http://localhost:8080`.

### Get Square Sandbox Credentials

1. Create free account at https://developer.squareup.com
2. Go to your **Applications** dashboard
3. Create a new application
4. Copy **Access Token** from Sandbox credentials
5. Paste into `.env` as `SQUARE_API_KEY`

### Test Endpoints

```bash
# Health check
curl http://localhost:8080/health

# Get services
curl http://localhost:8080/services

# Get barbers
curl http://localhost:8080/barbers

# Create appointment
curl -X POST http://localhost:8080/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust-1",
    "barberId": "barber-jordan",
    "serviceId": "svc-classic",
    "startAt": "2026-03-20T10:00:00Z",
    "notes": "Please fade the sides"
  }'
```

## Azure Deployment

Deploy to **Azure App Service** or **Azure Container Apps**:

```bash
az webapp up --resource-group rg-barbershop-dev --name barbershop-api-dev --runtime "node|20-lts"
```

Set environment variables in Azure portal or via CLI:

```bash
az webapp config appsettings set \
  --resource-group rg-barbershop-dev \
  --name barbershop-api-dev \
  --settings SQUARE_API_KEY="your-key" SQUARE_WEBHOOK_SIGNATURE_KEY="your-key"
```

## Next Steps

1. **Wire auth to Microsoft Entra External ID** in `/auth/*` endpoints
2. **Connect Azure SQL database** for appointments, CRM, rewards tables
3. **Implement Square customer sync** in `POST /customers/sync`
4. **Add webhook signature verification** in `POST /square/webhooks`
5. **Build reward accrual logic** triggered by Square payment webhooks
6. **Add appointment status automations** (send SMS reminders, etc.)
