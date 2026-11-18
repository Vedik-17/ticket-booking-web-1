import { Booking, BookingItem, BookingStatus, CustomerDetails, TicketTier } from '@firefly/shared-types';
import { generateBookingReference, generateUUID } from '@firefly/core';

export const PLATFORM_FEE_PERCENT = 0.025; // 2.5% platform fee

export interface CreateBookingDraftParams {
  eventId: string;
  organiserId: string;
  customer: CustomerDetails;
  items: Array<{ tier: TicketTier; quantity: number }>;
  currency?: 'INR' | 'USD';
  reservationMinutes?: number;
}

export class BookingEngine {
  /**
   * Validates guest customer details before creating a reservation
   */
  public static validateCustomer(customer: CustomerDetails): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!customer.fullName || customer.fullName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters long.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customer.email || !emailRegex.test(customer.email.trim())) {
      errors.push('A valid email address is required.');
    }

    const phoneRegex = /^\+?[0-9]{10,15}$/;
    const cleanPhone = customer.phone.replace(/[\s-]/g, '');
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      errors.push('A valid contact phone number is required.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculates subtotal, platform service fees, and total in lowest currency units (Paise)
   */
  public static calculatePricing(items: Array<{ tier: TicketTier; quantity: number }>): {
    bookingItems: BookingItem[];
    subtotalInPence: number;
    serviceFeeInPence: number;
    totalAmountInPence: number;
  } {
    let subtotalInPence = 0;
    const bookingItems: BookingItem[] = [];

    for (const item of items) {
      const lineTotal = item.tier.priceInPence * item.quantity;
      subtotalInPence += lineTotal;

      bookingItems.push({
        id: generateUUID(),
        bookingId: '', // populated in final booking object
        ticketTierId: item.tier.id,
        tierName: item.tier.name,
        unitPriceInPence: item.tier.priceInPence,
        quantity: item.quantity,
        totalPriceInPence: lineTotal,
      });
    }

    const serviceFeeInPence = Math.round(subtotalInPence * PLATFORM_FEE_PERCENT);
    const totalAmountInPence = subtotalInPence + serviceFeeInPence;

    return {
      bookingItems,
      subtotalInPence,
      serviceFeeInPence,
      totalAmountInPence,
    };
  }

  /**
   * Creates an initial reserved booking
   */
  public static createBooking(params: CreateBookingDraftParams): { booking: Booking } {
    const bookingId = generateUUID();
    const reference = generateBookingReference();
    const { bookingItems, subtotalInPence, serviceFeeInPence, totalAmountInPence } = this.calculatePricing(params.items);

    const minutes = params.reservationMinutes || 10;
    const reservationExpiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    const itemsWithBookingId = bookingItems.map((item) => ({
      ...item,
      bookingId,
    }));

    const booking: Booking = {
      id: bookingId,
      bookingReference: reference,
      eventId: params.eventId,
      organiserId: params.organiserId,
      customer: params.customer,
      items: itemsWithBookingId,
      subtotalInPence,
      serviceFeeInPence,
      totalAmountInPence,
      currency: params.currency || 'INR',
      status: 'RESERVED',
      reservationExpiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { booking };
  }

  /**
   * Validates state transitions in the booking lifecycle
   */
  public static canTransition(current: BookingStatus, next: BookingStatus): boolean {
    const transitions: Record<BookingStatus, BookingStatus[]> = {
      INITIATED: ['RESERVED', 'FAILED', 'CANCELLED'],
      RESERVED: ['PAYMENT_PENDING', 'EXPIRED', 'CANCELLED'],
      PAYMENT_PENDING: ['PAYMENT_PROCESSING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'CANCELLED'],
      PAYMENT_PROCESSING: ['CONFIRMED', 'FAILED', 'REFUNDED'],
      CONFIRMED: ['REFUNDED', 'CANCELLED'],
      FAILED: [], // terminal
      CANCELLED: [], // terminal
      REFUNDED: [], // terminal
      EXPIRED: [], // terminal
    };

    return transitions[current]?.includes(next) ?? false;
  }
}
