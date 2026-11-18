import QRCode from 'qrcode';

export interface UpiPaymentDetails {
  upiId: string;
  payeeName: string;
  amountInRupees: number;
  transactionNote: string;
}

export function buildUpiUri(details: UpiPaymentDetails): string {
  const { upiId, payeeName, amountInRupees, transactionNote } = details;
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amountInRupees.toFixed(2),
    cu: 'INR',
    tn: transactionNote,
  });
  return `upi://pay?${params.toString()}`;
}

export function buildAppUpiUri(app: 'gpay' | 'phonepe' | 'paytm', details: UpiPaymentDetails): string {
  const baseUri = buildUpiUri(details);
  switch (app) {
    case 'phonepe':
      return `phonepe://pay?${baseUri.replace('upi://pay?', '')}`;
    case 'paytm':
      return `paytmmp://pay?${baseUri.replace('upi://pay?', '')}`;
    case 'gpay':
      return `tez://upi/pay?${baseUri.replace('upi://pay?', '')}`;
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

