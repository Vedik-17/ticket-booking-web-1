/**
 * FIREFLY Shared Domain Types & State Machines
 */

// ==========================================
// USER & ORGANISER DOMAIN
// ==========================================

export type UserRole = 'CUSTOMER' | 'ORGANISER' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type OrganiserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';

export interface Organiser {
  id: string;
  userId: string;
  businessName: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl?: string;
  status: OrganiserStatus;
  payoutUpiId?: string;
  payoutBankDetails?: {
    accountNumber: string;
    ifsc: string;
    beneficiaryName: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// EVENT DOMAIN
// ==========================================

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'POSTPONED' | 'CANCELLED' | 'COMPLETED';

export type EventCategory = 
  | 'CONCERT' 
  | 'MUSIC_FESTIVAL' 
  | 'NIGHTLIFE' 
  | 'EXHIBITION' 
  | 'CONFERENCE' 
  | 'THEATRE_COMEDY' 
  | 'SPORTS';

export interface EventVenue {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface EventSchedule {
  doorsOpenAt?: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
}

export interface Event {
  id: string;
  organiserId: string;
  title: string;
  slug: string;
  tagline?: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  posterUrl: string;
  galleryUrls: string[];
  venue: EventVenue;
  schedule: EventSchedule;
  isAgeRestricted: boolean;
  minimumAge?: number;
  termsAndConditions?: string;
  featured: boolean;
  upiId?: string; // Event-specific UPI ID for payment redirection e.g. "solaris@okhdfcbank"
  upiPayeeName?: string; // Event-specific merchant/payee name
  whatsappPhone?: string; // Event-specific organiser WhatsApp contact
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// TICKET TIER & INVENTORY DOMAIN
// ==========================================

export type TicketTierStatus = 'ACTIVE' | 'SOLD_OUT' | 'PAUSED' | 'HIDDEN';

export interface TicketTier {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  priceInPence: number; // in lowest currency unit: e.g. Paise for INR (₹100 = 10000)
  currency: 'INR' | 'USD';
  capacity: number;
  reservedCount: number;
  soldCount: number;
  minPerBooking: number;
  maxPerBooking: number;
  salesStartAt: string;
  salesEndAt: string;
  status: TicketTierStatus;
  perks?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryReservation {
  id: string;
  bookingId: string;
  ticketTierId: string;
  quantity: number;
  expiresAt: string; // ISO 8601 string
  released: boolean;
  createdAt: string;
}

// ==========================================
// BOOKING DOMAIN
// ==========================================

export type BookingStatus =
  | 'INITIATED'
  | 'RESERVED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_PROCESSING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED';

export interface CustomerDetails {
  fullName: string;
  email: string;
  phone: string;
  whatsappOptIn: boolean;
  isGuest: boolean;
  userId?: string;
}

export interface BookingItem {
  id: string;
  bookingId: string;
  ticketTierId: string;
  tierName: string;
  unitPriceInPence: number;
  quantity: number;
  totalPriceInPence: number;
}

export interface Booking {
  id: string;
  bookingReference: string; // Human-readable e.g. "FF-2026-X89J"
  eventId: string;
  organiserId: string;
  customer: CustomerDetails;
  items: BookingItem[];
  subtotalInPence: number;
  serviceFeeInPence: number;
  totalAmountInPence: number;
  currency: 'INR' | 'USD';
  status: BookingStatus;
  reservationExpiresAt: string;
  paymentOrderId?: string;
  paymentId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// PAYMENT DOMAIN
// ==========================================

export type PaymentProviderType = 'RAZORPAY' | 'MOCK_GATEWAY' | 'DIRECT_UPI_P1';

export type PaymentStatus = 
  | 'CREATED' 
  | 'AUTHORIZED' 
  | 'CAPTURED' 
  | 'FAILED' 
  | 'REFUNDED';

export interface PaymentOrderRequest {
  bookingId: string;
  bookingReference: string;
  amountInPence: number;
  currency: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  notes?: Record<string, string>;
}

export interface PaymentOrderResponse {
  orderId: string;
  amountInPence: number;
  currency: string;
  provider: PaymentProviderType;
  keyId?: string;
  notes?: Record<string, string>;
}

export interface PaymentVerificationRequest {
  bookingId: string;
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  paymentId: string;
  orderId: string;
  amountInPence: number;
  status: PaymentStatus;
  errorMessage?: string;
  rawPayload?: Record<string, unknown>;
}

// ==========================================
// TICKET & CHECK-IN DOMAIN
// ==========================================

export type TicketStatus = 'ISSUED' | 'CHECKED_IN' | 'REVOKED' | 'TRANSFERRED';

export interface Ticket {
  id: string;
  ticketNumber: string; // Human readable e.g. "TKT-A891-23B"
  bookingId: string;
  eventId: string;
  ticketTierId: string;
  tierName: string;
  attendeeName: string;
  qrPayload: string; // Cryptographic verification payload
  securityToken: string; // Nonce for revocation & verification
  status: TicketStatus;
  checkedInAt?: string;
  checkedInBy?: string; // Scanner agent ID
  createdAt: string;
  updatedAt: string;
}

export interface CheckInRequest {
  qrPayload: string;
  scannerUserId: string;
  eventId: string;
  notes?: string;
}

export type CheckInResultStatus = 
  | 'SUCCESS' 
  | 'ALREADY_CHECKED_IN' 
  | 'INVALID_QR' 
  | 'EVENT_MISMATCH' 
  | 'TICKET_REVOKED' 
  | 'UNPAID';

export interface CheckInResponse {
  status: CheckInResultStatus;
  message: string;
  timestamp: string;
  ticket?: {
    id: string;
    ticketNumber: string;
    attendeeName: string;
    tierName: string;
    checkedInAt?: string;
  };
}

// ==========================================
// ANALYTICS & AUDIT DOMAIN
// ==========================================

export interface OrganiserAnalytics {
  eventId?: string;
  grossSalesInPence: number;
  netSalesInPence: number;
  totalTicketsSold: number;
  totalTicketsCapacity: number;
  totalCheckIns: number;
  checkInRatePercent: number;
  salesByTier: Array<{
    tierId: string;
    tierName: string;
    soldCount: number;
    capacity: number;
    revenueInPence: number;
  }>;
}

export interface PlatformAnalytics {
  totalOrganisers: number;
  activeOrganisers: number;
  totalEvents: number;
  activeEvents: number;
  totalTicketsSold: number;
  totalPlatformVolumeInPence: number;
  platformFeesEarnedInPence: number;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}
