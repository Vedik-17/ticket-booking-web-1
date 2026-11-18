import test from 'node:test';
import assert from 'node:assert/strict';

// Test imports from packages
import { EventEngine } from '../packages/event-engine/src/index';
import { InventoryEngine } from '../packages/inventory-engine/src/index';
import { BookingEngine } from '../packages/booking-engine/src/index';
import { TicketEngine } from '../packages/ticket-engine/src/index';
import { ScannerEngine } from '../packages/scanner-engine/src/index';
import { MockPaymentProvider } from '../packages/payment-engine/src/index';
import {
  signTicketPayload,
  verifyTicketSignature,
  buildQrPayload,
  parseQrPayload,
  formatINR,
  paiseToRupees,
  rupeesToPaise,
} from '../packages/core/src/index';
import { Event, TicketTier, Booking, Ticket } from '../packages/shared-types/src/index';

test('1. Core Utilities & Cryptography', async (t) => {
  await t.test('Currency conversion handles Paise to Rupees accurately', () => {
    assert.equal(paiseToRupees(199900), 1999);
    assert.equal(rupeesToPaise(1999), 199900);
    assert.equal(formatINR(199900), '₹1,999');
  });

  await t.test('HMAC signing and tamper verification works', () => {
    const ticketId = 'tkt-uuid-1';
    const eventId = 'evt-uuid-1';
    const token = 'random-nonce-123';
    const secret = 'test-secret-key';

    const sig = signTicketPayload(ticketId, eventId, token, secret);
    assert.equal(typeof sig, 'string');
    assert.equal(sig.length, 32);

    // Verify valid signature
    assert.equal(verifyTicketSignature(ticketId, eventId, token, sig, secret), true);

    // Verify tampered ticketId fails
    assert.equal(verifyTicketSignature('tampered-ticket-id', eventId, token, sig, secret), false);

    // Verify tampered secret fails
    assert.equal(verifyTicketSignature(ticketId, eventId, token, sig, 'wrong-secret'), false);
  });

  await t.test('QR payload builder and parser matches canonical format', () => {
    const ticketId = 'tkt-uuid-99';
    const eventId = 'evt-uuid-99';
    const token = 'nonce-xyz';

    const qr = buildQrPayload(ticketId, eventId, token);
    assert.ok(qr.startsWith('FF1.'));

    const parsed = parseQrPayload(qr);
    assert.ok(parsed);
    assert.equal(parsed.ticketId, ticketId);
    assert.equal(parsed.eventId, eventId);
    assert.equal(parsed.token, token);
  });
});

