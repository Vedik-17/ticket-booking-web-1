import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Event, TicketTier } from '@firefly/shared-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ events: [], tiers: [] });
  }

  try {
    const rawEvents = await sql`
      SELECT * FROM p1_events ORDER BY created_at DESC
    `;

    const rawTiers = await sql`
      SELECT * FROM p1_tiers ORDER BY price_in_pence ASC
    `;

    const events: Event[] = rawEvents.map((r: any) => ({
      id: r.id,
      organiserId: r.organiser_id || 'org-1',
      title: r.title,
      slug: r.slug,
      tagline: r.tagline || '',
      description: r.description || '',
      category: r.category || 'MUSIC_FESTIVAL',
      status: r.status || 'PUBLISHED',
      posterUrl: r.poster_url || '',
      galleryUrls: [],
      upiId: r.upi_id || undefined,
      upiPayeeName: r.upi_payee_name || undefined,
      whatsappPhone: r.whatsapp_phone || undefined,
      venue: typeof r.venue === 'string' ? JSON.parse(r.venue) : r.venue,
      schedule: typeof r.schedule === 'string' ? JSON.parse(r.schedule) : r.schedule,
      isAgeRestricted: false,
      featured: true,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const tiers: TicketTier[] = rawTiers.map((r: any) => ({
      id: r.id,
      eventId: r.event_id,
      name: r.name,
      description: r.description || '',
      priceInPence: Number(r.price_in_pence),
      currency: r.currency || 'INR',
      capacity: Number(r.capacity),
      soldCount: Number(r.sold_count || 0),
      reservedCount: 0,
      minPerBooking: 1,
      maxPerBooking: 50,
      salesStartAt: r.created_at,
      salesEndAt: r.created_at,
      status: r.status || 'ACTIVE',
      createdAt: r.created_at,
      updatedAt: r.created_at,
    }));

    return NextResponse.json({ events, tiers });
  } catch (err: any) {
    console.error('Error fetching events from DB:', err);
    return NextResponse.json({ events: [], tiers: [], error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { event, tiers } = body;

    if (!event || !event.title || !event.venue) {
      return NextResponse.json({ error: 'Missing required event fields' }, { status: 400 });
    }

    const id = event.id || `e-${Date.now().toString(36)}`;
    const slug = event.slug || event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${Date.now().toString(36).substring(2, 6)}`;

    // Insert or update event
    await sql`
      INSERT INTO p1_events (
        id, organiser_id, title, slug, tagline, description,
        category, status, poster_url, upi_id, upi_payee_name, whatsapp_phone,
        venue, schedule, updated_at
      ) VALUES (
        ${id},
        ${event.organiserId || 'org-1'},
        ${event.title},
        ${slug},
        ${event.tagline || ''},
        ${event.description || ''},
        ${event.category || 'MUSIC_FESTIVAL'},
        ${event.status || 'PUBLISHED'},
        ${event.posterUrl || ''},
        ${event.upiId || null},
        ${event.upiPayeeName || null},
        ${event.whatsappPhone || null},
        ${JSON.stringify(event.venue)},
        ${JSON.stringify(event.schedule)},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        tagline = EXCLUDED.tagline,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        status = EXCLUDED.status,
        poster_url = EXCLUDED.poster_url,
        upi_id = EXCLUDED.upi_id,
        upi_payee_name = EXCLUDED.upi_payee_name,
        whatsapp_phone = EXCLUDED.whatsapp_phone,
        venue = EXCLUDED.venue,
        schedule = EXCLUDED.schedule,
        updated_at = NOW()
    `;

    // Insert or update tiers if provided
    if (Array.isArray(tiers) && tiers.length > 0) {
      for (const t of tiers) {
        const tierId = t.id || `t-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
        await sql`
          INSERT INTO p1_tiers (
            id, event_id, name, description, price_in_pence,
            currency, capacity, sold_count, status
          ) VALUES (
            ${tierId},
            ${id},
            ${t.name},
            ${t.description || ''},
            ${Number(t.priceInPence) || 0},
            ${t.currency || 'INR'},
            ${Number(t.capacity) || 100},
            ${Number(t.soldCount) || 0},
            ${t.status || 'ACTIVE'}
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price_in_pence = EXCLUDED.price_in_pence,
            capacity = EXCLUDED.capacity,
            sold_count = EXCLUDED.sold_count,
            status = EXCLUDED.status
        `;
      }
    }

    return NextResponse.json({ success: true, eventId: id, slug });
  } catch (err: any) {
    console.error('Error saving event to DB:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
