# HIPAA Business Associate Agreement (BAA) Requirements

## Overview

MedTask AI processes Protected Health Information (PHI). Any third-party service
that stores, processes, or transmits PHI on our behalf is a **Business Associate**
under HIPAA and must sign a BAA before production use.

## Required BAAs

### 1. Clerk (Authentication)

- **Role:** Stores user email, name, session tokens. If we store org/patient
  context in Clerk metadata, it becomes a BA.
- **BAA Status:** Clerk offers a BAA on their Enterprise plan.
- **Action Required:**
  - Upgrade to Clerk Enterprise (or confirm current plan includes BAA).
  - Execute BAA before storing any PHI-adjacent data in Clerk.
  - Avoid storing PHI (patient names, MRNs, diagnoses) in Clerk user metadata.

### 2. Hosting Provider (Vercel / Railway)

- **Vercel:**
  - Offers BAA on Enterprise plan.
  - Required because Next.js serverless functions process tRPC requests
    containing PHI (task titles, descriptions referencing patients).
  - Action: Execute Vercel Enterprise BAA.

- **Railway (Postgres):**
  - Offers BAA on Pro plan.
  - Database stores all PHI (tasks, patients, audit logs).
  - Encryption at rest is handled by managed Postgres (AES-256).
  - Action: Execute Railway BAA before production database provisioning.

### 3. Future Integrations

Any new service that touches PHI needs a BAA **before** integration:
- Email/notification providers (SendGrid, Resend, etc.)
- AI/LLM providers (if sending PHI to models)
- Monitoring/logging services (Datadog, Sentry — ensure PHI scrubbing first)
- File storage (S3, Cloudflare R2)

## Encryption Posture

| Layer            | Mechanism                        | Owner           |
|------------------|----------------------------------|-----------------|
| At rest (DB)     | AES-256, managed Postgres        | Railway/Vercel  |
| In transit       | TLS 1.3                          | Hosting + CDN   |
| Application logs | PHI scrubbed before output       | MedTask app     |
| Backups          | Encrypted by hosting provider    | Railway/Vercel  |

## Checklist Before Production

- [ ] Clerk BAA signed
- [ ] Hosting provider BAA signed (Vercel or alternative)
- [ ] Database provider BAA signed (Railway or alternative)
- [ ] PHI scrubbing verified in all log outputs
- [ ] Audit logging active on all mutations
- [ ] Session timeout ≤ 15 min enforced
- [ ] Security headers deployed (CSP, HSTS, X-Frame-Options)
- [ ] Penetration test / vulnerability scan scheduled
- [ ] Staff HIPAA training documented
- [ ] Incident response plan documented
