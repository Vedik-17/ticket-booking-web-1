import {
  Event,
  Organiser,
  TicketTier,
  Booking,
  Ticket,
  UserProfile,
  CheckInResponse,
  OrganiserAnalytics,
  PlatformAnalytics,
  AuditLogEntry,
} from '@firefly/shared-types';
import { InventoryEngine } from '@firefly/inventory-engine';
import { BookingEngine } from '@firefly/booking-engine';
import { TicketEngine } from '@firefly/ticket-engine';
import { ScannerEngine } from '@firefly/scanner-engine';
import { generateUUID } from '@firefly/core';

class FireflyDataStore {
  private profiles: Map<string, UserProfile> = new Map();
  private organisers: Map<string, Organiser> = new Map();
  private events: Map<string, Event> = new Map();
  private tiers: Map<string, TicketTier> = new Map();
  private bookings: Map<string, Booking> = new Map();
  private tickets: Map<string, Ticket> = new Map();
  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Profiles
    const adminProfile: UserProfile = {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'admin@firefly.live',
      fullName: 'Platform Administrator',
      phone: '+919876543210',
      role: 'ADMIN',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const orgProfile1: UserProfile = {
      id: 'b0000000-0000-0000-0000-000000000002',
      email: 'lumina@experiences.io',
      fullName: 'Lumina Music Group',
      phone: '+919876543211',
      role: 'ORGANISER',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.profiles.set(adminProfile.id, adminProfile);
    this.profiles.set(orgProfile1.id, orgProfile1);

    // 2. Organisers
    const org1: Organiser = {
      id: 'd0000000-0000-0000-0000-000000000001',
      userId: orgProfile1.id,
      businessName: 'Lumina Experiences',
      supportEmail: 'support@lumina.live',
      supportPhone: '+919876543211',
      websiteUrl: 'https://lumina.live',
      status: 'ACTIVE',
      payoutUpiId: 'lumina@okaxis',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.organisers.set(org1.id, org1);

    // 3. Events
    const event1: Event = {
      id: 'e0000000-0000-0000-0000-000000000001',
      organiserId: org1.id,
      title: 'SOLARIS: Liquid Electronic Festival 2026',
      slug: 'solaris-2026',
      tagline: 'A transcendent 12-hour melodic techno & progressive experience under open skies.',
      description:
        'Immerse in an audio-visual spectacle featuring world-class melodic pioneers, multi-dimensional holographic stage architecture, spatial acoustics, and ambient liquid installations.',
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
        address: 'Outer Ring Road, Rajiv Gandhi International Airport Complex',
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
        'Entry restricted to 21+. Government photo ID mandatory at entrance. No refunds or ticket transfers permitted within 24 hours of gate opening.',
      featured: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const event2: Event = {
      id: 'e0000000-0000-0000-0000-000000000002',
      organiserId: org1.id,
      title: 'Prism Horizon: Modern Light & Sound Exhibition',
      slug: 'prism-horizon',
      tagline: 'Interactive kinetic sculpture, refractive lasers, and ambient soundscapes.',
      description:
        'Step inside an otherworldly labyrinth of responsive LED arrays, infinity glass corridors, and spatial synth compositions designed to reshape perception of architectural light.',
      category: 'EXHIBITION',
      status: 'PUBLISHED',
      posterUrl:
        'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
      galleryUrls: [
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      ],
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
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    this.events.set(event1.id, event1);
    this.events.set(event2.id, event2);

    // 4. Ticket Categories
    const tier1: TicketTier = {
      id: 'f0000000-0000-0000-0000-000000000001',
      eventId: event1.id,
      name: 'General Admission (Phase 1)',
      description: 'Full festival access to main amphitheatre and outdoor stages.',
      priceInPence: 199900, // ₹1,999
      currency: 'INR',
      capacity: 1000,
      reservedCount: 0,
      soldCount: 42,
      minPerBooking: 1,
      maxPerBooking: 6,
      salesStartAt: '2026-01-01T00:00:00Z',
      salesEndAt: '2026-12-15T15:00:00Z',
      status: 'ACTIVE',
      perks: ['Main Stage Access', 'Express Entry Lane'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const tier2: TicketTier = {
      id: 'f0000000-0000-0000-0000-000000000002',
      eventId: event1.id,
      name: 'VIP Deck & Lounge',
      description: 'Elevated mezzanine viewing deck, dedicated craft bars, and private air-conditioned lounges.',
      priceInPence: 499900, // ₹4,999
      currency: 'INR',
      capacity: 200,
      reservedCount: 0,
      soldCount: 15,
      minPerBooking: 1,
      maxPerBooking: 4,
      salesStartAt: '2026-01-01T00:00:00Z',
      salesEndAt: '2026-12-15T15:00:00Z',
      status: 'ACTIVE',
      perks: ['Elevated VIP Platform', 'Complimentary Welcome Beverage', 'Dedicated Restrooms', 'Priority Parking'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const tier3: TicketTier = {
      id: 'f0000000-0000-0000-0000-000000000003',
      eventId: event2.id,
      name: 'Standard Day Pass',
      description: 'Single entry admission to all interactive galleries and light chambers.',
      priceInPence: 79900, // ₹799
      currency: 'INR',
      capacity: 500,
      reservedCount: 0,
      soldCount: 18,
      minPerBooking: 1,
      maxPerBooking: 8,
      salesStartAt: '2026-01-01T00:00:00Z',
      salesEndAt: '2026-11-28T20:00:00Z',
      status: 'ACTIVE',
      perks: ['All Exhibition Halls Access', 'Digital Audio Guide Link'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    this.tiers.set(tier1.id, tier1);
    this.tiers.set(tier2.id, tier2);
    this.tiers.set(tier3.id, tier3);
  }

  // Event operations
  public getEvents(): Event[] {
    return Array.from(this.events.values());
  }

  public getEventById(id: string): Event | undefined {
    return this.events.get(id);
  }

  public getEventBySlug(slug: string): Event | undefined {
    return Array.from(this.events.values()).find((e) => e.slug === slug);
  }

  public createEvent(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Event {
    const id = generateUUID();
    const newEvent: Event = {
      ...event,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.events.set(id, newEvent);
    return newEvent;
  }

  public updateEvent(id: string, updates: Partial<Event>): Event | undefined {
    const existing = this.events.get(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.events.set(id, updated);
    return updated;
  }

  // Tiers operations
  public getTiersByEventId(eventId: string): TicketTier[] {
    return Array.from(this.tiers.values()).filter((t) => t.eventId === eventId);
  }

  public getTierById(id: string): TicketTier | undefined {
    return this.tiers.get(id);
  }

  public createTier(tier: Omit<TicketTier, 'id' | 'createdAt' | 'updatedAt' | 'reservedCount' | 'soldCount'>): TicketTier {
    const id = generateUUID();
    const newTier: TicketTier = {
      ...tier,
      id,
      reservedCount: 0,
      soldCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tiers.set(id, newTier);
    return newTier;
  }

  // Booking & Reservation operations
  public reserveBooking(params: {
    eventId: string;
    organiserId: string;
    customer: { fullName: string; email: string; phone: string; whatsappOptIn: boolean };
    items: Array<{ tierId: string; quantity: number }>;
  }): { success: boolean; booking?: Booking; error?: string } {
    const event = this.events.get(params.eventId);
    if (!event || event.status !== 'PUBLISHED') {
      return { success: false, error: 'Event is not accepting bookings.' };
    }

    // Validate stock and capacity for all items
    const selectedItemsWithTiers: Array<{ tier: TicketTier; quantity: number }> = [];
    for (const item of params.items) {
      const tier = this.tiers.get(item.tierId);
      if (!tier || tier.eventId !== params.eventId) {
        return { success: false, error: `Invalid ticket tier: ${item.tierId}` };
      }
      const validation = InventoryEngine.validateReservationRequest(tier, item.quantity);
      if (!validation.valid) {
        return { success: false, error: validation.reason };
      }
      selectedItemsWithTiers.push({ tier, quantity: item.quantity });
    }

    // Create booking draft
    const { booking } = BookingEngine.createBooking({
      eventId: params.eventId,
      organiserId: params.organiserId,
      customer: {
        ...params.customer,
        isGuest: true,
      },
      items: selectedItemsWithTiers,
    });

    // Atomically increment reserved count
    for (const { tier, quantity } of selectedItemsWithTiers) {
      const updated = {
        ...tier,
        reservedCount: tier.reservedCount + quantity,
        updatedAt: new Date().toISOString(),
      };
      this.tiers.set(tier.id, updated);
    }

    this.bookings.set(booking.id, booking);
    return { success: true, booking };
  }

  public getBookingById(id: string): Booking | undefined {
    return this.bookings.get(id);
  }

  public getBookingByReference(reference: string): Booking | undefined {
    return Array.from(this.bookings.values()).find((b) => b.bookingReference === reference);
  }

  public getBookingsByEventId(eventId: string): Booking[] {
    return Array.from(this.bookings.values()).filter((b) => b.eventId === eventId);
  }

  public getAllBookings(): Booking[] {
    return Array.from(this.bookings.values());
  }

  public confirmPaymentAndIssueTickets(bookingId: string, paymentId: string): {
    success: boolean;
    booking?: Booking;
    tickets?: Ticket[];
    error?: string;
  } {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      return { success: false, error: 'Booking not found.' };
    }

    if (booking.status === 'CONFIRMED') {
      const existingTickets = Array.from(this.tickets.values()).filter((t) => t.bookingId === bookingId);
      return { success: true, booking, tickets: existingTickets };
    }

    // Mint cryptographic tickets
    const issuedTickets = TicketEngine.issueTickets({
      booking,
      items: booking.items,
    });

    for (const ticket of issuedTickets) {
      this.tickets.set(ticket.id, ticket);
    }

    // Convert reserved inventory to sold
    for (const item of booking.items) {
      const tier = this.tiers.get(item.ticketTierId);
      if (tier) {
        const newReserved = Math.max(0, tier.reservedCount - item.quantity);
        const newSold = tier.soldCount + item.quantity;
        this.tiers.set(tier.id, {
          ...tier,
          reservedCount: newReserved,
          soldCount: newSold,
          status: newSold >= tier.capacity ? 'SOLD_OUT' : tier.status,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Update booking state
    const confirmedBooking: Booking = {
      ...booking,
      status: 'CONFIRMED',
      paymentId,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.bookings.set(bookingId, confirmedBooking);

    return {
      success: true,
      booking: confirmedBooking,
      tickets: issuedTickets,
    };
  }

  // Ticket & Check-in operations
  public getTicketById(id: string): Ticket | undefined {
    return this.tickets.get(id);
  }

  public getTicketsByBookingId(bookingId: string): Ticket[] {
    return Array.from(this.tickets.values()).filter((t) => t.bookingId === bookingId);
  }

  public getTicketsByEventId(eventId: string): Ticket[] {
    return Array.from(this.tickets.values()).filter((t) => t.eventId === eventId);
  }

  public processCheckIn(qrPayload: string, eventId: string, scannerUserId = 'SCANNER-DEFAULT'): CheckInResponse {
    // Find ticket by matching qrPayload or parsing ticket ID
    let targetTicket: Ticket | undefined;
    for (const ticket of this.tickets.values()) {
      if (ticket.qrPayload === qrPayload || qrPayload.includes(ticket.id)) {
        targetTicket = ticket;
        break;
      }
    }

    const { response, updatedTicket } = ScannerEngine.processScan({
      request: {
        qrPayload,
        eventId,
        scannerUserId,
      },
      ticket: targetTicket,
    });

    if (updatedTicket) {
      this.tickets.set(updatedTicket.id, updatedTicket);
    }

    return response;
  }

  // Organiser operations
  public getOrganisers(): Organiser[] {
    return Array.from(this.organisers.values());
  }

  public getOrganiserById(id: string): Organiser | undefined {
    return this.organisers.get(id);
  }

  public updateOrganiserStatus(id: string, status: Organiser['status']): Organiser | undefined {
    const org = this.organisers.get(id);
    if (!org) return undefined;
    const updated = { ...org, status, updatedAt: new Date().toISOString() };
    this.organisers.set(id, updated);
    return updated;
  }

  // Analytics operations (strictly computed from real records)
  public getOrganiserAnalytics(organiserId: string, eventId?: string): OrganiserAnalytics {
    let bookings = Array.from(this.bookings.values()).filter(
      (b) => b.organiserId === organiserId && b.status === 'CONFIRMED'
    );
    if (eventId) {
      bookings = bookings.filter((b) => b.eventId === eventId);
    }

    let grossSalesInPence = 0;
    let netSalesInPence = 0;
    let totalTicketsSold = 0;

    for (const b of bookings) {
      grossSalesInPence += b.totalAmountInPence;
      netSalesInPence += b.subtotalInPence;
      for (const item of b.items) {
        totalTicketsSold += item.quantity;
      }
    }

    let relevantTiers = Array.from(this.tiers.values());
    if (eventId) {
      relevantTiers = relevantTiers.filter((t) => t.eventId === eventId);
    } else {
      const orgEvents = Array.from(this.events.values()).filter((e) => e.organiserId === organiserId);
      const orgEventIds = new Set(orgEvents.map((e) => e.id));
      relevantTiers = relevantTiers.filter((t) => orgEventIds.has(t.eventId));
    }

    const totalTicketsCapacity = relevantTiers.reduce((acc, t) => acc + t.capacity, 0);

    let tickets = Array.from(this.tickets.values());
    if (eventId) {
      tickets = tickets.filter((t) => t.eventId === eventId);
    }
    const totalCheckIns = tickets.filter((t) => t.status === 'CHECKED_IN').length;
    const checkInRatePercent = totalTicketsSold > 0 ? Math.round((totalCheckIns / totalTicketsSold) * 100) : 0;

    const salesByTier = relevantTiers.map((t) => ({
      tierId: t.id,
      tierName: t.name,
      soldCount: t.soldCount,
      capacity: t.capacity,
      revenueInPence: t.soldCount * t.priceInPence,
    }));

    return {
      eventId,
      grossSalesInPence,
      netSalesInPence,
      totalTicketsSold,
      totalTicketsCapacity,
      totalCheckIns,
      checkInRatePercent,
      salesByTier,
    };
  }

  public getPlatformAnalytics(): PlatformAnalytics {
    const totalOrganisers = this.organisers.size;
    const activeOrganisers = Array.from(this.organisers.values()).filter((o) => o.status === 'ACTIVE').length;
    const totalEvents = this.events.size;
    const activeEvents = Array.from(this.events.values()).filter((e) => e.status === 'PUBLISHED').length;

    const confirmedBookings = Array.from(this.bookings.values()).filter((b) => b.status === 'CONFIRMED');
    const totalVolume = confirmedBookings.reduce((acc, b) => acc + b.totalAmountInPence, 0);
    const platformFees = confirmedBookings.reduce((acc, b) => acc + b.serviceFeeInPence, 0);
    const totalTickets = confirmedBookings.reduce(
      (acc, b) => acc + b.items.reduce((sum, item) => sum + item.quantity, 0),
      0
    );

    return {
      totalOrganisers,
      activeOrganisers,
      totalEvents,
      activeEvents,
      totalTicketsSold: totalTickets,
      totalPlatformVolumeInPence: totalVolume,
      platformFeesEarnedInPence: platformFees,
    };
  }
}

// Global Singleton Store Instance
export const db = new FireflyDataStore();
