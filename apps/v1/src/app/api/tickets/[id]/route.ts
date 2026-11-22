import { NextResponse } from 'next/server';
import { db } from '@/lib/store';
import QRCode from 'qrcode';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticket = db.getTicketById(id);

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found.' }, { status: 404 });
    }

    const event = db.getEventById(ticket.eventId);
    const booking = db.getBookingById(ticket.bookingId);

    // Generate high resolution QR code data URL
    const qrDataUrl = await QRCode.toDataURL(ticket.qrPayload, {
      width: 400,
      margin: 2,
      color: {
        dark: '#080808',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });

    return NextResponse.json({
      success: true,
      ticket,
      event,
      booking,
      qrDataUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

