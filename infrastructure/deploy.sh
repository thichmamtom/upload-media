#!/bin/bash
# Azure Deployment Script for Media Manager
# Prerequisites: Azure CLI installed and logged in

set -e

# Configuration - MODIFY THESE
RESOURCE_GROUP="rg-mediamanager-prod"
LOCATION="southeastasia"
STORAGE_NAME="st$(openssl rand -hex 4)media"
APP_NAME="app-mediamanager-api"
DB_ADMIN_USER="mediaadmin"
DB_ADMIN_PASSWORD="$(openssl rand -base64 24)"

echo "╔══════════════════════════════════════════╗"
echo "║  Media Manager - Azure Deployment Script ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Create Resource Group
echo "📁 Creating Resource Group: $RESOURCE_GROUP"
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --output none

# 2. Create Storage Account
echo "📦 Creating Storage Account: $STORAGE_NAME"
az storage account create \
  --name $STORAGE_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --allow-blob-public-access false \
  --output none

# 3. Create Blob Containers
echo "📂 Creating Blob Containers..."
STORAGE_KEY=$(az storage account keys list --account-name $STORAGE_NAME --resource-group $RESOURCE_GROUP --query '[0].value' -o tsv)

for container in originals thumbnails uploads downloads; do
  az storage container create \
    --name $container \
    --account-name $STORAGE_NAME \
    --account-key $STORAGE_KEY \
    --output none
  echo "   ✓ Created container: $container"
done

# 4. Create PostgreSQL Flexible Server
echo "🐘 Creating PostgreSQL Server..."
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name "psql-mediamanager" \
  --location $LOCATION \
  --admin-user $DB_ADMIN_USER \
  --admin-password "$DB_ADMIN_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --yes \
  --output none

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name "psql-mediamanager" \
  --database-name "media_manager" \
  --output none

# 5. Create App Service
echo "🚀 Creating App Service..."
az appservice plan create \
  --name "plan-mediamanager" \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux \
  --output none

az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan "plan-mediamanager" \
  --runtime "NODE:20-lts" \
  --output none

# 6. Create CDN
echo "🌐 Creating CDN..."
az cdn profile create \
  --name "cdn-mediamanager" \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_Microsoft \
  --output none

az cdn endpoint create \
  --name "endpoint-media" \
  --profile-name "cdn-mediamanager" \
  --resource-group $RESOURCE_GROUP \
  --origin "$STORAGE_NAME.blob.core.windows.net" \
  --origin-host-header "$STORAGE_NAME.blob.core.windows.net" \
  --output none

# 7. Configure App Settings
echo "⚙️ Configuring App Settings..."
DATABASE_URL="postgresql://$DB_ADMIN_USER:$DB_ADMIN_PASSWORD@psql-mediamanager.postgres.database.azure.com:5432/media_manager?sslmode=require"
CDN_ENDPOINT="https://endpoint-media.azureedge.net"

az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    DATABASE_URL="$DATABASE_URL" \
    AZURE_STORAGE_ACCOUNT_NAME="$STORAGE_NAME" \
    AZURE_STORAGE_ACCOUNT_KEY="$STORAGE_KEY" \
    AZURE_CDN_ENDPOINT="$CDN_ENDPOINT" \
    NODE_ENV="production" \
  --output none

# Done!
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Deployment Complete!                                 ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Resources created:                                      ║"
echo "║  • Resource Group: $RESOURCE_GROUP"
echo "║  • Storage Account: $STORAGE_NAME"
echo "║  • PostgreSQL Server: psql-mediamanager"
echo "║  • App Service: $APP_NAME"
echo "║  • CDN Endpoint: $CDN_ENDPOINT"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Database Credentials (SAVE THESE!):                     ║"
echo "║  • Username: $DB_ADMIN_USER"
echo "║  • Password: $DB_ADMIN_PASSWORD"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Next Steps:                                             ║"
echo "║  1. Deploy your code: az webapp up --name $APP_NAME"
echo "║  2. Run Prisma migrations                                ║"
echo "║  3. Deploy frontend to Azure Static Web Apps             ║"
echo "╚══════════════════════════════════════════════════════════╝"
