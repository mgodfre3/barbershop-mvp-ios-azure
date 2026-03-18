# BarberShop MVP

Square-first MVP for a barbershop platform with an iOS customer app powered by Square APIs, Azure backend for custom scheduling and rewards, admin portal, CRM, and POS integration.

## Architecture: What Square Owns vs. What Azure Owns

This is **NOT** a from-scratch payment/POS system. We leverage Square as the system of record for commerce, and Azure as the system of record for barbershop-specific logic.

### Square Owns (✅ Ready to Use)
- ✅ **Customers API** — Customer profiles, contact info, segments
- ✅ **Catalog API** — Services, pricing, inventory
- ✅ **Payments API** — Payment processing, receipts
- ✅ **Orders API** — Order creation, fulfillment tracking
- ✅ **Loyalty API** — (Generic loyalty; we build custom barbershop loyalty in Azure)
- ✅ **Webhooks** — Real-time events for payments, orders, customers

### Azure Owns (🔧 Custom Barbershop Logic)
- 🔧 **Appointment Scheduling** — Barber work hours, slot availability, conflict prevention
- 🔧 **Appointment Workflow** — requested → confirmed → completed → cancelled states
- 🔧 **CRM** — Customer notes, tags, no-show tracking, follow-ups
- 🔧 **Rewards Ledger** — Barbershop-specific points accrual (per visit, per barber, per service), tiers, redemptions
- 🔧 **Business Rules** — Cancellation policies, appointment buffers, barber assignment logic

## Current repo status

This repository now contains:

- **`BarberShop/`** — SwiftUI iOS app with sample data + repository pattern (ready to wire to Square + Azure APIs)
- **`api/`** — Express.js backend (Square SDK client + Azure business logic)
- **`admin-web/`** — Next.js admin portal scaffold (future: wire to APIs)
- **`infra/`** — Azure Bicep IaC for App Service, SQL, Key Vault, monitoring

## Data Flow Example: Book & Pay

```
1. Customer searches barbers/services in iOS app
   └─ iOS calls /barbers and /services (populated from Square Catalog)

2. Customer selects barber + service + time
   └─ iOS calls /availability (Azure computes slots from barber schedules)

3. Customer requests appointment
   └─ iOS calls POST /appointments (Azure stores request)

4. Barber/admin approves appointment (via admin portal or Square)
   └─ Admin calls PATCH /appointments/:id { status: "confirmed" }

5. Customer arrives, barber completes service
   └─ Admin calls PATCH /appointments/:id { status: "completed" }

6. Customer pays via in-app Square payment form
   └─ iOS app uses Square In-App Payments SDK
   └─ Payment processes through Square Payments API

7. Square sends payment.created webhook to Azure API
   └─ Azure /square/webhooks handler receives event
   └─ Azure creates reward ledger entry (e.g., +10 points)
   └─ iOS app fetches /rewards/summary, shows updated balance

8. Customer loyalty balance updated
   └─ Next visit, they see "120 points until reward"
```

## MVP product scope

### Customer iOS app
- Registration and sign-in (future: Microsoft Entra External ID)
- Browse services and barbers (from Square Catalog)
- Request or book appointments
- View upcoming appointments
- Pay with card or Apple Pay (Square In-App Payments SDK)
- View rewards balance and activity
- Manage profile and marketing preferences

### Admin web portal
- Appointment calendar and status management
- Barber schedule editor
- Customer search and CRM notes
- Reward adjustments and audit trail
- Square integration status (sync logs, webhook health)

### Backend API (Square-first)
- **Endpoints that sync with Square:** catalog, customers, payments, webhooks
- **Endpoints custom to barbershop:** appointments, barbers, scheduling, CRM, rewards ledger
- **Authentication:** Placeholder for Entra; MVP uses mock
- **Webhooks:** Ingest Square payment events, trigger Azure reward logic

## Azure Services

