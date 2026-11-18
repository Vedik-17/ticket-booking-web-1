import { NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { PaymentEngineFactory } from '@firefly/payment-engine';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    const provider = PaymentEngineFactory.getProvider();
    const isValid = provider.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid webhook signature.' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const result = await provider.processWebhookEvent(event);

    if (result.handled && result.bookingId && result.status === 'CAPTURED' && result.paymentId) {
      db.confirmPaymentAndIssueTickets(result.bookingId, result.paymentId);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
