# FIREFLY P1 — Derivation Blueprint & Architecture Specification

## 1. Concept & Scope

FIREFLY P1 is a lightweight, single-event rapid deployment edition derived from the tested V1 foundation. It is tailored for independent event organizers who need an operational ticketing system with minimal setup, zero database hosting costs, and direct UPI payments.

---

## 2. Reusability Matrix: V1 vs. P1

| Engine / Component | Reusability | V1 Implementation | P1 Derivation Replacement |
| :--- | :--- | :--- | :--- |
| **`@firefly/shared-types`** | **100% Reused** | Canonical domain types | Reused as-is |
| **`@firefly/core`** | **100% Reused** | HMAC hashing, QR payloads, UUIDs, WhatsApp | Reused as-is |
| **`@firefly/design-system`**| **100% Reused** | Apple Liquid Glass tokens & palette | Reused as-is |
| **`@firefly/ui`** | **100% Reused** | GlassCard, GlassButton, GlassInput, etc. | Reused as-is |
| **`@firefly/ticket-engine`**| **100% Reused** | QR payload minting & verification | Reused as-is |
| **`@firefly/scanner-engine`**| **100% Reused** | Access control & duplicate detection logic | Reused as-is |
| **Storage / Persistence** | **Replaced** | PostgreSQL via Supabase (Cloud) | Browser IndexedDB (`idb-keyval` / `sql.js`) |
| **Payment Gateway** | **Replaced** | Razorpay / Automated Gateway API | Direct UPI deep-link (`upi://pay`) + Manual Verification |
| **Event Multi-Tenancy** | **Simplified** | Multi-organiser marketplace (`/events`) | Dedicated single-event landing page |
| **Authentication** | **Simplified** | Supabase Auth + JWT + RBAC | Organiser single-device 6-digit PIN |
| **Check-In Validation** | **Adapted** | Multi-gate cloud synchronization | Single organizer device local check-in |

---

## 3. How P1 Will Be Derived Without Damaging V1

1. **Independent Directory:** P1 resides in `apps/p1/`, completely isolated from `apps/v1/`.
2. **Shared Package Imports:** P1 imports shared business logic (`@firefly/core`, `@firefly/shared-types`, `@firefly/ui`, `@firefly/scanner-engine`) directly from `packages/`.
3. **Pluggable Payment Engine:** `IPaymentProvider` is implemented as `DirectUpiPaymentProvider`, generating deep-link URIs for PhonePe, Google Pay, and Paytm, accompanied by an exact-amount UPI QR code.
4. **Local IndexedDB Engine:** A local storage driver replaces the Supabase repository, ensuring 100% functionality on a static or serverless host (e.g. Vercel) without any external database.
5. **Preservation Guarantee:** V1 remains the primary enterprise codebase; P1 is simply an alternative frontend assembly using the same battle-tested engine modules.

