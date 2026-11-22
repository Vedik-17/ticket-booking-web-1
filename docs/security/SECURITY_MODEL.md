# FIREFLY V1 — Security Architecture & Threat Model

## 1. Threat Mitigation Matrix

| Threat Category | Potential Vector | Firefly V1 Mitigation Architecture |
| :--- | :--- | :--- |
| **Inventory Overselling** | Concurrent rapid checkout requests for final tickets | PostgreSQL `SELECT ... FOR UPDATE` pessimistic locks; check constraint `reserved_count + sold_count <= capacity`. |
| **Counterfeit QR Passes** | Bad actor mints QR image with forged ticket ID | HMAC-SHA256 signature calculated with server secret `FIREFLY_TICKET_SECRET`. Unsigned/forged QRs fail instantly. |
| **Screenshot Ticket Sharing** | Multiple guests attempt entry with same QR photo | Atomic check-in transition `ISSUED -> CHECKED_IN`. First scan succeeds; second scan triggers `ALREADY_CHECKED_IN` duplicate alarm. |
| **Payment Signature Tampering** | Client attempts to falsify gateway success payload | Client is never trusted. Signature verification executes strictly server-side using constant-time string comparison (`crypto.timingSafeEqual`). |
| **Cross-Tenant Data Leakage** | Organiser A attempts to read or mutate Organiser B records | Supabase Row Level Security (RLS) policies scoped to `current_organiser_id()`. Privileged admin endpoints require server-validated role. |
| **Replay Attacks on Reissued Tickets** | Scanned screenshot of cancelled/reissued pass | Reissuing rotates the `security_token` nonce, invalidating the old QR signature while preserving booking history. |

---

## 2. Cryptographic Token Specification
Ticket QR payload structure:
```
FF1.<ticketId>.<eventId>.<nonce>.<signature>
```
Where:
- `FF1`: Format version prefix.
- `ticketId`: Canonical UUID of the ticket record.
- `eventId`: Canonical UUID of the host event.
- `nonce`: High-entropy 16-byte random hex token.
- `signature`: 32-character hex HMAC-SHA256 digest of `${ticketId}:${eventId}:${nonce}` using private server secret.

---

## 3. Principle of Least Privilege & RBAC
1. **Public/Guest:** Can query published events, inspect tiers, create temporary inventory holds, and view confirmed tickets via direct booking token.
2. **Organiser:** Can create/update only their own events, manage own ticket tiers, launch gate scanner for their own events, and review revenue reports for their own tenant.
3. **Admin:** Elevated privileges to suspend/reactivate organisers, moderate events platform-wide, and review aggregated financial volume.

