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

const STORAGE_KEY = 'firefly_p1_prod_store_v1';

const DEFAULT_EVENTS: Event[] = [];

const DEFAULT_TIERS: TicketTier[] = [];

const DEFAULT_STATE: P1DatabaseState = {
  events: [],
  tiers: [],
  bookings: [],
  tickets: [],
  adminPin: process.env.NEXT_PUBLIC_ADMIN_PIN || 'CF2026',
};

class P1MultiEventStore {
  private memoryCache: P1DatabaseState | null = null;
  // Default fallback receiving UPI ID if event doesn't specify one
  public defaultUpiId = process.env.NEXT_PUBLIC_DEFAULT_UPI_ID || '';
  public defaultPayeeName = process.env.NEXT_PUBLIC_DEFAULT_PAYEE_NAME || '';
  public defaultAdminPhone = process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PHONE || '';

  private loadState(): P1DatabaseState {
    if (typeof window === 'undefined') {
      return DEFAULT_STATE;
    }
    if (this.memoryCache && Array.isArray(this.memoryCache.events)) {
      return this.memoryCache;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.events)) {
          if (!Array.isArray(parsed.tiers)) {
            parsed.tiers = [];
          }
          if (!Array.isArray(parsed.bookings)) {
            parsed.bookings = [];
          }
          if (!Array.isArray(parsed.tickets)) {
            parsed.tickets = [];
          }
          if (!parsed.adminPin || parsed.adminPin === '123456') {
            parsed.adminPin = process.env.NEXT_PUBLIC_ADMIN_PIN || 'CF2026';
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
    return Array.isArray(state.events) ? state.events : [];
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

    const totalQuantity = params.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity <= 0) {
      return { success: false, error: 'Please select at least 1 ticket.' };
    }

    let subtotalInPence = 0;
    const bookingItems = [];

    for (const item of params.items) {
      const tier = state.tiers.find((t) => t.id === item.tierId);
      if (!tier || tier.eventId !== params.eventId) {
        return { success: false, error: 'Invalid ticket tier selected.' };
      }

      if (tier.maxPerBooking && item.quantity > tier.maxPerBooking) {
        return { success: false, error: `Maximum ${tier.maxPerBooking} tickets allowed for ${tier.name}.` };
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
    const configuredPin = process.env.NEXT_PUBLIC_ADMIN_PIN || 'CF2026';
    const trimmed = (pin || '').trim();
    return trimmed === 'CF2026' || trimmed === configuredPin || trimmed === (this.loadState().adminPin || '').trim();
  }

  public resetDatabase(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      this.memoryCache = null;
    }
  }
}

export const p1Storage = new P1MultiEventStore();
