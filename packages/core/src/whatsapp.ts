/**
 * WhatsApp click-to-chat URL builder and message templating
 */

export function sanitizePhoneNumber(phone: string): string {
  // Strip non-digits
  const cleaned = phone.replace(/\D/g, '');
  // Default to India country code 91 if 10-digit number
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return cleaned;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const sanitized = sanitizePhoneNumber(phone);
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${sanitized}?text=${encodedMsg}`;
}

export function buildCustomerSupportMessage(eventTitle: string, bookingRef?: string): string {
  if (bookingRef) {
    return `Hi, I have a query regarding my booking ${bookingRef} for the event "${eventTitle}".`;
  }
  return `Hi, I have an enquiry about the event "${eventTitle}" on Firefly.`;
}

export function buildTicketShareMessage(eventTitle: string, ticketUrl: string, attendeeName: string): string {
  return `Hello ${attendeeName}, here is your digital ticket for "${eventTitle}":\n${ticketUrl}\nPlease have the QR code ready at the entrance.`;
}
