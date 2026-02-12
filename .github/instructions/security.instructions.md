---
description: 'Security rules for this public hackathon repository'
applyTo: '**'
---

# Security Instructions

## CRITICAL: This Repository is PUBLIC

All code in this repository is publicly visible. Protect confidential information at all times.

## Prohibited Content

- ❌ API keys, passwords, tokens, or credentials of any kind
- ❌ Customer data or Personally Identifiable Information (PII)
- ❌ Microsoft Confidential information (only General-level content)
- ❌ Azure subscription IDs, tenant IDs, resource names, or connection strings
- ❌ Proprietary algorithms or trade secrets
- ❌ Screenshots of Azure Portal containing sensitive details
- ❌ Deployment credentials or service principal secrets

## Required Practices

- ✅ Use environment variables for all configuration (`os.getenv()`)
- ✅ Use `DefaultAzureCredential` for Azure authentication
- ✅ Store secrets in `.env` file which is gitignored
- ✅ Provide `.env.example` with placeholder values only
- ✅ Review all files before committing for sensitive data
- ✅ Use placeholder values in documentation examples (e.g., `<your-endpoint>`)

## Before Every Commit

1. Check all files for hardcoded secrets or endpoints
2. Verify `.env` is listed in `.gitignore`
3. Ensure no Azure resource identifiers are exposed
4. Confirm all example values use placeholders
