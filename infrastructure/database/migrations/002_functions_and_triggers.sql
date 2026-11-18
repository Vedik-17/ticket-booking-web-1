-- ==============================================================================
-- FIREFLY V1 — DATABASE MIGRATION 002: FUNCTIONS, TRIGGERS & CONCURRENCY LOCKS
-- ACID transactional inventory reservations, expiry cleanup & check-in locks
-- ==============================================================================

-- 1. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to stateful tables
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_organisers_updated_at ON organisers;
CREATE TRIGGER trg_organisers_updated_at BEFORE UPDATE ON organisers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ticket_categories_updated_at ON ticket_categories;
CREATE TRIGGER trg_ticket_categories_updated_at BEFORE UPDATE ON ticket_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON tickets;
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- 2. Concurrency-Safe Atomic Inventory Reservation
-- Acquires row locks using SELECT ... FOR UPDATE to prevent race conditions & overselling
CREATE OR REPLACE FUNCTION reserve_tickets_atomically(
    p_event_id UUID,
    p_tier_id UUID,
    p_quantity INT,
    p_booking_id UUID,
    p_duration_minutes INT DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
    v_tier RECORD;
    v_available INT;
    v_reservation_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Acquire pessimistic lock on the ticket category row
    SELECT * INTO v_tier
    FROM ticket_categories
    WHERE id = p_tier_id AND event_id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'TIER_NOT_FOUND', 'message', 'Ticket tier does not exist.');
    END IF;

    IF v_tier.status <> 'ACTIVE' THEN
        RETURN jsonb_build_object('success', false, 'error', 'TIER_INACTIVE', 'message', 'Ticket tier is not currently active.');
    END IF;

    IF NOW() < v_tier.sales_start_at OR NOW() > v_tier.sales_end_at THEN
        RETURN jsonb_build_object('success', false, 'error', 'SALES_CLOSED', 'message', 'Sales for this ticket tier are closed.');
    END IF;

    IF p_quantity < v_tier.min_per_booking OR p_quantity > v_tier.max_per_booking THEN
        RETURN jsonb_build_object('success', false, 'error', 'QUANTITY_OUT_OF_BOUNDS', 'message', 'Requested quantity outside permitted limits.');
    END IF;

    v_available := v_tier.capacity - v_tier.sold_count - v_tier.reserved_count;
    IF v_available < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_STOCK', 'message', format('Only %s tickets available.', v_available));
    END IF;

    v_expires_at := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;

    -- Increment reserved count
    UPDATE ticket_categories
    SET reserved_count = reserved_count + p_quantity,
        status = CASE WHEN (sold_count + reserved_count + p_quantity) >= capacity THEN 'SOLD_OUT' ELSE status END
    WHERE id = p_tier_id;

    -- Create reservation record
    INSERT INTO inventory_reservations (booking_id, ticket_tier_id, quantity, expires_at, released)
    VALUES (p_booking_id, p_tier_id, p_quantity, v_expires_at, false)
    RETURNING id INTO v_reservation_id;

    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_reservation_id,
        'expires_at', v_expires_at,
        'quantity', p_quantity,
        'tier_name', v_tier.name,
        'price_in_pence', v_tier.price_in_pence
    );
END;
$$ LANGUAGE plpgsql;


-- 3. Release Expired Reservations (Runs periodically or before inventory lookups)
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS INT AS $$
DECLARE
    v_res RECORD;
    v_released_count INT := 0;
BEGIN
    FOR v_res IN
        SELECT id, ticket_tier_id, quantity, booking_id
        FROM inventory_reservations
        WHERE expires_at <= NOW() AND released = FALSE
        FOR UPDATE
    LOOP
        -- Decrement reserved count on ticket_categories
        UPDATE ticket_categories
        SET reserved_count = GREATEST(0, reserved_count - v_res.quantity),
            status = CASE WHEN status = 'SOLD_OUT' THEN 'ACTIVE' ELSE status END
        WHERE id = v_res.ticket_tier_id;

        -- Mark reservation as released
        UPDATE inventory_reservations
        SET released = TRUE
        WHERE id = v_res.id;

        -- Transition expired booking if still in RESERVED / PAYMENT_PENDING state
        UPDATE bookings
        SET status = 'EXPIRED'
        WHERE id = v_res.booking_id AND status IN ('INITIATED', 'RESERVED', 'PAYMENT_PENDING');

        v_released_count := v_released_count + 1;
    END LOOP;

    RETURN v_released_count;
