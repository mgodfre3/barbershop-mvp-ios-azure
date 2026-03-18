# BarberShop MVP

Azure-first MVP for a barbershop platform with an iOS customer app, cloud backend, admin portal, CRM, scheduling, rewards, and Square POS integration.

## Current repo status

This repository currently contains the iOS client MVP shell built with:

- SwiftUI
- SwiftData for lightweight local state and future caching
- XCTest and XCUITest

The app now includes:

- Home dashboard
- Booking tab
- Rewards tab
- Profile tab
- Mock customer, barber, service, appointment, and rewards data

## MVP product scope

### Customer iOS app
- Registration and sign-in
- View services and barbers
- Request or book appointments
- View upcoming appointments
- View rewards balance and activity
- Manage profile and marketing preferences
- Receive push notifications for confirmations and reminders

### Admin web portal
- Staff/admin login
- Customer search and profile lookup
- Barber schedule management
- Appointment calendar and status updates
- Reward adjustments and audit trail
- CRM notes and follow-up reminders

### Backend services
- Authentication and authorization
- Customer, barber, service, and appointment APIs
- Availability and scheduling validation
- Rewards ledger and tier tracking
- Notification orchestration
- Square webhook ingestion and reconciliation

## Azure-first architecture

### Recommended Azure services
- **Authentication:** Microsoft Entra External ID
- **Backend API:** Azure App Service for MVP, or Azure Container Apps if background workers are needed early
- **Database:** Azure SQL Database
- **Blob/file storage:** Azure Blob Storage
- **Push notifications:** Azure Notification Hubs
- **Admin web portal hosting:** Azure Static Web Apps
- **Secrets:** Azure Key Vault
- **Observability:** Azure Monitor + Application Insights + Log Analytics
- **CI/CD:** GitHub Actions

## System responsibilities

### iOS app
- Customer-facing mobile experience
- Local cache and UI state
- Token/session handling
- Notification display

### Azure backend
- Source of truth for business data
- Scheduling rules and conflict prevention
- Rewards transactions
- CRM notes and customer history
- Square integration

### Admin portal
- Business operations UI
- Schedule management
- CRM workflows
- Appointment and rewards oversight

## Core domain model

### Entities
- `CustomerProfile`
- `Barber`
- `ServiceMenuItem`
- `Appointment`
- `RewardSummary`
- `RewardActivity`
- `AppSession`

### Backend entities to add next
- `UserAccount`
- `ShopLocation`
- `ScheduleTemplate`
- `ScheduleException`
- `AppointmentStatusEvent`
- `RewardLedgerEntry`
- `CRMNote`
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
