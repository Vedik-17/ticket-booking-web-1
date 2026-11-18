import QRCode from 'qrcode';

export interface UpiPaymentDetails {
  upiId: string;
  payeeName: string;
  amountInRupees: number;
  transactionNote: string;
  transactionRef?: string;
}

/**
 * Builds standard NPCI Universal UPI Intent URI:
 * upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...&tr=...
 * Supported by all UPI apps (PhonePe, Google Pay, Paytm, Navi, Supermoney, Pop UPI, CRED, BHIM, etc.)
 */
export function buildUpiUri(details: UpiPaymentDetails): string {
  const { upiId, payeeName, amountInRupees, transactionNote, transactionRef } = details;
  const params: Record<string, string> = {
    pa: upiId,
    pn: payeeName,
    am: amountInRupees.toFixed(2),
    cu: 'INR',
    tn: transactionNote,
  };
  if (transactionRef) {
    params.tr = transactionRef;
  }

  const queryString = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  return `upi://pay?${queryString}`;
}

/**
 * App-specific deep links (falls back to universal upi://pay)
 */
export function buildAppUpiUri(app: 'gpay' | 'phonepe' | 'paytm' | 'cred' | 'bhim', details: UpiPaymentDetails): string {
  const baseUri = buildUpiUri(details);
  const query = baseUri.replace('upi://pay?', '');

  switch (app) {
    case 'phonepe':
      return `phonepe://pay?${query}`;
    case 'paytm':
      return `paytmmp://pay?${query}`;
    case 'gpay':
      return `tez://upi/pay?${query}`;
    case 'cred':
      return `credpay://pay?${query}`;
    case 'bhim':
      return `upi://pay?${query}`;
    default:
      return baseUri;
  }
}

export async function generateUpiQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    width: 320,
    margin: 2,
    color: {
      dark: '#080808',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
}
