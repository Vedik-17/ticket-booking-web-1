import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Booking, Ticket } from '@firefly/shared-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ bookings: [], tickets: [] });
  }

  try {
    const rawBookings = await sql`
      SELECT * FROM p1_bookings ORDER BY created_at DESC
    `;

    let rawTickets = await sql`
      SELECT * FROM p1_tickets ORDER BY created_at DESC
    `;

    // Auto-heal: Ensure every booking has ticket records in Postgres
    const existingTicketBookingIds = new Set(rawTickets.map((t: any) => t.booking_id));
    for (const b of rawBookings) {
      if (!existingTicketBookingIds.has(b.id)) {
        const items = typeof b.items === 'string' ? JSON.parse(b.items) : (b.items || []);
        const cust = typeof b.customer === 'string' ? JSON.parse(b.customer) : (b.customer || {});
        for (const item of items) {
          const qty = Number(item.quantity) || 1;
          for (let i = 0; i < qty; i++) {
            const ticketId = `tkt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
            const ticketNumber = `TKT-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const qrPayload = `FF1.${ticketId}.${b.event_id}.${ticketNumber}`;
            const tierId = item.tierId || item.ticketTierId || 'default';
            const tierName = item.tierName || 'Standard Pass';
            const attendeeName = cust.fullName || 'Attendee';

            await sql`
              INSERT INTO p1_tickets (
                id, ticket_number, booking_id, event_id, tier_id,
                tier_name, attendee_name, qr_payload, status, checked_in_at
              ) VALUES (
                ${ticketId}, ${ticketNumber}, ${b.id}, ${b.event_id}, ${tierId},
                ${tierName}, ${attendeeName}, ${qrPayload}, 'ISSUED', null
              )
              ON CONFLICT (id) DO NOTHING
            `;

            rawTickets.push({
              id: ticketId,
              ticket_number: ticketNumber,
              booking_id: b.id,
              event_id: b.event_id,
              tier_id: tierId,
              tier_name: tierName,
              attendee_name: attendeeName,
              qr_payload: qrPayload,
              status: 'ISSUED',
              checked_in_at: null,
              created_at: b.created_at,
            });
          }
        }
      }
    }

    const bookings: Booking[] = rawBookings.map((b: any) => ({
      id: b.id,
      bookingReference: b.booking_reference,
      eventId: b.event_id,
      organiserId: b.organiser_id || 'org-1',
      customer: typeof b.customer === 'string' ? JSON.parse(b.customer) : b.customer,
      items: typeof b.items === 'string' ? JSON.parse(b.items) : b.items,
      status: b.status,
      subtotalInPence: Number(b.total_amount_in_pence),
      serviceFeeInPence: 0,
      totalAmountInPence: Number(b.total_amount_in_pence),
      currency: 'INR',
      reservationExpiresAt: b.created_at,
      paymentMethod: b.payment_method || 'UPI',
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));

    const tickets: Ticket[] = rawTickets.map((t: any) => ({
      id: t.id,
      ticketNumber: t.ticket_number,
      bookingId: t.booking_id,
      eventId: t.event_id,
      ticketTierId: t.tier_id,
      tierName: t.tier_name,
      attendeeName: t.attendee_name,
      qrPayload: t.qr_payload,
      securityToken: t.id,
      status: t.status,
      checkedInAt: t.checked_in_at || undefined,
      createdAt: t.created_at,
      updatedAt: t.created_at,
    }));

    return NextResponse.json({ bookings, tickets });
  } catch (err: any) {
    console.error('Error fetching bookings from DB:', err);
    return NextResponse.json({ bookings: [], tickets: [], error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { booking, tickets } = body;

    if (!booking || !booking.id) {
      return NextResponse.json({ error: 'Invalid booking data' }, { status: 400 });
    }

    await sql`
      INSERT INTO p1_bookings (
        id, booking_reference, event_id, customer, items,
        status, total_amount_in_pence, payment_method, updated_at
      ) VALUES (
        ${booking.id},
        ${booking.bookingReference},
        ${booking.eventId},
        ${JSON.stringify(booking.customer)},
        ${JSON.stringify(booking.items)},
        ${booking.status},
        ${booking.totalAmountInPence},
        ${booking.paymentMethod || 'UPI'},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW()
    `;

    if (Array.isArray(tickets) && tickets.length > 0) {
      for (const t of tickets) {
        const tierId = t.ticketTierId || t.tierId || 'default';
        await sql`
          INSERT INTO p1_tickets (
            id, ticket_number, booking_id, event_id, tier_id,
            tier_name, attendee_name, qr_payload, status, checked_in_at
          ) VALUES (
            ${t.id},
            ${t.ticketNumber},
            ${t.bookingId},
            ${t.eventId},
            ${tierId},
            ${t.tierName || ''},
            ${t.attendeeName || ''},
            ${t.qrPayload || ''},
            ${t.status || 'ISSUED'},
            ${t.checkedInAt || null}
          )
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            checked_in_at = EXCLUDED.checked_in_at
        `;
      }
    }

    // Increment tier sold counts if booking is created
    if (Array.isArray(booking.items)) {
      for (const item of booking.items) {
        const tId = item.tierId || item.ticketTierId;
        if (tId) {
          await sql`
            UPDATE p1_tiers
            SET sold_count = sold_count + ${Number(item.quantity) || 1}
            WHERE id = ${tId}
          `;
        }
      }
    }

    return NextResponse.json({ success: true, bookingId: booking.id });
  } catch (err: any) {
    console.error('Error saving booking to DB:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { bookingId, status, ticketStatus, tickets } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    await sql`
      UPDATE p1_bookings
      SET status = ${status || 'CONFIRMED'}, updated_at = NOW()
      WHERE id = ${bookingId}
    `;

    if (ticketStatus) {
      await sql`
        UPDATE p1_tickets
        SET status = ${ticketStatus}
        WHERE booking_id = ${bookingId}
      `;
    }

    if (Array.isArray(tickets) && tickets.length > 0) {
      for (const t of tickets) {
        const tierId = t.ticketTierId || t.tierId || 'default';
        await sql`
          INSERT INTO p1_tickets (
            id, ticket_number, booking_id, event_id, tier_id,
            tier_name, attendee_name, qr_payload, status, checked_in_at
          ) VALUES (
            ${t.id},
            ${t.ticketNumber},
            ${t.bookingId},
            ${t.eventId},
            ${tierId},
            ${t.tierName || ''},
            ${t.attendeeName || ''},
            ${t.qrPayload || ''},
            ${t.status || 'ISSUED'},
            ${t.checkedInAt || null}
          )
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            checked_in_at = EXCLUDED.checked_in_at
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error updating booking status:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const url = new URL(req.url);
    let bookingId = (url.searchParams.get('id') || url.searchParams.get('bookingId') || '').trim();

    if (!bookingId) {
      try {
        const body = await req.json();
        bookingId = body.bookingId || body.id;
      } catch {}
    }

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    // 1. Delete all associated tickets to immediately revoke gate access
    await sql`
      DELETE FROM p1_tickets
      WHERE booking_id = ${bookingId}
    `;

    // 2. Delete the booking record
    await sql`
      DELETE FROM p1_bookings
      WHERE id = ${bookingId}
    `;

    return NextResponse.json({ success: true, deletedBookingId: bookingId });
  } catch (err: any) {
    console.error('Error deleting booking:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
