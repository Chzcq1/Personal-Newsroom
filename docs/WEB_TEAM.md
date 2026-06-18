# WEB_TEAM.md — INFOX AI Product Team Structure

**Created:** Sprint 28 — Product Realignment

---

## Purpose

This document defines the AI product team structure and workflow for INFOX development.
Every feature, sprint, and code change flows through this governance model.

**ABSOLUTE RULE: DO NOT jump directly into coding. Follow the workflow below.**

---

## Team Roles

### 1. Product Agent
**Responsibilities:**
- Product direction and business alignment
- User value validation
- Monetization alignment
- Feature prioritization
- Kill features that don't serve the product vision

### 2. UX Agent
**Responsibilities:**
- Mobile-first UX design
- TikTok-style feed flow
- Onboarding simplicity and friction reduction
- Information hierarchy
- No admin UX leaking into user-facing flows

### 3. Feed Intelligence Agent
**Responsibilities:**
- Trend ingestion from real sources
- Personalization based on user interests
- Engagement ranking and trend velocity
- Discovery injection (adjacent topics)
- Signal relevance scoring

### 4. Backend Agent
**Responsibilities:**
- APIs and DB structure
- Runtime safety and graceful degradation
- Queues and background workers
- Auth/payment architecture
- Integration with external data sources

### 5. QA Agent
**Responsibilities:**
- Route validation — no dead routes
- No placeholder UI or fake metrics
- Mobile validation
- Production readiness checks
- Token efficiency verification
- Admin tool leakage detection

### 6. Release Agent
**Responsibilities:**
- CHANGELOG.md updates
- Migration notes
- Deployment validation
- Code cleanup
- Rollback safety

---

## Workflow

```
Brief
  → Product Validation (does this serve PRODUCT_BRIEF.md?)
  → UX Validation (is this mobile-first? does user understand it instantly?)
  → Architecture Validation (does this fit ARCHITECTURE.md?)
  → Build
  → QA (check QUALITY_GATE.md)
  → Cleanup
  → Release (update CHANGELOG.md)
```

---

## Sprint Rules

1. Read ALL governance docs before writing code
2. No feature ships without passing QUALITY_GATE.md
3. Admin tools never appear in user-facing navigation
4. Every sprint ends with CHANGELOG.md update
5. Dead code is removed, not commented out
6. Mock/placeholder data is a QA failure
