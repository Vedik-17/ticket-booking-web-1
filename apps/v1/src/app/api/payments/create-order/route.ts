import { NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { PaymentEngineFactory } from '@firefly/payment-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ success: false, error: 'Booking ID is required.' }, { status: 400 });
    }

    const booking = db.getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }

    if (booking.status === 'CONFIRMED') {
      return NextResponse.json({ success: false, error: 'Booking is already paid and confirmed.' }, { status: 400 });
    }

    const provider = PaymentEngineFactory.getProvider();
    const orderResponse = await provider.createOrder({
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      amountInPence: booking.totalAmountInPence,
      currency: booking.currency,
      customer: {
        name: booking.customer.fullName,
        email: booking.customer.email,
        phone: booking.customer.phone,
      },
    });

    return NextResponse.json({ success: true, order: orderResponse });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
