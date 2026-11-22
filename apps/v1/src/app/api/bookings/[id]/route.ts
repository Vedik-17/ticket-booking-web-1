import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = db.getBookingById(id) || db.getBookingByReference(id);

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }

    const event = db.getEventById(booking.eventId);
    const tickets = db.getTicketsByBookingId(booking.id);

    return NextResponse.json({
      success: true,
      booking,
      event,
      tickets,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

