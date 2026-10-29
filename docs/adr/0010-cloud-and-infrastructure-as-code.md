# 0010. One cloud provider in Australia, infrastructure as code

- **Status:** Proposed (provider choice needs confirmation of available credits)
- **Date:** 2026-10-28
- **Deciders:** Prasana (interim approver)
- **V11 references:** §6 "one cloud provider, infrastructure-as-code", §12.5, §12.12, NFR-SEC-001..003, NFR-RES-001

## Context

V11 asks for one cloud provider, infrastructure as code, and separate dev, test/UAT and production environments. Buyers' FHB income and deposit data makes Australian data residency a sensible default for the privacy impact assessment.

## Decision

- **Provider:** AWS in `ap-southeast-2` (Sydney), unless the university or client has credits with Azure (Australia East) or Google Cloud (Sydney). The architecture below maps one-to-one onto any of them, so the choice should follow credits.
- **Runtime:** the Next.js app in a container on a managed container service (AWS App Runner or ECS Fargate); background ingestion jobs as a second container from the same image.
- **Data:** managed PostgreSQL 16 (RDS) with PostGIS and pgvector; object storage (S3) for media and raw feed payloads; secrets in the provider's secrets manager. Encryption at rest and TLS everywhere.
- **IaC:** OpenTofu (open-source Terraform) in `infra/`, one module per environment. No manual console changes to test or production.
- **Environments:** `dev` (local Docker Compose with PostGIS), `test` (UAT), `prod`. Add `staging` only if UAT stops being production-like enough.
- **Design-semester cost:** zero cloud spend is needed. Local Docker Compose is enough for the prototype. Provision `test` at the start of the build semester.

## Consequences

- Containers keep us portable between clouds, which limits vendor lock-in.
- More setup than a platform like Vercel, but it keeps data in Australia and avoids splitting the system across several vendors.
- Someone on the team must own the IaC; this is a WS12 responsibility (§12.9).

## Alternatives considered

- **Vercel + a hosted Postgres:** fastest to deploy, but adds two vendors to the privacy assessment, and residency and cost at scale are less predictable.
- **Kubernetes:** unnecessary operational load for one app and one worker.

## Conflict with brief

None.
