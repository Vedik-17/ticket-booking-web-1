import { CheckInRequest, CheckInResponse, Ticket } from '@firefly/shared-types';
import { TicketEngine } from '@firefly/ticket-engine';
import { parseQrPayload } from '@firefly/core';

export class ScannerEngine {
  /**
   * Evaluates check-in request against ticket record atomically
   */
  public static processScan(params: {
    request: CheckInRequest;
    ticket?: Ticket | null;
  }): {
    response: CheckInResponse;
    updatedTicket?: Ticket;
  } {
    const { request, ticket } = params;
    const now = new Date().toISOString();

    const parsed = parseQrPayload(request.qrPayload);
    if (!parsed) {
      return {
        response: {
          status: 'INVALID_QR',
          message: 'The scanned QR code is unreadable or not a Firefly ticket format.',
          timestamp: now,
        },
      };
    }

    if (!ticket) {
      return {
        response: {
          status: 'INVALID_QR',
          message: 'No ticket record found matching this code.',
          timestamp: now,
        },
      };
    }

    if (ticket.eventId !== request.eventId) {
      return {
        response: {
          status: 'EVENT_MISMATCH',
          message: 'This ticket is valid, but belongs to a different event.',
          timestamp: now,
          ticket: {
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            attendeeName: ticket.attendeeName,
            tierName: ticket.tierName,
          },
        },
      };
    }

    if (ticket.status === 'REVOKED') {
      return {
        response: {
          status: 'TICKET_REVOKED',
          message: 'This ticket has been marked REVOKED by the organiser.',
          timestamp: now,
          ticket: {
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            attendeeName: ticket.attendeeName,
            tierName: ticket.tierName,
          },
        },
      };
    }

    if (ticket.status === 'CHECKED_IN') {
      return {
        response: {
          status: 'ALREADY_CHECKED_IN',
          message: `DUPLICATE ENTRY DETECTED! Already admitted at ${ticket.checkedInAt || 'prior check-in'}.`,
          timestamp: now,
          ticket: {
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            attendeeName: ticket.attendeeName,
            tierName: ticket.tierName,
            checkedInAt: ticket.checkedInAt,
          },
        },
      };
    }

    const verification = TicketEngine.verifyTicket(ticket, request.qrPayload);
    if (!verification.valid) {
      return {
        response: {
          status: 'INVALID_QR',
          message: verification.reason || 'Cryptographic verification failed.',
          timestamp: now,
        },
      };
    }

    const updatedTicket: Ticket = {
      ...ticket,
      status: 'CHECKED_IN',
      checkedInAt: now,
      checkedInBy: request.scannerUserId,
      updatedAt: now,
    };

    return {
      response: {
        status: 'SUCCESS',
        message: 'Ticket successfully verified. Access Granted.',
        timestamp: now,
        ticket: {
          id: updatedTicket.id,
          ticketNumber: updatedTicket.ticketNumber,
          attendeeName: updatedTicket.attendeeName,
          tierName: updatedTicket.tierName,
          checkedInAt: now,
        },
      },
      updatedTicket,
    };
  }
}
