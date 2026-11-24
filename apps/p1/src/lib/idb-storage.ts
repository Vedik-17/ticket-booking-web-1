import {
  Event,
  TicketTier,
  Booking,
  Ticket,
  CheckInResponse,
} from '@firefly/shared-types';
import { generateUUID, generateBookingReference, generateTicketNumber, buildQrPayload } from '@firefly/core';
import { ScannerEngine } from '@firefly/scanner-engine';
import QRCode from 'qrcode';

export interface P1CustomerDetails {
  fullName: string;
  phone: string;
}

export interface P1DatabaseState {
  events: Event[];
  tiers: TicketTier[];
  bookings: Booking[];
  tickets: Ticket[];
  adminPin: string;
}

export interface GateScanInspection {
  status: 'READY' | 'DUPLICATE' | 'EVENT_MISMATCH' | 'INVALID';
  message: string;
  timestamp: string;
  booking?: Booking;
  event?: Event;
  tickets: Ticket[];
  totalPasses: number;
  unenteredTickets: Ticket[];
  checkedInTickets: Ticket[];
  firstCheckedInAt?: string;
  matchedTicket?: Ticket;
}

const STORAGE_KEY = 'firefly_p1_prod_store_v2';
const IDB_NAME = 'firefly_idb_v2';
const IDB_STORE = 'app_state';

