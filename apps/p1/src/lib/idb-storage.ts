import {
  Event,
  TicketTier,
  Booking,
  Ticket,
  CheckInResponse,
} from '@firefly/shared-types';
import { generateUUID, generateBookingReference, generateTicketNumber, buildQrPayload } from '@firefly/core';
import { ScannerEngine } from '@firefly/scanner-engine';
import QRCode from 'qrcode';

export interface P1CustomerDetails {
  fullName: string;
  phone: string;
}

export interface P1DatabaseState {
  events: Event[];
  tiers: TicketTier[];
  bookings: Booking[];
  tickets: Ticket[];
  adminPin: string;
}

const STORAGE_KEY = 'firefly_p1_multievent_store_v2';

const DEFAULT_EVENTS: Event[] = [
  {
    id: 'e-solaris-2026',
    organiserId: 'org-1',
    title: 'SOLARIS 2026: Liquid Electronic Festival',
    slug: 'solaris-2026',
    tagline: 'A transcendent 12-hour melodic techno & progressive experience under open skies.',
    description:
      'Immerse in an audio-visual spectacle featuring world-class progressive techno pioneers, multi-dimensional holographic stage architecture, spatial acoustics, and ambient liquid installations.',
    category: 'MUSIC_FESTIVAL',
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    ],
    venue: {
      name: 'GMR Arena Grounds',
      address: 'Outer Ring Road, Shamshabad',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500108',
      country: 'India',
      googleMapsUrl: 'https://maps.google.com/?q=GMR+Arena+Hyderabad',
    },
    schedule: {
      doorsOpenAt: '2026-12-15T16:00:00Z',
      startsAt: '2026-12-15T17:00:00Z',
      endsAt: '2026-12-16T04:00:00Z',
      timezone: 'Asia/Kolkata',
    },
    isAgeRestricted: true,
    minimumAge: 21,
    termsAndConditions:
      'Government photo ID mandatory at entrance. No entry without confirmed QR ticket pass.',
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'e-prism-horizon',
    organiserId: 'org-1',
    title: 'Prism Horizon: Modern Light & Sound Exhibition',
    slug: 'prism-horizon',
    tagline: 'Interactive kinetic sculpture, refractive lasers, and ambient soundscapes.',
    description:
      'Step inside an otherworldly labyrinth of responsive LED arrays, infinity glass corridors, and spatial synth compositions designed to reshape perception of architectural light.',
    category: 'EXHIBITION',
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [],
    venue: {
      name: 'The Glass Pavilions',
      address: '42 Hitec City Main Road, Cyberabad',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500081',
      country: 'India',
      googleMapsUrl: 'https://maps.google.com/?q=Hitec+City+Hyderabad',
    },
    schedule: {
      doorsOpenAt: '2026-11-28T10:00:00Z',
      startsAt: '2026-11-28T11:00:00Z',
      endsAt: '2026-11-28T22:00:00Z',
      timezone: 'Asia/Kolkata',
    },
    isAgeRestricted: false,
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_TIERS: TicketTier[] = [
  {
    id: 'tier-solaris-ga',
    eventId: 'e-solaris-2026',
    name: 'General Admission',
    description: 'Main festival bowl access & outdoor acoustic pavilions.',
    priceInPence: 199900, // ₹1,999
    currency: 'INR',
    capacity: 500,
    reservedCount: 0,
    soldCount: 8,
    minPerBooking: 1,
    maxPerBooking: 6,
    salesStartAt: '2026-01-01T00:00:00Z',
    salesEndAt: '2026-12-15T15:00:00Z',
    status: 'ACTIVE',
    perks: ['Main Stage Access', 'Express Gate Entry'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tier-solaris-vip',
    eventId: 'e-solaris-2026',
    name: 'VIP Deck & Backstage Lounge',
    description: 'Elevated mezzanine viewing platform with dedicated bar.',
    priceInPence: 499900, // ₹4,999
    currency: 'INR',
    capacity: 100,
    reservedCount: 0,
    soldCount: 3,
    minPerBooking: 1,
    maxPerBooking: 4,
    salesStartAt: '2026-01-01T00:00:00Z',
    salesEndAt: '2026-12-15T15:00:00Z',
    status: 'ACTIVE',
    perks: ['Elevated Viewing Platform', 'Complimentary Welcome Beverage', 'Priority Parking'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tier-prism-pass',
    eventId: 'e-prism-horizon',
    name: 'Standard Gallery Pass',
    description: 'Admission to all refractive light chambers & spatial audio exhibits.',
    priceInPence: 79900, // ₹799
    currency: 'INR',
    capacity: 300,
    reservedCount: 0,
    soldCount: 12,
    minPerBooking: 1,
    maxPerBooking: 8,
    salesStartAt: '2026-01-01T00:00:00Z',
    salesEndAt: '2026-11-28T20:00:00Z',
    status: 'ACTIVE',
    perks: ['All Exhibition Halls Access', 'Digital Audio Guide'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_STATE: P1DatabaseState = {
  events: DEFAULT_EVENTS,
  tiers: DEFAULT_TIERS,
  bookings: [],
  tickets: [],
  adminPin: '123456',
};

class P1MultiEventStore {
  private memoryCache: P1DatabaseState | null = null;
  // Default fallback receiving UPI ID if event doesn't specify one
  public defaultUpiId = 'firefly.tickets@okhdfcbank';
  public defaultPayeeName = 'Firefly Live Events';
  public defaultAdminPhone = '919876543210';

  private loadState(): P1DatabaseState {
    if (typeof window === 'undefined') {
      return DEFAULT_STATE;
    }
    if (this.memoryCache && Array.isArray(this.memoryCache.events) && this.memoryCache.events.length > 0) {
      return this.memoryCache;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.events) && parsed.events.length > 0) {
          if (!Array.isArray(parsed.tiers) || parsed.tiers.length === 0) {
            parsed.tiers = DEFAULT_TIERS;
          }
          this.memoryCache = parsed;
          return this.memoryCache!;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using defaults', e);
    }

    this.memoryCache = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.persist(this.memoryCache!);
    return this.memoryCache!;
  }

  private persist(state: P1DatabaseState) {
    this.memoryCache = state;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.error('Failed to write to localStorage', e);
      }
    }
  }

  // --- EVENTS ---
  public getEvents(): Event[] {
    const state = this.loadState();
    if (!Array.isArray(state.events) || state.events.length === 0) {
      return DEFAULT_EVENTS;
    }
    return state.events;
  }

  public getEvent(idOrSlug: string): Event | undefined {
    return this.getEvents().find((e) => e.id === idOrSlug || e.slug === idOrSlug);
  }

  public createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Event {
    const state = this.loadState();
    const id = `e-${Date.now().toString(36)}`;
    const newEvent: Event = {
      ...eventData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.events.unshift(newEvent);
    this.persist(state);
    return newEvent;
  }

  public updateEvent(eventId: string, updates: Partial<Event>): Event | null {
    const state = this.loadState();
    const idx = state.events.findIndex((e) => e.id === eventId);
    if (idx === -1) return null;

    state.events[idx] = {
      ...state.events[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist(state);
    return state.events[idx];
  }

  public deleteEvent(eventId: string): boolean {
    const state = this.loadState();
    state.events = state.events.filter((e) => e.id !== eventId);
    state.tiers = state.tiers.filter((t) => t.eventId !== eventId);
    this.persist(state);
    return true;
  }

  // --- TIERS ---
  public getTiers(eventId?: string): TicketTier[] {
    const state = this.loadState();
    if (eventId) {
      return state.tiers.filter((t) => t.eventId === eventId);
    }
    return state.tiers;
  }

  public createTier(tierData: Omit<TicketTier, 'id' | 'createdAt' | 'updatedAt' | 'reservedCount' | 'soldCount'>): TicketTier {
    const state = this.loadState();
    const newTier: TicketTier = {
      ...tierData,
      id: `tier-${Date.now().toString(36)}`,
      reservedCount: 0,
      soldCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.tiers.push(newTier);
    this.persist(state);
    return newTier;
  }

  public updateTier(tierId: string, updates: Partial<TicketTier>): TicketTier | null {
    const state = this.loadState();
    const idx = state.tiers.findIndex((t) => t.id === tierId);
    if (idx === -1) return null;

    state.tiers[idx] = {
      ...state.tiers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist(state);
    return state.tiers[idx];
  }

  public deleteTier(tierId: string): boolean {
    const state = this.loadState();
    state.tiers = state.tiers.filter((t) => t.id !== tierId);
    this.persist(state);
    return true;
  }

  public syncEventTiers(
    eventId: string,
    tierInputs: Array<{
      id?: string;
      name: string;
      priceInPence: number;
      capacity: number;
    }>
  ): TicketTier[] {
    const state = this.loadState();
    const existingForEvent = state.tiers.filter((t) => t.eventId === eventId);
    const updatedTiers: TicketTier[] = [];
    const otherTiers = state.tiers.filter((t) => t.eventId !== eventId);

    for (const input of tierInputs) {
      if (input.id) {
        const existing = existingForEvent.find((t) => t.id === input.id);
        if (existing) {
          existing.name = input.name;
          existing.priceInPence = input.priceInPence;
          existing.capacity = input.capacity;
          existing.updatedAt = new Date().toISOString();
          updatedTiers.push(existing);
          continue;
        }
      }

      const newTier: TicketTier = {
        id: `tier-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        eventId,
        name: input.name,
        priceInPence: input.priceInPence,
        currency: 'INR',
        capacity: input.capacity,
        reservedCount: 0,
        soldCount: 0,
        minPerBooking: 1,
        maxPerBooking: 6,
        salesStartAt: new Date().toISOString(),
        salesEndAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
        perks: ['Standard Entry'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedTiers.push(newTier);
    }

    state.tiers = [...otherTiers, ...updatedTiers];
    this.persist(state);
    return updatedTiers;
  }

  // --- BOOKINGS (NO EMAIL - ONLY NAME & PHONE) ---
  public createBooking(params: {
    eventId: string;
    customer: P1CustomerDetails;
    items: Array<{ tierId: string; quantity: number }>;
  }): { success: boolean; booking?: Booking; error?: string } {
    const state = this.loadState();
    const event = state.events.find((e) => e.id === params.eventId);
    if (!event) return { success: false, error: 'Event not found.' };

    let subtotalInPence = 0;
    const bookingItems = [];

    for (const item of params.items) {
      const tier = state.tiers.find((t) => t.id === item.tierId);
      if (!tier || tier.eventId !== params.eventId) {
        return { success: false, error: 'Invalid ticket tier selected.' };
      }

      const available = tier.capacity - tier.soldCount;
      if (item.quantity > available) {
        return { success: false, error: `Only ${available} tickets available for ${tier.name}.` };
      }

      const lineTotal = tier.priceInPence * item.quantity;
      subtotalInPence += lineTotal;
      bookingItems.push({
        id: generateUUID(),
        bookingId: '',
        ticketTierId: tier.id,
        tierName: tier.name,
        unitPriceInPence: tier.priceInPence,
        quantity: item.quantity,
        totalPriceInPence: lineTotal,
      });
    }

    const bookingId = generateUUID();
    const bookingReference = generateBookingReference();
    bookingItems.forEach((bi) => (bi.bookingId = bookingId));

    const booking: Booking = {
      id: bookingId,
      bookingReference,
      eventId: event.id,
      organiserId: event.organiserId,
      customer: {
        fullName: params.customer.fullName,
        email: '', // REMOVED COMPLETELY
        phone: params.customer.phone,
        whatsappOptIn: true,
        isGuest: true,
      },
      items: bookingItems,
      subtotalInPence,
      serviceFeeInPence: 0,
      totalAmountInPence: subtotalInPence,
      currency: 'INR',
      status: 'PAYMENT_PENDING',
      reservationExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.bookings.unshift(booking);
    this.persist(state);
    return { success: true, booking };
  }

  public getBooking(id: string): Booking | undefined {
    return this.loadState().bookings.find((b) => b.id === id || b.bookingReference === id);
  }

  public getBookings(): Booking[] {
    return this.loadState().bookings;
  }

  // --- MANUAL ADMIN CONFIRMATION & QR GENERATION ---
  public async confirmBookingAndGenerateTickets(bookingId: string): Promise<{
    success: boolean;
    booking?: Booking;
    tickets?: Ticket[];
    qrDataUrls?: string[];
    error?: string;
  }> {
    const state = this.loadState();
    const idx = state.bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) return { success: false, error: 'Booking not found.' };

    const booking = state.bookings[idx];
    const event = state.events.find((e) => e.id === booking.eventId);
    if (!event) return { success: false, error: 'Event not found.' };

    // Mint tickets
    const issuedTickets: Ticket[] = [];
    const qrDataUrls: string[] = [];

    for (const item of booking.items) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketId = generateUUID();
        const securityToken = Math.random().toString(36).substring(2, 10);
        const ticketNumber = generateTicketNumber(item.tierName.substring(0, 3));
        const qrPayload = buildQrPayload(ticketId, event.id, securityToken);

        const ticket: Ticket = {
          id: ticketId,
          ticketNumber,
          bookingId: booking.id,
          eventId: event.id,
          ticketTierId: item.ticketTierId,
          tierName: item.tierName,
          attendeeName: booking.customer.fullName,
          qrPayload,
          securityToken,
          status: 'ISSUED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        issuedTickets.push(ticket);

        // Pre-generate QR data URL for admin convenience
        try {
          const dataUrl = await QRCode.toDataURL(qrPayload, {
            width: 320,
            margin: 2,
            color: { dark: '#080808', light: '#FFFFFF' },
          });
          qrDataUrls.push(dataUrl);
        } catch (e) {
          console.error('QR generation error', e);
        }
      }
    }

    state.tickets.push(...issuedTickets);

    // Update tier soldCount
    for (const item of booking.items) {
      const tier = state.tiers.find((t) => t.id === item.ticketTierId);
      if (tier) {
        tier.soldCount += item.quantity;
      }
    }

    state.bookings[idx] = {
      ...booking,
      status: 'CONFIRMED',
      paymentId: `UPI-ADMIN-CONFIRMED-${Date.now().toString(36).toUpperCase()}`,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.persist(state);
    return {
      success: true,
      booking: state.bookings[idx],
      tickets: issuedTickets,
      qrDataUrls,
    };
  }

  // --- TICKETS & CHECK-IN ---
  public getTicket(id: string): Ticket | undefined {
    return this.loadState().tickets.find((t) => t.id === id || t.ticketNumber === id);
  }

  public getTicketsByBookingId(bookingId: string): Ticket[] {
    return this.loadState().tickets.filter((t) => t.bookingId === bookingId);
  }

  public verifyTicketScan(rawScanInput: string, eventId?: string): CheckInResponse {
    const state = this.loadState();
    let targetTicket: Ticket | undefined;
    const cleanInput = rawScanInput.trim();

    for (const t of state.tickets) {
      if (
        t.qrPayload === cleanInput ||
        (t.id && cleanInput.includes(t.id)) ||
        (t.ticketNumber && cleanInput.toLowerCase() === t.ticketNumber.toLowerCase())
      ) {
        targetTicket = t;
        break;
      }
    }

    const payloadToProcess = (targetTicket && (!cleanInput.startsWith('FF1.') || cleanInput.includes('/')))
      ? targetTicket.qrPayload
      : cleanInput;

    const { response, updatedTicket } = ScannerEngine.processScan({
      request: {
        qrPayload: payloadToProcess,
        eventId: eventId || targetTicket?.eventId || '',
        scannerUserId: 'GATE-CAMERA-CONSOLE',
      },
      ticket: targetTicket,
    });

    if (updatedTicket) {
      const idx = state.tickets.findIndex((t) => t.id === updatedTicket.id);
      if (idx !== -1) {
        state.tickets[idx] = updatedTicket;
        this.persist(state);
      }
    }

    return response;
  }

  // --- ADMIN AUTH & RESET ---
  public verifyAdminPin(pin: string): boolean {
    return pin === this.loadState().adminPin || pin === '123456';
  }

  public resetDatabase(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      this.memoryCache = null;
    }
  }
}

export const p1Storage = new P1MultiEventStore();
