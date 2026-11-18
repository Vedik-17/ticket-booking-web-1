import {
  PaymentOrderRequest,
  PaymentOrderResponse,
  PaymentVerificationRequest,
  PaymentVerificationResult,
  PaymentProviderType,
} from '@firefly/shared-types';

export interface IPaymentProvider {
  readonly providerType: PaymentProviderType;

  /**
   * Generates a payment order from the provider
   */
  createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse>;

  /**
   * Verifies the cryptographic payment signature returned by the gateway
   */
  verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult>;

  /**
   * Verifies an inbound webhook signature
   */
  verifyWebhookSignature(rawPayload: string, signature: string, secret?: string): boolean;

  /**
   * Parses and handles webhook event payload
   */
  processWebhookEvent(event: Record<string, unknown>): Promise<{
    handled: boolean;
    bookingId?: string;
    orderId?: string;
    paymentId?: string;
    status?: string;
    reason?: string;
  }>;
}
