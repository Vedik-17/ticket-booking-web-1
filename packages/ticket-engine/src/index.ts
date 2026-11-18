import { Booking, BookingItem, Ticket, TicketStatus } from '@firefly/shared-types';
import {
  generateUUID,
  generateTicketNumber,
  generateSecureToken,
  buildQrPayload,
  parseQrPayload,
  verifyTicketSignature,
} from '@firefly/core';

export interface IssueTicketsParams {
  booking: Booking;
  items: BookingItem[];
  attendeeNames?: string[];
}

export class TicketEngine {
  /**
   * Mints cryptographic tickets for all items in a confirmed booking
   */
  public static issueTickets(params: IssueTicketsParams): Ticket[] {
    const { booking, items, attendeeNames = [] } = params;
    const tickets: Ticket[] = [];
    let attendeeIndex = 0;

    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketId = generateUUID();
        const securityToken = generateSecureToken(16);
        const ticketNumber = generateTicketNumber(item.tierName.substring(0, 3));
        const attendeeName = attendeeNames[attendeeIndex] || booking.customer.fullName;
        attendeeIndex++;

        const qrPayload = buildQrPayload(ticketId, booking.eventId, securityToken);

        tickets.push({
          id: ticketId,
          ticketNumber,
          bookingId: booking.id,
          eventId: booking.eventId,
          ticketTierId: item.ticketTierId,
          tierName: item.tierName,
          attendeeName,
          qrPayload,
          securityToken,
          status: 'ISSUED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return tickets;
  }

  /**
   * Validates a ticket QR payload against the ticket record
   */
  public static verifyTicket(ticket: Ticket, rawQrPayload: string): {
    valid: boolean;
    reason?: string;
  } {
    const parsed = parseQrPayload(rawQrPayload);
    if (!parsed) {
      return { valid: false, reason: 'Malformed or unrecognizable QR format.' };
    }

    if (parsed.ticketId !== ticket.id) {
      return { valid: false, reason: 'Ticket ID mismatch.' };
    }

    if (parsed.eventId !== ticket.eventId) {
      return { valid: false, reason: 'Ticket does not belong to this event.' };
    }

    if (parsed.token !== ticket.securityToken) {
      return { valid: false, reason: 'Ticket security token has expired or been reissued.' };
    }

    const signatureValid = verifyTicketSignature(parsed.ticketId, parsed.eventId, parsed.token, parsed.signature);
    if (!signatureValid) {
      return { valid: false, reason: 'Cryptographic signature verification failed. Potential counterfeit.' };
    }

    if (ticket.status === 'REVOKED') {
      return { valid: false, reason: 'Ticket has been revoked by organiser.' };
    }

    if (ticket.status === 'CHECKED_IN') {
      return { valid: false, reason: `Ticket already checked in at ${ticket.checkedInAt || 'earlier time'}.` };
    }

    return { valid: true };
  }

  /**
   * Reissues a ticket with a fresh cryptographic nonce and QR payload, invalidating any previously leaked QR
   */
  public static reissueTicket(ticket: Ticket): Ticket {
    const newToken = generateSecureToken(16);
    const newQr = buildQrPayload(ticket.id, ticket.eventId, newToken);

    return {
      ...ticket,
      securityToken: newToken,
      qrPayload: newQr,
      status: 'ISSUED',
      checkedInAt: undefined,
      checkedInBy: undefined,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Revokes a ticket
   */
  public static revokeTicket(ticket: Ticket): Ticket {
    return {
      ...ticket,
      status: 'REVOKED',
      updatedAt: new Date().toISOString(),
    };
  }
}
