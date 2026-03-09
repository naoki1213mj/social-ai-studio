#!/usr/bin/env bash
# ============================================================
# Social AI Studio — Infrastructure Provisioning
# Deploys VNet-integrated Container Apps + Key Vault + Private Endpoints
#
# Prerequisites:
#   - az login (with sufficient permissions)
#   - Existing Cosmos DB account (cosmos-social-ai-studio)
#   - Existing AI Foundry project endpoint
#
# Usage:
#   chmod +x infra/provision.sh
#   ./infra/provision.sh
# ============================================================
set -euo pipefail

# ---- Configuration ----
RG="rg-hackfest-techconnect2026"
LOCATION="eastus2"
ENV_NAME="techpulse-prod"

echo "🚀 Deploying Social AI Studio infrastructure..."
echo "   Resource Group: $RG"
echo "   Location:       $LOCATION"
echo "   Environment:    $ENV_NAME"
echo ""

# ---- Deploy Bicep ----
echo "📦 Deploying Bicep template..."
OUTPUTS=$(az deployment group create \
  --resource-group "$RG" \
  --template-file infra/main.bicep \
  --parameters environmentName="$ENV_NAME" \
               location="$LOCATION" \
  --query "properties.outputs" \
  -o json)

# ---- Extract outputs ----
ACR_NAME=$(echo "$OUTPUTS" | jq -r '.AZURE_CONTAINER_REGISTRY_NAME.value')
CA_NAME=$(echo "$OUTPUTS" | jq -r '.AZURE_CONTAINER_APP_NAME.value')
CA_URL=$(echo "$OUTPUTS" | jq -r '.AZURE_CONTAINER_APP_URL.value')
KV_NAME=$(echo "$OUTPUTS" | jq -r '.AZURE_KEY_VAULT_NAME.value')
KV_URL=$(echo "$OUTPUTS" | jq -r '.AZURE_KEY_VAULT_URL.value')
VNET_NAME=$(echo "$OUTPUTS" | jq -r '.VNET_NAME.value')

echo ""
echo "✅ Infrastructure deployed!"
echo "   ACR:            $ACR_NAME"
echo "   Container App:  $CA_NAME"
echo "   App URL:        $CA_URL"
echo "   Key Vault:      $KV_NAME ($KV_URL)"
echo "   VNet:           $VNET_NAME"
echo ""

# ---- Assign Cosmos DB RBAC (data-plane) ----
echo "🔐 Assigning Cosmos DB data-plane role..."
CA_PRINCIPAL=$(az containerapp show -n "$CA_NAME" -g "$RG" \
  --query "identity.principalId" -o tsv)

COSMOS_ACCOUNT="cosmos-social-ai-studio"
COSMOS_ID=$(az cosmosdb show -n "$COSMOS_ACCOUNT" -g "$RG" --query "id" -o tsv)

# Cosmos DB Built-in Data Contributor role
az cosmosdb sql role assignment create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$RG" \
  --scope "/" \
  --principal-id "$CA_PRINCIPAL" \
  --role-definition-id "00000000-0000-0000-0000-000000000002" \
  2>/dev/null || echo "   (Role assignment may already exist)"

echo ""
echo "📋 Update deploy.yml with these values:"
echo "   ACR_NAME: $ACR_NAME"
echo "   CONTAINER_APP_NAME: $CA_NAME"
echo ""
echo "Done! 🎉"
