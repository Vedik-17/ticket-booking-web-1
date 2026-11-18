# FIREFLY V1 — API Specification

All routes return standard JSON envelopes `{ success: boolean, ... }`.

---

## 1. Public Marketplace Endpoints

### `GET /api/events`
Query active published events with optional filtering.
- **Query Parameters:**
  - `category`: Filter by event category (`CONCERT`, `MUSIC_FESTIVAL`, etc.)
  - `q`: Search string matching title, description, or venue city
  - `city`: Location filter
- **Response:**
  ```json
  {
    "success": true,
    "events": [
      {
        "id": "e0000000-0000-0000-0000-000000000001",
        "title": "SOLARIS: Liquid Electronic Festival 2026",
        "slug": "solaris-2026",
        "category": "MUSIC_FESTIVAL",
        "status": "PUBLISHED",
        "venue": { "city": "Hyderabad" }
      }
    ]
  }
  ```

### `GET /api/events/:id`
Retrieve detailed event specification and active ticket tiers.

---

## 2. Guest Reservation & Checkout

### `POST /api/bookings/reserve`
Atomically allocates ticket inventory and generates a 10-minute reservation.
- **Request Body:**
  ```json
  {
    "eventId": "e0000000-0000-0000-0000-000000000001",
    "organiserId": "d0000000-0000-0000-0000-000000000001",
    "customer": {
      "fullName": "Alex Sharma",
      "email": "alex@example.com",
      "phone": "+919876543210",
      "whatsappOptIn": true
    },
    "items": [
      { "tierId": "f0000000-0000-0000-0000-000000000001", "quantity": 2 }
    ]
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "booking": {
      "id": "uuid",
      "bookingReference": "FF-2026-X89J",
      "status": "RESERVED",
      "reservationExpiresAt": "2026-12-15T16:10:00Z",
      "totalAmountInPence": 409795
    }
  }
  ```

---

## 3. Payment Processing & Verification

### `POST /api/payments/create-order`
Initializes gateway transaction with Razorpay or active provider.
- **Request Body:** `{ "bookingId": "uuid" }`
- **Response:** `{ "success": true, "order": { "orderId": "order_xxx", "amountInPence": 409795 } }`

### `POST /api/payments/verify`
Server-side cryptographic verification of gateway signature.
- **Request Body:**
  ```json
  {
    "bookingId": "uuid",
    "orderId": "order_xxx",
    "paymentId": "pay_xxx",
    "signature": "hmac_hex_signature"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Payment verified successfully. Tickets issued.",
    "tickets": [
      {
        "id": "uuid",
        "ticketNumber": "VIP-9J8A-42",
        "qrPayload": "FF1.uuid.eventId.token.sig"
      }
    ]
  }
  ```

---

## 4. Gate Entrance Check-In

### `POST /api/check-in`
Atomic scan verification across multiple entrance gates.
- **Request Body:**
  ```json
  {
    "qrPayload": "FF1.uuid.eventId.token.sig",
    "eventId": "e0000000-0000-0000-0000-000000000001",
    "scannerUserId": "GATE-AGENT-01"
  }
  ```
- **Responses:**
  - `SUCCESS`: `{ "status": "SUCCESS", "message": "Ticket successfully verified. Access Granted." }`
  - `DUPLICATE`: `{ "status": "ALREADY_CHECKED_IN", "message": "DUPLICATE ENTRY DETECTED! Already admitted at 19:42." }`
  - `MISMATCH`: `{ "status": "EVENT_MISMATCH", "message": "Ticket belongs to a different event." }`