END;
$$ LANGUAGE plpgsql;


-- 4. Atomic Check-in Verification
-- Prevents duplicate entry race conditions across multiple venue entrance scanners
CREATE OR REPLACE FUNCTION atomic_check_in(
    p_ticket_id UUID,
    p_event_id UUID,
    p_scanner_user_id UUID,
    p_security_token VARCHAR(64),
    p_ip_address VARCHAR(45) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_ticket RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Pessimistic row-level lock on ticket
    SELECT * INTO v_ticket
    FROM tickets
    WHERE id = p_ticket_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO check_ins (ticket_id, event_id, scanner_user_id, scan_result, ip_address, notes)
        VALUES (p_ticket_id, p_event_id, p_scanner_user_id, 'INVALID', p_ip_address, 'Ticket does not exist');
        RETURN jsonb_build_object('success', false, 'status', 'INVALID_QR', 'message', 'Ticket record not found.');
    END IF;

    IF v_ticket.event_id <> p_event_id THEN
        INSERT INTO check_ins (ticket_id, event_id, scanner_user_id, scan_result, ip_address, notes)
        VALUES (p_ticket_id, p_event_id, p_scanner_user_id, 'MISMATCH', p_ip_address, 'Event ID mismatch');
        RETURN jsonb_build_object('success', false, 'status', 'EVENT_MISMATCH', 'message', 'Ticket is registered for a different event.');
    END IF;

    IF v_ticket.security_token <> p_security_token THEN
        INSERT INTO check_ins (ticket_id, event_id, scanner_user_id, scan_result, ip_address, notes)
        VALUES (p_ticket_id, p_event_id, p_scanner_user_id, 'INVALID', p_ip_address, 'Stale or counterfeit security token');
        RETURN jsonb_build_object('success', false, 'status', 'INVALID_QR', 'message', 'Security token mismatch. Reissued ticket required.');
    END IF;

    IF v_ticket.status = 'REVOKED' THEN
        INSERT INTO check_ins (ticket_id, event_id, scanner_user_id, scan_result, ip_address, notes)
        VALUES (p_ticket_id, p_event_id, p_scanner_user_id, 'REVOKED', p_ip_address, 'Attempted scan of revoked ticket');
        RETURN jsonb_build_object('success', false, 'status', 'TICKET_REVOKED', 'message', 'Ticket has been revoked by organiser.');
    END IF;

    IF v_ticket.status = 'CHECKED_IN' THEN
        INSERT INTO check_ins (ticket_id, event_id, scanner_user_id, scan_result, ip_address, notes)
        VALUES (p_ticket_id, p_event_id, p_scanner_user_id, 'DUPLICATE', p_ip_address, format('Previously checked in at %s', v_ticket.checked_in_at));
        RETURN jsonb_build_object(
            'success', false,
            'status', 'ALREADY_CHECKED_IN',
            'message', 'DUPLICATE SCAN DETECTED. Ticket already admitted.',
            'checked_in_at', v_ticket.checked_in_at,
            'attendee_name', v_ticket.attendee_name,
            'tier_name', v_ticket.tier_name
        );
    END IF;

    -- Grant check-in
    UPDATE tickets
    SET status = 'CHECKED_IN',
        checked_in_at = v_now,
        checked_in_by = p_scanner_user_id
    WHERE id = p_ticket_id;

    INSERT INTO check_ins (ticket_id, event_id, scanner_user_id, scan_result, ip_address)
    VALUES (p_ticket_id, p_event_id, p_scanner_user_id, 'SUCCESS', p_ip_address);

    RETURN jsonb_build_object(
        'success', true,
        'status', 'SUCCESS',
        'message', 'Valid ticket. Access Granted.',
        'ticket_id', v_ticket.id,
        'ticket_number', v_ticket.ticket_number,
        'attendee_name', v_ticket.attendee_name,
        'tier_name', v_ticket.tier_name,
        'checked_in_at', v_now
    );
END;
$$ LANGUAGE plpgsql;
