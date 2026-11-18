import {
  Event,
  TicketTier,
  Booking,
  Ticket,
  CheckInResponse,
} from '@firefly/shared-types';
import { generateUUID, generateBookingReference } from '@firefly/core';
import { TicketEngine } from '@firefly/ticket-engine';
import { ScannerEngine } from '@firefly/scanner-engine';

export interface P1OrganiserConfig {
  pin: string; // e.g. "123456"
  businessName: string;
  upiId: string; // e.g. "firefly@upi"
  payeeName: string; // e.g. "FIREFLY LIVE"
  whatsappPhone: string; // e.g. "9876543210"
}

export interface P1DatabaseState {
  event: Event;
  tiers: TicketTier[];
  bookings: Booking[];
  tickets: Ticket[];
  config: P1OrganiserConfig;
}

const STORAGE_KEY = 'firefly_p1_store_v1';

const DEFAULT_STATE: P1DatabaseState = {
  config: {
    pin: '123456',
    businessName: 'Solaris Live Productions',
    upiId: 'solaris.festival@okhdfcbank',
    payeeName: 'Solaris Festival Organiser',
    whatsappPhone: '919876543210',
  },
  event: {
    id: 'e-p1-solaris',
    organiserId: 'org-p1-local',
    title: 'SOLARIS 2026: Liquid Electronic Festival',
    slug: 'solaris-2026',
    tagline: 'A 12-hour progressive & melodic techno celebration under open skies.',
    description:
      'Experience the pinnacle of audio-visual artistry featuring world-renowned electronic pioneers, multi-dimensional holographic stage architecture, spatial acoustics, and ambient liquid installations.',
    category: 'MUSIC_FESTIVAL',
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
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
      'Government photo ID mandatory at entrance. No re-entry permitted. Tickets verified via single-device gate scanner.',
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  tiers: [
    {
      id: 'tier-ga-p1',
      eventId: 'e-p1-solaris',
      name: 'General Admission (Phase 1)',
      description: 'Full festival access to main amphitheatre and outdoor stages.',
      priceInPence: 199900, // ₹1,999
      currency: 'INR',
      capacity: 500,
      reservedCount: 0,
      soldCount: 14,
      minPerBooking: 1,
      maxPerBooking: 6,
      salesStartAt: '2026-01-01T00:00:00Z',
      salesEndAt: '2026-12-15T15:00:00Z',
      status: 'ACTIVE',
      perks: ['Main Stage Access', 'Express Entry Lane'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tier-vip-p1',
      eventId: 'e-p1-solaris',
      name: 'VIP Deck & Backstage Lounge',
      description: 'Elevated mezzanine viewing deck with private bars and restrooms.',
      priceInPence: 499900, // ₹4,999
      currency: 'INR',
      capacity: 100,
      reservedCount: 0,
      soldCount: 6,
      minPerBooking: 1,
      maxPerBooking: 4,
      salesStartAt: '2026-01-01T00:00:00Z',
      salesEndAt: '2026-12-15T15:00:00Z',
      status: 'ACTIVE',
      perks: ['Elevated Viewing Deck', 'Welcome Drink', 'Priority Valet Parking'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  bookings: [],
  tickets: [],
};

class P1StorageEngine {
  private memoryCache: P1DatabaseState | null = null;

  private loadState(): P1DatabaseState {
    if (typeof window === 'undefined') {
      return DEFAULT_STATE;
    }
    if (this.memoryCache) {
      return this.memoryCache;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.memoryCache = JSON.parse(raw);
        return this.memoryCache!;
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using memory defaults', e);
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

  public getEvent(): Event {
    return this.loadState().event;
  }

  public updateEvent(updates: Partial<Event>): Event {
    const state = this.loadState();
    state.event = {
      ...state.event,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist(state);
    return state.event;
  }

  public getConfig(): P1OrganiserConfig {
    return this.loadState().config;
  }

  public updateConfig(updates: Partial<P1OrganiserConfig>): P1OrganiserConfig {
    const state = this.loadState();
    state.config = {
      ...state.config,
      ...updates,
    };
    this.persist(state);
    return state.config;
  }

  public getTiers(): TicketTier[] {
    return this.loadState().tiers;
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

  public createTier(tier: Omit<TicketTier, 'id' | 'createdAt' | 'updatedAt' | 'reservedCount' | 'soldCount'>): TicketTier {
    const state = this.loadState();
    const newTier: TicketTier = {
      ...tier,
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

  public createBooking(params: {
    customer: { fullName: string; email: string; phone: string; whatsappOptIn: boolean };
    items: Array<{ tierId: string; quantity: number }>;
  }): { success: boolean; booking?: Booking; error?: string } {
    const state = this.loadState();
    let subtotalInPence = 0;
    const bookingItems = [];

    for (const item of params.items) {
      const tier = state.tiers.find((t) => t.id === item.tierId);
      if (!tier) return { success: false, error: 'Invalid tier' };

      const available = tier.capacity - tier.soldCount;
      if (item.quantity > available) {
        return { success: false, error: `Only ${available} tickets remaining for ${tier.name}` };
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
      eventId: state.event.id,
      organiserId: state.event.organiserId,
      customer: {
        ...params.customer,
        isGuest: true,
      },
      items: bookingItems,
      subtotalInPence,
      serviceFeeInPence: 0, // Direct UPI in P1 has 0 gateway fees
      totalAmountInPence: subtotalInPence,
      currency: 'INR',
      status: 'PAYMENT_PENDING',
      reservationExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.bookings.push(booking);
    this.persist(state);
    return { success: true, booking };
  }

  public getBooking(id: string): Booking | undefined {
    const state = this.loadState();
    return state.bookings.find((b) => b.id === id || b.bookingReference === id);
  }

  public getBookings(): Booking[] {
    return this.loadState().bookings;
  }

  public confirmBookingAndIssueTickets(bookingId: string, transactionNote?: string): {
    success: boolean;
    booking?: Booking;
    tickets?: Ticket[];
    error?: string;
  } {
    const state = this.loadState();
    const bIndex = state.bookings.findIndex((b) => b.id === bookingId);
    if (bIndex === -1) return { success: false, error: 'Booking not found' };

    const booking = state.bookings[bIndex];

    // Mint cryptographic tickets
    const issuedTickets = TicketEngine.issueTickets({
      booking,
      items: booking.items,
    });

    state.tickets.push(...issuedTickets);

    // Update tier sold count
    for (const item of booking.items) {
      const tier = state.tiers.find((t) => t.id === item.ticketTierId);
      if (tier) {
        tier.soldCount += item.quantity;
        if (tier.soldCount >= tier.capacity) {
          tier.status = 'SOLD_OUT';
        }
      }
    }

    state.bookings[bIndex] = {
      ...booking,
      status: 'CONFIRMED',
      paymentId: transactionNote || `UPI-MANUAL-${Date.now()}`,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.persist(state);
    return {
      success: true,
      booking: state.bookings[bIndex],
      tickets: issuedTickets,
    };
  }

  public getTicket(id: string): Ticket | undefined {
    return this.loadState().tickets.find((t) => t.id === id || t.ticketNumber === id);
  }

  public getTicketsByBookingId(bookingId: string): Ticket[] {
    return this.loadState().tickets.filter((t) => t.bookingId === bookingId);
  }

  public verifyTicketScan(qrPayload: string, scannerUserId = 'ORGANISER-P1'): CheckInResponse {
    const state = this.loadState();
    let targetTicket: Ticket | undefined;

    for (const t of state.tickets) {
      if (t.qrPayload === qrPayload || qrPayload.includes(t.id)) {
        targetTicket = t;
        break;
      }
    }

    const { response, updatedTicket } = ScannerEngine.processScan({
      request: {
        qrPayload,
        eventId: state.event.id,
        scannerUserId,
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

  public resetDatabase(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      this.memoryCache = null;
    }
  }
}

export const p1Storage = new P1StorageEngine();
