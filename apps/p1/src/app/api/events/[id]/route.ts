import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { id } = await params;

  try {
    await sql`DELETE FROM p1_events WHERE id = ${id} OR slug = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting event:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { updates, tiers } = body;

    if (updates) {
      await sql`
        UPDATE p1_events SET
          title = COALESCE(${updates.title}, title),
          tagline = COALESCE(${updates.tagline}, tagline),
          description = COALESCE(${updates.description}, description),
          category = COALESCE(${updates.category}, category),
          poster_url = COALESCE(${updates.posterUrl}, poster_url),
          upi_id = COALESCE(${updates.upiId}, upi_id),
          upi_payee_name = COALESCE(${updates.upiPayeeName}, upi_payee_name),
          whatsapp_phone = COALESCE(${updates.whatsappPhone}, whatsapp_phone),
          venue = COALESCE(${updates.venue ? JSON.stringify(updates.venue) : null}, venue),
          schedule = COALESCE(${updates.schedule ? JSON.stringify(updates.schedule) : null}, schedule),
          updated_at = NOW()
        WHERE id = ${id} OR slug = ${id}
      `;
    }

    // Sync tiers if provided
    if (Array.isArray(tiers)) {
      // Find actual event id
      const rows = await sql`SELECT id FROM p1_events WHERE id = ${id} OR slug = ${id} LIMIT 1`;
      if (rows.length > 0) {
        const actualEventId = rows[0].id;
        for (const t of tiers) {
          const tierId = t.id || `t-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
          await sql`
            INSERT INTO p1_tiers (
              id, event_id, name, description, price_in_pence,
              currency, capacity, sold_count, status
            ) VALUES (
              ${tierId},
              ${actualEventId},
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
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error updating event:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

