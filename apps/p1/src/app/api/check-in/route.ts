import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ success: false, reason: 'Database not available' }, { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const code = (url.searchParams.get('code') || '').trim();
    if (!code) {
      return NextResponse.json({ success: false, reason: 'MISSING_CODE' }, { status: 400 });
    }

    let raw = code;
    if (raw.includes('/ticket/')) {
      const parts = raw.split('/ticket/');
      if (parts[1]) {
        raw = parts[1].split('?')[0].split('#')[0].trim();
      }
    }
    let extractedTicketId = raw;
    if (raw.startsWith('FF1.')) {
      const parts = raw.split('.');
      if (parts.length >= 2) extractedTicketId = parts[1];
    }

    // Try finding ticket in p1_tickets
    const ticketRows = await sql`
      SELECT * FROM p1_tickets
      WHERE id = ${raw}
         OR id = ${extractedTicketId}
         OR UPPER(ticket_number) = ${raw.toUpperCase()}
         OR qr_payload = ${raw}
      LIMIT 1
    `;

    let bookingId = '';
    let matchedTicket = null;

    if (ticketRows.length > 0) {
      matchedTicket = ticketRows[0];
      bookingId = matchedTicket.booking_id;
    } else {
      // Try finding booking
      const bRows = await sql`
        SELECT * FROM p1_bookings
        WHERE id = ${raw}
           OR UPPER(booking_reference) = ${raw.toUpperCase()}
        LIMIT 1
      `;
      if (bRows.length > 0) {
        bookingId = bRows[0].id;
      }
    }

    if (!bookingId) {
      return NextResponse.json({ status: 'INVALID', message: 'No ticket or booking found.' });
    }

    // Fetch booking
    const bookingRows = await sql`SELECT * FROM p1_bookings WHERE id = ${bookingId} LIMIT 1`;
    const booking = bookingRows[0] || null;

    // Fetch sibling tickets
    const siblingTickets = await sql`SELECT * FROM p1_tickets WHERE booking_id = ${bookingId}`;

    // Fetch event
    const eventId = matchedTicket?.event_id || booking?.event_id;
    let event = null;
    if (eventId) {
      const eventRows = await sql`SELECT * FROM p1_events WHERE id = ${eventId} LIMIT 1`;
      event = eventRows[0] || null;
    }

    return NextResponse.json({
      status: 'FOUND',
      booking,
      event,
      tickets: siblingTickets,
      matchedTicket,
    });
  } catch (err: any) {
    console.error('Error during ticket cloud inspection:', err);
    return NextResponse.json({ success: false, reason: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ success: false, reason: 'Database not available' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { ticketId, ticketIds, bookingId, qrPayload } = body;

    // 1. Batch ticket IDs check-in
    if (Array.isArray(ticketIds) && ticketIds.length > 0) {
      const now = new Date().toISOString();
      for (const id of ticketIds) {
        await sql`
          UPDATE p1_tickets
          SET status = 'CHECKED_IN', checked_in_at = ${now}
          WHERE id = ${id} OR ticket_number = ${id}
        `;
      }
      return NextResponse.json({ success: true, count: ticketIds.length, checkedInAt: now });
    }

    // 2. Entire booking check-in
    if (bookingId) {
      const now = new Date().toISOString();
      await sql`
        UPDATE p1_tickets
        SET status = 'CHECKED_IN', checked_in_at = ${now}
        WHERE booking_id = ${bookingId}
      `;
      return NextResponse.json({ success: true, bookingId, checkedInAt: now });
    }

    // 3. Single ticket ID or qrPayload
    let rows: any[] = [];
    if (ticketId) {
      rows = await sql`
        SELECT * FROM p1_tickets WHERE id = ${ticketId} OR ticket_number = ${ticketId} LIMIT 1
      `;
    } else if (qrPayload) {
      rows = await sql`
        SELECT * FROM p1_tickets WHERE qr_payload = ${qrPayload} LIMIT 1
      `;
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: false, reason: 'TICKET_NOT_FOUND' });
    }

    const t = rows[0];
    if (t.status === 'CHECKED_IN') {
      return NextResponse.json({
        success: false,
        reason: 'ALREADY_CHECKED_IN',
        checkedInAt: t.checked_in_at,
        ticket: {
          id: t.id,
          ticketNumber: t.ticket_number,
          attendeeName: t.attendee_name,
          tierName: t.tier_name,
        },
      });
    }

    if (t.status === 'CANCELLED') {
      return NextResponse.json({ success: false, reason: 'TICKET_CANCELLED' });
    }

    const now = new Date().toISOString();
    await sql`
      UPDATE p1_tickets
      SET status = 'CHECKED_IN', checked_in_at = ${now}
      WHERE id = ${t.id}
    `;

    return NextResponse.json({
      success: true,
      ticket: {
        id: t.id,
        ticketNumber: t.ticket_number,
        attendeeName: t.attendee_name,
        tierName: t.tier_name,
        status: 'CHECKED_IN',
        checkedInAt: now,
      },
    });
  } catch (err: any) {
    console.error('Error during ticket check-in:', err);
    return NextResponse.json({ success: false, reason: err.message }, { status: 500 });
  }
}