- **Backend API:** Azure App Service (Node.js + Express)
- **Database:** Azure SQL Database (appointments, barbers, CRM, rewards ledger)
- **Storage:** Azure Blob Storage (future: receipts, invoices, media)
- **Auth:** Microsoft Entra External ID (future implementation)
- **Notifications:** Azure Notification Hubs (future: SMS/email/push reminders)
- **Admin Portal Host:** Azure Static Web Apps
- **Secrets:** Azure Key Vault (Square credentials, DB conn strings)
- **Monitoring:** Application Insights + Log Analytics
- **IaC:** Bicep templates in `infra/`

## Core Data Model

| Entity | Owner | Purpose |
|--------|-------|---------|
| `Customer` | Square | Profile, contact info, segments |
| `Barber` | Azure | Name, specialty, work hours, availability |
| `Service` | Square | Name, price, duration, category |
| `Appointment` | Azure | Booking request, status workflow, notes |
| `RewardAccount` | Azure | Points balance, tier |
| `RewardLedgerEntry` | Azure | Immutable transaction (earned/redeemed points) |
| `CRMNote` | Azure | Internal notes, tags, follow-up date |
| `SquareMapping` | Azure | Link between local IDs and Square IDs |

- `SquareMapping`

## Azure backend blueprint

### API areas
- `POST /auth/register`
- `POST /auth/login`
- `GET /services`
- `GET /barbers`
- `GET /availability`
- `POST /appointments`
- `GET /appointments`
- `PATCH /appointments/{id}`
- `GET /rewards/summary`
- `POST /square/webhooks`

### Data storage guidance
Use **Azure SQL Database** as the system of record for:

- customers
- barbers
- services
- schedules
- appointments
- CRM notes
- rewards ledger
- Square ID mappings

Use **SwiftData** in the app only for local persistence and caching.

## Square integration strategy

### MVP
- Map internal customers to Square customers
- Optionally sync catalog/services from Square
- Receive payment/order webhooks
- Reconcile completed payments against appointments
- Award rewards based on completed visit or validated payment event

### Later
- Deeper POS reconciliation
- Multi-location sync
- Membership/package support
- Advanced reporting

## Build phases

### Phase 1 - iOS foundation
- SwiftUI shell
- Mock data and domain models
- Booking flow prototype
- Rewards summary
- Profile and preferences
- Unit and UI smoke tests

### Phase 2 - Azure backend
- Create Azure SQL schema
- Stand up API on App Service or Container Apps
- Add Entra External ID auth
- Implement appointments and rewards endpoints
- Connect iOS app to live APIs

### Phase 3 - Admin portal
- Create web portal on Azure Static Web Apps
- Add schedule editor
- Add appointment management
- Add CRM notes and reward adjustment views

### Phase 4 - Square integration
- Add Square credentials in Key Vault
- Implement webhook endpoint
- Reconcile catalog/customer/payment data
- Add observability and retry handling

## Immediate next deliverables

1. Split the iOS app into feature folders:
   - `App/`
   - `Domain/`
   - `Features/Home/`
   - `Features/Booking/`
   - `Features/Rewards/`
   - `Features/Profile/`
   - `Data/`
   - `Support/`
2. Create Azure infrastructure definitions with Bicep or Terraform.
3. Add an API project for auth, scheduling, appointments, rewards, and Square webhooks.
4. Add an admin web portal project hosted on Azure Static Web Apps.
5. Replace mock data with repository protocols and live network-backed implementations.

## Local development

Open the Xcode project:

```bash
open BarberShop.xcodeproj
```

Run tests from Terminal:

```bash
xcodebuild test -project BarberShop.xcodeproj -scheme BarberShop -destination 'platform=iOS Simulator,name=iPhone 16'
```

If that simulator name is unavailable on your machine, list devices with:

```bash
xcrun simctl list devices
```

## Notes

- This repo is currently iOS-only.
- Backend, infrastructure, and admin portal code can be added as sibling folders in this repository next.
- The current UI is intentionally mock-backed so the experience can be iterated before wiring Azure APIs.
