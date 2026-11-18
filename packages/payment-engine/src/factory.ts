import { IPaymentProvider } from './interface';
import { RazorpayPaymentProvider } from './razorpay';
import { MockPaymentProvider } from './mock';

export class PaymentEngineFactory {
  private static instance: IPaymentProvider | null = null;

  public static getProvider(): IPaymentProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType = process.env.PAYMENT_PROVIDER || 'RAZORPAY';

    if (providerType === 'MOCK' || !process.env.RAZORPAY_KEY_ID) {
      this.instance = new MockPaymentProvider();
      return this.instance;
    }

    this.instance = new RazorpayPaymentProvider();
    return this.instance;
  }

  public static setProvider(provider: IPaymentProvider): void {
    this.instance = provider;
  }

  public static reset(): void {
    this.instance = null;
  }
}
