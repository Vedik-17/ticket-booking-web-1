import { NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { EventEngine } from '@firefly/event-engine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as any;
    const query = searchParams.get('q') || undefined;
    const city = searchParams.get('city') || undefined;
    const status = (searchParams.get('status') as any) || 'PUBLISHED';

    let events = db.getEvents();
    events = EventEngine.filterEvents(events, {
      category,
      searchQuery: query,
      city,
      status,
    });
    events = EventEngine.sortEventsByDate(events);

    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      tagline,
      description,
      category,
      posterUrl,
      galleryUrls,
      venue,
      schedule,
      isAgeRestricted,
      minimumAge,
      organiserId = 'd0000000-0000-0000-0000-000000000001',
    } = body;

    if (!title || !description || !category || !posterUrl || !venue || !schedule) {
      return NextResponse.json(
        { success: false, error: 'Missing required event parameters.' },
        { status: 400 }
      );
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + `-${Date.now().toString(36).substring(2, 6)}`;

    const event = db.createEvent({
      organiserId,
      title,
      slug,
      tagline,
      description,
      category,
      status: 'PUBLISHED',
      posterUrl,
      galleryUrls: galleryUrls || [],
      venue,
      schedule,
      isAgeRestricted: Boolean(isAgeRestricted),
      minimumAge: minimumAge ? Number(minimumAge) : undefined,
      featured: false,
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

