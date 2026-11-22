import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Organiser id and status required.' }, { status: 400 });
    }

    const updated = db.updateOrganiserStatus(id, status);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Organiser not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, organiser: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

