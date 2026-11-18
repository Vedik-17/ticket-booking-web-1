import crypto from 'crypto';
import {
  PaymentOrderRequest,
  PaymentOrderResponse,
  PaymentVerificationRequest,
  PaymentVerificationResult,
} from '@firefly/shared-types';
import { IPaymentProvider } from './interface';

export const MOCK_SECRET = 'firefly-mock-payment-secret-2026';

export class MockPaymentProvider implements IPaymentProvider {
  public readonly providerType = 'MOCK_GATEWAY';

  public async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    const orderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      orderId,
      amountInPence: request.amountInPence,
      currency: request.currency || 'INR',
      provider: 'MOCK_GATEWAY',
      keyId: 'mock_key_firefly_test',
      notes: {
        bookingId: request.bookingId,
        bookingReference: request.bookingReference,
        ...request.notes,
      },
    };
  }

  /**
   * Helper to generate a valid test signature for automated tests
   */
  public static generateTestSignature(orderId: string, paymentId: string, secret = MOCK_SECRET): string {
    return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  public async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    const expected = MockPaymentProvider.generateTestSignature(request.orderId, request.paymentId);
    const valid = expected === request.signature;

    if (!valid) {
      return {
        success: false,
        paymentId: request.paymentId,
        orderId: request.orderId,
        amountInPence: 0,
        status: 'FAILED',
        errorMessage: 'Invalid mock test payment signature.',
      };
    }

    return {
      success: true,
      paymentId: request.paymentId,
      orderId: request.orderId,
      amountInPence: 0,
      status: 'CAPTURED',
    };
  }

  public verifyWebhookSignature(rawPayload: string, signature: string, secret = MOCK_SECRET): boolean {
    const expected = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
    return expected === signature;
  }

  public async processWebhookEvent(event: Record<string, unknown>): Promise<{
    handled: boolean;
    bookingId?: string;
    orderId?: string;
    paymentId?: string;
    status?: string;
    reason?: string;
  }> {
    if (event.event === 'mock.payment.success') {
      return {
        handled: true,
        bookingId: event.bookingId as string,
        orderId: event.orderId as string,
        paymentId: event.paymentId as string,
        status: 'CAPTURED',
      };
    }
    return { handled: false };
  }
}
