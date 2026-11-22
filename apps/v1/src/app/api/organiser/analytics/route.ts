import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organiserId = searchParams.get('organiserId') || 'd0000000-0000-0000-0000-000000000001';
    const eventId = searchParams.get('eventId') || undefined;

    const analytics = db.getOrganiserAnalytics(organiserId, eventId);
    return NextResponse.json({ success: true, analytics });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

