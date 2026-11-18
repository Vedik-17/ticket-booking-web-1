-- ==============================================================================
-- FIREFLY V1 — DATABASE SEED 001: DEMO SEED DATA
-- Default administrator, verified organizers, live events, tiers, and bookings
-- ==============================================================================

-- 1. Create Default Profiles
INSERT INTO profiles (id, email, full_name, phone, role)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin@firefly.live', 'Platform Administrator', '+919876543210', 'ADMIN'),
    ('b0000000-0000-0000-0000-000000000002', 'lumina@experiences.io', 'Lumina Music Group', '+919876543211', 'ORGANISER'),
    ('c0000000-0000-0000-0000-000000000003', 'curator@echoes.art', 'Echoes Electronic collective', '+919876543212', 'ORGANISER')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Organisers
INSERT INTO organisers (id, user_id, business_name, support_email, support_phone, website_url, status, payout_upi_id)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Lumina Experiences', 'support@lumina.live', '+919876543211', 'https://lumina.live', 'ACTIVE', 'lumina@okaxis'),
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'Echoes Arts & Sound', 'hello@echoes.art', '+919876543212', 'https://echoes.art', 'ACTIVE', 'echoes@okicici')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Events
INSERT INTO events (
    id, organiser_id, title, slug, tagline, description, category, status, poster_url, gallery_urls, venue, schedule, is_age_restricted, minimum_age, featured
)
VALUES
    (
        'e0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'SOLARIS: Liquid Electronic Festival 2026',
        'solaris-2026',
        'A transcendent 12-hour progressive & melodic techno celebration under open skies.',
        'Immerse in an audio-visual spectacle featuring world-class progressive techno pioneers, multi-dimensional holographic stage architecture, spatial acoustics, and ambient liquid installations.',
        'MUSIC_FESTIVAL',
        'PUBLISHED',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
        ARRAY[
            'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80'
        ],
        '{"name": "GMR Arena Grounds", "address": "Outer Ring Road, Rajiv Gandhi International Airport Complex", "city": "Hyderabad", "state": "Telangana", "postalCode": "500108", "country": "India", "googleMapsUrl": "https://maps.google.com/?q=GMR+Arena+Hyderabad"}'::jsonb,
        '{"doorsOpenAt": "2026-12-15T16:00:00Z", "startsAt": "2026-12-15T17:00:00Z", "endsAt": "2026-12-16T04:00:00Z", "timezone": "Asia/Kolkata"}'::jsonb,
        TRUE,
        21,
        TRUE
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000002',
        'Prism Horizon: Modern Light & Sound Exhibition',
        'prism-horizon',
        'Interactive kinetic sculpture, refractive lasers, and ambient soundscapes.',
        'Step inside an otherworldly labyrinth of responsive LED arrays, infinity glass corridors, and spatial synth compositions designed to reshape perception of architectural light.',
        'EXHIBITION',
        'PUBLISHED',
        'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
        ARRAY[
            'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'
        ],
        '{"name": "The Glass Pavilions", "address": "42 Hitec City Main Road, Cyberabad", "city": "Hyderabad", "state": "Telangana", "postalCode": "500081", "country": "India", "googleMapsUrl": "https://maps.google.com/?q=Hitec+City+Hyderabad"}'::jsonb,
        '{"doorsOpenAt": "2026-11-28T10:00:00Z", "startsAt": "2026-11-28T11:00:00Z", "endsAt": "2026-11-28T22:00:00Z", "timezone": "Asia/Kolkata"}'::jsonb,
        FALSE,
        NULL,
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- 4. Create Ticket Categories
INSERT INTO ticket_categories (
    id, event_id, name, description, price_in_pence, currency, capacity, reserved_count, sold_count, min_per_booking, max_per_booking, sales_start_at, sales_end_at, status, perks
)
VALUES
    (
        'f0000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000001',
        'General Admission (Phase 1)',
        'Full festival access to main amphitheatre and outdoor stages.',
        199900,
        'INR',
        1000,
        0,
        42,
        1,
        6,
        '2026-01-01T00:00:00Z',
        '2026-12-15T15:00:00Z',
        'ACTIVE',
        ARRAY['Main Stage Access', 'Express Entry Lane']
    ),
    (
        'f0000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000001',
        'VIP Deck & Backstage Lounge',
        'Elevated mezzanine viewing deck, dedicated craft bars, and private air-conditioned lounges.',
        499900,
        'INR',
        200,
        0,
        15,
        1,
        4,
        '2026-01-01T00:00:00Z',
        '2026-12-15T15:00:00Z',
        'ACTIVE',
        ARRAY['Elevated VIP Platform', 'Complimentary Welcome Beverage', 'Dedicated Restrooms', 'Priority Parking']
    ),
    (
        'f0000000-0000-0000-0000-000000000003',
        'e0000000-0000-0000-0000-000000000002',
        'Standard Day Pass',
        'Single entry admission to all interactive galleries and light chambers.',
        79900,
        'INR',
        500,
        0,
        18,
        1,
        8,
        '2026-01-01T00:00:00Z',
        '2026-11-28T20:00:00Z',
        'ACTIVE',
        ARRAY['All Exhibition Halls Access', 'Digital Audio Guide Link']
    )
ON CONFLICT (id) DO NOTHING;
