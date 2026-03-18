using '../main.bicep'

param location = 'eastus'
param environmentName = 'dev'
param namePrefix = 'barbershop'
param sqlAdminLogin = 'sqladminbarber'
param sqlAdminPassword = '<set-in-pipeline-or-local-secure-store>'
