# Admin Web Portal Scaffold

Next.js admin portal for BarberShop operations.

## MVP views

- Dashboard overview
- Appointments queue/calendar
- Customer CRM search
- Rewards adjustments
- Barber schedules
- Square sync status

## Local development

```bash
cd admin-web
npm install
npm run dev
```

Then visit `http://localhost:3000`.

## Azure deployment target

Deploy to Azure Static Web Apps for fast, low-cost global hosting with auth integration.

## Environment variables

See `.env.example`. Configure:

- `NEXT_PUBLIC_API_BASE_URL` → your Azure App Service API endpoint
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` → Microsoft Entra External ID credentials
- `AZURE_REDIRECT_URI` → your Static Web Apps domain

## Notes

This is the MVP scaffold. Wire to live API endpoints once backend is deployed to Azure.