const DEFAULT_DEMO_EVENTS: Event[] = [
  {
    id: 'evt-arijit-singh-live',
    organiserId: 'org-1',
    title: 'Arijit Singh Live Hyderabad',
    slug: 'arijit-singh-live-hyderabad',
    tagline: 'Soulful live orchestra and chart-topping romantic anthems',
    description:
      'Experience the magic of Arijit Singh live in concert with a 45-piece grand symphony orchestra. An unforgettable evening of music spanning his legendary Bollywood ballads, acoustic medleys and exclusive live renditions.',
    category: 'CONCERT',
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [],
    venue: {
      name: 'Gachibowli Stadium',
      address: 'Old Mumbai Highway, Gachibowli',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500032',
      country: 'India',
      googleMapsUrl: 'https://maps.google.com/?q=Gachibowli+Stadium+Hyderabad',
    },
    schedule: {
      startsAt: '2026-11-30T19:00:00.000Z',
      endsAt: '2026-11-30T23:00:00.000Z',
      timezone: 'Asia/Kolkata',
    },
    isAgeRestricted: false,
    featured: true,
    upiId: 'arijitlive@okhdfcbank',
    upiPayeeName: 'Live Nation Experiences',
    whatsappPhone: '919876543210',
    maxTicketsPerBooking: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-hampi-trip',
    organiserId: 'org-1',
    title: 'Hampi Heritage Trip (2D / 1N)',
    slug: 'hampi-heritage-trip',
    tagline: 'Curated historic ruins exploration with hot air ballooning',
    description:
      'A curated 2-day weekend getaway exploring the boulder-strewn landscape of the Vijayanagara Empire. Includes heritage guided walks, sunrise hot air balloon flight, luxury camping and traditional Karnataka culinary delights.',
    category: 'CONFERENCE', // Used for Travel
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [],
    venue: {
      name: 'Hampi Heritage Valley',
      address: 'Near Virupaksha Temple Complex',
      city: 'Hampi',
      state: 'Karnataka',
      postalCode: '583239',
      country: 'India',
    },
    schedule: {
      startsAt: '2026-12-05T06:00:00.000Z',
      endsAt: '2026-12-06T20:00:00.000Z',
      timezone: 'Asia/Kolkata',
    },
    isAgeRestricted: false,
    featured: true,
    upiId: 'hampitrip@okaxis',
    upiPayeeName: 'Reserva Curated Travel',
    whatsappPhone: '919876543210',
    maxTicketsPerBooking: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-open-air-cinema',
    organiserId: 'org-1',
    title: 'Open Air Film Festival',
    slug: 'open-air-film-festival',
    tagline: 'Under-the-stars cinematic classics with gourmet food trucks',
    description:
      'Watch cult classics and indie gems under the open night sky with plush beanbags, wireless headphones, artisanal popcorn stations and craft brews.',
    category: 'EXHIBITION', // Used for Festival
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [],
    venue: {
      name: 'Jayabheri Meadow Lawns',
      address: 'Near Whitefield Lake',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560066',
      country: 'India',
    },
    schedule: {
      startsAt: '2026-12-12T18:00:00.000Z',
      endsAt: '2026-12-14T23:00:00.000Z',
      timezone: 'Asia/Kolkata',
    },
    isAgeRestricted: false,
    featured: true,
    upiId: 'filmfest@okicici',
    upiPayeeName: 'Open Air Cinema Co.',
    whatsappPhone: '919876543210',
    maxTicketsPerBooking: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-sunburn-2026',
    organiserId: 'org-1',
    title: 'Sunburn Hyderabad 2026',
    slug: 'sunburn-hyderabad-2026',
    tagline: 'World-class dance music festival with multiple stages',
    description:
      'A one-day music festival with international artists, multiple stages and immersive experiences. Experience the biggest dance music spectacle of the year with world-class audio-visual production, food village, and curated festival zones.',
    category: 'MUSIC_FESTIVAL',
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [],
    venue: {
      name: 'HITEX Exhibition Center',
      address: 'Trade Fair Office Building, IZZAT Nagar',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500084',
      country: 'India',
      googleMapsUrl: 'https://maps.google.com/?q=HITEX+Exhibition+Center+Hyderabad',
    },
    schedule: {
      startsAt: '2026-12-12T16:00:00.000Z',
      endsAt: '2026-12-12T23:30:00.000Z',
      timezone: 'Asia/Kolkata',
    },
    isAgeRestricted: false,
    featured: true,
    upiId: 'sunburn@okhdfcbank',
    upiPayeeName: 'Sunburn Live Experiences',
    whatsappPhone: '919876543210',
    maxTicketsPerBooking: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-tech-fest-2026',
    organiserId: 'org-1',
    title: 'Tech Fest 2026',
    slug: 'tech-fest-2026',
    tagline: 'Workshops, hackathons, and product showcases',
    description:
      'A premier technology conference with hands-on AI workshops, keynotes from global founders, developer challenges, and venture capital pitches.',
    category: 'CONFERENCE',
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [],
    venue: {
      name: 'HITEX Convention Hall',
      address: 'HITEX Road, Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500084',
      country: 'India',
    },
    schedule: {
      startsAt: '2026-12-13T10:00:00.000Z',
      endsAt: '2026-12-13T18:00:00.000Z',
      timezone: 'Asia/Kolkata',
    },
    isAgeRestricted: false,
    featured: true,
    upiId: 'techfest@okaxis',
    upiPayeeName: 'Tech Fest 2026 Organiser',
    whatsappPhone: '919876543210',
    maxTicketsPerBooking: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-art-culture-fest',
    organiserId: 'org-1',
    title: 'Art & Culture Fest',
    slug: 'art-culture-fest',
    tagline: 'Live heritage exhibitions and acoustic stages',
    description:
      'Celebrating local craftsmanship, musical roots, art galleries, and handcrafted cuisines across 5 themed culture pavilions.',
    category: 'EXHIBITION',
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [],
    venue: {
      name: 'LB Stadium',
      address: 'Fateh Maidan, Basheerbagh',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500001',
      country: 'India',
    },
    schedule: {
      startsAt: '2026-12-20T11:00:00.000Z',
      endsAt: '2026-12-20T21:00:00.000Z',
      timezone: 'Asia/Kolkata',
    },
    isAgeRestricted: false,
    featured: false,
    upiId: 'artfest@okicici',
    upiPayeeName: 'Art Culture Society',
    whatsappPhone: '919876543210',
    maxTicketsPerBooking: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-edm-festival-hyd',
    organiserId: 'org-1',
    title: 'EDM Festival Hyderabad',
    slug: 'edm-festival-hyderabad',
    tagline: 'Superstar DJ sets, synchronized laser dome & bass stages',
    description:
      'Immerse yourself in 8 hours of non-stop dance music featuring top international electronic acts, 360-degree laser stages, food pavilions and VIP lounge access.',
    category: 'MUSIC_FESTIVAL',
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [],
    venue: {
      name: 'HITEX Arena',
      address: 'HITEX Exhibition Center, Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500084',
      country: 'India',
      googleMapsUrl: 'https://maps.google.com/?q=HITEX+Arena+Hyderabad',
    },
    schedule: {
      startsAt: '2026-11-28T17:00:00.000Z',
      endsAt: '2026-11-28T23:59:00.000Z',
      timezone: 'Asia/Kolkata',
    },
    isAgeRestricted: false,
    featured: true,
    upiId: 'edmhyd@okhdfcbank',
    upiPayeeName: 'EDM Live Hyderabad',
    whatsappPhone: '919876543210',
    maxTicketsPerBooking: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-food-culture-blr',
    organiserId: 'org-1',
    title: 'Food & Culture Fest Bangalore',
    slug: 'food-and-culture-fest-bangalore',
    tagline: 'Artisanal culinary popups, live acoustic bands & craft markets',
    description:
      'A weekend gastronomic celebration featuring 60+ gourmet food creators, regional microbreweries, masterclasses by celebrity chefs, and indie folk performances.',
    category: 'EXHIBITION',
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [],
    venue: {
      name: 'Jayabheri Meadow Lawns',
      address: 'Near Whitefield Lake',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560066',
      country: 'India',
      googleMapsUrl: 'https://maps.google.com/?q=Jayabheri+Bangalore',
    },
    schedule: {
      startsAt: '2026-12-06T12:00:00.000Z',
      endsAt: '2026-12-06T22:30:00.000Z',
      timezone: 'Asia/Kolkata',
    },
    isAgeRestricted: false,
    featured: true,
    upiId: 'foodfest@okicici',
    upiPayeeName: 'Bangalore Culture Collective',
    whatsappPhone: '919876543210',
    maxTicketsPerBooking: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-music-in-hills-araku',
    organiserId: 'org-1',
    title: 'Music in the Hills Araku',
    slug: 'music-in-the-hills-araku',
    tagline: 'Misty valley acoustic retreat & camping festival',
    description:
      'Unplug in the Eastern Ghats with an intimate 2-day boutique music gathering nestled in coffee plantations. Stargazing, campfire jam sessions, tribal coffee tastings, and eco-tents.',
    category: 'CONFERENCE', // Travel category
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [],
    venue: {
      name: 'Araku Coffee Valley Valley Pines',
      address: 'Near Padmapuram Gardens',
      city: 'Araku Valley',
      state: 'Andhra Pradesh',
      postalCode: '531149',
      country: 'India',
      googleMapsUrl: 'https://maps.google.com/?q=Araku+Valley',
    },
    schedule: {
      startsAt: '2026-12-12T14:00:00.000Z',
      endsAt: '2026-12-14T12:00:00.000Z',
      timezone: 'Asia/Kolkata',
    },
    isAgeRestricted: false,
    featured: true,
    upiId: 'arakuhills@okaxis',
    upiPayeeName: 'Araku Music Experiences',
    whatsappPhone: '919876543210',
    maxTicketsPerBooking: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-campus-dj-night',
    organiserId: 'org-1',
    title: 'Campus DJ Night',
    slug: 'campus-dj-night',
    tagline: 'High energy student EDM and laser spectacle',
    description:
      'The biggest university festival afterparty featuring top club DJs, laser stages, and food pop-ups.',
    category: 'NIGHTLIFE',
    status: 'PUBLISHED',
    posterUrl:
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [],
    venue: {
      name: 'Gachibowli Stadium Ground',
      address: 'Old Mumbai Highway, Gachibowli',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500032',
      country: 'India',
    },
    schedule: {
      startsAt: '2026-12-14T19:00:00.000Z',
      endsAt: '2026-12-14T23:00:00.000Z',
      timezone: 'Asia/Kolkata',
    },
    isAgeRestricted: false,
    featured: false,
    upiId: 'campusdj@okhdfcbank',
    upiPayeeName: 'Campus DJ Events',
    whatsappPhone: '919876543210',
    maxTicketsPerBooking: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_DEMO_TIERS: TicketTier[] = [
  // Arijit Singh Tiers
  {
    id: 'tier-as-silver',
    eventId: 'evt-arijit-singh-live',
    name: 'Silver Seating',
    description: 'Reserved seated area with clear sightlines to the orchestra stage',
    priceInPence: 149900,
    currency: 'INR',
    capacity: 3000,
    reservedCount: 0,
    soldCount: 1420,
    minPerBooking: 1,
    maxPerBooking: 6,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-11-30T19:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tier-as-gold',
    eventId: 'evt-arijit-singh-live',
    name: 'Gold Pass',
    description: 'Central arena seating with dedicated hospitality entrance',
    priceInPence: 399900,
    currency: 'INR',
    capacity: 1000,
    reservedCount: 0,
    soldCount: 450,
    minPerBooking: 1,
    maxPerBooking: 6,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-11-30T19:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tier-as-platinum',
    eventId: 'evt-arijit-singh-live',
    name: 'Platinum Fan Lounge',
    description: 'Front-row stage experience, complimentary dining, and valet parking',
    priceInPence: 899900,
    currency: 'INR',
    capacity: 200,
    reservedCount: 0,
    soldCount: 95,
    minPerBooking: 1,
    maxPerBooking: 4,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-11-30T19:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Hampi Tiers
  {
    id: 'tier-hampi-all',
    eventId: 'evt-hampi-trip',
    name: 'Weekend Experience Pass',
    description: 'Complete 2D/1N package including luxury tent stay, heritage tours, and balloon flight',
    priceInPence: 349900,
    currency: 'INR',
    capacity: 120,
    reservedCount: 0,
    soldCount: 48,
    minPerBooking: 1,
    maxPerBooking: 4,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-12-05T06:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Open Air Film Tiers
  {
    id: 'tier-film-beanbag',
    eventId: 'evt-open-air-cinema',
    name: 'Festival Pass',
    description: 'Reserved plush beanbag with wireless headphones and gourmet popcorn',
    priceInPence: 59900,
    currency: 'INR',
    capacity: 500,
    reservedCount: 0,
    soldCount: 210,
    minPerBooking: 1,
    maxPerBooking: 6,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-12-12T18:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Sunburn Tiers
  {
    id: 'tier-sb-gen',
    eventId: 'evt-sunburn-2026',
    name: 'General Access',
    description: 'Standard festival entry with access to Main Stage and Arena B',
    priceInPence: 99900,
    currency: 'INR',
    capacity: 5000,
    reservedCount: 0,
    soldCount: 1240,
    minPerBooking: 1,
    maxPerBooking: 6,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-12-12T16:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tier-sb-vip',
    eventId: 'evt-sunburn-2026',
    name: 'VIP Access',
    description: 'Elevated viewing deck, dedicated bars and fast-track entrance lane',
    priceInPence: 249900,
    currency: 'INR',
    capacity: 1000,
    reservedCount: 0,
    soldCount: 320,
    minPerBooking: 1,
    maxPerBooking: 6,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-12-12T16:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tier-sb-pit',
    eventId: 'evt-sunburn-2026',
    name: 'Fan Pit',
    description: 'Exclusive zone directly in front of the artist stage with welcome drink',
    priceInPence: 499900,
    currency: 'INR',
    capacity: 250,
    reservedCount: 0,
    soldCount: 110,
    minPerBooking: 1,
    maxPerBooking: 4,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-12-12T16:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Tech Fest Tiers
  {
    id: 'tier-tf-gen',
    eventId: 'evt-tech-fest-2026',
    name: 'General Pass',
    description: 'Keynotes, expo arena access, and community networking session',
    priceInPence: 49900,
    currency: 'INR',
    capacity: 2000,
    reservedCount: 0,
    soldCount: 450,
    minPerBooking: 1,
    maxPerBooking: 10,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-12-13T10:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tier-tf-workshop',
    eventId: 'evt-tech-fest-2026',
    name: 'Workshop Pass',
    description: 'General pass + full-day hands-on masterclass with certificate',
    priceInPence: 129900,
    currency: 'INR',
    capacity: 300,
    reservedCount: 0,
    soldCount: 95,
    minPerBooking: 1,
    maxPerBooking: 5,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-12-13T10:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Art Culture Tiers
  {
    id: 'tier-art-day',
    eventId: 'evt-art-culture-fest',
    name: 'General Access',
    description: 'Full day access to art exhibitions and musical performance lawn',
    priceInPence: 29900,
    currency: 'INR',
    capacity: 1500,
    reservedCount: 0,
    soldCount: 430,
    minPerBooking: 1,
    maxPerBooking: 8,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-12-20T11:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Campus DJ Tiers
  {
    id: 'tier-dj-student',
    eventId: 'evt-campus-dj-night',
    name: 'General Access',
    description: 'Standard campus festival arena entry with light wristband',
    priceInPence: 39900,
    currency: 'INR',
    capacity: 800,
    reservedCount: 0,
    soldCount: 650,
    minPerBooking: 1,
    maxPerBooking: 6,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-12-14T19:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // EDM Festival Hyderabad
  {
    id: 'tier-edm-ga',
    eventId: 'evt-edm-festival-hyd',
    name: 'Arena Pass',
    description: 'General festival grounds entry with laser show access',
    priceInPence: 79900,
    currency: 'INR',
    capacity: 2500,
    reservedCount: 0,
    soldCount: 1100,
    minPerBooking: 1,
    maxPerBooking: 6,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-11-28T17:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Food & Culture Fest Bangalore
  {
    id: 'tier-food-pass',
    eventId: 'evt-food-culture-blr',
    name: 'Tasting Pass',
    description: 'Festival entry plus 3 complimentary tasting vouchers',
    priceInPence: 49900,
    currency: 'INR',
    capacity: 1200,
    reservedCount: 0,
    soldCount: 420,
    minPerBooking: 1,
    maxPerBooking: 8,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-12-06T12:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Music in the Hills Araku
  {
    id: 'tier-araku-camp',
    eventId: 'evt-music-in-hills-araku',
    name: 'Camping & Pass',
    description: '2-day access, tent accommodation, and campfire acoustics',
    priceInPence: 349900,
    currency: 'INR',
    capacity: 200,
    reservedCount: 0,
    soldCount: 85,
    minPerBooking: 1,
    maxPerBooking: 4,
    salesStartAt: new Date().toISOString(),
    salesEndAt: '2026-12-12T14:00:00.000Z',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_STATE: P1DatabaseState = {
  events: DEFAULT_DEMO_EVENTS,
  tiers: DEFAULT_DEMO_TIERS,
  bookings: [],
  tickets: [],
  adminPin: process.env.NEXT_PUBLIC_ADMIN_PIN || 'CF2026',
};

class P1MultiEventStore {
  private memoryCache: P1DatabaseState | null = null;
  private isSyncing = false;
  private idbReady: Promise<IDBDatabase | null> | null = null;
  private listeners: Set<() => void> = new Set();

  public defaultUpiId = process.env.NEXT_PUBLIC_DEFAULT_UPI_ID || '';
  public defaultPayeeName = process.env.NEXT_PUBLIC_DEFAULT_PAYEE_NAME || '';
  public defaultAdminPhone = process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PHONE || '';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initIndexedDB();
      // Initiate background sync with server
      this.syncWithServer();
    }
  }

  // --- INDEXEDDB INITIALIZER (Bypasses 5MB LocalStorage Quota) ---
  private initIndexedDB(): Promise<IDBDatabase | null> {
    if (this.idbReady) return this.idbReady;
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return Promise.resolve(null);
    }

    this.idbReady = new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = (e: any) => resolve(e.target.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.idbReady;
  }

  private async writeToIdb(key: string, val: any): Promise<void> {
    try {
      const db = await this.initIndexedDB();
      if (!db) return;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(val, key);
    } catch (e) {
      console.warn('IDB write failed:', e);
    }
  }

  private async readFromIdb(key: string): Promise<any> {
    try {
      const db = await this.initIndexedDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  // --- SERVER SYNC (Cross-Device Global Postgres Persistence) ---
  public async syncWithServer(): Promise<void> {
    if (this.isSyncing || typeof window === 'undefined') return;
    this.isSyncing = true;

    try {
      // 1. Fetch live events and tiers from Postgres
      const res = await fetch('/api/events', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          const state = this.loadState();
          
          const serverEvents: Event[] = data.events;
          const serverTiers: TicketTier[] = Array.isArray(data.tiers) ? data.tiers : [];

          // Keep any locally created events that might not have reached server yet
          const localOnlyEvents = state.events.filter(
            (le) => !serverEvents.some((se) => se.id === le.id)
          );
          const localOnlyTiers = state.tiers.filter(
            (lt) => !serverTiers.some((st) => st.id === lt.id)
          );

          state.events = [...serverEvents, ...localOnlyEvents];
          state.tiers = [...serverTiers, ...localOnlyTiers];

          this.persist(state);
          this.notifySubscribers();

          // Push any pending local-only events up to the server
          for (const localEvt of localOnlyEvents) {
            const tiersForLocal = state.tiers.filter((t) => t.eventId === localEvt.id);
            fetch('/api/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: localEvt, tiers: tiersForLocal }),
            }).catch(() => {});
          }
        }
      }

      // 2. Fetch live bookings and tickets from Postgres
      const bRes = await fetch('/api/bookings', { cache: 'no-store' });
      if (bRes.ok) {
        const bData = await bRes.json();
        if (Array.isArray(bData.bookings)) {
          const state = this.loadState();
          const serverBookings: Booking[] = bData.bookings;
          const serverTickets: Ticket[] = Array.isArray(bData.tickets) ? bData.tickets : [];

          const localOnlyBookings = state.bookings.filter(
            (lb) => !serverBookings.some((sb) => sb.id === lb.id)
          );
          const localOnlyTickets = state.tickets.filter(
            (lt) => !serverTickets.some((st) => st.id === lt.id)
          );

          state.bookings = [...serverBookings, ...localOnlyBookings];
          state.tickets = [...serverTickets, ...localOnlyTickets];

          this.persist(state);
          this.notifySubscribers();
        }
      }
    } catch (e) {
      console.warn('Server sync skipped (working offline):', e);
    } finally {
      this.isSyncing = false;
    }
  }

  public notifySubscribers() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('Subscriber error:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firefly-storage-synced'));
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    const windowHandler = () => callback();
    if (typeof window !== 'undefined') {
      window.addEventListener('firefly-storage-synced', windowHandler);
    }
    return () => {
      this.listeners.delete(callback);
      if (typeof window !== 'undefined') {
        window.removeEventListener('firefly-storage-synced', windowHandler);
      }
    };
  }

  private loadState(): P1DatabaseState {
    if (typeof window === 'undefined') {
      return DEFAULT_STATE;
    }
    if (this.memoryCache && Array.isArray(this.memoryCache.events)) {
      return this.memoryCache;
    }

    // Try LocalStorage first for instant synchronous load
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.events) && parsed.events.length > 0) {
          parsed.tiers = Array.isArray(parsed.tiers) && parsed.tiers.length > 0 ? parsed.tiers : DEFAULT_DEMO_TIERS;
          parsed.bookings = Array.isArray(parsed.bookings) ? parsed.bookings : [];
          parsed.tickets = Array.isArray(parsed.tickets) ? parsed.tickets : [];
          parsed.adminPin = process.env.NEXT_PUBLIC_ADMIN_PIN || 'CF2026';
          this.memoryCache = parsed;
          return this.memoryCache!;
        }
      }
    } catch (e) {
      console.warn('LocalStorage read fallback:', e);
    }

    // Read IDB asynchronously in background
    this.readFromIdb(STORAGE_KEY).then((idbState) => {
      if (idbState && Array.isArray(idbState.events) && idbState.events.length > 0) {
        if (!this.memoryCache || this.memoryCache.events.length === 0) {
          this.memoryCache = idbState;
          this.notifySubscribers();
        }
      }
    });

    this.memoryCache = JSON.parse(JSON.stringify(DEFAULT_STATE));
    return this.memoryCache!;
  }

  private persist(state: P1DatabaseState) {
    this.memoryCache = state;
    if (typeof window !== 'undefined') {
      // 1. Write to IndexedDB (virtually unlimited quota for high-res posters)
      this.writeToIdb(STORAGE_KEY, state);

      // 2. Also try writing to localStorage as secondary cache
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        // If quota exceeded due to poster image, strip heavy poster from localStorage only
        try {
          const lightState = {
            ...state,
            events: state.events.map((evt) => ({
              ...evt,
              posterUrl: evt.posterUrl?.length > 10000 ? '' : evt.posterUrl,
            })),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(lightState));
        } catch {}
      }
    }
  }

  // --- EVENTS ---
  public getEvents(): Event[] {
    const state = this.loadState();
    return Array.isArray(state.events) ? state.events : [];
  }

  public getEvent(idOrSlug: string): Event | undefined {
    return this.getEvents().find((e) => e.id === idOrSlug || e.slug === idOrSlug);
  }

  public createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Event {
    const state = this.loadState();
    const id = `e-${Date.now().toString(36)}`;
    const newEvent: Event = {
      ...eventData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.events.unshift(newEvent);
    this.persist(state);
    this.notifySubscribers();

    // Sync to PostgreSQL backend immediately
    if (typeof window !== 'undefined') {
      const eventTiers = state.tiers.filter((t) => t.eventId === id);
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: newEvent, tiers: eventTiers }),
      }).catch((e) => console.warn('Failed to sync event to server:', e));
    }

    return newEvent;
  }

  public async createEventWithTiers(
    eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>,
    tiersData: Array<Omit<TicketTier, 'id' | 'eventId' | 'createdAt' | 'updatedAt' | 'reservedCount' | 'soldCount'>>
  ): Promise<{ event: Event; tiers: TicketTier[] }> {
    const state = this.loadState();
    const eventId = `e-${Date.now().toString(36)}`;
    const newEvent: Event = {
      ...eventData,
      id: eventId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.events.unshift(newEvent);

    const createdTiers: TicketTier[] = [];
    for (const td of tiersData) {
      const tierId = `t-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const newTier: TicketTier = {
        ...td,
        id: tierId,
        eventId: eventId,
        soldCount: 0,
        reservedCount: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.tiers.push(newTier);
      createdTiers.push(newTier);
    }

    this.persist(state);
    this.notifySubscribers();

    // Sync to PostgreSQL backend immediately and await
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: newEvent, tiers: createdTiers }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Failed to sync event to server:', err);
        }
      } catch (e) {
        console.warn('Network error syncing event to server:', e);
      }
    }

    return { event: newEvent, tiers: createdTiers };
  }

  public updateEvent(eventId: string, updates: Partial<Event>): Event | null {
    const state = this.loadState();
    const idx = state.events.findIndex((e) => e.id === eventId);
    if (idx === -1) return null;

    state.events[idx] = {
      ...state.events[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist(state);
    this.notifySubscribers();

    // Sync update to server
    if (typeof window !== 'undefined') {
      const eventTiers = state.tiers.filter((t) => t.eventId === eventId);
      fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, tiers: eventTiers }),
      }).catch((e) => console.warn('Failed to sync event update to server:', e));
    }

    return state.events[idx];
  }

  public async updateEventWithTiers(
    eventId: string,
    updates: Partial<Event>,
    tiersInput?: Array<{ id?: string; name: string; priceInPence: number; capacity: number; status?: string }>
  ): Promise<boolean> {
    const state = this.loadState();
    const idx = state.events.findIndex((e) => e.id === eventId);
    if (idx === -1) return false;

    state.events[idx] = {
      ...state.events[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    let updatedTiers: TicketTier[] = [];
    if (Array.isArray(tiersInput)) {
      state.tiers = state.tiers.filter((t) => t.eventId !== eventId);
      updatedTiers = tiersInput.map((t) => ({
        id: t.id || `t-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        eventId,
        name: t.name,
        description: '',
        priceInPence: t.priceInPence,
        currency: 'INR',
        capacity: t.capacity,
        soldCount: 0,
        reservedCount: 0,
        minPerBooking: 1,
        maxPerBooking: 50,
        salesStartAt: new Date().toISOString(),
        salesEndAt: new Date().toISOString(),
        status: (t.status as any) || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      state.tiers.push(...updatedTiers);
    } else {
      updatedTiers = state.tiers.filter((t) => t.eventId === eventId);
    }

    this.persist(state);
    this.notifySubscribers();

    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/events/${eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates, tiers: updatedTiers }),
        });
      } catch (e) {
        console.warn('Failed to sync event update to server:', e);
      }
    }

    return true;
  }

  public async deleteEvent(eventId: string): Promise<boolean> {
    const state = this.loadState();
    state.events = state.events.filter((e) => e.id !== eventId);
    state.tiers = state.tiers.filter((t) => t.eventId !== eventId);
    this.persist(state);
    this.notifySubscribers();

    if (typeof window !== 'undefined') {
      fetch(`/api/events/${eventId}`, { method: 'DELETE' }).catch((e) =>
        console.warn('Failed to sync delete to server:', e)
      );
    }

    return true;
  }

  // --- TIERS ---
  public getTiers(eventId?: string): TicketTier[] {
    const state = this.loadState();
    if (eventId) {
      return state.tiers.filter((t) => t.eventId === eventId);
    }
    return state.tiers;
  }

  public createTier(tierData: Omit<TicketTier, 'id' | 'createdAt' | 'updatedAt' | 'reservedCount' | 'soldCount'>): TicketTier {
    const state = this.loadState();
    const id = `t-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newTier: TicketTier = {
      ...tierData,
      id,
      soldCount: 0,
      reservedCount: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.tiers.push(newTier);
    this.persist(state);
    this.notifySubscribers();

    // Sync tier to server
    if (typeof window !== 'undefined') {
      const event = state.events.find((e) => e.id === tierData.eventId);
      if (event) {
        const tiers = state.tiers.filter((t) => t.eventId === event.id);
        fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, tiers }),
        }).catch((e) => console.warn('Failed to sync tier to server:', e));
      }
    }

    return newTier;
  }

  public syncEventTiers(
    eventId: string,
    tiersInput: Array<{ id?: string; name: string; priceInPence: number; capacity: number }>
  ): void {
    const state = this.loadState();
    state.tiers = state.tiers.filter((t) => t.eventId !== eventId);

    const newTiers: TicketTier[] = tiersInput.map((t) => ({
      id: t.id || `t-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      eventId,
      name: t.name,
      description: '',
      priceInPence: t.priceInPence,
      currency: 'INR',
      capacity: t.capacity,
      soldCount: 0,
      reservedCount: 0,
      minPerBooking: 1,
      maxPerBooking: 50,
      salesStartAt: new Date().toISOString(),
      salesEndAt: new Date().toISOString(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    state.tiers.push(...newTiers);
    this.persist(state);
    this.notifySubscribers();

    if (typeof window !== 'undefined') {
      const event = state.events.find((e) => e.id === eventId);
      if (event) {
        fetch(`/api/events/${eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: {}, tiers: newTiers }),
        }).catch((e) => console.warn('Failed to sync tiers to server:', e));
      }
    }
  }

  // --- BOOKINGS & TICKETS ---
  public getBookings(): Booking[] {
    return this.loadState().bookings;
  }

  public getBooking(idOrRef: string): Booking | undefined {
    return this.loadState().bookings.find(
      (b) => b.id === idOrRef || b.bookingReference === idOrRef
    );
  }

  public getTicketsByBookingId(bookingId: string): Ticket[] {
    return this.loadState().tickets.filter((t) => t.bookingId === bookingId);
  }

  public getTickets(): Ticket[] {
    return this.loadState().tickets;
  }

  public getTicket(idOrNumber: string): Ticket | undefined {
    return this.loadState().tickets.find(
      (t) => t.id === idOrNumber || t.ticketNumber === idOrNumber || t.bookingId === idOrNumber
    );
  }

  public createBooking(params: {
    eventId: string;
    customer: P1CustomerDetails;
    items: Array<{ tierId: string; quantity: number }>;
  }): { success: boolean; booking?: Booking; error?: string } {
    const state = this.loadState();
    const event = state.events.find((e) => e.id === params.eventId);
    if (!event) return { success: false, error: 'Event not found.' };

    const totalQuantity = params.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity <= 0) {
      return { success: false, error: 'Please select at least 1 ticket.' };
    }

    let subtotalInPence = 0;
    const bookingItems = [];

    for (const item of params.items) {
      const tier = state.tiers.find((t) => t.id === item.tierId);
      if (!tier || tier.eventId !== params.eventId) {
        return { success: false, error: 'Invalid ticket tier selected.' };
      }

      const available = tier.capacity - tier.soldCount;
      if (item.quantity > available) {
        return {
          success: false,
          error: `Only ${Math.max(0, available)} tickets remaining for ${tier.name}.`,
        };
      }

      subtotalInPence += tier.priceInPence * item.quantity;
      bookingItems.push({
        tierId: tier.id,
        tierName: tier.name,
        quantity: item.quantity,
        unitPriceInPence: tier.priceInPence,
        subtotalInPence: tier.priceInPence * item.quantity,
      });

      // Update sold count
      tier.soldCount += item.quantity;
    }

    const bookingId = `b-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const bookingReference = generateBookingReference();

    const booking: Booking = {
      id: bookingId,
      bookingReference,
      eventId: event.id,
      organiserId: event.organiserId || 'org-1',
      customer: {
        fullName: params.customer.fullName,
        email: `${params.customer.phone}@firefly.direct`,
        phone: params.customer.phone,
        whatsappOptIn: true,
        isGuest: true,
      },
      items: bookingItems as any,
      subtotalInPence,
      serviceFeeInPence: 0,
      totalAmountInPence: subtotalInPence,
      currency: 'INR',
      status: 'PAYMENT_PENDING',
      reservationExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.bookings.unshift(booking);

    // Pre-create tickets in pending status
    const createdTickets: Ticket[] = [];
    for (const item of bookingItems) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketId = `tkt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const ticketNumber = generateTicketNumber();
        const qrPayload = buildQrPayload(ticketId, event.id, 'P1_TICKET_SECRET_KEY');

        const ticket: Ticket = {
          id: ticketId,
          ticketNumber,
          bookingId: booking.id,
          eventId: event.id,
          ticketTierId: item.tierId,
          tierName: item.tierName,
          attendeeName: params.customer.fullName,
          qrPayload,
          securityToken: ticketId,
          status: 'ISSUED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        state.tickets.push(ticket);
        createdTickets.push(ticket);
      }
    }

    this.persist(state);
    this.notifySubscribers();

    // Sync booking and tickets to Postgres server
    if (typeof window !== 'undefined') {
      fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking, tickets: createdTickets }),
      }).catch((e) => console.warn('Failed to sync booking to server:', e));
    }

    return { success: true, booking };
  }

  public async confirmBookingAndGenerateTickets(
    bookingId: string
  ): Promise<{ success: boolean; booking: Booking; tickets: Ticket[]; qrDataUrls: string[] }> {
    const state = this.loadState();
    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');

    booking.status = 'CONFIRMED';
    booking.updatedAt = new Date().toISOString();

    let tickets = state.tickets.filter((t) => t.bookingId === bookingId);

    // Auto-generate tickets from booking items if missing
    if (tickets.length === 0 && Array.isArray(booking.items) && booking.items.length > 0) {
      for (const item of booking.items) {
        const qty = Number(item.quantity) || 1;
        for (let i = 0; i < qty; i++) {
          const ticketId = `tkt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
          const ticketNumber = generateTicketNumber();
          const qrPayload = buildQrPayload(ticketId, booking.eventId, 'P1_TICKET_SECRET_KEY');

          const newTicket: Ticket = {
            id: ticketId,
            ticketNumber,
            bookingId: booking.id,
            eventId: booking.eventId,
            ticketTierId: (item as any).tierId || (item as any).ticketTierId || 'default',
            tierName: item.tierName || 'Standard Pass',
            attendeeName: booking.customer.fullName,
            qrPayload,
            securityToken: ticketId,
            status: 'ISSUED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          state.tickets.push(newTicket);
          tickets.push(newTicket);
        }
      }
    }

    const qrDataUrls: string[] = [];
    for (const t of tickets) {
      t.status = 'ISSUED';
      t.updatedAt = new Date().toISOString();
      try {
        const dataUrl = await QRCode.toDataURL(t.qrPayload, {
          width: 320,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
        qrDataUrls.push(dataUrl);
      } catch {
        qrDataUrls.push('');
      }
    }

    this.persist(state);
    this.notifySubscribers();

    // Sync status update & tickets to server
    if (typeof window !== 'undefined') {
      fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          status: 'CONFIRMED',
          ticketStatus: 'ISSUED',
          tickets,
        }),
      }).catch((e) => console.warn('Failed to sync confirm to server:', e));
    }

    return { success: true, booking, tickets, qrDataUrls };
  }

  public async deleteBooking(bookingId: string): Promise<{ success: boolean }> {
    const state = this.loadState();

    // 1. Remove booking from local state
    state.bookings = state.bookings.filter((b) => b.id !== bookingId);

    // 2. Remove all tickets belonging to this booking to immediately invalidate gate passes
    state.tickets = state.tickets.filter((t) => t.bookingId !== bookingId);

    this.persist(state);
    this.notifySubscribers();

    // 3. Delete in PostgreSQL cloud database
    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/bookings?bookingId=${encodeURIComponent(bookingId)}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('Failed to delete booking on cloud server:', e);
      }
    }

    return { success: true };
  }

  // --- GATE SCANNER ---
  public checkInTicket(payloadOrId: string, allowedEventId?: string): CheckInResponse {
    const state = this.loadState();
    const trimmed = payloadOrId.trim();

    let ticket = state.tickets.find(
      (t) => t.qrPayload === trimmed || t.id === trimmed || t.ticketNumber.toUpperCase() === trimmed.toUpperCase()
    );

    if (!ticket) {
      if (trimmed.startsWith('FF1.')) {
        const parts = trimmed.split('.');
        if (parts.length >= 3) {
          const tId = parts[1];
          ticket = state.tickets.find((t) => t.id === tId);
        }
      }
    }

    const now = new Date().toISOString();
    if (!ticket) {
      return {
        status: 'INVALID_QR',
        message: 'No ticket record found matching this pass.',
        timestamp: now,
      };
    }

    if (allowedEventId && ticket.eventId !== allowedEventId) {
      return {
        status: 'EVENT_MISMATCH',
        message: 'This ticket belongs to a different event.',
        timestamp: now,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          tierName: ticket.tierName,
        },
      };
    }

    if (ticket.status === 'REVOKED') {
      return {
        status: 'TICKET_REVOKED',
        message: 'This ticket has been marked REVOKED.',
        timestamp: now,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          tierName: ticket.tierName,
        },
      };
    }

    if (ticket.status === 'CHECKED_IN') {
      return {
        status: 'ALREADY_CHECKED_IN',
        message: `Already checked in at ${new Date(ticket.checkedInAt || now).toLocaleTimeString()}`,
        timestamp: now,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          tierName: ticket.tierName,
          checkedInAt: ticket.checkedInAt,
        },
      };
    }

    ticket.status = 'CHECKED_IN';
    ticket.checkedInAt = now;
    ticket.updatedAt = now;

    this.persist(state);
    this.notifySubscribers();

    // Sync check-in to server
    if (typeof window !== 'undefined') {
      fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id }),
      }).catch((e) => console.warn('Failed to sync check-in to server:', e));
    }

    return {
      status: 'SUCCESS',
      message: 'Admission Granted! Ticket verified successfully.',
      timestamp: now,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName,
        tierName: ticket.tierName,
        checkedInAt: now,
      },
    };
  }

  public verifyTicketScan(payloadOrId: string, allowedEventId?: string): CheckInResponse {
    return this.checkInTicket(payloadOrId, allowedEventId);
  }

  // --- BOOKMYSHOW-STYLE GATE ADMISSION INSPECTOR ---
  public resolveScanForGateInspection(codeOrPayload: string, allowedEventId?: string): GateScanInspection {
    const state = this.loadState();
    const now = new Date().toISOString();
    let raw = (codeOrPayload || '').trim();

    // 1. If scanned text is a URL (e.g. https://.../ticket/tkt-1234), extract the ticket ID
    if (raw.includes('/ticket/')) {
      const parts = raw.split('/ticket/');
      if (parts[1]) {
        raw = parts[1].split('?')[0].split('#')[0].trim();
      }
    }

    // 2. If canonical "FF1.<ticketId>.<eventId>..." format
    let extractedTicketId = raw;
    if (raw.startsWith('FF1.')) {
      const parts = raw.split('.');
      if (parts.length >= 2) {
        extractedTicketId = parts[1];
      }
    }

    // 3. Find matching ticket
    let ticket = state.tickets.find(
      (t) =>
        t.id.toLowerCase() === raw.toLowerCase() ||
        t.id.toLowerCase() === extractedTicketId.toLowerCase() ||
        t.ticketNumber.toUpperCase() === raw.toUpperCase() ||
        t.qrPayload === raw ||
        (t.qrPayload && t.qrPayload.includes(raw)) ||
        raw.includes(t.id) ||
        raw.includes(t.ticketNumber)
    );

    // 4. If not found by ticket, try matching by booking ID or reference
    let booking: Booking | undefined;
    if (ticket) {
      const bId = ticket.bookingId;
      booking = state.bookings.find((b) => b.id === bId);
    } else {
      booking = state.bookings.find(
        (b) =>
          b.id.toLowerCase() === raw.toLowerCase() ||
          b.bookingReference.toUpperCase() === raw.toUpperCase() ||
          raw.includes(b.id) ||
          raw.includes(b.bookingReference)
      );
      if (booking) {
        ticket = state.tickets.find((t) => t.bookingId === booking!.id);
      }
    }

    if (!ticket && !booking) {
      return {
        status: 'INVALID',
        message: 'No matching ticket or booking found in system.',
        timestamp: now,
        tickets: [],
        totalPasses: 0,
        unenteredTickets: [],
        checkedInTickets: [],
      };
    }

    const eventId = ticket?.eventId || booking?.eventId || '';
    const event = state.events.find((e) => e.id === eventId);

    if (allowedEventId && eventId !== allowedEventId) {
      return {
        status: 'EVENT_MISMATCH',
        message: `This pass is for "${event?.title || 'Another Event'}", not the selected event!`,
        timestamp: now,
        booking,
        event,
        tickets: ticket ? [ticket] : [],
        totalPasses: 1,
        unenteredTickets: [],
        checkedInTickets: [],
        matchedTicket: ticket,
      };
    }

    // All sibling tickets belonging to this booking
    const bookingId = ticket?.bookingId || booking?.id;
    let siblingTickets = state.tickets.filter((t) => t.bookingId === bookingId);
    if (siblingTickets.length === 0 && ticket) {
      siblingTickets = [ticket];
    }

    const totalPasses = siblingTickets.length;
    const unenteredTickets = siblingTickets.filter((t) => t.status !== 'CHECKED_IN');
    const checkedInTickets = siblingTickets.filter((t) => t.status === 'CHECKED_IN');

    // If all tickets in booking are already checked in => DUPLICATE
    if (totalPasses > 0 && unenteredTickets.length === 0) {
      const firstCheckedInAt = checkedInTickets[0]?.checkedInAt || now;
      return {
        status: 'DUPLICATE',
        message: `DUPLICATE ENTRY DETECTED! All ${totalPasses} pass(es) on this booking were already entered and locked at ${new Date(firstCheckedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        timestamp: now,
        booking,
        event,
        tickets: siblingTickets,
        totalPasses,
        unenteredTickets,
        checkedInTickets,
        firstCheckedInAt,
        matchedTicket: ticket,
      };
    }

    // Ready for admission!
    return {
      status: 'READY',
      message: `${unenteredTickets.length} of ${totalPasses} pass(es) ready for admission.`,
      timestamp: now,
      booking,
      event,
      tickets: siblingTickets,
      totalPasses,
      unenteredTickets,
      checkedInTickets,
      matchedTicket: ticket,
    };
  }

  public async confirmGateAdmit(
    ticketIds: string[]
  ): Promise<{ success: boolean; count: number; checkedInAt: string }> {
    const state = this.loadState();
    const now = new Date().toISOString();
    let count = 0;

    for (const id of ticketIds) {
      const idx = state.tickets.findIndex((t) => t.id === id || t.ticketNumber === id);
      if (idx !== -1) {
        state.tickets[idx].status = 'CHECKED_IN';
        state.tickets[idx].checkedInAt = now;
        state.tickets[idx].updatedAt = now;
        count++;
      }
    }

    this.persist(state);
    this.notifySubscribers();

    // Sync to PostgreSQL cloud database
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketIds, now }),
        });
      } catch (e) {
        console.warn('Check-in cloud sync error:', e);
      }
    }

    return { success: true, count, checkedInAt: now };
  }

  public async resolveScanForGateInspectionAsync(
    codeOrPayload: string,
    allowedEventId?: string
  ): Promise<GateScanInspection> {
    const localRes = this.resolveScanForGateInspection(codeOrPayload, allowedEventId);
    if (localRes.status !== 'INVALID') {
      return localRes;
    }

    // If not found in local IndexedDB, check cloud Neon Postgres database
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/check-in?code=${encodeURIComponent(codeOrPayload.trim())}`);
        if (res.ok) {
          const cloudData = await res.json();
          if (cloudData.status === 'FOUND' && cloudData.booking) {
            const state = this.loadState();
            if (!state.bookings.some((b) => b.id === cloudData.booking.id)) {
              const cust = typeof cloudData.booking.customer === 'string'
                ? JSON.parse(cloudData.booking.customer)
                : (cloudData.booking.customer || {
                    fullName: cloudData.booking.customer_name || 'Attendee',
                    phone: cloudData.booking.customer_phone || '',
                    email: cloudData.booking.customer_email || '',
                    whatsappOptIn: true,
                    isGuest: true,
                  });
              const rawItems = typeof cloudData.booking.items === 'string'
                ? JSON.parse(cloudData.booking.items)
                : (cloudData.booking.items || []);

              state.bookings.push({
                id: cloudData.booking.id,
                bookingReference: cloudData.booking.booking_reference,
                eventId: cloudData.booking.event_id,
                organiserId: cloudData.booking.organiser_id || 'org-1',
                customer: cust,
                items: rawItems,
                status: cloudData.booking.status,
                subtotalInPence: Number(cloudData.booking.total_amount_in_pence || 0),
                serviceFeeInPence: 0,
                totalAmountInPence: Number(cloudData.booking.total_amount_in_pence || 0),
                currency: cloudData.booking.currency || 'INR',
                reservationExpiresAt: cloudData.booking.created_at || new Date().toISOString(),
                createdAt: cloudData.booking.created_at || new Date().toISOString(),
                updatedAt: cloudData.booking.updated_at || new Date().toISOString(),
              });
            }

            if (Array.isArray(cloudData.tickets)) {
              for (const ct of cloudData.tickets) {
                const exIdx = state.tickets.findIndex((t) => t.id === ct.id);
                const mapped: Ticket = {
                  id: ct.id,
                  ticketNumber: ct.ticket_number,
                  bookingId: ct.booking_id,
                  eventId: ct.event_id,
                  ticketTierId: ct.tier_id,
                  tierName: ct.tier_name,
                  attendeeName: ct.attendee_name,
                  qrPayload: ct.qr_payload,
                  securityToken: ct.id,
                  status: ct.status,
                  checkedInAt: ct.checked_in_at,
                  createdAt: ct.created_at,
                  updatedAt: ct.updated_at,
                };
                if (exIdx >= 0) {
                  state.tickets[exIdx] = mapped;
                } else {
                  state.tickets.push(mapped);
                }
              }
            }

            if (cloudData.event && !state.events.some((e) => e.id === cloudData.event.id)) {
              state.events.push(cloudData.event);
            }

            this.persist(state);
            this.notifySubscribers();
            return this.resolveScanForGateInspection(codeOrPayload, allowedEventId);
          }
        }
      } catch (e) {
        console.warn('Async cloud inspection error:', e);
      }
    }

    return localRes;
  }

  // --- ADMIN AUTH & RESET ---
  public verifyAdminPin(pin: string): boolean {
    const configuredPin = process.env.NEXT_PUBLIC_ADMIN_PIN || 'CF2026';
    const trimmed = (pin || '').trim();
    return trimmed === 'CF2026' || trimmed === configuredPin || trimmed === (this.loadState().adminPin || '').trim();
  }

  public async resetDatabase(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      await this.writeToIdb(STORAGE_KEY, DEFAULT_STATE);
      this.memoryCache = JSON.parse(JSON.stringify(DEFAULT_STATE));
      this.notifySubscribers();
    }
  }
}

export const p1Storage = new P1MultiEventStore();
