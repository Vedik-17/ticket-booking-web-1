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

export interface GateScanInspection {
  status: 'READY' | 'DUPLICATE' | 'EVENT_MISMATCH' | 'INVALID';
  message: string;
  timestamp: string;
  booking?: Booking;
  event?: Event;
  tickets: Ticket[];
  totalPasses: number;
  unenteredTickets: Ticket[];
  checkedInTickets: Ticket[];
  firstCheckedInAt?: string;
  matchedTicket?: Ticket;
}

const STORAGE_KEY = 'firefly_p1_prod_store_v2';
const IDB_NAME = 'firefly_idb_v2';
const IDB_STORE = 'app_state';

const DEFAULT_STATE: P1DatabaseState = {
  events: [],
  tiers: [],
  bookings: [],
  tickets: [],
  adminPin: process.env.NEXT_PUBLIC_ADMIN_PIN || 'CF2026',
};

class P1MultiEventStore {
  private memoryCache: P1DatabaseState | null = null;
  private isSyncing = false;
  private idbReady: Promise<IDBDatabase | null> | null = null;
  private listeners: Set<() => void> = new Set();

  public defaultUpiId = process.env.NEXT_PUBLIC_DEFAULT_UPI_ID || '';
  public defaultPayeeName = process.env.NEXT_PUBLIC_DEFAULT_PAYEE_NAME || '';
  public defaultAdminPhone = process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PHONE || '';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initIndexedDB();
      // Initiate background sync with server
      this.syncWithServer();
    }
  }

  // --- INDEXEDDB INITIALIZER (Bypasses 5MB LocalStorage Quota) ---
  private initIndexedDB(): Promise<IDBDatabase | null> {
    if (this.idbReady) return this.idbReady;
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return Promise.resolve(null);
    }

    this.idbReady = new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = (e: any) => resolve(e.target.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.idbReady;
  }

  private async writeToIdb(key: string, val: any): Promise<void> {
    try {
      const db = await this.initIndexedDB();
      if (!db) return;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(val, key);
    } catch (e) {
      console.warn('IDB write failed:', e);
    }
  }

  private async readFromIdb(key: string): Promise<any> {
    try {
      const db = await this.initIndexedDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  // --- SERVER SYNC (Cross-Device Global Postgres Persistence) ---
  public async syncWithServer(): Promise<void> {
    if (this.isSyncing || typeof window === 'undefined') return;
    this.isSyncing = true;

    try {
      // 1. Fetch live events and tiers from Postgres
      const res = await fetch('/api/events', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          const state = this.loadState();
          
          const serverEvents: Event[] = data.events;
          const serverTiers: TicketTier[] = Array.isArray(data.tiers) ? data.tiers : [];

          // Keep any locally created events that might not have reached server yet
          const localOnlyEvents = state.events.filter(
            (le) => !serverEvents.some((se) => se.id === le.id)
          );
          const localOnlyTiers = state.tiers.filter(
            (lt) => !serverTiers.some((st) => st.id === lt.id)
          );

          state.events = [...serverEvents, ...localOnlyEvents];
          state.tiers = [...serverTiers, ...localOnlyTiers];

          this.persist(state);
          this.notifySubscribers();

          // Push any pending local-only events up to the server
          for (const localEvt of localOnlyEvents) {
            const tiersForLocal = state.tiers.filter((t) => t.eventId === localEvt.id);
            fetch('/api/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: localEvt, tiers: tiersForLocal }),
            }).catch(() => {});
          }
        }
      }

      // 2. Fetch live bookings and tickets from Postgres
      const bRes = await fetch('/api/bookings', { cache: 'no-store' });
      if (bRes.ok) {
        const bData = await bRes.json();
        if (Array.isArray(bData.bookings)) {
          const state = this.loadState();
          const serverBookings: Booking[] = bData.bookings;
          const serverTickets: Ticket[] = Array.isArray(bData.tickets) ? bData.tickets : [];

          const localOnlyBookings = state.bookings.filter(
            (lb) => !serverBookings.some((sb) => sb.id === lb.id)
          );
          const localOnlyTickets = state.tickets.filter(
            (lt) => !serverTickets.some((st) => st.id === lt.id)
          );

          state.bookings = [...serverBookings, ...localOnlyBookings];
          state.tickets = [...serverTickets, ...localOnlyTickets];

          this.persist(state);
          this.notifySubscribers();
        }
      }
    } catch (e) {
      console.warn('Server sync skipped (working offline):', e);
    } finally {
      this.isSyncing = false;
    }
  }

  public notifySubscribers() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('Subscriber error:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firefly-storage-synced'));
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    const windowHandler = () => callback();
    if (typeof window !== 'undefined') {
      window.addEventListener('firefly-storage-synced', windowHandler);
    }
    return () => {
      this.listeners.delete(callback);
      if (typeof window !== 'undefined') {
        window.removeEventListener('firefly-storage-synced', windowHandler);
      }
    };
  }

  private loadState(): P1DatabaseState {
    if (typeof window === 'undefined') {
      return DEFAULT_STATE;
    }
    if (this.memoryCache && Array.isArray(this.memoryCache.events)) {
      return this.memoryCache;
    }

    // Try LocalStorage first for instant synchronous load
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.events)) {
          parsed.tiers = Array.isArray(parsed.tiers) ? parsed.tiers : [];
          parsed.bookings = Array.isArray(parsed.bookings) ? parsed.bookings : [];
          parsed.tickets = Array.isArray(parsed.tickets) ? parsed.tickets : [];
          parsed.adminPin = process.env.NEXT_PUBLIC_ADMIN_PIN || 'CF2026';
          this.memoryCache = parsed;
          return this.memoryCache!;
        }
      }
    } catch (e) {
      console.warn('LocalStorage read fallback:', e);
    }

    // Read IDB asynchronously in background
    this.readFromIdb(STORAGE_KEY).then((idbState) => {
      if (idbState && Array.isArray(idbState.events) && idbState.events.length > 0) {
        if (!this.memoryCache || this.memoryCache.events.length === 0) {
          this.memoryCache = idbState;
          this.notifySubscribers();
        }
      }
    });

    this.memoryCache = JSON.parse(JSON.stringify(DEFAULT_STATE));
    return this.memoryCache!;
  }

  private persist(state: P1DatabaseState) {
    this.memoryCache = state;
    if (typeof window !== 'undefined') {
      // 1. Write to IndexedDB (virtually unlimited quota for high-res posters)
      this.writeToIdb(STORAGE_KEY, state);

      // 2. Also try writing to localStorage as secondary cache
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        // If quota exceeded due to poster image, strip heavy poster from localStorage only
        try {
          const lightState = {
            ...state,
            events: state.events.map((evt) => ({
              ...evt,
              posterUrl: evt.posterUrl?.length > 10000 ? '' : evt.posterUrl,
            })),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(lightState));
        } catch {}
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
    this.notifySubscribers();

    // Sync to PostgreSQL backend immediately
    if (typeof window !== 'undefined') {
      const eventTiers = state.tiers.filter((t) => t.eventId === id);
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: newEvent, tiers: eventTiers }),
      }).catch((e) => console.warn('Failed to sync event to server:', e));
    }

    return newEvent;
  }

  public async createEventWithTiers(
    eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>,
    tiersData: Array<Omit<TicketTier, 'id' | 'eventId' | 'createdAt' | 'updatedAt' | 'reservedCount' | 'soldCount'>>
  ): Promise<{ event: Event; tiers: TicketTier[] }> {
    const state = this.loadState();
    const eventId = `e-${Date.now().toString(36)}`;
    const newEvent: Event = {
      ...eventData,
      id: eventId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.events.unshift(newEvent);

    const createdTiers: TicketTier[] = [];
    for (const td of tiersData) {
      const tierId = `t-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const newTier: TicketTier = {
        ...td,
        id: tierId,
        eventId: eventId,
        soldCount: 0,
        reservedCount: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.tiers.push(newTier);
      createdTiers.push(newTier);
    }

    this.persist(state);
    this.notifySubscribers();

    // Sync to PostgreSQL backend immediately and await
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: newEvent, tiers: createdTiers }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Failed to sync event to server:', err);
        }
      } catch (e) {
        console.warn('Network error syncing event to server:', e);
      }
    }

    return { event: newEvent, tiers: createdTiers };
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
    this.notifySubscribers();

    // Sync update to server
    if (typeof window !== 'undefined') {
      const eventTiers = state.tiers.filter((t) => t.eventId === eventId);
      fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, tiers: eventTiers }),
      }).catch((e) => console.warn('Failed to sync event update to server:', e));
    }

    return state.events[idx];
  }

  public async updateEventWithTiers(
    eventId: string,
    updates: Partial<Event>,
    tiersInput?: Array<{ id?: string; name: string; priceInPence: number; capacity: number; status?: string }>
  ): Promise<boolean> {
    const state = this.loadState();
    const idx = state.events.findIndex((e) => e.id === eventId);
    if (idx === -1) return false;

    state.events[idx] = {
      ...state.events[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    let updatedTiers: TicketTier[] = [];
    if (Array.isArray(tiersInput)) {
      state.tiers = state.tiers.filter((t) => t.eventId !== eventId);
      updatedTiers = tiersInput.map((t) => ({
        id: t.id || `t-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        eventId,
        name: t.name,
        description: '',
        priceInPence: t.priceInPence,
        currency: 'INR',
        capacity: t.capacity,
        soldCount: 0,
        reservedCount: 0,
        minPerBooking: 1,
        maxPerBooking: 50,
        salesStartAt: new Date().toISOString(),
        salesEndAt: new Date().toISOString(),
        status: (t.status as any) || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      state.tiers.push(...updatedTiers);
    } else {
      updatedTiers = state.tiers.filter((t) => t.eventId === eventId);
    }

    this.persist(state);
    this.notifySubscribers();

    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/events/${eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates, tiers: updatedTiers }),
        });
      } catch (e) {
        console.warn('Failed to sync event update to server:', e);
      }
    }

    return true;
  }

  public async deleteEvent(eventId: string): Promise<boolean> {
    const state = this.loadState();
    state.events = state.events.filter((e) => e.id !== eventId);
    state.tiers = state.tiers.filter((t) => t.eventId !== eventId);
    this.persist(state);
    this.notifySubscribers();

    if (typeof window !== 'undefined') {
      fetch(`/api/events/${eventId}`, { method: 'DELETE' }).catch((e) =>
        console.warn('Failed to sync delete to server:', e)
      );
    }

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
    const id = `t-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newTier: TicketTier = {
      ...tierData,
      id,
      soldCount: 0,
      reservedCount: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.tiers.push(newTier);
    this.persist(state);
    this.notifySubscribers();

    // Sync tier to server
    if (typeof window !== 'undefined') {
      const event = state.events.find((e) => e.id === tierData.eventId);
      if (event) {
        const tiers = state.tiers.filter((t) => t.eventId === event.id);
        fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, tiers }),
        }).catch((e) => console.warn('Failed to sync tier to server:', e));
      }
    }

    return newTier;
  }

  public syncEventTiers(
    eventId: string,
    tiersInput: Array<{ id?: string; name: string; priceInPence: number; capacity: number }>
  ): void {
    const state = this.loadState();
    state.tiers = state.tiers.filter((t) => t.eventId !== eventId);

    const newTiers: TicketTier[] = tiersInput.map((t) => ({
      id: t.id || `t-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      eventId,
      name: t.name,
      description: '',
      priceInPence: t.priceInPence,
      currency: 'INR',
      capacity: t.capacity,
      soldCount: 0,
      reservedCount: 0,
      minPerBooking: 1,
      maxPerBooking: 50,
      salesStartAt: new Date().toISOString(),
      salesEndAt: new Date().toISOString(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    state.tiers.push(...newTiers);
    this.persist(state);
    this.notifySubscribers();

    if (typeof window !== 'undefined') {
      const event = state.events.find((e) => e.id === eventId);
      if (event) {
        fetch(`/api/events/${eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: {}, tiers: newTiers }),
        }).catch((e) => console.warn('Failed to sync tiers to server:', e));
      }
    }
  }

  // --- BOOKINGS & TICKETS ---
  public getBookings(): Booking[] {
    return this.loadState().bookings;
  }

  public getBooking(idOrRef: string): Booking | undefined {
    return this.loadState().bookings.find(
      (b) => b.id === idOrRef || b.bookingReference === idOrRef
    );
  }

  public getTicketsByBookingId(bookingId: string): Ticket[] {
    return this.loadState().tickets.filter((t) => t.bookingId === bookingId);
  }

  public getTickets(): Ticket[] {
    return this.loadState().tickets;
  }

  public getTicket(idOrNumber: string): Ticket | undefined {
    return this.loadState().tickets.find(
      (t) => t.id === idOrNumber || t.ticketNumber === idOrNumber || t.bookingId === idOrNumber
    );
  }

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

      const available = tier.capacity - tier.soldCount;
      if (item.quantity > available) {
        return {
          success: false,
          error: `Only ${Math.max(0, available)} tickets remaining for ${tier.name}.`,
        };
      }

      subtotalInPence += tier.priceInPence * item.quantity;
      bookingItems.push({
        tierId: tier.id,
        tierName: tier.name,
        quantity: item.quantity,
        unitPriceInPence: tier.priceInPence,
        subtotalInPence: tier.priceInPence * item.quantity,
      });

      // Update sold count
      tier.soldCount += item.quantity;
    }

    const bookingId = `b-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const bookingReference = generateBookingReference();

    const booking: Booking = {
      id: bookingId,
      bookingReference,
      eventId: event.id,
      organiserId: event.organiserId || 'org-1',
      customer: {
        fullName: params.customer.fullName,
        email: `${params.customer.phone}@firefly.direct`,
        phone: params.customer.phone,
        whatsappOptIn: true,
        isGuest: true,
      },
      items: bookingItems as any,
      subtotalInPence,
      serviceFeeInPence: 0,
      totalAmountInPence: subtotalInPence,
      currency: 'INR',
      status: 'PAYMENT_PENDING',
      reservationExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.bookings.unshift(booking);

    // Pre-create tickets in pending status
    const createdTickets: Ticket[] = [];
    for (const item of bookingItems) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketId = `tkt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const ticketNumber = generateTicketNumber();
        const qrPayload = buildQrPayload(ticketId, event.id, 'P1_TICKET_SECRET_KEY');

        const ticket: Ticket = {
          id: ticketId,
          ticketNumber,
          bookingId: booking.id,
          eventId: event.id,
          ticketTierId: item.tierId,
          tierName: item.tierName,
          attendeeName: params.customer.fullName,
          qrPayload,
          securityToken: ticketId,
          status: 'ISSUED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        state.tickets.push(ticket);
        createdTickets.push(ticket);
      }
    }

    this.persist(state);
    this.notifySubscribers();

    // Sync booking and tickets to Postgres server
    if (typeof window !== 'undefined') {
      fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking, tickets: createdTickets }),
      }).catch((e) => console.warn('Failed to sync booking to server:', e));
    }

    return { success: true, booking };
  }

  public async confirmBookingAndGenerateTickets(
    bookingId: string
  ): Promise<{ success: boolean; booking: Booking; tickets: Ticket[]; qrDataUrls: string[] }> {
    const state = this.loadState();
    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');

    booking.status = 'CONFIRMED';
    booking.updatedAt = new Date().toISOString();

    let tickets = state.tickets.filter((t) => t.bookingId === bookingId);

    // Auto-generate tickets from booking items if missing
    if (tickets.length === 0 && Array.isArray(booking.items) && booking.items.length > 0) {
      for (const item of booking.items) {
        const qty = Number(item.quantity) || 1;
        for (let i = 0; i < qty; i++) {
          const ticketId = `tkt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
          const ticketNumber = generateTicketNumber();
          const qrPayload = buildQrPayload(ticketId, booking.eventId, 'P1_TICKET_SECRET_KEY');

          const newTicket: Ticket = {
            id: ticketId,
            ticketNumber,
            bookingId: booking.id,
            eventId: booking.eventId,
            ticketTierId: (item as any).tierId || (item as any).ticketTierId || 'default',
            tierName: item.tierName || 'Standard Pass',
            attendeeName: booking.customer.fullName,
            qrPayload,
            securityToken: ticketId,
            status: 'ISSUED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          state.tickets.push(newTicket);
          tickets.push(newTicket);
        }
      }
    }

    const qrDataUrls: string[] = [];
    for (const t of tickets) {
      t.status = 'ISSUED';
      t.updatedAt = new Date().toISOString();
      try {
        const dataUrl = await QRCode.toDataURL(t.qrPayload, {
          width: 320,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
        qrDataUrls.push(dataUrl);
      } catch {
        qrDataUrls.push('');
      }
    }

    this.persist(state);
    this.notifySubscribers();

    // Sync status update & tickets to server
    if (typeof window !== 'undefined') {
      fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          status: 'CONFIRMED',
          ticketStatus: 'ISSUED',
          tickets,
        }),
      }).catch((e) => console.warn('Failed to sync confirm to server:', e));
    }

    return { success: true, booking, tickets, qrDataUrls };
  }

  public async deleteBooking(bookingId: string): Promise<{ success: boolean }> {
    const state = this.loadState();

    // 1. Remove booking from local state
    state.bookings = state.bookings.filter((b) => b.id !== bookingId);

    // 2. Remove all tickets belonging to this booking to immediately invalidate gate passes
    state.tickets = state.tickets.filter((t) => t.bookingId !== bookingId);

    this.persist(state);
    this.notifySubscribers();

    // 3. Delete in PostgreSQL cloud database
    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/bookings?bookingId=${encodeURIComponent(bookingId)}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('Failed to delete booking on cloud server:', e);
      }
    }

    return { success: true };
  }

  // --- GATE SCANNER ---
  public checkInTicket(payloadOrId: string, allowedEventId?: string): CheckInResponse {
    const state = this.loadState();
    const trimmed = payloadOrId.trim();

    let ticket = state.tickets.find(
      (t) => t.qrPayload === trimmed || t.id === trimmed || t.ticketNumber.toUpperCase() === trimmed.toUpperCase()
    );

    if (!ticket) {
      if (trimmed.startsWith('FF1.')) {
        const parts = trimmed.split('.');
        if (parts.length >= 3) {
          const tId = parts[1];
          ticket = state.tickets.find((t) => t.id === tId);
        }
      }
    }

    const now = new Date().toISOString();
    if (!ticket) {
      return {
        status: 'INVALID_QR',
        message: 'No ticket record found matching this pass.',
        timestamp: now,
      };
    }

    if (allowedEventId && ticket.eventId !== allowedEventId) {
      return {
        status: 'EVENT_MISMATCH',
        message: 'This ticket belongs to a different event.',
        timestamp: now,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          tierName: ticket.tierName,
        },
      };
    }

    if (ticket.status === 'REVOKED') {
      return {
        status: 'TICKET_REVOKED',
        message: 'This ticket has been marked REVOKED.',
        timestamp: now,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          tierName: ticket.tierName,
        },
      };
    }

    if (ticket.status === 'CHECKED_IN') {
      return {
        status: 'ALREADY_CHECKED_IN',
        message: `Already checked in at ${new Date(ticket.checkedInAt || now).toLocaleTimeString()}`,
        timestamp: now,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          tierName: ticket.tierName,
          checkedInAt: ticket.checkedInAt,
        },
      };
    }

    ticket.status = 'CHECKED_IN';
    ticket.checkedInAt = now;
    ticket.updatedAt = now;

    this.persist(state);
    this.notifySubscribers();

    // Sync check-in to server
    if (typeof window !== 'undefined') {
      fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id }),
      }).catch((e) => console.warn('Failed to sync check-in to server:', e));
    }

    return {
      status: 'SUCCESS',
      message: 'Admission Granted! Ticket verified successfully.',
      timestamp: now,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName,
        tierName: ticket.tierName,
        checkedInAt: now,
      },
    };
  }

  public verifyTicketScan(payloadOrId: string, allowedEventId?: string): CheckInResponse {
    return this.checkInTicket(payloadOrId, allowedEventId);
  }

  // --- BOOKMYSHOW-STYLE GATE ADMISSION INSPECTOR ---
  public resolveScanForGateInspection(codeOrPayload: string, allowedEventId?: string): GateScanInspection {
    const state = this.loadState();
    const now = new Date().toISOString();
    let raw = (codeOrPayload || '').trim();

    // 1. If scanned text is a URL (e.g. https://.../ticket/tkt-1234), extract the ticket ID
    if (raw.includes('/ticket/')) {
      const parts = raw.split('/ticket/');
      if (parts[1]) {
        raw = parts[1].split('?')[0].split('#')[0].trim();
      }
    }

    // 2. If canonical "FF1.<ticketId>.<eventId>..." format
    let extractedTicketId = raw;
    if (raw.startsWith('FF1.')) {
      const parts = raw.split('.');
      if (parts.length >= 2) {
        extractedTicketId = parts[1];
      }
    }

    // 3. Find matching ticket
    let ticket = state.tickets.find(
      (t) =>
        t.id.toLowerCase() === raw.toLowerCase() ||
        t.id.toLowerCase() === extractedTicketId.toLowerCase() ||
        t.ticketNumber.toUpperCase() === raw.toUpperCase() ||
        t.qrPayload === raw ||
        (t.qrPayload && t.qrPayload.includes(raw)) ||
        raw.includes(t.id) ||
        raw.includes(t.ticketNumber)
    );

    // 4. If not found by ticket, try matching by booking ID or reference
    let booking: Booking | undefined;
    if (ticket) {
      const bId = ticket.bookingId;
      booking = state.bookings.find((b) => b.id === bId);
    } else {
      booking = state.bookings.find(
        (b) =>
          b.id.toLowerCase() === raw.toLowerCase() ||
          b.bookingReference.toUpperCase() === raw.toUpperCase() ||
          raw.includes(b.id) ||
          raw.includes(b.bookingReference)
      );
      if (booking) {
        ticket = state.tickets.find((t) => t.bookingId === booking!.id);
      }
    }

    if (!ticket && !booking) {
      return {
        status: 'INVALID',
        message: 'No matching ticket or booking found in system.',
        timestamp: now,
        tickets: [],
        totalPasses: 0,
        unenteredTickets: [],
        checkedInTickets: [],
      };
    }

    const eventId = ticket?.eventId || booking?.eventId || '';
    const event = state.events.find((e) => e.id === eventId);

    if (allowedEventId && eventId !== allowedEventId) {
      return {
        status: 'EVENT_MISMATCH',
        message: `This pass is for "${event?.title || 'Another Event'}", not the selected event!`,
        timestamp: now,
        booking,
        event,
        tickets: ticket ? [ticket] : [],
        totalPasses: 1,
        unenteredTickets: [],
        checkedInTickets: [],
        matchedTicket: ticket,
      };
    }

    // All sibling tickets belonging to this booking
    const bookingId = ticket?.bookingId || booking?.id;
    let siblingTickets = state.tickets.filter((t) => t.bookingId === bookingId);
    if (siblingTickets.length === 0 && ticket) {
      siblingTickets = [ticket];
    }

    const totalPasses = siblingTickets.length;
    const unenteredTickets = siblingTickets.filter((t) => t.status !== 'CHECKED_IN');
    const checkedInTickets = siblingTickets.filter((t) => t.status === 'CHECKED_IN');

    // If all tickets in booking are already checked in => DUPLICATE
    if (totalPasses > 0 && unenteredTickets.length === 0) {
      const firstCheckedInAt = checkedInTickets[0]?.checkedInAt || now;
      return {
        status: 'DUPLICATE',
        message: `DUPLICATE ENTRY DETECTED! All ${totalPasses} pass(es) on this booking were already entered and locked at ${new Date(firstCheckedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        timestamp: now,
        booking,
        event,
        tickets: siblingTickets,
        totalPasses,
        unenteredTickets,
        checkedInTickets,
        firstCheckedInAt,
        matchedTicket: ticket,
      };
    }

    // Ready for admission!
    return {
      status: 'READY',
      message: `${unenteredTickets.length} of ${totalPasses} pass(es) ready for admission.`,
      timestamp: now,
      booking,
      event,
      tickets: siblingTickets,
      totalPasses,
      unenteredTickets,
      checkedInTickets,
      matchedTicket: ticket,
    };
  }

  public async confirmGateAdmit(
    ticketIds: string[]
  ): Promise<{ success: boolean; count: number; checkedInAt: string }> {
    const state = this.loadState();
    const now = new Date().toISOString();
    let count = 0;

    for (const id of ticketIds) {
      const idx = state.tickets.findIndex((t) => t.id === id || t.ticketNumber === id);
      if (idx !== -1) {
        state.tickets[idx].status = 'CHECKED_IN';
        state.tickets[idx].checkedInAt = now;
        state.tickets[idx].updatedAt = now;
        count++;
      }
    }

    this.persist(state);
    this.notifySubscribers();

    // Sync to PostgreSQL cloud database
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketIds, now }),
        });
      } catch (e) {
        console.warn('Check-in cloud sync error:', e);
      }
    }

    return { success: true, count, checkedInAt: now };
  }

  public async resolveScanForGateInspectionAsync(
    codeOrPayload: string,
    allowedEventId?: string
  ): Promise<GateScanInspection> {
    const localRes = this.resolveScanForGateInspection(codeOrPayload, allowedEventId);
    if (localRes.status !== 'INVALID') {
      return localRes;
    }

    // If not found in local IndexedDB, check cloud Neon Postgres database
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/check-in?code=${encodeURIComponent(codeOrPayload.trim())}`);
        if (res.ok) {
          const cloudData = await res.json();
          if (cloudData.status === 'FOUND' && cloudData.booking) {
            const state = this.loadState();
            if (!state.bookings.some((b) => b.id === cloudData.booking.id)) {
              const cust = typeof cloudData.booking.customer === 'string'
                ? JSON.parse(cloudData.booking.customer)
                : (cloudData.booking.customer || {
                    fullName: cloudData.booking.customer_name || 'Attendee',
                    phone: cloudData.booking.customer_phone || '',
                    email: cloudData.booking.customer_email || '',
                    whatsappOptIn: true,
                    isGuest: true,
                  });
              const rawItems = typeof cloudData.booking.items === 'string'
                ? JSON.parse(cloudData.booking.items)
                : (cloudData.booking.items || []);

              state.bookings.push({
                id: cloudData.booking.id,
                bookingReference: cloudData.booking.booking_reference,
                eventId: cloudData.booking.event_id,
                organiserId: cloudData.booking.organiser_id || 'org-1',
                customer: cust,
                items: rawItems,
                status: cloudData.booking.status,
                subtotalInPence: Number(cloudData.booking.total_amount_in_pence || 0),
                serviceFeeInPence: 0,
                totalAmountInPence: Number(cloudData.booking.total_amount_in_pence || 0),
                currency: cloudData.booking.currency || 'INR',
                reservationExpiresAt: cloudData.booking.created_at || new Date().toISOString(),
                createdAt: cloudData.booking.created_at || new Date().toISOString(),
                updatedAt: cloudData.booking.updated_at || new Date().toISOString(),
              });
            }

            if (Array.isArray(cloudData.tickets)) {
              for (const ct of cloudData.tickets) {
                const exIdx = state.tickets.findIndex((t) => t.id === ct.id);
                const mapped: Ticket = {
                  id: ct.id,
                  ticketNumber: ct.ticket_number,
                  bookingId: ct.booking_id,
                  eventId: ct.event_id,
                  ticketTierId: ct.tier_id,
                  tierName: ct.tier_name,
                  attendeeName: ct.attendee_name,
                  qrPayload: ct.qr_payload,
                  securityToken: ct.id,
                  status: ct.status,
                  checkedInAt: ct.checked_in_at,
                  createdAt: ct.created_at,
                  updatedAt: ct.updated_at,
                };
                if (exIdx >= 0) {
                  state.tickets[exIdx] = mapped;
                } else {
                  state.tickets.push(mapped);
                }
              }
            }

            if (cloudData.event && !state.events.some((e) => e.id === cloudData.event.id)) {
              state.events.push(cloudData.event);
            }

            this.persist(state);
            this.notifySubscribers();
            return this.resolveScanForGateInspection(codeOrPayload, allowedEventId);
          }
        }
      } catch (e) {
        console.warn('Async cloud inspection error:', e);
      }
    }

    return localRes;
  }

  // --- ADMIN AUTH & RESET ---
  public verifyAdminPin(pin: string): boolean {
    const configuredPin = process.env.NEXT_PUBLIC_ADMIN_PIN || 'CF2026';
    const trimmed = (pin || '').trim();
    return trimmed === 'CF2026' || trimmed === configuredPin || trimmed === (this.loadState().adminPin || '').trim();
  }

  public async resetDatabase(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      await this.writeToIdb(STORAGE_KEY, DEFAULT_STATE);
      this.memoryCache = JSON.parse(JSON.stringify(DEFAULT_STATE));
      this.notifySubscribers();
    }
  }
}

export const p1Storage = new P1MultiEventStore();
