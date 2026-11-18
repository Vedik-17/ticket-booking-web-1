import { NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { PaymentEngineFactory } from '@firefly/payment-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, orderId, paymentId, signature } = body;

    if (!bookingId || !orderId || !paymentId || !signature) {
      return NextResponse.json(
        { success: false, error: 'Missing payment verification credentials.' },
        { status: 400 }
      );
    }

    const booking = db.getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }

    // Verify signature cryptographically server-side
    const provider = PaymentEngineFactory.getProvider();
    const verification = await provider.verifyPayment({
      bookingId,
      orderId,
      paymentId,
      signature,
    });

    if (!verification.success) {
      return NextResponse.json(
        {
          success: false,
          error: verification.errorMessage || 'Cryptographic payment verification failed.',
        },
        { status: 400 }
      );
    }

    // Server-side state transition and cryptographic ticket minting
    const confirmation = db.confirmPaymentAndIssueTickets(bookingId, paymentId);
    if (!confirmation.success) {
      return NextResponse.json(
        { success: false, error: confirmation.error || 'Failed to issue tickets.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully. Tickets issued.',
      booking: confirmation.booking,
      tickets: confirmation.tickets,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
