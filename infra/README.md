# Azure Infrastructure Scaffold

This folder contains Bicep templates for the Azure-first BarberShop MVP.

## Resources provisioned

- Azure App Service Plan (Linux)
- Azure Web App for API
- Azure SQL Server + Database
- Azure Storage Account
- Azure Key Vault (RBAC mode)
- Log Analytics Workspace
- Application Insights

## Deploy

```bash
az login
az account set --subscription "<subscription-id-or-name>"
az group create --name rg-barbershop-dev --location eastus
az deployment group create \
  --resource-group rg-barbershop-dev \
  --template-file infra/bicep/main.bicep \
  --parameters infra/bicep/params/dev.bicepparam \
  --parameters sqlAdminPassword="<strong-password>"
```

## Notes

- Keep real secrets out of parameter files; inject them during deployment.
- Add network restrictions, private endpoints, and managed identity role assignments in a hardening pass.
