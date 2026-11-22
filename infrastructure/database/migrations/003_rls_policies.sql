-- ==============================================================================
-- FIREFLY V1 — DATABASE MIGRATION 003: ROW LEVEL SECURITY (RLS) POLICIES
-- Enforces tenant isolation and role-based access control directly at database level
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS VARCHAR AS $$
BEGIN
    RETURN (
        SELECT role FROM profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Is current user platform administrator
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_user_role() = 'ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get current user's organiser ID
CREATE OR REPLACE FUNCTION current_organiser_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM organisers
        WHERE user_id = auth.uid() AND status = 'ACTIVE'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id OR is_platform_admin());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id OR is_platform_admin());


-- 2. ORGANISERS POLICIES
CREATE POLICY "Public can view active organiser basic profiles"
    ON organisers FOR SELECT
    USING (status = 'ACTIVE' OR user_id = auth.uid() OR is_platform_admin());

CREATE POLICY "Organisers can update their own profile"
    ON organisers FOR UPDATE
    USING (user_id = auth.uid() OR is_platform_admin());

CREATE POLICY "Admins can manage all organisers"
    ON organisers FOR ALL
    USING (is_platform_admin());


-- 3. EVENTS POLICIES
CREATE POLICY "Public can view published events"
    ON events FOR SELECT
    USING (status = 'PUBLISHED' OR organiser_id = current_organiser_id() OR is_platform_admin());

CREATE POLICY "Organisers can insert own events"
    ON events FOR INSERT
    WITH CHECK (organiser_id = current_organiser_id() OR is_platform_admin());

CREATE POLICY "Organisers can update own events"
    ON events FOR UPDATE
    USING (organiser_id = current_organiser_id() OR is_platform_admin());

CREATE POLICY "Organisers can delete draft events only"
    ON events FOR DELETE
    USING ((organiser_id = current_organiser_id() AND status = 'DRAFT') OR is_platform_admin());


-- 4. TICKET CATEGORIES POLICIES
CREATE POLICY "Public can view active ticket tiers for published events"
    ON ticket_categories FOR SELECT
    USING (
        status IN ('ACTIVE', 'SOLD_OUT')
        OR event_id IN (SELECT id FROM events WHERE organiser_id = current_organiser_id())
        OR is_platform_admin()
    );

CREATE POLICY "Organisers can manage ticket tiers for own events"
    ON ticket_categories FOR ALL
    USING (
        event_id IN (SELECT id FROM events WHERE organiser_id = current_organiser_id())
        OR is_platform_admin()
    );


-- 5. BOOKINGS POLICIES
CREATE POLICY "Organisers can view bookings for their own events"
    ON bookings FOR SELECT
    USING (
        organiser_id = current_organiser_id()
        OR user_id = auth.uid()
        OR is_platform_admin()
    );

-- Allow server actions/service role to insert bookings for guest checkout
CREATE POLICY "Service and guests can insert bookings"
    ON bookings FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Organisers and admins can update bookings"
    ON bookings FOR UPDATE
    USING (organiser_id = current_organiser_id() OR is_platform_admin());


-- 6. TICKETS POLICIES
CREATE POLICY "Organisers and ticket holders can view tickets"
    ON tickets FOR SELECT
    USING (
        event_id IN (SELECT id FROM events WHERE organiser_id = current_organiser_id())
        OR is_platform_admin()
    );

CREATE POLICY "Organisers and check-in staff can update tickets"
    ON tickets FOR UPDATE
    USING (
        event_id IN (SELECT id FROM events WHERE organiser_id = current_organiser_id())
        OR is_platform_admin()
    );


-- 7. CHECK-INS POLICIES
CREATE POLICY "Organisers can view check-in logs for their events"
    ON check_ins FOR SELECT
    USING (
        event_id IN (SELECT id FROM events WHERE organiser_id = current_organiser_id())
        OR is_platform_admin()
    );

CREATE POLICY "Check-in agents can record scans"
    ON check_ins FOR INSERT
    WITH CHECK (
        event_id IN (SELECT id FROM events WHERE organiser_id = current_organiser_id())
        OR is_platform_admin()
    );


-- 8. AUDIT LOGS POLICIES
CREATE POLICY "Only admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (is_platform_admin());

CREATE POLICY "System can append audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (TRUE);

