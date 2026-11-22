import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { qrPayload, eventId, scannerUserId = 'SCANNER-PORTAL' } = body;

    if (!qrPayload || !eventId) {
      return NextResponse.json(
        { success: false, error: 'qrPayload and eventId are required.' },
        { status: 400 }
      );
    }

    const checkInResponse = db.processCheckIn(qrPayload, eventId, scannerUserId);

    return NextResponse.json({
      success: checkInResponse.status === 'SUCCESS',
      result: checkInResponse,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

