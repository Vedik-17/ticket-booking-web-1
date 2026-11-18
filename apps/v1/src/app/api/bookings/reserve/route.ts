import { NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { BookingEngine } from '@firefly/booking-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventId, organiserId, customer, items } = body;

    if (!eventId || !organiserId || !customer || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid reservation request format.' },
        { status: 400 }
      );
    }

    // Validate customer details
    const customerValidation = BookingEngine.validateCustomer(customer);
    if (!customerValidation.valid) {
      return NextResponse.json(
        { success: false, errors: customerValidation.errors },
        { status: 422 }
      );
    }

    const result = db.reserveBooking({
      eventId,
      organiserId,
      customer,
      items,
    });

    if (!result.success || !result.booking) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to reserve inventory.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, booking: result.booking }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
