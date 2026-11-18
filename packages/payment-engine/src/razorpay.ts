import crypto from 'crypto';
import {
  PaymentOrderRequest,
  PaymentOrderResponse,
  PaymentVerificationRequest,
  PaymentVerificationResult,
} from '@firefly/shared-types';
import { IPaymentProvider } from './interface';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

export class RazorpayPaymentProvider implements IPaymentProvider {
  public readonly providerType = 'RAZORPAY';
  private config: RazorpayConfig;

  constructor(config?: Partial<RazorpayConfig>) {
    this.config = {
      keyId: config?.keyId || process.env.RAZORPAY_KEY_ID || '',
      keySecret: config?.keySecret || process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: config?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || '',
    };
  }

  public isConfigured(): boolean {
    return Boolean(this.config.keyId && this.config.keySecret);
  }

  public async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    if (!this.isConfigured()) {
      throw new Error(
        'Razorpay credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local.'
      );
    }

    const auth = Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64');
    const payload = {
      amount: request.amountInPence,
      currency: request.currency || 'INR',
      receipt: request.bookingReference,
      notes: {
        bookingId: request.bookingId,
        bookingReference: request.bookingReference,
        customerName: request.customer.name,
        customerEmail: request.customer.email,
        ...request.notes,
      },
    };

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Razorpay order creation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      orderId: data.id,
      amountInPence: data.amount,
      currency: data.currency,
      provider: 'RAZORPAY',
      keyId: this.config.keyId,
      notes: data.notes,
    };
  }

  public async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        paymentId: request.paymentId,
        orderId: request.orderId,
        amountInPence: 0,
        status: 'FAILED',
        errorMessage: 'Razorpay secret key is unconfigured on server.',
      };
    }

    const payload = `${request.orderId}|${request.paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.config.keySecret)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(request.signature)
    );

    if (!isValid) {
      return {
        success: false,
        paymentId: request.paymentId,
        orderId: request.orderId,
        amountInPence: 0,
        status: 'FAILED',
        errorMessage: 'Invalid payment signature. Potential tampering detected.',
      };
    }

    return {
      success: true,
      paymentId: request.paymentId,
      orderId: request.orderId,
      amountInPence: 0, // In production, verified against Razorpay Payment Fetch API
      status: 'CAPTURED',
    };
  }

  public verifyWebhookSignature(rawPayload: string, signature: string, secret = this.config.webhookSecret): boolean {
    if (!secret || !signature) {
      return false;
    }

    const expected = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  public async processWebhookEvent(event: Record<string, unknown>): Promise<{
    handled: boolean;
    bookingId?: string;
    orderId?: string;
    paymentId?: string;
    status?: string;
    reason?: string;
  }> {
    const eventType = event.event as string;
    const payload = event.payload as Record<string, any>;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const orderEntity = payload?.order?.entity;
      const bookingId = paymentEntity?.notes?.bookingId || orderEntity?.notes?.bookingId;

      return {
        handled: true,
        bookingId,
        orderId: paymentEntity?.order_id || orderEntity?.id,
        paymentId: paymentEntity?.id,
        status: 'CAPTURED',
      };
    }

    if (eventType === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      return {
        handled: true,
        bookingId: paymentEntity?.notes?.bookingId,
        orderId: paymentEntity?.order_id,
        paymentId: paymentEntity?.id,
        status: 'FAILED',
        reason: paymentEntity?.error_description,
      };
    }

    return { handled: false };
  }
}
