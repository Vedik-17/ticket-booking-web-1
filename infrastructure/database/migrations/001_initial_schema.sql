-- ==============================================================================
-- FIREFLY V1 — DATABASE MIGRATION 001: INITIAL SCHEMA
-- PostgreSQL schema for multi-tenant event ticketing platform
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Unified user directory with Role-Based Access Control)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    role VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ORGANISER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ORGANISERS (Multi-tenant SaaS accounts)
CREATE TABLE IF NOT EXISTS organisers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    support_email VARCHAR(255) NOT NULL,
    support_phone VARCHAR(32) NOT NULL,
    website_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED')),
    payout_upi_id VARCHAR(128),
    payout_bank_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organisers_user_id ON organisers(user_id);
CREATE INDEX IF NOT EXISTS idx_organisers_status ON organisers(status);

-- 3. EVENTS (Event listings, venues, and status lifecycle)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organiser_id UUID NOT NULL REFERENCES organisers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    tagline VARCHAR(255),
    description TEXT NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (category IN (
        'CONCERT', 'MUSIC_FESTIVAL', 'NIGHTLIFE', 'EXHIBITION', 'CONFERENCE', 'THEATRE_COMEDY', 'SPORTS'
    )),
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'PUBLISHED', 'POSTPONED', 'CANCELLED', 'COMPLETED'
    )),
    poster_url TEXT NOT NULL,
    gallery_urls TEXT[] NOT NULL DEFAULT '{}',
    venue JSONB NOT NULL,
    schedule JSONB NOT NULL,
    is_age_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    minimum_age INT,
    terms_and_conditions TEXT,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organiser_id ON events(organiser_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);

-- 4. TICKET CATEGORIES (Tiers and inventory allocations)
CREATE TABLE IF NOT EXISTS ticket_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    price_in_pence INT NOT NULL CHECK (price_in_pence >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    capacity INT NOT NULL CHECK (capacity > 0),
    reserved_count INT NOT NULL DEFAULT 0 CHECK (reserved_count >= 0),
    sold_count INT NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
    min_per_booking INT NOT NULL DEFAULT 1 CHECK (min_per_booking >= 1),
    max_per_booking INT NOT NULL DEFAULT 10 CHECK (max_per_booking >= 1),
    sales_start_at TIMESTAMPTZ NOT NULL,
    sales_end_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD_OUT', 'PAUSED', 'HIDDEN')),
    perks TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_capacity_overflow CHECK (reserved_count + sold_count <= capacity)
);

CREATE INDEX IF NOT EXISTS idx_ticket_categories_event ON ticket_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_categories_status ON ticket_categories(status);

-- 5. BOOKINGS (Transactions & Guest Checkout)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(32) UNIQUE NOT NULL,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    organiser_id UUID NOT NULL REFERENCES organisers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_whatsapp_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
    is_guest BOOLEAN NOT NULL DEFAULT TRUE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    subtotal_in_pence INT NOT NULL CHECK (subtotal_in_pence >= 0),
    service_fee_in_pence INT NOT NULL DEFAULT 0 CHECK (service_fee_in_pence >= 0),
    total_amount_in_pence INT NOT NULL CHECK (total_amount_in_pence >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL DEFAULT 'RESERVED' CHECK (status IN (
        'INITIATED', 'RESERVED', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING',
        'CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED'
    )),
    reservation_expires_at TIMESTAMPTZ NOT NULL,
    payment_order_id VARCHAR(128),
    payment_id VARCHAR(128),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_organiser ON bookings(organiser_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON bookings(reservation_expires_at) WHERE status = 'RESERVED';

-- 6. BOOKING ITEMS (Line items breakdown)
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    ticket_tier_id UUID NOT NULL REFERENCES ticket_categories(id) ON DELETE RESTRICT,
    tier_name VARCHAR(128) NOT NULL,
    unit_price_in_pence INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price_in_pence INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);

-- 7. INVENTORY RESERVATIONS (Time-bound hold records)
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    ticket_tier_id UUID NOT NULL REFERENCES ticket_categories(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    expires_at TIMESTAMPTZ NOT NULL,
    released BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_res_active ON inventory_reservations(expires_at, released) WHERE released = FALSE;

-- 8. PAYMENT ATTEMPTS (Auditable payment ledger)
CREATE TABLE IF NOT EXISTS payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    order_id VARCHAR(128) NOT NULL,
    payment_id VARCHAR(128),
    amount_in_pence INT NOT NULL,
    currency VARCHAR(8) NOT NULL,
    status VARCHAR(32) NOT NULL,
    signature VARCHAR(255),
    error_message TEXT,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_booking ON payment_attempts(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_order ON payment_attempts(order_id);

-- 9. TICKETS (Cryptographically secure digital passes)
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(32) UNIQUE NOT NULL,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    ticket_tier_id UUID NOT NULL REFERENCES ticket_categories(id) ON DELETE RESTRICT,
    tier_name VARCHAR(128) NOT NULL,
    attendee_name VARCHAR(255) NOT NULL,
    qr_payload TEXT NOT NULL,
    security_token VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'CHECKED_IN', 'REVOKED', 'TRANSFERRED')),
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_booking ON tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- 10. CHECK-INS (Audit trail of venue scans)
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    scanner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    scan_result VARCHAR(32) NOT NULL CHECK (scan_result IN ('SUCCESS', 'DUPLICATE', 'REVOKED', 'INVALID', 'MISMATCH')),
    ip_address VARCHAR(45),
    notes TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_ins_ticket ON check_ins(ticket_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_event ON check_ins(event_id);

-- 11. AUDIT LOGS (Compliance and security tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
