import { TicketTier, InventoryReservation } from '@firefly/shared-types';

export const DEFAULT_RESERVATION_DURATION_MINUTES = 10;

export interface ReserveInventoryParams {
  tier: TicketTier;
  quantity: number;
  bookingId: string;
  durationMinutes?: number;
}

export interface ReservationResult {
  success: boolean;
  reservation?: InventoryReservation;
  updatedTier?: TicketTier;
  errorCode?: 'INSUFFICIENT_STOCK' | 'TIER_PAUSED' | 'EXCEEDS_MAX_LIMIT' | 'BELOW_MIN_LIMIT' | 'SALES_CLOSED';
  message?: string;
}

export class InventoryEngine {
  /**
   * Calculates the currently available (unreserved, unsold) inventory for a tier
   */
  public static getAvailableStock(tier: TicketTier): number {
    return Math.max(0, tier.capacity - tier.soldCount - tier.reservedCount);
  }

  /**
   * Verifies if a requested ticket quantity is eligible for reservation
   */
  public static validateReservationRequest(tier: TicketTier, quantity: number): { valid: boolean; reason?: string } {
    if (tier.status !== 'ACTIVE') {
      return { valid: false, reason: `Ticket tier is not currently active (${tier.status})` };
    }

    const now = new Date().getTime();
    const salesStart = new Date(tier.salesStartAt).getTime();
    const salesEnd = new Date(tier.salesEndAt).getTime();

    if (now < salesStart) {
      return { valid: false, reason: 'Ticket sales have not opened yet' };
    }
    if (now > salesEnd) {
      return { valid: false, reason: 'Ticket sales for this tier have closed' };
    }

    if (quantity < tier.minPerBooking) {
      return { valid: false, reason: `Minimum ${tier.minPerBooking} ticket(s) required per booking` };
    }
    if (quantity > tier.maxPerBooking) {
      return { valid: false, reason: `Maximum ${tier.maxPerBooking} tickets permitted per booking` };
    }

    const available = this.getAvailableStock(tier);
    if (quantity > available) {
      return { valid: false, reason: `Only ${available} ticket(s) remaining for ${tier.name}` };
    }

    return { valid: true };
  }

  /**
   * Performs in-memory reservation calculations (mirrors the PostgreSQL transactional reserve function)
   */
  public static reserve(params: ReserveInventoryParams): ReservationResult {
    const { tier, quantity, bookingId, durationMinutes = DEFAULT_RESERVATION_DURATION_MINUTES } = params;
    const validation = this.validateReservationRequest(tier, quantity);

    if (!validation.valid) {
      return {
        success: false,
        errorCode: 'INSUFFICIENT_STOCK',
        message: validation.reason,
      };
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const updatedTier: TicketTier = {
      ...tier,
      reservedCount: tier.reservedCount + quantity,
      status: (tier.soldCount + tier.reservedCount + quantity >= tier.capacity) ? 'SOLD_OUT' : tier.status,
      updatedAt: new Date().toISOString(),
    };

    const reservation: InventoryReservation = {
      id: `RES-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      bookingId,
      ticketTierId: tier.id,
      quantity,
      expiresAt,
      released: false,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      reservation,
      updatedTier,
    };
  }

  /**
   * Releases an unconfirmed or expired reservation back into the available pool
   */
  public static releaseReservation(tier: TicketTier, reservation: InventoryReservation): { updatedTier: TicketTier; releasedReservation: InventoryReservation } {
    if (reservation.released) {
      return { updatedTier: tier, releasedReservation: reservation };
    }

    const newReservedCount = Math.max(0, tier.reservedCount - reservation.quantity);
    const updatedTier: TicketTier = {
      ...tier,
      reservedCount: newReservedCount,
      status: (tier.status === 'SOLD_OUT' && (tier.soldCount + newReservedCount < tier.capacity)) ? 'ACTIVE' : tier.status,
      updatedAt: new Date().toISOString(),
    };

    const releasedReservation: InventoryReservation = {
      ...reservation,
      released: true,
    };

    return { updatedTier, releasedReservation };
  }

  /**
   * Confirms reservation upon successful payment: converts reservedCount to soldCount
   */
  public static confirmReservation(tier: TicketTier, reservation: InventoryReservation): { updatedTier: TicketTier; confirmedReservation: InventoryReservation } {
    const newReservedCount = Math.max(0, tier.reservedCount - reservation.quantity);
    const newSoldCount = tier.soldCount + reservation.quantity;

    const updatedTier: TicketTier = {
      ...tier,
      reservedCount: newReservedCount,
      soldCount: newSoldCount,
      status: (newSoldCount >= tier.capacity) ? 'SOLD_OUT' : tier.status,
      updatedAt: new Date().toISOString(),
    };

    const confirmedReservation: InventoryReservation = {
      ...reservation,
      released: true, // finalized
    };

    return { updatedTier, confirmedReservation };
  }

  /**
   * Checks if an inventory reservation is expired
   */
  public static isExpired(reservation: InventoryReservation): boolean {
    return new Date(reservation.expiresAt).getTime() <= Date.now();
  }
}
