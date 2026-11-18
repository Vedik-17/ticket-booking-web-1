import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET() {
  try {
    const analytics = db.getPlatformAnalytics();
    const organisers = db.getOrganisers();
    const events = db.getEvents();
    const bookings = db.getAllBookings();

    return NextResponse.json({
      success: true,
      analytics,
      organisers,
      events,
      bookingsCount: bookings.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