test('2. Inventory Engine & Concurrency Bounds', async (t) => {
  const dummyTier: TicketTier = {
    id: 'tier-1',
    eventId: 'evt-1',
    name: 'General Admission',
    priceInPence: 100000,
    currency: 'INR',
    capacity: 100,
    reservedCount: 0,
    soldCount: 95,
    minPerBooking: 1,
    maxPerBooking: 10,
    salesStartAt: new Date(Date.now() - 3600000).toISOString(),
    salesEndAt: new Date(Date.now() + 3600000).toISOString(),
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await t.test('Calculates available stock correctly', () => {
    assert.equal(InventoryEngine.getAvailableStock(dummyTier), 5);
  });

  await t.test('Rejects reservation exceeding available capacity', () => {
    const res = InventoryEngine.reserve({
      tier: dummyTier,
      quantity: 6, // only 5 available
      bookingId: 'book-1',
    });
    assert.equal(res.success, false);
    assert.equal(res.errorCode, 'INSUFFICIENT_STOCK');
  });

  await t.test('Accepts valid reservation and increments reservedCount', () => {
    const res = InventoryEngine.reserve({
      tier: dummyTier,
      quantity: 5,
      bookingId: 'book-1',
    });
    assert.equal(res.success, true);
    assert.ok(res.updatedTier);
    assert.equal(res.updatedTier.reservedCount, 5);
    assert.equal(res.updatedTier.status, 'SOLD_OUT');
  });

  await t.test('Expired reservation release restores stock', () => {
    const res = InventoryEngine.reserve({
      tier: dummyTier,
      quantity: 4,
      bookingId: 'book-2',
    });
    assert.ok(res.reservation && res.updatedTier);

    const released = InventoryEngine.releaseReservation(res.updatedTier, res.reservation);
    assert.equal(released.updatedTier.reservedCount, 0);
    assert.equal(released.releasedReservation.released, true);
  });
});

test('3. Booking Engine Lifecycle & State Machine', async (t) => {
  await t.test('Validates guest customer input', () => {
    const valid = BookingEngine.validateCustomer({
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210',
      whatsappOptIn: true,
      isGuest: true,
    });
    assert.equal(valid.valid, true);

    const invalid = BookingEngine.validateCustomer({
      fullName: 'J',
      email: 'bad-email',
      phone: '123',
      whatsappOptIn: false,
      isGuest: true,
    });
    assert.equal(invalid.valid, false);
    assert.equal(invalid.errors.length, 3);
  });

  await t.test('Calculates platform fee and pricing accurately', () => {
    const tier: TicketTier = {
      id: 't-1',
      eventId: 'e-1',
      name: 'Early Bird',
      priceInPence: 200000, // ₹2000
      currency: 'INR',
      capacity: 50,
      reservedCount: 0,
      soldCount: 0,
      minPerBooking: 1,
      maxPerBooking: 4,
      salesStartAt: new Date().toISOString(),
      salesEndAt: new Date(Date.now() + 100000).toISOString(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const pricing = BookingEngine.calculatePricing([{ tier, quantity: 2 }]);
    assert.equal(pricing.subtotalInPence, 400000); // ₹4,000
    assert.equal(pricing.serviceFeeInPence, 10000); // 2.5% = ₹100
    assert.equal(pricing.totalAmountInPence, 410000); // ₹4,100
  });

  await t.test('State transition validation adheres to state machine rules', () => {
    assert.equal(BookingEngine.canTransition('INITIATED', 'RESERVED'), true);
    assert.equal(BookingEngine.canTransition('RESERVED', 'CONFIRMED'), false); // Must pass PAYMENT_PENDING/PROCESSING
    assert.equal(BookingEngine.canTransition('PAYMENT_PENDING', 'CONFIRMED'), true);
    assert.equal(BookingEngine.canTransition('CONFIRMED', 'FAILED'), false); // Cannot fail once confirmed
  });
});

test('4. Ticket Engine & Entrance Scanner Anti-Duplicate Validation', async (t) => {
  const dummyBooking: Booking = {
    id: 'b-100',
    bookingReference: 'FF-2026-TEST',
    eventId: 'e-100',
    organiserId: 'org-1',
    customer: {
      fullName: 'Sarah Connor',
      email: 'sarah@resistance.com',
      phone: '9876543210',
      whatsappOptIn: true,
      isGuest: true,
    },
    items: [
      {
        id: 'bi-1',
        bookingId: 'b-100',
        ticketTierId: 'tier-vip',
        tierName: 'VIP Lounge',
        unitPriceInPence: 500000,
        quantity: 2,
        totalPriceInPence: 1000000,
      },
    ],
    subtotalInPence: 1000000,
    serviceFeeInPence: 25000,
    totalAmountInPence: 1025000,
    currency: 'INR',
    status: 'CONFIRMED',
    reservationExpiresAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const issuedTickets = TicketEngine.issueTickets({
    booking: dummyBooking,
    items: dummyBooking.items,
  });

  assert.equal(issuedTickets.length, 2);
  const firstTicket = issuedTickets[0];
  assert.equal(firstTicket.status, 'ISSUED');
  assert.ok(firstTicket.qrPayload.startsWith('FF1.'));

  await t.test('First scan of valid ticket grants admission', () => {
    const scan1 = ScannerEngine.processScan({
      request: {
        qrPayload: firstTicket.qrPayload,
        eventId: dummyBooking.eventId,
        scannerUserId: 'GATE-1',
      },
      ticket: firstTicket,
    });

    assert.equal(scan1.response.status, 'SUCCESS');
    assert.ok(scan1.updatedTicket);
    assert.equal(scan1.updatedTicket.status, 'CHECKED_IN');

    // Duplicate scan with same ticket MUST be rejected immediately!
    const scan2 = ScannerEngine.processScan({
      request: {
        qrPayload: firstTicket.qrPayload,
        eventId: dummyBooking.eventId,
        scannerUserId: 'GATE-2',
      },
      ticket: scan1.updatedTicket, // now CHECKED_IN
    });

    assert.equal(scan2.response.status, 'ALREADY_CHECKED_IN');
    assert.ok(scan2.response.message.includes('DUPLICATE ENTRY DETECTED'));
  });

  await t.test('Scan of ticket for wrong event is rejected', () => {
    const scanWrongEvent = ScannerEngine.processScan({
      request: {
        qrPayload: firstTicket.qrPayload,
        eventId: 'different-event-id',
        scannerUserId: 'GATE-1',
      },
      ticket: firstTicket,
    });

    assert.equal(scanWrongEvent.response.status, 'EVENT_MISMATCH');
  });

  await t.test('Reissuing a ticket invalidates previous QR code', () => {
    const reissued = TicketEngine.reissueTicket(firstTicket);
    assert.notEqual(reissued.securityToken, firstTicket.securityToken);
    assert.notEqual(reissued.qrPayload, firstTicket.qrPayload);

    // Old QR with new ticket record fails verification
    const verification = TicketEngine.verifyTicket(reissued, firstTicket.qrPayload);
    assert.equal(verification.valid, false);
    assert.ok(verification.reason?.includes('expired or been reissued'));
  });
});

test('5. Payment Engine & Gateway Signature Verification', async (t) => {
  const provider = new MockPaymentProvider();
  const orderReq = {
    bookingId: 'book-pay-1',
    bookingReference: 'FF-2026-PAY1',
    amountInPence: 205000,
    currency: 'INR',
    customer: {
      name: 'Tester',
      email: 'test@example.com',
      phone: '9876543210',
    },
  };

  const order = await provider.createOrder(orderReq);
  assert.ok(order.orderId);
  assert.equal(order.amountInPence, 205000);

  const paymentId = 'pay_test_987';
  const validSignature = MockPaymentProvider.generateTestSignature(order.orderId, paymentId);

  await t.test('Valid cryptographic payment signature succeeds', async () => {
    const result = await provider.verifyPayment({
      bookingId: 'book-pay-1',
      orderId: order.orderId,
      paymentId,
      signature: validSignature,
    });
    assert.equal(result.success, true);
    assert.equal(result.status, 'CAPTURED');
  });

  await t.test('Forged payment signature is detected and rejected', async () => {
    const result = await provider.verifyPayment({
      bookingId: 'book-pay-1',
      orderId: order.orderId,
      paymentId,
      signature: 'bad-forged-signature-string',
    });
    assert.equal(result.success, false);
    assert.equal(result.status, 'FAILED');
  });
});
