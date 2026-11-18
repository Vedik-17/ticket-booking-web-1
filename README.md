# FIREFLY — Unified Event Ticketing Platform

FIREFLY is an event ticketing platform built for live events, concerts, music festivals, exhibitions, conferences, and premium ticketed experiences.

## Architecture

This repository is structured as a modular monorepo supporting two distinct editions:

- **FIREFLY V1 (`apps/v1`)**: The full commercial platform (Marketplace + Multi-tenant Organiser SaaS + Platform Admin). Backed by PostgreSQL (Supabase), server-side concurrency-safe booking engine, Razorpay gateway integration, cryptographic QR issuance, and real-time mobile check-in.
- **FIREFLY P1 (`apps/p1`)**: The lightweight rapid single-event prototype, derived from V1 core engines with client-side IndexedDB persistence, direct UPI deep-linking, and single-device organiser check-in.

```
FIREFLY/
├── apps/
│   ├── v1/                       # Full commercial V1 application (Next.js App Router)
│   └── p1/                       # Reserved P1 single-event prototype
├── packages/
│   ├── shared-types/             # Canonical domain models & state machine types
│   ├── core/                     # Cryptography, validation, HMAC signing & helpers
│   ├── design-system/            # Liquid Glass design tokens & theme configuration
│   ├── event-engine/             # Event lifecycle, querying & moderation
│   ├── inventory-engine/         # Concurrency-safe ticket reservation & release
│   ├── booking-engine/           # Booking state machine & checkout lifecycle
│   ├── payment-engine/           # Payment gateway abstraction & Razorpay integration
│   ├── ticket-engine/            # Cryptographic QR ticket generation & PDF layout
│   ├── scanner-engine/           # Check-in validation & duplicate entry prevention
│   └── ui/                       # Apple Liquid Glass UI components
├── infrastructure/
│   ├── database/                 # PostgreSQL migrations, RLS policies & triggers
│   ├── deployment/               # Vercel & Supabase deployment guides
│   └── security/                 # Security threat models & audit checklist
└── docs/                         # Architecture, API & Database documentation
```

## Quick Start (V1)

```bash
# Navigate to monorepo
cd FIREFLY

# Install dependencies
npm install

# Start V1 development server
npm run dev

# Run test suite
npm run test

# Build production bundle
npm run build
```

## Design Language: Liquid Glass
Inspired by Apple's design language:
- **Base:** OLED Black (`#080808`), Charcoal (`#111111`), Deep Surface (`#181818`)
- **Accents:** Fiery Orange (`#FF6A1A`), Ember Orange (`#FF9A45`)
- **Effects:** Multi-layered glassmorphism, subtle backdrop-blur, translucent borders, ambient light diffusion.
