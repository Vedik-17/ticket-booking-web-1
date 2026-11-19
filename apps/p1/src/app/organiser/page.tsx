'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Camera,
  CameraOff,
  Layers,
  Settings,
  Lock,
  Plus,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  QrCode,
  Send,
  MessageSquare,
  Upload,
  ImageIcon,
  ExternalLink,
  Trash2,
  Pencil,
  X,
  RefreshCw,
  UserCheck,
  Copy,
  Download,
  Share2,
  Video,
  Info,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton, GlassInput } from '@firefly/ui';
import { Booking, Event, TicketTier, Ticket, CheckInResponse } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';
import { p1Storage } from '@/lib/idb-storage';
import {
  compressImageToDataUrl,
  generateTicketCardDataUrl,
  shareTicketImageDirectly,
} from '@/lib/image';
import {
  parseFlexibleDateTime,
  formatForHumanInput,
  formatPreviewDateTime,
} from '@/lib/date';
import { FlexibleDateTimeInput } from '@/components/FlexibleDateTimeInput';

export default function P1AdminPanelPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<'bookings' | 'events' | 'scanner'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);

  // Recently confirmed ticket modal/drawer
  const [confirmedModal, setConfirmedModal] = useState<{
    booking: Booking;
    tickets: Ticket[];
    qrDataUrls: string[];
    passCardUrls: string[];
  } | null>(null);
  const [copiedPhoto, setCopiedPhoto] = useState(false);
  const [sharingPhoto, setSharingPhoto] = useState(false);

  // Default clean neutral banner if organiser does not upload an image
  const DEFAULT_EVENT_POSTER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' viewBox='0 0 1200 600'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='50%25' r='50%25'%3E%3Cstop offset='0%25' stop-color='%23FF6A1A' stop-opacity='0.3'/%3E%3Cstop offset='100%25' stop-color='%23121212' stop-opacity='1'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='%23121212' width='1200' height='600'/%3E%3Crect fill='url(%23g)' width='1200' height='600'/%3E%3Ccircle cx='600' cy='300' r='100' fill='%23FF6A1A' fill-opacity='0.08' stroke='%23FF6A1A' stroke-width='2' stroke-opacity='0.2'/%3E%3Ctext x='50%25' y='50%25' fill='%23FFFFFF' fill-opacity='0.7' font-family='sans-serif' font-size='24' font-weight='600' text-anchor='middle' dy='.3em'%3ELIVE EXPERIENCE%3C/text%3E%3C/svg%3E";

  // New Event Modal State - Clean blank initial state for production
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    tagline: '',
    description: '',
    category: 'MUSIC_FESTIVAL',
    posterUrl: '',
    venueName: '',
    address: '',
    city: '',
    googleMapsUrl: '',
    startsAt: '',
    endsAt: '',
    upiId: '',
    upiPayeeName: '',
    whatsappPhone: '',
    maxTicketsPerBooking: '6',
    tier1Name: '',
    tier1Price: '',
    tier1Capacity: '',
    tier2Name: '',
    tier2Price: '',
    tier2Capacity: '',
  });
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Edit Event Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editBannerPreview, setEditBannerPreview] = useState<string>('');
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [isEditDragging, setIsEditDragging] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    tagline: '',
    description: '',
    category: 'MUSIC_FESTIVAL',
    posterUrl: '',
    venueName: '',
    address: '',
    city: '',
    googleMapsUrl: '',
    startsAt: '',
    endsAt: '',
    upiId: '',
    upiPayeeName: '',
    whatsappPhone: '',
    maxTicketsPerBooking: '6',
    tiers: [] as Array<{
      id?: string;
      name: string;
      priceInRupees: string;
      capacity: string;
    }>,
  });

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<CheckInResponse | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [selectedScannerEvent, setSelectedScannerEvent] = useState<string>('ALL');
  const [scanningPhoto, setScanningPhoto] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [hasMediaDevices, setHasMediaDevices] = useState(true);
  const [showFlagGuide, setShowFlagGuide] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  const scannerRef = useRef<any>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const secure = window.isSecureContext ?? false;
      const media = !!(navigator?.mediaDevices && navigator?.mediaDevices?.getUserMedia);
      setIsSecure(secure);
      setHasMediaDevices(media);
    }
  }, []);

  const loadAllData = () => {
    setBookings(p1Storage.getBookings());
    const evts = p1Storage.getEvents();
    setEvents(evts);
    setTiers(p1Storage.getTiers());
    // Load all tickets from bookings/store
    const allTkts: Ticket[] = [];
    const bList = p1Storage.getBookings();
    bList.forEach((b) => {
      allTkts.push(...p1Storage.getTicketsByBookingId(b.id));
    });
    setAllTickets(allTkts);
    return evts;
  };

  useEffect(() => {
    const loadedEvents = loadAllData();

    // Check if URL has ?edit=<eventId>
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('edit');
      if (editId) {
        setActiveTab('events');
        const target = loadedEvents.find((e) => e.id === editId || e.slug === editId);
        if (target) {
          openEditEvent(target);
        }
      }
    }
  }, [isAuthenticated]);

  // Clean up camera scanner when leaving scanner tab or unmounting
  useEffect(() => {
    if (activeTab !== 'scanner') {
      stopCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [activeTab]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (p1Storage.verifyAdminPin(pinInput)) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Manual payment verification & QR generation
  const handleConfirmBooking = async (bookingId: string) => {
    const res = await p1Storage.confirmBookingAndGenerateTickets(bookingId);
    if (res.success && res.booking && res.tickets) {
      loadAllData();
      const currentEvents = p1Storage.getEvents();
      const event = currentEvents.find((e) => e.id === res.booking!.eventId);

      // Pre-generate official Pass Card images with QR
      const cards: string[] = [];
      for (const t of res.tickets) {
        try {
          const cardUrl = await generateTicketCardDataUrl({
            eventTitle: event?.title || 'Firefly Live Event',
            attendeeName: t.attendeeName,
            tierName: t.tierName,
            ticketNumber: t.ticketNumber,
            venueName: event?.venue.name || 'Event Grounds',
            dateStr: event?.schedule.startsAt ? new Date(event.schedule.startsAt).toLocaleDateString() : 'Live Date',
            qrPayload: t.qrPayload,
          });
          cards.push(cardUrl);
        } catch {
          cards.push(res.qrDataUrls?.[0] || '');
        }
      }

      setConfirmedModal({
        booking: res.booking,
        tickets: res.tickets,
        qrDataUrls: res.qrDataUrls || [],
        passCardUrls: cards,
      });
    }
  };

  // Direct Ticket Pass Image Sharing via Web Share / WhatsApp
  const handleSharePassPhoto = async (booking: Booking, ticket: Ticket, passCardUrl?: string) => {
    setSharingPhoto(true);
    try {
      const currentEvents = p1Storage.getEvents();
      const event = currentEvents.find((e) => e.id === booking.eventId);
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const ticketUrl = `${origin}/ticket/${ticket.id}`;

      let cardUrl = passCardUrl;
      if (!cardUrl) {
        cardUrl = await generateTicketCardDataUrl({
          eventTitle: event?.title || 'Firefly Event',
          attendeeName: ticket.attendeeName,
          tierName: ticket.tierName,
          ticketNumber: ticket.ticketNumber,
          venueName: event?.venue.name || 'Venue',
          dateStr: event?.schedule.startsAt ? new Date(event.schedule.startsAt).toLocaleDateString() : 'Date',
          qrPayload: ticket.qrPayload,
        });
      }

      const caption =
        `*CONFIRMED TICKET PASS: ${event?.title || 'Event'}*\n\n` +
        `👤 Attendee: ${ticket.attendeeName}\n` +
        `🎟️ Tier: ${ticket.tierName}\n` +
        `🔢 Pass No: ${ticket.ticketNumber}\n` +
        `📍 Venue: ${event?.venue.name || 'Venue'}, ${event?.venue.city || 'City'}\n\n` +
        `Digital Pass Link: ${ticketUrl}\n\n` +
        `⚡ Scan the QR code on this ticket pass image at the entrance gate.`;

      const result = await shareTicketImageDirectly({
        imageDataUrl: cardUrl,
        ticketNumber: ticket.ticketNumber,
        captionText: caption,
        targetPhone: booking.customer.phone,
      });

      if (result === 'COPIED_TO_CLIPBOARD') {
        setCopiedPhoto(true);
        setTimeout(() => setCopiedPhoto(false), 3000);
      }
    } finally {
      setSharingPhoto(false);
    }
  };

  const handleCopyPassImage = async (passCardUrl: string) => {
    try {
      const res = await fetch(passCardUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopiedPhoto(true);
      setTimeout(() => setCopiedPhoto(false), 2500);
    } catch {
      alert('Could not copy image to clipboard.');
    }
  };

  // Unified Image Processor (Compresses and stores image for both click and drag & drop)
  const processImageFile = async (file: File, isEdit: boolean = false) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select or drop a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (isEdit) {
      setUploadingEditImage(true);
      try {
        const dataUrl = await compressImageToDataUrl(file, 1200, 800, 0.82);
        setEditBannerPreview(dataUrl);
        setEditForm((prev) => ({ ...prev, posterUrl: dataUrl }));
      } catch {
        alert('Could not compress image');
      } finally {
        setUploadingEditImage(false);
      }
    } else {
      setUploadingImage(true);
      try {
        const dataUrl = await compressImageToDataUrl(file, 1200, 800, 0.82);
        setBannerPreview(dataUrl);
        setNewEvent((prev) => ({ ...prev, posterUrl: dataUrl }));
      } catch {
        alert('Could not compress image');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  // Banner Image Upload for New Event
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processImageFile(file, false);
    e.target.value = '';
  };

  // Drag & Drop Handlers for New Event Poster
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processImageFile(file, false);
    }
  };

  // Create Event Form Submit
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.venueName.trim()) {
      alert('Please fill in title and venue');
      return;
    }

    if (!newEvent.tier1Name.trim() || !newEvent.tier1Price.trim()) {
      alert('Please specify at least Tier 1 name and ticket rate.');
      return;
    }

    const maxTix = Math.max(1, Number(newEvent.maxTicketsPerBooking) || 6);

    const parsedStart = parseFlexibleDateTime(newEvent.startsAt);
    if (newEvent.startsAt.trim() && !parsedStart) {
      alert('Could not understand Start Date & Time. Please use a format like "21/11/2026, 07:00 PM" or pick a date.');
      return;
    }

    const parsedEnd = parseFlexibleDateTime(newEvent.endsAt);
    if (newEvent.endsAt.trim() && !parsedEnd) {
      alert('Could not understand End Date & Time. Please use a format like "21/11/2026, 10:00 PM" or pick a date.');
      return;
    }

    const now = new Date();
    const defaultStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const finalStart = parsedStart || defaultStart;
    const finalEnd = parsedEnd || new Date(finalStart.getTime() + 4 * 60 * 60 * 1000);

    const startsAtIso = finalStart.toISOString();
    const endsAtIso = finalEnd.toISOString();

    const created = p1Storage.createEvent({
      organiserId: 'org-1',
      title: newEvent.title.trim(),
      slug: newEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${Date.now().toString(36).substring(2, 6)}`,
      tagline: newEvent.tagline.trim(),
      description: newEvent.description.trim() || newEvent.title.trim(),
      category: newEvent.category as any,
      status: 'PUBLISHED',
      posterUrl: newEvent.posterUrl.trim() || DEFAULT_EVENT_POSTER,
      galleryUrls: [],
      upiId: newEvent.upiId.trim() || undefined,
      upiPayeeName: newEvent.upiPayeeName.trim() || undefined,
      whatsappPhone: newEvent.whatsappPhone.trim() || undefined,
      maxTicketsPerBooking: maxTix,
      venue: {
        name: newEvent.venueName.trim(),
        address: newEvent.address.trim(),
        city: newEvent.city.trim() || 'Venue',
        state: '',
        postalCode: '',
        country: 'India',
        googleMapsUrl: newEvent.googleMapsUrl.trim() || `https://maps.google.com/?q=${encodeURIComponent(newEvent.venueName.trim() + (newEvent.city.trim() ? ' ' + newEvent.city.trim() : ''))}`,
      },
      schedule: {
        doorsOpenAt: startsAtIso,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        timezone: 'Asia/Kolkata',
      },
      isAgeRestricted: false,
      featured: true,
    });

    if (newEvent.tier1Name.trim() && newEvent.tier1Price.trim()) {
      p1Storage.createTier({
        eventId: created.id,
        name: newEvent.tier1Name.trim(),
        priceInPence: Math.round(Number(newEvent.tier1Price) * 100),
        currency: 'INR',
        capacity: Number(newEvent.tier1Capacity) || 500,
        minPerBooking: 1,
        maxPerBooking: maxTix,
        salesStartAt: new Date().toISOString(),
        salesEndAt: endsAtIso,
        status: 'ACTIVE',
        perks: ['Standard Entry'],
      });
    }

    if (newEvent.tier2Name.trim() && newEvent.tier2Price.trim()) {
      p1Storage.createTier({
        eventId: created.id,
        name: newEvent.tier2Name.trim(),
        priceInPence: Math.round(Number(newEvent.tier2Price) * 100),
        currency: 'INR',
        capacity: Number(newEvent.tier2Capacity) || 100,
        minPerBooking: 1,
        maxPerBooking: maxTix,
        salesStartAt: new Date().toISOString(),
        salesEndAt: endsAtIso,
        status: 'ACTIVE',
        perks: ['VIP Access'],
      });
    }

    setNewEvent({
      title: '',
      tagline: '',
      description: '',
      category: 'MUSIC_FESTIVAL',
      posterUrl: '',
      venueName: '',
      address: '',
      city: '',
      googleMapsUrl: '',
      startsAt: '',
      endsAt: '',
      upiId: '',
      upiPayeeName: '',
      whatsappPhone: '',
      maxTicketsPerBooking: '6',
      tier1Name: '',
      tier1Price: '',
      tier1Capacity: '',
      tier2Name: '',
      tier2Price: '',
      tier2Capacity: '',
    });
    setBannerPreview('');
    setShowAddEventModal(false);
    loadAllData();
    alert('Event created and published successfully!');
  };

  // Helper to open Edit Modal with populated data
  const openEditEvent = (evt: Event) => {
    const eventTiers = p1Storage.getTiers(evt.id);
    setEditingEvent(evt);
    setEditBannerPreview(evt.posterUrl);

    setEditForm({
      title: evt.title,
      tagline: evt.tagline || '',
      description: evt.description,
      category: evt.category,
      posterUrl: evt.posterUrl,
      venueName: evt.venue.name,
      address: evt.venue.address || '',
      city: evt.venue.city,
      googleMapsUrl: evt.venue.googleMapsUrl || '',
      startsAt: formatForHumanInput(evt.schedule.startsAt),
      endsAt: formatForHumanInput(evt.schedule.endsAt),
      upiId: evt.upiId || '',
      upiPayeeName: evt.upiPayeeName || '',
      whatsappPhone: evt.whatsappPhone || '',
      maxTicketsPerBooking: evt.maxTicketsPerBooking ? evt.maxTicketsPerBooking.toString() : '6',
      tiers: eventTiers.map((t) => ({
        id: t.id,
        name: t.name,
        priceInRupees: (t.priceInPence / 100).toString(),
        capacity: t.capacity.toString(),
      })),
    });
    setShowEditModal(true);
  };

  // Banner upload inside Edit Modal
  const handleEditBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processImageFile(file, true);
    e.target.value = '';
  };

  // Drag & Drop Handlers for Edit Event Poster
  const handleEditDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEditDragging) setIsEditDragging(true);
  };

  const handleEditDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditDragging(true);
  };

  const handleEditDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsEditDragging(false);
  };

  const handleEditDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processImageFile(file, true);
    }
  };

  // Tier manipulation inside Edit Modal
  const handleAddTierToEdit = () => {
    setEditForm((prev) => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        {
          name: 'Additional Tier',
          priceInRupees: '999',
          capacity: '100',
        },
      ],
    }));
  };

  const handleRemoveTierFromEdit = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index),
    }));
  };

  const handleEditTierField = (index: number, field: 'name' | 'priceInRupees' | 'capacity', value: string) => {
    setEditForm((prev) => {
      const updated = [...prev.tiers];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, tiers: updated };
    });
  };

  // Save changes to edited event
  const handleSaveEditedEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    if (!editForm.title.trim() || !editForm.venueName.trim()) {
      alert('Please fill in title and venue');
      return;
    }

    const maxTix = Math.max(1, Number(editForm.maxTicketsPerBooking) || 6);

    const parsedStart = parseFlexibleDateTime(editForm.startsAt);
    if (editForm.startsAt.trim() && !parsedStart) {
      alert('Could not understand Start Date & Time. Please use a format like "21/11/2026, 07:00 PM"');
      return;
    }

    const parsedEnd = parseFlexibleDateTime(editForm.endsAt);
    if (editForm.endsAt.trim() && !parsedEnd) {
      alert('Could not understand End Date & Time. Please use a format like "21/11/2026, 10:00 PM"');
      return;
    }

    const startsAtIso = parsedStart ? parsedStart.toISOString() : editingEvent.schedule.startsAt;
    const endsAtIso = parsedEnd ? parsedEnd.toISOString() : editingEvent.schedule.endsAt;

    p1Storage.updateEvent(editingEvent.id, {
      title: editForm.title,
      tagline: editForm.tagline,
      description: editForm.description,
      category: editForm.category as any,
      posterUrl: editForm.posterUrl || editingEvent.posterUrl,
      upiId: editForm.upiId.trim() || undefined,
      upiPayeeName: editForm.upiPayeeName.trim() || undefined,
      whatsappPhone: editForm.whatsappPhone.trim() || undefined,
      maxTicketsPerBooking: maxTix,
      venue: {
        ...editingEvent.venue,
        name: editForm.venueName,
        address: editForm.address,
        city: editForm.city,
        googleMapsUrl: editForm.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(editForm.venueName + ' ' + editForm.city)}`,
      },
      schedule: {
        ...editingEvent.schedule,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
      },
    });

    if (editForm.tiers.length > 0) {
      p1Storage.syncEventTiers(
        editingEvent.id,
        editForm.tiers.map((t) => ({
          id: t.id,
          name: t.name,
          priceInPence: Math.round(Number(t.priceInRupees) * 100),
          capacity: Number(t.capacity) || 100,
        }))
      );
    }

    setShowEditModal(false);
    setEditingEvent(null);
    loadAllData();
    alert(`"${editForm.title}" updated successfully!`);
  };

  // --- CAMERA QR SCANNER ENGINE ---
  const startCameraScanner = async () => {
    setCameraError(null);
    setScanResult(null);

    // Pre-flight check: Mobile browsers require Secure Context (HTTPS or localhost) for getUserMedia
    const secure = typeof window !== 'undefined' ? window.isSecureContext : true;
    const hasMedia = typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;

    if (!secure || !hasMedia) {
      setCameraError('MOBILE_INSECURE_CONTEXT');
      setIsScanning(false);
      return;
    }

    setIsScanning(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      // Clear any prior instance
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}
      }

      const qrScanner = new Html5Qrcode('qr-camera-feed');
      scannerRef.current = qrScanner;

      const config = {
        fps: 12,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      };

      await qrScanner.start(
        { facingMode: 'environment' }, // Back camera on mobile
        config,
        (decodedText) => {
          handleProcessScan(decodedText);
        },
        () => {
          // Frame parse error: silent while searching
        }
      );
    } catch (err: any) {
      console.error('Camera initialization failed', err);
      setIsScanning(false);
      const msg = String(err?.message || err || '');
      if (
        msg.includes('getUserMedia') ||
        msg.includes('NotAllowedError') ||
        msg.includes('Permission') ||
        msg.includes('not supported') ||
        (typeof window !== 'undefined' && !window.isSecureContext)
      ) {
        setCameraError('MOBILE_INSECURE_CONTEXT');
      } else {
        setCameraError(msg || 'Camera hardware is unavailable.');
      }
    }
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error clearing scanner', err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  // Instant Snapshot Scanner via Native Mobile Camera (<input capture="environment" />)
  const handlePhotoScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningPhoto(true);
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      // Create off-screen scanner instance for file analysis
      const fileScanner = new Html5Qrcode('qr-camera-scratch');
      try {
        const decodedText = await fileScanner.scanFile(file, false);
        handleProcessScan(decodedText);
      } finally {
        try {
          await fileScanner.clear();
        } catch {}
      }
    } catch (err: any) {
      console.warn('QR scan error on file', err);
      alert('Could not detect a valid QR code in this photo. Please hold steady, ensure good lighting, and snap again.');
    } finally {
      setScanningPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  // Process Decoded QR Code (Live Camera, Photo, or Manual)
  const handleProcessScan = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Pleasant audio feedback & device vibration
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {}

    const targetEventId = selectedScannerEvent === 'ALL' ? undefined : selectedScannerEvent;
    const res = p1Storage.verifyTicketScan(cleanCode, targetEventId);
    setScanResult(res);
    loadAllData();
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessScan(manualCode);
    setManualCode('');
  };

  // Helper to build WhatsApp message to send ticket to customer
  const buildWhatsAppTicketSendUrl = (booking: Booking, ticket: Ticket) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const ticketUrl = `${origin}/ticket/${ticket.id}`;
    const event = events.find((e) => e.id === booking.eventId);

    const message =
      `Hello ${booking.customer.fullName}!\n\n` +
      `Your ticket for "${event?.title || 'Event'}" has been CONFIRMED!\n\n` +
      `• Ticket No: ${ticket.ticketNumber}\n` +
      `• Tier: ${ticket.tierName}\n` +
      `• Attendee: ${ticket.attendeeName}\n\n` +
      `Access your official QR Entry Pass here:\n${ticketUrl}\n\n` +
      `Please have your QR code ready for gate scanning at the entrance.`;

    const cleanPhone = booking.customer.phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  // PIN Gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-xs mx-auto py-16 space-y-6">
        <GlassCard className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/30 flex items-center justify-center mx-auto text-[#FF9A45]">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Admin Panel Access</h2>
            <p className="text-xs text-white/50">Enter the 6-digit administration passcode</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-3">
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••••"
              className="w-full text-center tracking-widest text-lg font-mono py-2 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white focus:outline-none focus:border-[#FF6A1A]"
              autoFocus
            />

            {pinError && <p className="text-xs text-red-400">Incorrect PIN. (Default: 123456)</p>}

            <GlassButton type="submit" variant="primary" fullWidth size="md">
              Enter Admin Panel
            </GlassButton>
          </form>

          <p className="text-[10px] text-white/40">Default Passcode: 123456</p>
        </GlassCard>
      </div>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === 'PAYMENT_PENDING');
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');
  const totalGrossPence = confirmedBookings.reduce((sum, b) => sum + b.totalAmountInPence, 0);

  // Gate Scanner Stats
  const checkedInTicketsCount = allTickets.filter((t) => t.status === 'CHECKED_IN').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Admin Control Panel</h1>
            <GlassBadge variant="accent">Direct UPI Edition</GlassBadge>
          </div>
          <p className="text-xs text-white/50 pt-0.5">
            Manual booking verification, QR code generation, WhatsApp dispatch & event management.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'bookings' ? 'bg-white/[0.12] text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
              activeTab === 'events' ? 'bg-white/[0.12] text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Manage Events ({events.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
              activeTab === 'scanner' ? 'bg-white/[0.12] text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-[#FF9A45]" />
            <span>Gate Scanner</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard padding="sm" className="space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase">Total Collected</span>
          <p className="text-base font-bold text-[#FF9A45]">{formatINR(totalGrossPence)}</p>
        </GlassCard>
        <GlassCard padding="sm" className="space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase">Awaiting Confirmation</span>
          <p className="text-base font-bold text-amber-400">{pendingBookings.length}</p>
        </GlassCard>
        <GlassCard padding="sm" className="space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase">Gate Check-ins</span>
          <p className="text-base font-bold text-emerald-400">
            {checkedInTicketsCount} / {allTickets.length}
          </p>
        </GlassCard>
      </div>

      {/* TAB 1: BOOKINGS & MANUAL CONFIRMATION */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Customer Bookings
            </h2>
            <span className="text-xs text-white/40">Only Name & Mobile (Zero Email)</span>
          </div>

          {bookings.length === 0 ? (
            <GlassCard className="text-center py-10 space-y-2">
              <p className="text-xs text-white/50">No customer bookings yet.</p>
              <Link href="/" className="text-xs text-[#FF9A45] hover:underline">
                View live events page
              </Link>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const event = events.find((e) => e.id === b.eventId);
                const issuedTickets = p1Storage.getTicketsByBookingId(b.id);
                const firstTicket = issuedTickets[0];

                return (
                  <GlassCard key={b.id} padding="sm" className="space-y-3 text-xs">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-2 border-b border-white/[0.05]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{b.bookingReference}</span>
                        <GlassBadge variant={b.status === 'CONFIRMED' ? 'success' : 'warning'} size="sm">
                          {b.status}
                        </GlassBadge>
                        <span className="text-white/40">•</span>
                        <span className="text-white/70 font-semibold">{event?.title}</span>
                      </div>

                      <span className="font-bold text-[#FF9A45] text-sm">
                        {formatINR(b.totalAmountInPence)}
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      {/* Customer Info (Name and Phone only) */}
                      <div className="space-y-1">
                        <p className="text-white font-medium text-sm">
                          {b.customer.fullName}{' '}
                          <span className="text-white/50 text-xs font-mono font-normal">
                            ({b.customer.phone})
                          </span>
                        </p>
                        <p className="text-white/60">
                          Tickets:{' '}
                          <span className="text-white font-medium">
                            {b.items.map((i) => `${i.quantity}x ${i.tierName}`).join(', ')}
                          </span>
                        </p>
                      </div>

                      {/* Action: Manual Confirm & WhatsApp Send */}
                      <div className="flex flex-wrap items-center gap-2">
                        {b.status === 'PAYMENT_PENDING' ? (
                          <GlassButton
                            size="sm"
                            variant="primary"
                            onClick={() => handleConfirmBooking(b.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-white" />
                            <span>Confirm Payment & Generate QR</span>
                          </GlassButton>
                        ) : (
                          <>
                            {firstTicket && (
                              <a
                                href={buildWhatsAppTicketSendUrl(b, firstTicket)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Send on WhatsApp</span>
                              </a>
                            )}
                            <Link href={`/ticket/${firstTicket?.id || ''}`}>
                              <GlassButton size="sm" variant="secondary">
                                View Pass
                              </GlassButton>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANAGE & EDIT EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Platform Events Catalog
            </h2>
            <GlassButton size="sm" variant="primary" onClick={() => setShowAddEventModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add New Event</span>
            </GlassButton>
          </div>

          {events.length === 0 ? (
            <GlassCard className="text-center py-16 px-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] mx-auto flex items-center justify-center text-[#FF9A45]">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">No Events in Catalog</h3>
                <p className="text-xs text-white/50 max-w-sm mx-auto">
                  Your event catalog is completely clean. Click below to add and publish your first live experience.
                </p>
              </div>
              <GlassButton variant="primary" size="sm" onClick={() => setShowAddEventModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Create First Event</span>
              </GlassButton>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((evt) => {
                const eventTiers = tiers.filter((t) => t.eventId === evt.id);

                return (
                  <GlassCard key={evt.id} padding="none" className="flex flex-col text-xs">
                    <div className="relative h-36 w-full overflow-hidden bg-neutral-900">
                      <img src={evt.posterUrl} alt={evt.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-80" />
                      <div className="absolute top-2.5 left-2.5">
                        <GlassBadge variant="accent" size="sm">{evt.category.replace('_', ' ')}</GlassBadge>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-white text-sm line-clamp-1">{evt.title}</h3>
                        <p className="text-white/60 line-clamp-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#FF9A45]" />
                          <span>{evt.venue.name}, {evt.venue.city}</span>
                        </p>
                        <p className="text-white/40 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(evt.schedule.startsAt).toLocaleDateString()}</span>
                        </p>

                        {/* Tiers summary */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {eventTiers.map((t) => (
                            <span
                              key={t.id}
                              className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[10px] text-white/70"
                            >
                              {t.name}: <span className="text-[#FF9A45] font-semibold">{formatINR(t.priceInPence)}</span>
                            </span>
                          ))}
                        </div>

                        {/* Event badges: UPI, WhatsApp & Max Booking limit */}
                        <div className="pt-0.5 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-mono">
                            <QrCode className="w-2.5 h-2.5 text-emerald-400" />
                            <span>UPI: {evt.upiId || 'System Default'}</span>
                          </span>
                          {evt.whatsappPhone && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-mono">
                              <MessageSquare className="w-2.5 h-2.5 text-emerald-400" />
                              <span>WA: {evt.whatsappPhone}</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FF6A1A]/10 border border-[#FF6A1A]/20 text-[10px] text-[#FF9A45] font-medium">
                            <span>Max {evt.maxTicketsPerBooking || 6} tkts/booking</span>
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* EDIT EVENT BUTTON */}
                          <button
                            onClick={() => openEditEvent(evt)}
                            className="px-2.5 py-1 rounded-lg bg-[#FF6A1A]/15 hover:bg-[#FF6A1A]/25 border border-[#FF6A1A]/30 text-[#FF9A45] hover:text-white font-medium text-xs flex items-center gap-1 transition-all"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <Link
                            href={`/event/${evt.slug || evt.id}`}
                            className="text-white/60 hover:text-white flex items-center gap-1 text-xs"
                          >
                            <span>Preview</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>

                        <button
                          onClick={() => {
                            if (confirm(`Delete event "${evt.title}"?`)) {
                              p1Storage.deleteEvent(evt.id);
                              loadAllData();
                            }
                          }}
                          className="text-white/40 hover:text-red-400 p-1 transition-colors"
                          title="Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE CAMERA GATE SCANNER */}
      {activeTab === 'scanner' && (
        <div className="max-w-md mx-auto space-y-4">
          <GlassCard className="space-y-4">
            {/* Header & Event selector */}
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#FF9A45]" />
                <h2 className="text-sm font-bold text-white">Live Camera Gate Scanner</h2>
              </div>
              <GlassBadge variant="accent">
                {checkedInTicketsCount} Admitted
              </GlassBadge>
            </div>

            {/* Event Filter */}
            <div className="space-y-1 text-xs">
              <label className="text-[10px] text-white/50 uppercase font-semibold">Admissions Scope</label>
              <select
                value={selectedScannerEvent}
                onChange={(e) => setSelectedScannerEvent(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-xs text-white focus:outline-none focus:border-[#FF6A1A]"
              >
                <option value="ALL" className="bg-[#181818] text-white">All Events (Auto-match)</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id} className="bg-[#181818] text-white">
                    {e.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Insecure Context notice badge if on HTTP LAN */}
            {(!isSecure || !hasMediaDevices) && (
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-white/70">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Mobile Wi-Fi Mode (Native Camera Active)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFlagGuide(!showFlagGuide)}
                  className="text-[#FF9A45] hover:underline font-medium text-[10px]"
                >
                  {showFlagGuide ? 'Hide Info' : 'Live Stream Info'}
                </button>
              </div>
            )}

            {/* Expander for Chrome Flag Guide */}
            {showFlagGuide && (
              <div className="p-3.5 rounded-xl bg-black/60 border border-amber-500/30 space-y-2.5 text-xs text-white/80 animate-in fade-in duration-200">
                <div className="flex items-start gap-2 text-amber-300 font-semibold text-xs">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Continuous Live Video on Android Chrome</span>
                </div>
                <p className="text-white/60 text-[11px] leading-relaxed">
                  Mobile browsers restrict continuous camera video streaming on plain <code className="text-amber-300 font-mono">http://</code> Wi-Fi connections. The <strong>&quot;Snap Photo / Upload QR&quot;</strong> button works 100% out of the box with your phone&apos;s native camera!
                </p>
                <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] space-y-1.5 text-[11px]">
                  <p className="text-white font-medium text-[10px] uppercase tracking-wider text-white/60">
                    To unlock continuous 12fps streaming:
                  </p>
                  <p className="text-white/70">
                    1. In Android Chrome, open: <br />
                    <span className="text-[#FF9A45] font-mono break-all text-[10px]">chrome://flags/#unsafely-treat-insecure-origin-as-secure</span>
                  </p>
                  <p className="text-white/70">
                    2. Add server address:
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-black/70 border border-white/10 font-mono text-white text-[11px] select-all">
                      {typeof window !== 'undefined' ? window.location.origin : 'http://10.93.32.147:3000'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(window.location.origin);
                          setCopiedOrigin(true);
                          setTimeout(() => setCopiedOrigin(false), 2000);
                        }
                      }}
                      className="px-2.5 py-1 rounded-md bg-[#FF6A1A]/20 hover:bg-[#FF6A1A]/30 border border-[#FF6A1A]/40 text-[#FF9A45] font-bold text-[10px] transition-colors"
                    >
                      {copiedOrigin ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-white/70">
                    3. Set to <strong className="text-white">Enabled</strong> and tap <strong className="text-white">Relaunch</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* CAMERA VIEWFINDER WINDOW */}
            <div className="relative rounded-2xl overflow-hidden bg-black/90 border border-white/[0.15] shadow-2xl min-h-[300px] flex flex-col items-center justify-center">
              {/* Target div for Html5Qrcode video element */}
              <div
                id="qr-camera-feed"
                className={`w-full ${isScanning ? 'block' : 'hidden'}`}
              />

              {/* Off-screen helper for snapshot file parsing */}
              <div
                id="qr-camera-scratch"
                style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
              />

              {/* Inactive Camera State with Dynamic CTA */}
              {!isScanning && (
                <div className="p-6 text-center space-y-4 w-full">
                  <div className="w-16 h-16 rounded-3xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/30 flex items-center justify-center mx-auto text-[#FF9A45] shadow-[0_0_30px_rgba(255,106,26,0.25)]">
                    <Camera className="w-8 h-8 animate-pulse" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">
                      {(!isSecure || !hasMediaDevices) ? 'Mobile Gate Camera Ready' : 'Camera Viewfinder Ready'}
                    </h3>
                    <p className="text-xs text-white/50 max-w-xs mx-auto">
                      {(!isSecure || !hasMediaDevices)
                        ? 'Snap attendee QR pass with your phone camera for instant admission verification.'
                        : 'Open your phone camera to scan attendee QR entrance tickets in real-time.'}
                    </p>
                  </div>

                  {/* SPECIFIC INSECURE CONTEXT ERROR CARD */}
                  {cameraError === 'MOBILE_INSECURE_CONTEXT' && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-left space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wider">
                            Mobile Browser Security Notice
                          </h4>
                          <p className="text-white/70 text-[11px] leading-relaxed">
                            Mobile browsers (Chrome / Safari) disable continuous live video streams over unencrypted <code className="text-amber-300 font-mono">http://</code> Wi-Fi connections.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-500/20 space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Works Instantly with Phone Camera or Gallery:</span>
                        </div>
                        <p className="text-white/60 text-[11px]">
                          Snap with your phone camera or select a QR image directly from your gallery.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCameraError(null);
                              photoInputRef.current?.click();
                            }}
                            className="py-3 px-3 rounded-xl bg-gradient-to-r from-[#FF6A1A] to-[#FF9A45] hover:opacity-90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-[0.98]"
                          >
                            <Camera className="w-4 h-4" />
                            <span>📸 Snap Camera</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCameraError(null);
                              galleryInputRef.current?.click();
                            }}
                            className="py-3 px-3 rounded-xl bg-white/[0.10] hover:bg-white/[0.18] border border-white/[0.15] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-[0.98]"
                          >
                            <ImageIcon className="w-4 h-4 text-[#FF9A45]" />
                            <span>🖼️ From Gallery</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => setShowFlagGuide(!showFlagGuide)}
                          className="text-white/50 hover:text-white underline text-[10px]"
                        >
                          Enable continuous video in Chrome flags →
                        </button>
                        <button
                          type="button"
                          onClick={() => setCameraError(null)}
                          className="text-white/40 hover:text-white text-[10px]"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {/* GENERIC ERROR CARD */}
                  {cameraError && cameraError !== 'MOBILE_INSECURE_CONTEXT' && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-left flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <span>{cameraError}</span>
                        <button
                          type="button"
                          onClick={() => setCameraError(null)}
                          className="block text-white/50 hover:text-white text-[10px] underline"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    {/* BUTTON LAYOUT FOR MOBILE HTTP LAN */}
                    {(!isSecure || !hasMediaDevices) ? (
                      <>
                        {/* Primary Action on Mobile Wi-Fi: Native Camera Capture */}
                        <GlassButton
                          variant="primary"
                          fullWidth
                          size="lg"
                          onClick={() => photoInputRef.current?.click()}
                          className="py-3.5 shadow-[0_4px_24px_rgba(255,106,26,0.35)]"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Camera className="w-5 h-5 text-white" />
                            <span className="font-bold">
                              {scanningPhoto ? 'Analyzing Ticket QR...' : '📸 Snap Photo to Scan QR'}
                            </span>
                          </div>
                        </GlassButton>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Upload Photo from Gallery */}
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="py-2.5 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#FF9A45]" />
                            <span>Upload from Gallery</span>
                          </button>

                          {/* Secondary Action: Try continuous video */}
                          <button
                            type="button"
                            onClick={startCameraScanner}
                            className="py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] text-white/70 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Video className="w-3.5 h-3.5 text-[#FF9A45]" />
                            <span>Live Stream</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Primary Action on Secure Context / Localhost: Live Video */}
                        <GlassButton
                          variant="primary"
                          fullWidth
                          size="lg"
                          onClick={startCameraScanner}
                          className="py-3.5 shadow-[0_4px_24px_rgba(255,106,26,0.35)]"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Camera className="w-4 h-4 text-white" />
                            <span className="font-bold">Start Live Camera Scanner</span>
                          </div>
                        </GlassButton>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Secondary Action: Snap Photo */}
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            className="py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] text-white/80 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#FF9A45]" />
                            <span>Snap Photo</span>
                          </button>

                          {/* Secondary Action: Upload from Gallery */}
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] text-white/80 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#FF9A45]" />
                            <span>From Gallery</span>
                          </button>
                        </div>
                      </>
                    )}

                    {/* Camera Photo Input (Native Camera Capture) */}
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoScan}
                      className="hidden"
                    />

                    {/* Gallery Photo Input (Opens Photo Library / Files) */}
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoScan}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* Active Camera Overlay Controls */}
              {isScanning && (
                <div className="w-full p-3 bg-black/60 backdrop-blur-sm border-t border-white/[0.10] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Live Video Scanning...</span>
                  </div>

                  <button
                    onClick={stopCameraScanner}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-medium text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Stop Camera</span>
                  </button>
                </div>
              )}
            </div>

            {/* SCAN RESULT BANNER (WITH AUDIO/VIBRATION CONFIRMATION) */}
            {scanResult && (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-3 transition-all ${
                  scanResult.status === 'SUCCESS'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.20)]'
                    : scanResult.status === 'ALREADY_CHECKED_IN'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.20)]'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.20)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {scanResult.status === 'SUCCESS' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    )}
                    <span>
                      {scanResult.status === 'SUCCESS'
                        ? 'ENTRY APPROVED / ADMITTED'
                        : scanResult.status === 'ALREADY_CHECKED_IN'
                        ? 'ALREADY CHECKED IN (DUPLICATE)'
                        : 'CHECK-IN REJECTED'}
                    </span>
                  </div>

                  <button
                    onClick={() => setScanResult(null)}
                    className="text-white/60 hover:text-white text-xs p-1"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-white/80">{scanResult.message}</p>

                {scanResult.ticket && (
                  <div className="pt-2.5 border-t border-current/20 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-white/50 block">Attendee</span>
                      <span className="font-bold text-white text-sm">
                        {scanResult.ticket.attendeeName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/50 block">Tier</span>
                      <span className="font-semibold text-[#FF9A45]">
                        {scanResult.ticket.tierName}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between pt-1 font-mono text-[11px] text-white/60">
                      <span>Pass: {scanResult.ticket.ticketNumber}</span>
                      <span>{new Date(scanResult.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                )}

                {/* Direct 1-Tap Next Scan Quick Action */}
                <div className="pt-2 border-t border-current/20 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScanResult(null);
                      if (!isScanning) {
                        photoInputRef.current?.click();
                      }
                    }}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#FF6A1A] to-[#FF9A45] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Snap Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScanResult(null);
                      galleryInputRef.current?.click();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-white/[0.12] hover:bg-white/[0.20] border border-white/[0.15] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[#FF9A45]" />
                    <span>From Gallery</span>
                  </button>
                </div>
              </div>
            )}

            {/* MANUAL CODE ENTRY / PASTE FALLBACK (EXPANDABLE) */}
            <div className="pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="w-full text-center text-xs text-white/50 hover:text-white py-1 flex items-center justify-center gap-1.5 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-[#FF9A45]" />
                <span>{showManualInput ? 'Hide Manual Code Input' : 'Or Type Ticket Number / Paste QR Code'}</span>
              </button>

              {showManualInput && (
                <form onSubmit={handleManualScanSubmit} className="pt-3 space-y-2">
                  <GlassInput
                    placeholder="e.g. TKT-9J8A-42 or FF1.<ticketId>..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    required
                  />
                  <GlassButton type="submit" variant="secondary" fullWidth size="sm">
                    Verify & Admit Manually
                  </GlassButton>
                </form>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* MODAL: TICKET QR GENERATED FOR ADMIN TO DISPATCH */}
      {confirmedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto text-center">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ticket Generated for Admin</span>
              </span>
              <button onClick={() => setConfirmedModal(null)} className="text-white/60 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">{confirmedModal.booking.customer.fullName}</h3>
              <p className="text-xs text-white/50">Mobile: {confirmedModal.booking.customer.phone}</p>
              <p className="text-xs text-[#FF9A45] font-semibold">
                Ref: {confirmedModal.booking.bookingReference}
              </p>
            </div>

            {/* Generated Official Pass Card or QR Code preview */}
            <div className="p-2 bg-black/40 rounded-2xl border border-white/[0.10] shadow-xl inline-block mx-auto max-w-[280px]">
              <img
                src={confirmedModal.passCardUrls?.[0] || confirmedModal.qrDataUrls[0]}
                alt="Ticket Pass Card"
                className="w-full h-auto rounded-xl object-contain shadow-md"
              />
            </div>

            <p className="text-xs text-white/70">
              Pass Number: <span className="font-mono font-bold text-white">{confirmedModal.tickets[0]?.ticketNumber}</span>
            </p>

            {/* DIRECT PASS DISPATCH VIA WHATSAPP */}
            <div className="pt-2 space-y-2">
              {/* PRIMARY: Direct WhatsApp chat redirect with preloaded text & link */}
              <a
                href={buildWhatsAppTicketSendUrl(confirmedModal.booking, confirmedModal.tickets[0])}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <GlassButton
                  variant="primary"
                  fullWidth
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-500 py-3.5 shadow-[0_4px_24px_rgba(16,185,129,0.30)] text-white"
                >
                  <div className="flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4 text-white" />
                    <span className="font-bold">Send Ticket on WhatsApp</span>
                  </div>
                </GlassButton>
              </a>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Copy Image to Clipboard */}
                <button
                  type="button"
                  onClick={() =>
                    handleCopyPassImage(
                      confirmedModal.passCardUrls?.[0] || confirmedModal.qrDataUrls[0]
                    )
                  }
                  className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.10] text-white flex items-center justify-center gap-1.5 transition-colors font-medium"
                >
                  {copiedPhoto ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPhoto ? 'Photo Copied!' : 'Copy Photo'}</span>
                </button>

                {/* Download Pass Image */}
                <a
                  href={confirmedModal.passCardUrls?.[0] || confirmedModal.qrDataUrls[0]}
                  download={`Firefly-Pass-${confirmedModal.tickets[0]?.ticketNumber}.png`}
                  className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.10] text-white flex items-center justify-center gap-1.5 transition-colors font-medium text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save Photo</span>
                </a>
              </div>

              <GlassButton variant="secondary" fullWidth size="sm" onClick={() => setConfirmedModal(null)}>
                Close
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* MODAL: EDIT EXISTING EVENT */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#FF9A45]" />
                <h3 className="text-base font-bold text-white">Edit Event Details</h3>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEvent(null);
                }}
                className="text-white/60 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedEvent} noValidate className="space-y-4 text-xs">
              {/* Photo Upload & Preview with Drag & Drop */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white/70 uppercase">Banner Poster</label>
                  <span className="text-[10px] text-white/40">Drag & Drop or Click to Browse</span>
                </div>

                <div
                  onDragOver={handleEditDragOver}
                  onDragEnter={handleEditDragEnter}
                  onDragLeave={handleEditDragLeave}
                  onDrop={handleEditDrop}
                  onClick={() => editFileInputRef.current?.click()}
                  className={`relative h-44 rounded-2xl overflow-hidden border-2 border-dashed cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center ${
                    isEditDragging
                      ? 'border-[#FF6A1A] bg-[#FF6A1A]/15 ring-4 ring-[#FF6A1A]/30 scale-[1.01]'
                      : (editBannerPreview || editForm.posterUrl)
                      ? 'border-white/[0.15] bg-neutral-900 hover:border-[#FF6A1A]/60'
                      : 'border-white/[0.20] hover:border-[#FF6A1A]/60 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  {(editBannerPreview || editForm.posterUrl) ? (
                    <>
                      <img
                        src={editBannerPreview || editForm.posterUrl}
                        alt="Banner Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
                        <Upload className="w-5 h-5 text-[#FF9A45]" />
                        <span className="text-xs font-semibold">Drop new poster or click to change</span>
                        <span className="text-[10px] text-white/60">PNG, JPG, WebP up to 10MB</span>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center space-y-2 pointer-events-none">
                      <div
                        className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center transition-transform ${
                          isEditDragging
                            ? 'bg-[#FF6A1A] text-white scale-110 shadow-lg shadow-[#FF6A1A]/40'
                            : 'bg-white/[0.06] text-[#FF9A45] group-hover:scale-105'
                        }`}
                      >
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-white">
                          {isEditDragging ? 'Drop poster image here!' : 'Drag & drop event poster here'}
                        </p>
                        <p className="text-[11px] text-white/50">
                          or <span className="text-[#FF9A45] underline underline-offset-2">browse files</span>
                        </p>
                      </div>
                      <span className="inline-block text-[10px] font-mono text-white/35">
                        JPEG • PNG • WebP (Auto-optimized)
                      </span>
                    </div>
                  )}

                  {uploadingEditImage && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center gap-2 text-xs text-white">
                      <div className="w-4 h-4 border-2 border-[#FF6A1A] border-t-transparent rounded-full animate-spin" />
                      <span>Optimizing image...</span>
                    </div>
                  )}
                </div>

                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleEditBannerUpload}
                  className="hidden"
                />
              </div>

              {/* Title & Tagline */}
              <GlassInput
                label="Event Title"
                placeholder="e.g. SOLARIS 2026"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
              />

              <GlassInput
                label="Tagline"
                placeholder="Short captivating headline"
                value={editForm.tagline}
                onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
              />

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 uppercase">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-xs text-white focus:outline-none focus:border-[#FF6A1A]"
                >
                  <option value="MUSIC_FESTIVAL" className="bg-[#181818] text-white">Music Festival</option>
                  <option value="EXHIBITION" className="bg-[#181818] text-white">Exhibition</option>
                  <option value="PARTY" className="bg-[#181818] text-white">Party</option>
                  <option value="CONFERENCE" className="bg-[#181818] text-white">Conference</option>
                  <option value="PERFORMANCE" className="bg-[#181818] text-white">Performance</option>
                  <option value="OTHER" className="bg-[#181818] text-white">Other</option>
                </select>
              </div>

              {/* Timings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FlexibleDateTimeInput
                  label="Start Date & Time"
                  value={editForm.startsAt}
                  onChange={(val) => setEditForm({ ...editForm, startsAt: val })}
                  placeholder="e.g. 21/11/2026, 07:00 PM"
                  showPresets={true}
                  presetType="start"
                  required
                />
                <FlexibleDateTimeInput
                  label="End Date & Time"
                  value={editForm.endsAt}
                  onChange={(val) => setEditForm({ ...editForm, endsAt: val })}
                  placeholder="e.g. 21/11/2026, 10:00 PM"
                  showPresets={true}
                  presetType="end"
                  required
                />
              </div>

              {/* Venue & Google Maps Pin */}
              <div className="grid grid-cols-2 gap-2">
                <GlassInput
                  label="Venue Name"
                  placeholder="e.g. Main Auditorium / Convention Centre"
                  value={editForm.venueName}
                  onChange={(e) => setEditForm({ ...editForm, venueName: e.target.value })}
                  required
                />
                <GlassInput
                  label="City"
                  placeholder="e.g. Mumbai, Bengaluru, Goa"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  required
                />
              </div>

              <GlassInput
                label="Venue Address"
                placeholder="Full address line"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />

              <GlassInput
                label="Google Maps Location Pin URL"
                placeholder="https://maps.google.com/?q=..."
                value={editForm.googleMapsUrl}
                onChange={(e) => setEditForm({ ...editForm, googleMapsUrl: e.target.value })}
                helperText="Redirects attendees directly to Google Maps navigation"
              />

              {/* Max Tickets per Booking / Transaction */}
              <GlassInput
                label="Max Tickets Per Transaction / Booking"
                type="number"
                min="1"
                max="50"
                placeholder="e.g. 6"
                value={editForm.maxTicketsPerBooking}
                onChange={(e) => setEditForm({ ...editForm, maxTicketsPerBooking: e.target.value })}
                helperText="Maximum total tickets a customer can book in a single transaction (default: 6)"
                required
              />

              {/* Event UPI Payment & WhatsApp Redirection Config */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
                <div className="flex items-center gap-2 text-white font-semibold text-xs">
                  <QrCode className="w-4 h-4 text-[#FF9A45]" />
                  <span>UPI Payment & WhatsApp Redirection</span>
                </div>
                <p className="text-[11px] text-white/50">
                  Configure the UPI destination and WhatsApp contact for this event. Customer payment screenshots and confirmation requests will be sent directly to this WhatsApp number.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <GlassInput
                    label="Event UPI ID / VPA"
                    placeholder="e.g. organiser@okhdfcbank or business@upi"
                    value={editForm.upiId}
                    onChange={(e) => setEditForm({ ...editForm, upiId: e.target.value })}
                    helperText="Leave blank for system default UPI"
                  />
                  <GlassInput
                    label="Payee / Merchant Name"
                    placeholder="e.g. Event Productions / Brand Name"
                    value={editForm.upiPayeeName}
                    onChange={(e) => setEditForm({ ...editForm, upiPayeeName: e.target.value })}
                    helperText="Name displayed in UPI payment apps"
                  />
                </div>
                <GlassInput
                  label="Organiser WhatsApp Number"
                  placeholder="e.g. 9876543210 or +919876543210"
                  value={editForm.whatsappPhone}
                  onChange={(e) => setEditForm({ ...editForm, whatsappPhone: e.target.value })}
                  helperText="Customers will be redirected to this WhatsApp chat with preloaded order details to send payment proof"
                />
              </div>

              {/* Dynamic Ticket Tiers Section */}
              <div className="pt-2 border-t border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white uppercase tracking-wider block">
                    Ticket Tiers & Rates
                  </span>
                  <button
                    type="button"
                    onClick={handleAddTierToEdit}
                    className="text-[#FF9A45] hover:text-white flex items-center gap-1 font-medium text-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Tier</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editForm.tiers.map((tier, idx) => (
                    <div
                      key={tier.id || idx}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40 uppercase font-semibold">
                          Tier #{idx + 1}
                        </span>
                        {editForm.tiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTierFromEdit(idx)}
                            className="text-white/40 hover:text-red-400 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <GlassInput
                          label="Tier Name"
                          value={tier.name}
                          onChange={(e) => handleEditTierField(idx, 'name', e.target.value)}
                          required
                        />
                        <GlassInput
                          label="Rate (₹)"
                          type="number"
                          value={tier.priceInRupees}
                          onChange={(e) => handleEditTierField(idx, 'priceInRupees', e.target.value)}
                          required
                        />
                        <GlassInput
                          label="Capacity"
                          type="number"
                          value={tier.capacity}
                          onChange={(e) => handleEditTierField(idx, 'capacity', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 uppercase">Event Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Detailed event information..."
                  className="w-full rounded-xl bg-white/[0.05] border border-white/[0.10] p-2.5 text-xs text-white focus:outline-none focus:border-[#FF6A1A]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <GlassButton
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEvent(null);
                  }}
                >
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary" fullWidth>
                  Save Changes
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* MODAL: ADD NEW EVENT */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white">Add New Event</h3>
              <button onClick={() => setShowAddEventModal(false)} className="text-white/60 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} noValidate className="space-y-4 text-xs">
              {/* Photo Upload with Drag & Drop */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white/70 uppercase">Banner Poster</label>
                  <span className="text-[10px] text-white/40">Drag & Drop or Click to Browse</span>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative h-44 rounded-2xl overflow-hidden border-2 border-dashed cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center ${
                    isDragging
                      ? 'border-[#FF6A1A] bg-[#FF6A1A]/15 ring-4 ring-[#FF6A1A]/30 scale-[1.01]'
                      : bannerPreview
                      ? 'border-white/[0.15] bg-neutral-900 hover:border-[#FF6A1A]/60'
                      : 'border-white/[0.20] hover:border-[#FF6A1A]/60 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  {bannerPreview ? (
                    <>
                      <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
                        <Upload className="w-5 h-5 text-[#FF9A45]" />
                        <span className="text-xs font-semibold">Drop new poster or click to change</span>
                        <span className="text-[10px] text-white/60">PNG, JPG, WebP up to 10MB</span>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center space-y-2 pointer-events-none">
                      <div
                        className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center transition-transform ${
                          isDragging
                            ? 'bg-[#FF6A1A] text-white scale-110 shadow-lg shadow-[#FF6A1A]/40'
                            : 'bg-white/[0.06] text-[#FF9A45] group-hover:scale-105'
                        }`}
                      >
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-white">
                          {isDragging ? 'Drop poster image here!' : 'Drag & drop event poster here'}
                        </p>
                        <p className="text-[11px] text-white/50">
                          or <span className="text-[#FF9A45] underline underline-offset-2">browse files</span>
                        </p>
                      </div>
                      <span className="inline-block text-[10px] font-mono text-white/35">
                        JPEG • PNG • WebP (Auto-optimized)
                      </span>
                    </div>
                  )}

                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center gap-2 text-xs text-white">
                      <div className="w-4 h-4 border-2 border-[#FF6A1A] border-t-transparent rounded-full animate-spin" />
                      <span>Optimizing image...</span>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleBannerUpload}
                  className="hidden"
                />
              </div>

              {/* Title & Tagline */}
              <GlassInput
                label="Event Title"
                placeholder="e.g. Annual Music Fest / Tech Summit"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                required
              />

              <GlassInput
                label="Tagline"
                placeholder="Short captivating tagline"
                value={newEvent.tagline}
                onChange={(e) => setNewEvent({ ...newEvent, tagline: e.target.value })}
              />

              {/* Timings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FlexibleDateTimeInput
                  label="Start Date & Time"
                  value={newEvent.startsAt}
                  onChange={(val) => setNewEvent({ ...newEvent, startsAt: val })}
                  placeholder="e.g. 21/11/2026, 07:00 PM"
                  showPresets={true}
                  presetType="start"
                  required
                />
                <FlexibleDateTimeInput
                  label="End Date & Time"
                  value={newEvent.endsAt}
                  onChange={(val) => setNewEvent({ ...newEvent, endsAt: val })}
                  placeholder="e.g. 21/11/2026, 10:00 PM"
                  showPresets={true}
                  presetType="end"
                  required
                />
              </div>

              {/* Venue & Google Maps Pin */}
              <div className="grid grid-cols-2 gap-2">
                <GlassInput
                  label="Venue Name"
                  placeholder="e.g. Main Auditorium / Convention Centre"
                  value={newEvent.venueName}
                  onChange={(e) => setNewEvent({ ...newEvent, venueName: e.target.value })}
                  required
                />
                <GlassInput
                  label="City"
                  placeholder="e.g. Mumbai, Bengaluru, Goa"
                  value={newEvent.city}
                  onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
                  required
                />
              </div>

              <GlassInput
                label="Google Maps Location Pin URL"
                placeholder="https://maps.google.com/?q=..."
                value={newEvent.googleMapsUrl}
                onChange={(e) => setNewEvent({ ...newEvent, googleMapsUrl: e.target.value })}
                helperText="Redirects customer directly to Google Maps pin"
              />

              {/* Max Tickets per Booking / Transaction */}
              <GlassInput
                label="Max Tickets Per Transaction / Booking"
                type="number"
                min="1"
                max="50"
                placeholder="e.g. 6"
                value={newEvent.maxTicketsPerBooking}
                onChange={(e) => setNewEvent({ ...newEvent, maxTicketsPerBooking: e.target.value })}
                helperText="Maximum total tickets a customer can book in a single transaction (default: 6)"
                required
              />

              {/* Event UPI Payment & WhatsApp Redirection Config */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
                <div className="flex items-center gap-2 text-white font-semibold text-xs">
                  <QrCode className="w-4 h-4 text-[#FF9A45]" />
                  <span>UPI Payment & WhatsApp Redirection</span>
                </div>
                <p className="text-[11px] text-white/50">
                  Configure the UPI destination and WhatsApp contact for this event. Customer payment screenshots and confirmation requests will be sent directly to this WhatsApp number.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <GlassInput
                    label="Event UPI ID / VPA"
                    placeholder="e.g. organiser@okhdfcbank or business@upi"
                    value={newEvent.upiId}
                    onChange={(e) => setNewEvent({ ...newEvent, upiId: e.target.value })}
                    helperText="Leave blank for system default UPI"
                  />
                  <GlassInput
                    label="Payee / Merchant Name"
                    placeholder="e.g. Event Productions / Brand Name"
                    value={newEvent.upiPayeeName}
                    onChange={(e) => setNewEvent({ ...newEvent, upiPayeeName: e.target.value })}
                    helperText="Name displayed in UPI payment apps"
                  />
                </div>
                <GlassInput
                  label="Organiser WhatsApp Number"
                  placeholder="e.g. 9876543210 or +919876543210"
                  value={newEvent.whatsappPhone}
                  onChange={(e) => setNewEvent({ ...newEvent, whatsappPhone: e.target.value })}
                  helperText="Customers will be redirected to this WhatsApp chat with preloaded order details to send payment proof"
                />
              </div>

              {/* Ticket Tiers Rates */}
              <div className="pt-2 border-t border-white/[0.08] space-y-2">
                <span className="font-semibold text-white uppercase tracking-wider block">
                  Ticket Tiers & Rates
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <GlassInput
                    label="Tier 1 Name"
                    placeholder="e.g. General Admission"
                    value={newEvent.tier1Name}
                    onChange={(e) => setNewEvent({ ...newEvent, tier1Name: e.target.value })}
                  />
                  <GlassInput
                    label="Rate (₹)"
                    type="number"
                    placeholder="e.g. 999"
                    value={newEvent.tier1Price}
                    onChange={(e) => setNewEvent({ ...newEvent, tier1Price: e.target.value })}
                  />
                  <GlassInput
                    label="Capacity"
                    type="number"
                    placeholder="e.g. 500"
                    value={newEvent.tier1Capacity}
                    onChange={(e) => setNewEvent({ ...newEvent, tier1Capacity: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <GlassInput
                    label="Tier 2 Name"
                    placeholder="e.g. VIP Pass (Optional)"
                    value={newEvent.tier2Name}
                    onChange={(e) => setNewEvent({ ...newEvent, tier2Name: e.target.value })}
                  />
                  <GlassInput
                    label="Rate (₹)"
                    type="number"
                    placeholder="e.g. 2499"
                    value={newEvent.tier2Price}
                    onChange={(e) => setNewEvent({ ...newEvent, tier2Price: e.target.value })}
                  />
                  <GlassInput
                    label="Capacity"
                    type="number"
                    placeholder="e.g. 100"
                    value={newEvent.tier2Capacity}
                    onChange={(e) => setNewEvent({ ...newEvent, tier2Capacity: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 uppercase">Description</label>
                <textarea
                  rows={2}
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Full event details..."
                  className="w-full rounded-xl bg-white/[0.05] border border-white/[0.10] p-2.5 text-xs text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <GlassButton type="button" variant="secondary" fullWidth onClick={() => setShowAddEventModal(false)}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary" fullWidth>
                  Publish Event
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
