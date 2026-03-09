// ========== Social AI Studio — Infrastructure ========== //
// VNet-integrated Container Apps + Key Vault + Private Endpoints
targetScope = 'resourceGroup'

@minLength(3)
@maxLength(20)
@description('A unique environment name for all resources')
param environmentName string

@description('Primary location for all resources')
param location string = resourceGroup().location

@description('Existing AI Foundry project endpoint')
param projectEndpoint string = ''

@description('Model deployment name')
param modelDeploymentName string = 'gpt-5.2'

@description('Image model deployment name')
param imageDeploymentName string = 'gpt-image-1.5'

@description('Vector Store ID (optional, auto-created if empty)')
param vectorStoreId string = ''

@description('Existing Cosmos DB account name')
param cosmosAccountName string = 'cosmos-social-ai-studio'

@description('Cosmos DB database name')
param cosmosDatabase string = 'social-ai-studio'

@description('Cosmos DB container name')
param cosmosContainer string = 'conversations'

@description('Content Safety endpoint')
param contentSafetyEndpoint string = ''

@description('Application Insights connection string')
@secure()
param appInsightsConnectionString string = ''

@description('AI Search endpoint')
param aiSearchEndpoint string = ''

@description('AI Search knowledge base name')
param aiSearchKnowledgeBaseName string = ''

var abbrs = loadJsonContent('./abbreviations.json')
var uniqueId = toLower(uniqueString(subscription().id, environmentName, location))
var solutionPrefix = 'tp${take(uniqueId, 10)}'

// ========== Virtual Network ========== //
resource vnet 'Microsoft.Network/virtualNetworks@2024-01-01' = {
  name: '${abbrs.virtualNetwork}${solutionPrefix}'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    subnets: [
      {
        name: 'snet-container-apps'
        properties: {
          addressPrefix: '10.0.0.0/23'
          delegations: [
            {
              name: 'Microsoft.App.environments'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
        }
      }
      {
        name: 'snet-private-endpoints'
        properties: {
          addressPrefix: '10.0.2.0/24'
        }
      }
    ]
  }
}

// ========== Key Vault ========== //
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${abbrs.keyVault}${solutionPrefix}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

// Key Vault Private Endpoint
resource keyVaultPe 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: 'pe-${keyVault.name}'
  location: location
  properties: {
    subnet: {
      id: vnet.properties.subnets[1].id
    }
    privateLinkServiceConnections: [
      {
        name: 'kv-link'
        properties: {
          privateLinkServiceId: keyVault.id
          groupIds: ['vault']
        }
      }
    ]
  }
}

resource keyVaultDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
}

resource keyVaultDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: keyVaultDnsZone
  name: 'kv-vnet-link'
  location: 'global'
  properties: {
    virtualNetwork: { id: vnet.id }
    registrationEnabled: false
  }
}

resource keyVaultDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: keyVaultPe
  name: 'kv-dns-group'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'config'
        properties: {
          privateDnsZoneId: keyVaultDnsZone.id
        }
      }
    ]
  }
}

// Store secrets in Key Vault
resource secretProjectEndpoint 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'project-endpoint'
  properties: {
    value: projectEndpoint
  }
}

resource secretAppInsights 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (!empty(appInsightsConnectionString)) {
  parent: keyVault
  name: 'appinsights-connection-string'
  properties: {
    value: appInsightsConnectionString
  }
}

resource secretContentSafety 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (!empty(contentSafetyEndpoint)) {
  parent: keyVault
  name: 'content-safety-endpoint'
  properties: {
    value: contentSafetyEndpoint
  }
}

// ========== Cosmos DB Private Endpoint ========== //
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' existing = {
  name: cosmosAccountName
}

resource cosmosPe 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: 'pe-${cosmosAccountName}'
  location: location
  properties: {
    subnet: {
      id: vnet.properties.subnets[1].id
    }
    privateLinkServiceConnections: [
      {
        name: 'cosmos-link'
        properties: {
          privateLinkServiceId: cosmosAccount.id
          groupIds: ['Sql']
        }
      }
    ]
  }
}

resource cosmosDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.documents.azure.com'
  location: 'global'
}

resource cosmosDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: cosmosDnsZone
  name: 'cosmos-vnet-link'
  location: 'global'
  properties: {
    virtualNetwork: { id: vnet.id }
    registrationEnabled: false
  }
}

resource cosmosDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: cosmosPe
  name: 'cosmos-dns-group'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'config'
        properties: {
          privateDnsZoneId: cosmosDnsZone.id
        }
      }
    ]
  }
}

// ========== Container Registry ========== //
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: '${abbrs.containerRegistry}${solutionPrefix}'
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// ========== Log Analytics ========== //
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${abbrs.logAnalytics}${solutionPrefix}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ========== Container Apps Environment (VNet-integrated) ========== //
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${abbrs.containerAppsEnv}${solutionPrefix}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: vnet.properties.subnets[0].id
      internal: false
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

// ========== Container App ========== //
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${abbrs.containerApp}${solutionPrefix}'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'social-ai-studio'
          image: '${acr.properties.loginServer}/social-ai-studio:latest'
          resources: {
            cpu: json('1.0')
            memory: '2.0Gi'
          }
          env: [
            { name: 'AZURE_KEY_VAULT_URL', value: keyVault.properties.vaultUri }
            { name: 'MODEL_DEPLOYMENT_NAME', value: modelDeploymentName }
            { name: 'IMAGE_DEPLOYMENT_NAME', value: imageDeploymentName }
            { name: 'VECTOR_STORE_ID', value: vectorStoreId }
            { name: 'COSMOS_ENDPOINT', value: 'https://${cosmosAccountName}.documents.azure.com:443/' }
            { name: 'COSMOS_DATABASE', value: cosmosDatabase }
            { name: 'COSMOS_CONTAINER', value: cosmosContainer }
            { name: 'AI_SEARCH_ENDPOINT', value: aiSearchEndpoint }
            { name: 'AI_SEARCH_KNOWLEDGE_BASE_NAME', value: aiSearchKnowledgeBaseName }
            { name: 'AI_SEARCH_REASONING_EFFORT', value: 'minimal' }
            { name: 'SERVE_STATIC', value: 'true' }
            { name: 'HOST', value: '0.0.0.0' }
            { name: 'PORT', value: '8000' }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

// ========== RBAC: Container App → Key Vault (Key Vault Secrets User) ========== //
resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, containerApp.id, '4633458b-17de-408a-b874-0445c86b69e6')
  scope: keyVault
  properties: {
    principalId: containerApp.identity.principalId
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6' // Key Vault Secrets User
    )
    principalType: 'ServicePrincipal'
  }
}

// ========== Outputs ========== //
output AZURE_CONTAINER_REGISTRY_NAME string = acr.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = acr.properties.loginServer
output AZURE_CONTAINER_APP_NAME string = containerApp.name
output AZURE_CONTAINER_APP_URL string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output AZURE_CONTAINER_APPS_ENVIRONMENT_NAME string = containerAppsEnv.name
output AZURE_KEY_VAULT_NAME string = keyVault.name
output AZURE_KEY_VAULT_URL string = keyVault.properties.vaultUri
output VNET_NAME string = vnet.name
