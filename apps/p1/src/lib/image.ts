import QRCode from 'qrcode';

/**
 * Client-side Canvas Image Compressor
 * Resizes large photo uploads to ~1200px Web-optimized JPEG Data URLs
 */
export async function compressImageToDataUrl(
  file: File,
  maxWidth = 1000,
  maxHeight = 650,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generates an official, high-resolution Digital Ticket Pass Card Image (600x840 PNG)
 * Suitable for sharing directly via WhatsApp, saving to photos, or printing
 */
export async function generateTicketCardDataUrl(params: {
  eventTitle: string;
  attendeeName: string;
  tierName: string;
  ticketNumber: string;
  venueName: string;
  dateStr: string;
  qrPayload: string;
}): Promise<string> {
  const { eventTitle, attendeeName, tierName, ticketNumber, venueName, dateStr, qrPayload } = params;

  // Generate crisp QR code
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 300,
    margin: 2,
    color: { dark: '#080808', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  });

  if (typeof document === 'undefined') return qrDataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 840;
  const ctx = canvas.getContext('2d');
  if (!ctx) return qrDataUrl;

  // Background
  ctx.fillStyle = '#0C0C0C';
  ctx.fillRect(0, 0, 600, 840);

  // Top Liquid Glass Accent Gradient
  const grad = ctx.createLinearGradient(0, 0, 600, 0);
  grad.addColorStop(0, '#FF6A1A');
  grad.addColorStop(1, '#FF9A45');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 10);

  // Outer Border
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 598, 838);

  // Brand Header
  ctx.fillStyle = '#FF9A45';
  ctx.font = 'bold 13px -apple-system, sans-serif';
  ctx.fillText('FIREFLY • OFFICIAL ENTRY PASS', 40, 52);

  // Event Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px -apple-system, sans-serif';
  const cleanTitle = eventTitle.length > 30 ? eventTitle.substring(0, 28) + '...' : eventTitle;
  ctx.fillText(cleanTitle, 40, 94);

  // Venue & Schedule
  ctx.fillStyle = '#8E8E93';
  ctx.font = '13px -apple-system, sans-serif';
  ctx.fillText(`${venueName} • ${dateStr}`, 40, 124);

  // Divider line
  ctx.strokeStyle = '#1F1F1F';
  ctx.beginPath();
  ctx.moveTo(40, 148);
  ctx.lineTo(560, 148);
  ctx.stroke();

  // Attendee Block
  ctx.fillStyle = '#636366';
  ctx.font = 'bold 11px -apple-system, sans-serif';
  ctx.fillText('ATTENDEE NAME', 40, 180);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px -apple-system, sans-serif';
  ctx.fillText(attendeeName, 40, 208);

  // Ticket Tier Block
  ctx.fillStyle = '#636366';
  ctx.font = 'bold 11px -apple-system, sans-serif';
  ctx.fillText('TICKET TIER', 340, 180);

  ctx.fillStyle = '#FF9A45';
  ctx.font = 'bold 18px -apple-system, sans-serif';
  ctx.fillText(tierName, 340, 208);

  // QR Code White Frame Container
  const qx = 150, qy = 250, qw = 300, qh = 300;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(qx, qy, qw, qh, 20);
  } else {
    ctx.rect(qx, qy, qw, qh);
  }
  ctx.fill();

  // Draw QR Image onto canvas
  const qrImg = new Image();
  await new Promise((res) => {
    qrImg.onload = res;
    qrImg.src = qrDataUrl;
  });
  ctx.drawImage(qrImg, qx + 10, qy + 10, qw - 20, qh - 20);

  // Ticket Number & Instructions
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(ticketNumber, 300, 590);

  ctx.fillStyle = '#8E8E93';
  ctx.font = '12px -apple-system, sans-serif';
  ctx.fillText('Present this QR code for gate entrance scanning', 300, 620);

  // Security Verification Box
  ctx.fillStyle = '#141414';
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(40, 660, 520, 70, 12);
  } else {
    ctx.rect(40, 660, 520, 70);
  }
  ctx.fill();

  ctx.fillStyle = '#FF9A45';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('HMAC-SHA256 ENCRYPTED • UNIQUE SECURITY TOKEN', 300, 690);

  ctx.fillStyle = '#636366';
  ctx.font = '10px monospace';
  ctx.fillText('SINGLE-DEVICE VERIFICATION • ADMISSION VOID IF DUPLICATED', 300, 712);

  ctx.textAlign = 'left';
  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Shares QR ticket image directly to WhatsApp via the Web Share API Level 2 (files support)
 * Supported in modern mobile browsers (iOS Safari and Android Chrome).
 * Falls back to Image Clipboard copy & WhatsApp click-to-chat.
 */
export async function shareTicketImageDirectly(params: {
  imageDataUrl: string;
  ticketNumber: string;
  captionText: string;
  targetPhone?: string;
}): Promise<'SHARED_VIA_SYSTEM' | 'COPIED_TO_CLIPBOARD' | 'DOWNLOADED'> {
  const { imageDataUrl, ticketNumber, captionText, targetPhone } = params;

  try {
    const res = await fetch(imageDataUrl);
    const blob = await res.blob();
    const file = new File([blob], `Firefly-Pass-${ticketNumber}.png`, { type: 'image/png' });

    // 1. Mobile Web Share API with real image file
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Firefly Ticket Pass - ${ticketNumber}`,
            text: captionText,
          });
          return 'SHARED_VIA_SYSTEM';
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return 'SHARED_VIA_SYSTEM';
          }
          console.warn('Navigator share error', err);
        }
      }
    }

    // 2. Clipboard API: Copy image directly to system clipboard
    let copied = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        copied = true;
      } catch (e) {
        console.warn('Clipboard write image failed', e);
      }
    }

    // 3. Download the PNG file
    const a = document.createElement('a');
    a.href = imageDataUrl;
    a.download = `Firefly-Pass-${ticketNumber}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 4. Open WhatsApp
    if (targetPhone) {
      const cleanPhone = targetPhone.replace(/\D/g, '');
      const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const note = copied ? '\n\n(Ticket Pass Image copied to your clipboard! Simply paste in chat.)' : '';
      const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(captionText + note)}`;
      window.open(waUrl, '_blank');
    }

    return copied ? 'COPIED_TO_CLIPBOARD' : 'DOWNLOADED';
  } catch (err) {
    console.error('Share image failed', err);
    return 'DOWNLOADED';
  }
}
