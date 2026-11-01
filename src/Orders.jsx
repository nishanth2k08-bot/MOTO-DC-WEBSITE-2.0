import React, { useEffect, useRef, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  Package,
  MapPin,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  Download,
  Ban,
  ShieldCheck,
  Search,
  X,
  Phone,
  Radio,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { getDeliveryPin } from './deliveryPinUtil';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './orders.css';

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const steps = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const labels = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  packed: 'Packed & Ready',
  shipped: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  returned: 'Returned',
  replaced: 'Replacement Completed',
  cancelled: 'Cancelled',
};

const formatDate = (value) => {
  try {
    const d = value?.toDate ? value.toDate() : value ? new Date(value) : null;
    return d && !Number.isNaN(d.getTime())
      ? d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Recently';
  } catch {
    return 'Recently';
  }
};

const STATUS_TARGETS = {
  placed: 0.052,
  confirmed: 0.16,
  packed: 0.27,
  shipped: 0.508,
  out_for_delivery: 0.747,
  delivered: 0.957,
  returned: 0.508,
  replaced: 0.747,
  cancelled: 0.052,
};

const STATUS_META = {
  placed: {
    badge: 'processing',
    title: 'Order Placed',
    stageText: 'Station 1 of 5',
    phase: 'Hub Staging',
    speed: 'Stationary',
    eta: '3–4 Business Days',
    location: 'Central Fulfillment Hub, Bangalore',
  },
  confirmed: {
    badge: 'processing',
    title: 'Order Confirmed',
    stageText: 'Station 1.5 of 5',
    phase: 'Inspection & Verification',
    speed: 'Bay 4',
    eta: '3–4 Business Days',
    location: 'Quality Inspection Bay',
  },
  packed: {
    badge: 'processing',
    title: 'Packed & Staged',
    stageText: 'Station 2 of 5',
    phase: 'Ready for Carrier Handover',
    speed: 'Dock B',
    eta: '2–3 Business Days',
    location: 'Outbound Logistics Terminal',
  },
  shipped: {
    badge: 'in_transit',
    title: 'In Transit',
    stageText: 'Station 3 of 5',
    phase: 'Express Highway NH-44',
    speed: '68 km/h',
    eta: '1–2 Business Days',
    location: 'Highway Corridor · Regional Transit',
  },
  out_for_delivery: {
    badge: 'in_transit',
    title: 'Out for Delivery',
    stageText: 'Station 4 of 5',
    phase: 'Final Mile Courier Dispatch',
    speed: '32 km/h',
    eta: 'Arriving Today',
    location: 'Local Hub ➔ Delivery Route',
  },
  delivered: {
    badge: 'delivered',
    title: 'Delivered',
    stageText: 'Station 5 of 5',
    phase: 'Completed at Doorstep',
    speed: 'Parked',
    eta: 'Delivered',
    location: 'Customer Address',
  },
  returned: {
    badge: 'processing',
    title: 'Return in Transit',
    stageText: 'Reverse Stream',
    phase: 'Returning to Inspection Facility',
    speed: '45 km/h',
    eta: '2–3 Days',
    location: 'Return Processing Facility',
  },
  replaced: {
    badge: 'in_transit',
    title: 'Replacement Shipped',
    stageText: 'Priority Transit',
    phase: 'Replacement Transit',
    speed: '58 km/h',
    eta: '1–2 Days',
    location: 'Priority Transit Hub',
  },
  cancelled: {
    badge: 'processing',
    title: 'Order Cancelled',
    stageText: 'Terminated',
    phase: 'Halted at Origin',
    speed: '0 km/h',
    eta: 'Cancelled',
    location: 'Central Depot (Discontinued)',
  },
};

const safeText = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();

async function downloadInvoice(o) {
  try {
    toast.loading('Generating colorful Tax Invoice PDF...', { id: 'pdf-toast' });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const orderNum = safeText(o.orderId || o.id || 'ORDER');
    const formattedDate = formatDate(o.createdAt);

    // Draw borders & motorsport accents on any page
    const drawPageChrome = (doc, isContinuation = false) => {
      // Outer Double Border
      doc.setDrawColor(203, 213, 225); // Slate 300
      doc.setLineWidth(0.75);
      doc.rect(7, 7, 196, 283);

      doc.setDrawColor(241, 245, 249); // Slate 100
      doc.setLineWidth(0.35);
      doc.rect(9, 9, 192, 279);

      // Top Motorsport racing band
      doc.setFillColor(255, 49, 87); // Crimson Red #ff3157
      doc.rect(9, 9, 192, 3.5, 'F');
      doc.setFillColor(15, 23, 42); // Midnight Carbon #0f172a
      doc.rect(9, 12.5, 192, 1.2, 'F');

      // Bottom Motorsport racing band
      doc.setFillColor(15, 23, 42);
      doc.rect(9, 283.3, 192, 1.2, 'F');
      doc.setFillColor(255, 49, 87);
      doc.rect(9, 284.5, 192, 3.5, 'F');

      if (isContinuation) {
        // Compact continuation header
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(12, 16, 186, 12, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text('MOTO', 16, 23.5);
        doc.setTextColor(255, 49, 87);
        doc.text('DC', 31, 23.5);
        doc.setFontSize(8);
        doc.setTextColor(203, 213, 225);
        doc.text('TAX INVOICE - CONTINUATION SHEET', 40, 23.5);
        doc.setTextColor(255, 255, 255);
        doc.text(`Order #${orderNum}`, 192, 23.5, { align: 'right' });
      }
    };

    // Draw initial page chrome
    drawPageChrome(pdf, false);

    // --- 1. LUXURY HEADER BANNER ---
    pdf.setFillColor(15, 23, 42); // #0f172a
    pdf.roundedRect(12, 16.5, 186, 31, 2, 2, 'F');

    // MOTO DC Brand
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    pdf.text('MOTO', 18, 27.5);
    pdf.setTextColor(255, 49, 87);
    pdf.text('DC', 45, 27.5);

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(148, 163, 184); // Slate 400
    pdf.text('GENUINE AUTOMOTIVE & MOTORCYCLE SPARE PARTS', 18, 33.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139); // Slate 500
    pdf.text('Central Logistics Hub: Beach Road, Karaikal, Puducherry - 609602 | Support: +91 98421 04829', 18, 38.5);
    pdf.text('GSTIN: 34AABCM9120K1ZX | CIN: U50400PY2024PTC008912 | Web: motodc-official.vercel.app', 18, 43);

    // Glowing Tax Invoice Badge
    pdf.setFillColor(255, 49, 87);
    pdf.roundedRect(142, 20.5, 50, 7.5, 1.5, 1.5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('ORIGINAL TAX INVOICE', 167, 25.5, { align: 'center' });

    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(203, 213, 225);
    pdf.text('Place of Supply: Puducherry (34)', 190, 33, { align: 'right' });
    pdf.text('Reverse Charge: Not Applicable (N)', 190, 37.5, { align: 'right' });
    pdf.text('Original for Recipient', 190, 42, { align: 'right' });

    // --- 2. QUICK METADATA BAR ---
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(12, 50, 186, 12, 1.5, 1.5, 'FD');

    // Order ID
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('INVOICE / ORDER NO.', 16, 54.5);
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text('#' + orderNum, 16, 59.5);

    // Date
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('ORDER DATE & TIME', 68, 54.5);
    pdf.setFontSize(7.8);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formattedDate, 68, 59.5);

    // Payment Method
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('PAYMENT METHOD', 118, 54.5);
    pdf.setFontSize(7.8);
    pdf.setTextColor(15, 23, 42);
    const isCod = o.paymentMethod === 'cod';
    pdf.text(isCod ? 'Cash on Delivery (COD)' : 'Prepaid (Razorpay / UPI)', 118, 59.5);

    // Payment Status Pill
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('PAYMENT STATUS', 166, 54.5);
    const isPaid = !isCod || String(o.paymentStatus || '').toLowerCase() === 'paid';
    if (isPaid) {
      pdf.setFillColor(220, 252, 231); // Green 100
      pdf.roundedRect(165, 55.8, 28, 4.8, 1, 1, 'F');
      pdf.setTextColor(21, 128, 61); // Green 700
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.8);
      pdf.text('PAID (VERIFIED)', 179, 59.3, { align: 'center' });
    } else {
      pdf.setFillColor(254, 243, 199); // Amber 100
      pdf.roundedRect(165, 55.8, 28, 4.8, 1, 1, 'F');
      pdf.setTextColor(180, 83, 9); // Amber 700
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.8);
      pdf.text('COD PENDING', 179, 59.3, { align: 'center' });
    }

    // --- 3. SPLIT INFO CARDS ---
    // Left: BILL TO / SHIP TO
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(12, 64.5, 90, 33, 1.5, 1.5, 'FD');
    pdf.setFillColor(255, 49, 87); // Red top stripe
    pdf.rect(12, 64.5, 90, 1.8, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text('BILL TO / RECIPIENT', 16, 70);

    const custName = safeText(o.customer?.name || o.shipping?.name || 'Valued Customer');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(custName, 16, 75);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(71, 85, 105);
    const phone = safeText(o.customer?.phone || o.shipping?.phone || '');
    const email = safeText(o.customer?.email || '');
    pdf.text([phone ? `Mobile: +91 ${phone}` : '', email].filter(Boolean).join(' | ') || 'Customer Verified', 16, 79.5);

    const address = [o.shipping?.address, o.shipping?.city, o.shipping?.state, o.shipping?.pincode]
      .filter(Boolean)
      .join(', ');
    const wrappedAddr = pdf.splitTextToSize(address || 'Central Delivery Address', 82);
    pdf.text(wrappedAddr.slice(0, 2), 16, 84);

    // Right: DISPATCH & SECURITY PIN
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(106, 64.5, 92, 33, 1.5, 1.5, 'FD');
    pdf.setFillColor(15, 23, 42); // Dark top stripe
    pdf.rect(106, 64.5, 92, 1.8, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text('DISPATCH & SECURITY CREDENTIALS', 110, 70);

    // Handover PIN Box
    pdf.setFillColor(239, 246, 255); // Blue 50
    pdf.setDrawColor(191, 219, 254); // Blue 200
    pdf.roundedRect(110, 72.5, 84, 11, 1.2, 1.2, 'FD');

    const pin = getDeliveryPin ? getDeliveryPin(o) : '3842';
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(30, 64, 175);
    pdf.text('DOORSTEP HANDOVER PIN', 114, 76.5);
    pdf.setFontSize(10.5);
    pdf.setTextColor(29, 78, 216);
    pdf.text(String(pin || '3842'), 188, 80.5, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.8);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Logistics Network: MotoDC Express 2-Wheeler Fleet', 110, 88);
    pdf.text('Fulfillment Hub: Karaikal Central Depot (PY-02)', 110, 92.5);

    // --- 4. ITEMS TABLE ---
    const drawTableHeader = (y) => {
      pdf.setFillColor(15, 23, 42);
      pdf.roundedRect(12, y, 186, 7.5, 1, 1, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.2);
      pdf.setTextColor(255, 255, 255);
      pdf.text('#', 16, y + 5);
      pdf.text('ITEM DESCRIPTION & SPECIFICATION', 26, y + 5);
      pdf.text('HSN', 108, y + 5);
      pdf.text('QTY', 130, y + 5, { align: 'center' });
      pdf.text('RATE (Rs.)', 160, y + 5, { align: 'right' });
      pdf.text('TOTAL (Rs.)', 194, y + 5, { align: 'right' });
    };

    let tableY = 100.5;
    drawTableHeader(tableY);
    tableY += 8;

    const items = o.items || [];
    items.forEach((item, idx) => {
      const wrapped = pdf.splitTextToSize(safeText(item.name || 'Automotive Spare Part'), 78);
      const rowH = Math.max(7, wrapped.length * 4.2 + 2);

      // Check page break
      if (tableY + rowH > 220) {
        pdf.addPage();
        drawPageChrome(pdf, true);
        tableY = 32;
        drawTableHeader(tableY);
        tableY += 8;
      }

      if (idx % 2 === 1) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(12, tableY, 186, rowH, 'F');
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.2);
      pdf.setTextColor(71, 85, 105);
      pdf.text(String(idx + 1), 16, tableY + 4.5);

      pdf.setTextColor(15, 23, 42);
      pdf.text(wrapped, 26, tableY + 4.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(safeText(item.hsn || '8708'), 108, tableY + 4.5);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(item.qty || 1), 130, tableY + 4.5, { align: 'center' });

      const price = Number(item.price || 0);
      const qty = Number(item.qty || 1);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Rs. ' + price.toLocaleString('en-IN'), 160, tableY + 4.5, { align: 'right' });

      pdf.setFont('helvetica', 'bold');
      pdf.text('Rs. ' + (price * qty).toLocaleString('en-IN'), 194, tableY + 4.5, { align: 'right' });

      pdf.setDrawColor(241, 245, 249);
      pdf.setLineWidth(0.3);
      pdf.line(12, tableY + rowH, 198, tableY + rowH);

      tableY += rowH;
    });

    // --- 5. SUMMARY, QR CODE & OFFICIAL SEAL ---
    let sumY = Math.max(tableY + 5, 155);
    if (sumY + 50 > 238) {
      pdf.addPage();
      drawPageChrome(pdf, true);
      sumY = 32;
    }

    // Generate Dynamic Verification QR Code
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(
        `https://motodc-official.vercel.app/orders?track=${encodeURIComponent(orderNum)}`,
        {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 140,
          color: { dark: '#0f172a', light: '#ffffff' },
        }
      );
    } catch {
      qrDataUrl = '';
    }

    // Left Container: QR Verification & Seal
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(12, sumY, 90, 48, 1.5, 1.5, 'FD');
    pdf.setFillColor(15, 23, 42); // Slate top stripe
    pdf.rect(12, sumY, 90, 1.8, 'F');

    if (qrDataUrl) {
      pdf.addImage(qrDataUrl, 'PNG', 16, sumY + 5, 25, 25);
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text('DIGITAL VERIFICATION', 45, sumY + 9);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Scan using any phone camera', 45, sumY + 14);
    pdf.text('to verify official authenticity', 45, sumY + 18);
    pdf.text('on MotoDC cloud ledger.', 45, sumY + 22);

    // Official Stamp Box
    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(34, 197, 94);
    pdf.roundedRect(16, sumY + 33, 82, 11, 1.2, 1.2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(21, 128, 61);
    pdf.text('[ * ] MOTODC DISPATCH VERIFIED [ * ]', 57, sumY + 38, { align: 'center' });
    pdf.setFontSize(5.8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('100% Genuine Certified Spares - Central Quality Assured', 57, sumY + 42, {
      align: 'center',
    });

    // Right Container: Financial Summary
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(106, sumY, 92, 48, 1.5, 1.5, 'FD');
    pdf.setFillColor(255, 49, 87); // Crimson top stripe
    pdf.rect(106, sumY, 92, 1.8, 'F');

    const total = Number(o.total || 0);
    const delivery = Number(o.delivery || 0);
    const subtotal = Number(o.subtotal ?? (total > delivery ? total - delivery : total));
    const taxable = Math.round((subtotal / 1.18) * 100) / 100;
    const cgst = Math.round(((subtotal - taxable) / 2) * 100) / 100;
    const sgst = Math.round((subtotal - taxable - cgst) * 100) / 100;

    const summaryRow = (lbl, val, yOff, isGreen = false) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.2);
      pdf.setTextColor(100, 116, 139);
      pdf.text(lbl, 110, sumY + yOff);
      pdf.setFont('helvetica', 'bold');
      if (isGreen) pdf.setTextColor(21, 128, 61);
      else pdf.setTextColor(15, 23, 42);
      pdf.text(val, 194, sumY + yOff, { align: 'right' });
    };

    summaryRow(
      'Items Subtotal (Taxable Base)',
      'Rs. ' + taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      8
    );
    summaryRow(
      'Central GST (CGST @ 9%)',
      'Rs. ' + cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      13
    );
    summaryRow(
      'State GST (SGST @ 9%)',
      'Rs. ' + sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      18
    );
    summaryRow(
      'Doorstep Express Delivery',
      delivery ? 'Rs. ' + delivery.toLocaleString('en-IN') : 'FREE (PROMO)',
      23,
      !delivery
    );

    // Grand Total Banner
    pdf.setFillColor(255, 49, 87);
    pdf.roundedRect(108, sumY + 28, 88, 16, 1.2, 1.2, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text('GRAND TOTAL AMOUNT (INCL. GST)', 112, sumY + 34);

    pdf.setFontSize(13);
    pdf.text('Rs. ' + total.toLocaleString('en-IN'), 192, sumY + 41, { align: 'right' });

    // --- 6. TERMS & REPLACEMENT POLICY BOX ---
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(12, 238, 186, 28, 1.5, 1.5, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(15, 23, 42);
    pdf.text('TERMS & 7-DAY REPLACEMENT POLICY:', 16, 243.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.4);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      '* 7-Day Hassle-Free Replacement for any defective, damaged, or incompatible vehicle spares.',
      16,
      248.5
    );
    pdf.text(
      '* Spares must be in brand original condition with security holographic stickers intact.',
      16,
      253
    );
    pdf.text(
      '* This is an electronically generated and digitally authenticated Tax Invoice under Rule 48 of CGST Rules.',
      16,
      257.5
    );
    pdf.text(
      '* Questions? Email support@motodc.in or call our 24/7 Karaikal logistics helpline: +91 98421 04829',
      16,
      262
    );

    // Digital Signatory
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(15, 23, 42);
    pdf.text('For MOTODC AUTOMOTIVE PRIVATE LIMITED', 194, 244, { align: 'right' });

    pdf.setFillColor(239, 246, 255);
    pdf.roundedRect(144, 247, 50, 6, 1, 1, 'F');
    pdf.setTextColor(29, 78, 216);
    pdf.setFontSize(6.2);
    pdf.text('[ Digitally Signed & Authenticated ]', 169, 251.2, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Authorized Operations Desk - Karaikal Hub', 194, 257, { align: 'right' });

    // --- 7. FOOTER PAGE COUNTER ---
    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `MotoDC Automotive Express Network - Built for the Road - Official Tax Invoice - Page ${p} of ${totalPages}`,
        105,
        276,
        { align: 'center' }
      );
    }

    pdf.save(`MOTO-DC-Invoice-${safeText(orderNum).replace(/[^a-z0-9_-]/gi, '-')}.pdf`);
    toast.success('Tax Invoice PDF downloaded!', { id: 'pdf-toast' });
  } catch (e) {
    console.error('Invoice generation error:', e);
    toast.error('Could not generate invoice', { id: 'pdf-toast' });
  }
}

const cancellableStatuses = ['placed', 'confirmed', 'packed'];

async function cancelOrder(o, onDeleted) {
  const u = auth.currentUser;
  if (!u || o.userId !== u.uid) {
    toast.error('You can only cancel your own order.');
    return;
  }
  const status = o.orderStatus || 'placed';
  if (!cancellableStatuses.includes(status)) {
    toast.error('This order can no longer be cancelled.');
    return;
  }
  if (!window.confirm('Are you sure you want to cancel this order? The order will be permanently removed.'))
    return;
  try {
    const token = await u.getIdToken();
    const response = await fetch('/api/cancel-order.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        orderId: o.orderId,
        docId: o.id,
        paymentMethod: o.paymentMethod,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Cancellation failed');
    onDeleted?.(o.id);
    toast.success(
      data.emailSent
        ? 'Order cancelled and confirmation email sent'
        : 'Order cancelled successfully'
    );
    if (!data.emailSent)
      toast.error('The order was cancelled, but the customer email could not be sent.');
  } catch (e) {
    console.error('Cancel order error:', e);
    toast.error(e.message || 'Could not cancel the order. Please try again.');
  }
}

async function deleteCompletedOrder(o, onDeleted) {
  const u = auth.currentUser;
  if (!u || o.userId !== u.uid) {
    toast.error('You can only delete your own order.');
    return;
  }
  const status = String(o.orderStatus || '').toLowerCase();
  if (!['delivered', 'returned', 'replaced'].includes(status)) {
    toast.error('Only delivered, returned, or replaced orders can be deleted.');
    return;
  }
  if (!window.confirm('Delete this order from your order history? This cannot be undone.'))
    return;
  try {
    const token = await u.getIdToken();
    const response = await fetch('/api/cancel-order.js', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ docId: o.id, paymentMethod: o.paymentMethod }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not delete the order');
    onDeleted?.(o.id);
    toast.success('Order removed from your history');
  } catch (e) {
    console.error('Delete order error:', e);
    toast.error(e.message || 'Could not delete the order. Please try again.');
  }
}

/* ============================================================
   ON-DEMAND LIVE GPS RADAR MODAL (Option A Component)
   ============================================================ */
function TrackingRadarModal({ activeOrder, isOpen, onClose }) {
  const routePathRef = useRef(null);
  const traveledPathRef = useRef(null);
  const carRef = useRef(null);
  const currentProgressRef = useRef(0.05);

  const status = String(activeOrder?.orderStatus || 'placed').toLowerCase();
  const meta = STATUS_META[status] || STATUS_META.placed;
  const targetProgress = STATUS_TARGETS[status] ?? STATUS_TARGETS.placed;

  useEffect(() => {
    if (!isOpen || !activeOrder) return;

    const path = routePathRef.current;
    const traveled = traveledPathRef.current;
    const car = carRef.current;
    if (!path || !car || !traveled) return;

    const total = path.getTotalLength();
    traveled.style.strokeDasharray = `${total}`;

    let raf = 0;
    let start = 0;
    const startP = currentProgressRef.current || 0.05;
    const endP = targetProgress;
    const duration = Math.max(800, Math.min(2200, Math.abs(endP - startP) * 2600));
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const updateVehicle = (p) => {
      const clampedP = Math.max(0.001, Math.min(0.999, p));
      const dist = total * clampedP;
      const pt = path.getPointAtLength(dist);
      const ahead = path.getPointAtLength(Math.min(total, dist + 3));
      const behind = path.getPointAtLength(Math.max(0, dist - 3));
      const angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;

      car.setAttribute(
        'transform',
        `translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}) rotate(${angle.toFixed(2)})`
      );
      traveled.style.strokeDashoffset = `${total * (1 - clampedP)}`;
      currentProgressRef.current = clampedP;
    };

    const frame = (now) => {
      if (!start) start = now;
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const p = startP + (endP - startP) * easeOutCubic(t);
      updateVehicle(p);

      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        let idleStart = performance.now();
        const idleFrame = (nowIdle) => {
          const idleT = (nowIdle - idleStart) / 1000;
          const drift = Math.sin(idleT * 1.8) * 0.0012;
          updateVehicle(Math.max(0, Math.min(1, endP + drift)));
          raf = requestAnimationFrame(idleFrame);
        };
        raf = requestAnimationFrame(idleFrame);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, activeOrder, targetProgress]);

  // Escape key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activeOrder) return null;

  const destCity = activeOrder?.shipping?.city || 'Customer Doorstep';
  const itemName = activeOrder?.items?.[0]?.name || 'MotoDC Parts Consignment';
  const isDelivered = status === 'delivered';
  const pin = getDeliveryPin(activeOrder);

  return (
    <div
      className="ordersRadarModalOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="ordersRadarModalWindow">
        {/* Modal Header */}
        <div className="ordersRadarModalHeader">
          <div className="ordersRadarModalTitleGroup">
            <div className="ordersRadarModalIcon">
              <Radio size={20} className="pulseRadarIcon" />
            </div>
            <div>
              <div className="ordersRadarModalTitle">
                <h3>Live Fleet GPS Radar</h3>
                <span className={`ordersRadarStatusPill ${isDelivered ? 'delivered' : 'transit'}`}>
                  {isDelivered ? 'DELIVERED · VERIFIED' : `${meta.title.toUpperCase()} · GPS LOCKED`}
                </span>
              </div>
              <p className="ordersRadarModalSub">
                Consignment #{activeOrder.orderId || activeOrder.id} · {itemName}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ordersRadarCloseBtn"
            onClick={onClose}
            aria-label="Close GPS Radar Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="ordersRadarModalBody">
          {/* Telemetry 4-HUD Grid */}
          <div className="ordersRadarHudGrid">
            <div className="ordersRadarHudCard">
              <span className="hudCardLabel">TRANSIT VELOCITY</span>
              <div className="hudCardValue velocity">
                {isDelivered ? 'Parked' : meta.speed || '68 km/h'}
              </div>
              <span className="hudCardSub">{isDelivered ? 'Delivered' : 'Highway Corridor NH-44'}</span>
            </div>

            <div className="ordersRadarHudCard">
              <span className="hudCardLabel">ESTIMATED ETA</span>
              <div className="hudCardValue eta">{meta.eta || '1–2 Business Days'}</div>
              <span className="hudCardSub">{meta.phase}</span>
            </div>

            <div className="ordersRadarHudCard">
              <span className="hudCardLabel">CORRIDOR DESTINATION</span>
              <div className="hudCardValue">{destCity}</div>
              <span className="hudCardSub">{meta.location}</span>
            </div>

            <div className="ordersRadarHudCard">
              <span className="hudCardLabel">DOORSTEP HANDOVER PIN</span>
              <div className="hudCardValue pin">{isDelivered ? 'VERIFIED' : pin}</div>
              <span className="hudCardSub">{isDelivered ? 'Barcode Scanned' : 'Present to Driver'}</span>
            </div>
          </div>

          {/* Animated SVG Highway Radar */}
          <div className="ordersRadarCanvasWrapper">
            <div className="radarFeedHeader">
              <span>RADAR LINK // 5.8 GHz · SATELLITE TELEMETRY FEED</span>
              <span className="liveSignalText">
                <i /> SATELLITE GPS ACTIVE
              </span>
            </div>

            <svg viewBox="0 0 1200 230" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="modalRouteAsphalt" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#090d14" />
                  <stop offset="50%" stopColor="#151b26" />
                  <stop offset="100%" stopColor="#090d14" />
                </linearGradient>
                <linearGradient id="modalNeonTraveled" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff1744" />
                  <stop offset="50%" stopColor="#ff3157" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
                <linearGradient id="modalVehicleBody" x1="0%" y1="0%" x2="100%" y2="80%">
                  <stop offset="0%" stopColor="#ff3864" />
                  <stop offset="40%" stopColor="#e11d48" />
                  <stop offset="100%" stopColor="#1a040b" />
                </linearGradient>
                <filter id="modalNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Coordinates Grid */}
              <g opacity="0.25">
                <line x1="30" y1="45" x2="1170" y2="45" stroke="#334155" strokeWidth="0.7" strokeDasharray="4 8" />
                <line x1="30" y1="115" x2="1170" y2="115" stroke="#334155" strokeWidth="0.7" strokeDasharray="4 8" />
                <line x1="30" y1="185" x2="1170" y2="185" stroke="#334155" strokeWidth="0.7" strokeDasharray="4 8" />
              </g>

              {/* Road Asphalt Bed */}
              <path
                d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
                fill="none"
                stroke="#0f172a"
                strokeWidth="24"
                strokeLinecap="round"
              />
              <path
                ref={routePathRef}
                d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
                fill="none"
                stroke="url(#modalRouteAsphalt)"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                ref={traveledPathRef}
                d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
                fill="none"
                stroke="url(#modalNeonTraveled)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#modalNeonGlow)"
              />

              {/* Waypoints */}
              {[
                { id: 'placed', step: 1, x: 90, y: 135, label: 'ORDER PLACED', sub: 'Hub Dispatch' },
                { id: 'packed', step: 2, x: 340, y: 90, label: 'PACKED & READY', sub: 'Inspected' },
                { id: 'shipped', step: 3, x: 610, y: 145, label: 'IN TRANSIT', sub: 'Highway Corridor' },
                { id: 'out_for_delivery', step: 4, x: 880, y: 85, label: 'OUT FOR DELIVERY', sub: 'Final Mile' },
                { id: 'delivered', step: 5, x: 1120, y: 133, label: 'DELIVERED', sub: 'Doorstep' },
              ].map((wp) => {
                const stepNum = wp.step;
                const activeStepNum =
                  status === 'delivered'
                    ? 5
                    : status === 'out_for_delivery'
                    ? 4
                    : status === 'shipped'
                    ? 3
                    : status === 'packed' || status === 'confirmed'
                    ? 2
                    : 1;
                const isDone = stepNum <= activeStepNum;
                const isCurrent = stepNum === activeStepNum;

                return (
                  <g key={wp.id} transform={`translate(${wp.x}, ${wp.y})`}>
                    <circle
                      cx="0"
                      cy="0"
                      r={isCurrent ? 14 : 10}
                      fill={isCurrent ? '#38bdf8' : isDone ? '#ff3157' : '#1e293b'}
                      stroke={isCurrent ? '#ffffff' : '#ff3157'}
                      strokeWidth={isCurrent ? 2.5 : 1}
                      filter={isCurrent ? 'url(#modalNeonGlow)' : undefined}
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="800"
                      fontFamily="Sora, sans-serif"
                    >
                      {isDone ? '✓' : stepNum}
                    </text>
                    <text
                      x="0"
                      y={wp.y > 110 ? 28 : -20}
                      textAnchor="middle"
                      fill={isCurrent ? '#38bdf8' : isDone ? '#f8fafc' : '#64748b'}
                      fontSize="9"
                      fontWeight="700"
                      fontFamily="Sora, sans-serif"
                    >
                      {wp.label}
                    </text>
                  </g>
                );
              })}

              {/* Dynamic Vehicle Indicator */}
              <g ref={carRef}>
                <ellipse cx="0" cy="2" rx="34" ry="7" fill="rgba(255,49,87,0.5)" filter="url(#modalNeonGlow)" />
                <rect x="-26" y="-12" width="52" height="24" rx="7" fill="#090d16" stroke="#ff3157" strokeWidth="1.8" />
                <circle cx="-16" cy="0" r="3" fill="#22c55e" />
                <text x="2" y="3.5" fill="#f8fafc" fontSize="8.5" fontWeight="800" fontFamily="monospace">
                  {isDelivered ? 'PARKED' : meta.speed || '68 KM/H'}
                </text>
              </g>
            </svg>
          </div>

          {/* Assigned Driver & Dispatcher Details */}
          <div className="ordersRadarCourierRow">
            <div className="ordersRadarCourierLeft">
              <div className="courierAvatarBadge">MDC</div>
              <div>
                <div className="courierNameTitle">
                  Assigned Unit: <b>Courier Unit #KA-04-MD</b>
                </div>
                <div className="courierSubText">
                  {isDelivered
                    ? 'Package handed over and verified via 4-digit security PIN'
                    : 'Dispatched via Express Corridor · Satellite Telemetry Active'}
                </div>
              </div>
            </div>
            <div className="ordersRadarCourierActions">
              <button
                type="button"
                className="ordersRadarDoneBtn"
                onClick={onClose}
              >
                Done Viewing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN ORDERS COMPONENT (Option A — Split-View Command Center)
   ============================================================ */
export default function Orders() {
  const nav = useNavigate(),
    location = useLocation(),
    [justPlacedData, setJustPlacedData] = useState(() =>
      location.state?.justPlaced ? location.state : null
    ),
    [orders, setOrders] = useState([]),
    [loading, setLoading] = useState(true),
    [activeOrderId, setActiveOrderId] = useState(() => location.state?.orderId || null),
    [filterStatus, setFilterStatus] = useState('all'),
    [searchQuery, setSearchQuery] = useState(''),
    [showRadarModal, setShowRadarModal] = useState(false);

  useEffect(() => {
    if (location.state?.justPlaced && location.state?.orderId) {
      setActiveOrderId(location.state.orderId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state]);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) {
      setLoading(false);
      return;
    }
    const queries = [
      query(collection(db, 'orders', 'cod orders', 'records'), where('userId', '==', u.uid)),
      query(collection(db, 'orders', 'online orders', 'records'), where('userId', '==', u.uid)),
    ];
    let active = true;
    const lists = [[], []];
    const unsubs = queries.map((q, i) =>
      onSnapshot(
        q,
        (snap) => {
          lists[i] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const next = [...lists[0], ...lists[1]].sort((a, b) => {
            const ad = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0,
              bd = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return bd - ad;
          });
          if (active) {
            setOrders(next);
            if (!activeOrderId && next.length > 0) {
              setActiveOrderId(location.state?.orderId || next[0].id);
            }
            setLoading(false);
          }
        },
        (e) => {
          console.error(e);
          if (active) {
            toast.error('Could not load your orders.');
            setLoading(false);
          }
        }
      )
    );
    return () => {
      active = false;
      unsubs.forEach((u) => u());
    };
  }, [activeOrderId, location.state]);

  const displayOrders = useMemo(() => {
    if (
      justPlacedData?.orderId &&
      !orders.some((o) => o.orderId === justPlacedData.orderId || o.id === justPlacedData.orderId)
    ) {
      const provisional = {
        id: justPlacedData.orderId,
        orderId: justPlacedData.orderId,
        total: justPlacedData.total,
        paymentMethod: justPlacedData.method,
        orderStatus: 'placed',
        createdAt: new Date(),
        items: [{ name: 'MotoDC Order #' + justPlacedData.orderId, price: justPlacedData.total, qty: 1 }],
        delivery: 'FREE',
        statusHistory: [{ status: 'placed', updatedAt: new Date().toISOString() }],
      };
      return [provisional, ...orders];
    }
    return orders;
  }, [orders, justPlacedData]);

  // Counts for tabs
  const inTransitCount = useMemo(
    () =>
      displayOrders.filter((o) =>
        ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery'].includes(
          String(o.orderStatus || '').toLowerCase()
        )
      ).length,
    [displayOrders]
  );

  const deliveredCount = useMemo(
    () =>
      displayOrders.filter(
        (o) => String(o.orderStatus || '').toLowerCase() === 'delivered'
      ).length,
    [displayOrders]
  );

  // Filtered orders according to tab & search query
  const filteredOrders = useMemo(() => {
    return displayOrders.filter((o) => {
      const st = String(o.orderStatus || 'placed').toLowerCase();
      if (
        filterStatus === 'in_transit' &&
        !['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery'].includes(st)
      ) {
        return false;
      }
      if (filterStatus === 'delivered' && st !== 'delivered') {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const orderIdMatch = String(o.orderId || o.id || '').toLowerCase().includes(q);
        const itemMatch = (o.items || []).some((item) =>
          String(item.name || '').toLowerCase().includes(q)
        );
        if (!orderIdMatch && !itemMatch) return false;
      }
      return true;
    });
  }, [displayOrders, filterStatus, searchQuery]);

  // Selected Active Order
  const activeOrder = useMemo(() => {
    return (
      filteredOrders.find((o) => o.id === activeOrderId || o.orderId === activeOrderId) ||
      filteredOrders[0] ||
      displayOrders.find((o) => o.id === activeOrderId || o.orderId === activeOrderId) ||
      displayOrders[0] ||
      null
    );
  }, [filteredOrders, displayOrders, activeOrderId]);

  const removeLocal = (id) => {
    setOrders((xs) => xs.filter((x) => x.id !== id));
    if (activeOrderId === id) {
      const remaining = displayOrders.filter((x) => x.id !== id);
      setActiveOrderId(remaining[0]?.id || null);
    }
  };

  const activeStatus = String(activeOrder?.orderStatus || 'placed').toLowerCase();
  const activeMeta = STATUS_META[activeStatus] || STATUS_META.placed;
  const isDelivered = activeStatus === 'delivered';
  const isCancelled = activeStatus === 'cancelled';
  const canCancel = cancellableStatuses.includes(activeStatus);

  return (
    <section className="page ordersPage">
      {/* Confirmation Banner if redirected immediately after checkout */}
      {justPlacedData && (
        <div className="orderJustPlacedBanner" role="status" aria-live="polite">
          <div className="justPlacedBannerLeft">
            <div className="justPlacedCheckCircle">
              <CheckCircle size={26} />
            </div>
            <div className="justPlacedBannerText">
              <span className="justPlacedBadge">
                ORDER CONFIRMED ·{' '}
                {justPlacedData.method === 'cod' ? 'CASH ON DELIVERY' : 'ONLINE PAYMENT'}
              </span>
              <h2>
                Thank you! Your order <span>#{justPlacedData.orderId}</span> is confirmed.
              </h2>
              <p>
                Total: <b>{money(justPlacedData.total)}</b> · Our dispatch team has queued your
                package for express fulfillment.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="justPlacedDismissBtn"
            onClick={() => setJustPlacedData(null)}
            aria-label="Dismiss confirmation banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* Clean Option A Page Header & Filter Bar */}
      <div className="ordersPageHeaderRow">
        <div className="ordersPageTitleBox">
          <h1 className="ordersPageMainTitle">My Orders</h1>
          <p className="ordersPageSubTitle">
            Track active shipments, verify doorstep handover PINs, and download invoices.
          </p>
        </div>

        {/* Filter Pills & Search Input */}
        <div className="ordersToolbarGroup">
          <div className="ordersFilterTabs">
            <button
              type="button"
              className={`ordersFilterPill ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All Orders ({displayOrders.length})
            </button>
            <button
              type="button"
              className={`ordersFilterPill ${filterStatus === 'in_transit' ? 'active' : ''}`}
              onClick={() => setFilterStatus('in_transit')}
            >
              In Transit ({inTransitCount})
            </button>
            <button
              type="button"
              className={`ordersFilterPill ${filterStatus === 'delivered' ? 'active' : ''}`}
              onClick={() => setFilterStatus('delivered')}
            >
              Delivered ({deliveredCount})
            </button>
          </div>

          <div className="ordersSearchBar">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search by order ID or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clearSearchBtn"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Split-View Layout */}
      {loading && !displayOrders.length ? (
        <div className="empty">Loading your orders...</div>
      ) : !displayOrders.length ? (
        <div className="ordersEmpty">
          <Package size={42} />
          <h2>No orders found</h2>
          <p>Your orders will appear here once placed.</p>
          <button className="heroBtn" onClick={() => nav('/products')}>
            Start Shopping
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="ordersNoMatch">
          <Search size={32} />
          <h3>No matching orders found</h3>
          <p>Try clearing your search query or switching filter tabs.</p>
          <button
            type="button"
            className="clearFilterBtn"
            onClick={() => {
              setFilterStatus('all');
              setSearchQuery('');
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="ordersSplitLayout">
          {/* LEFT COLUMN: ORDER LIST SELECTOR (5 cols) */}
          <div className="ordersSplitListCol">
            {filteredOrders.map((o) => {
              const st = String(o.orderStatus || 'placed').toLowerCase();
              const isSelected = activeOrder?.id === o.id;
              const isOrderDelivered = st === 'delivered';
              const isOrderInTransit = [
                'placed',
                'confirmed',
                'packed',
                'shipped',
                'out_for_delivery',
              ].includes(st);

              return (
                <div
                  key={o.id}
                  className={`ordersSplitCard ${isSelected ? 'active' : ''}`}
                  onClick={() => setActiveOrderId(o.id)}
                >
                  <div className="ordersSplitCardInner">
                    <div className="ordersSplitThumb">
                      {o.items?.[0]?.image ? (
                        <img
                          src={o.items[0].image}
                          alt={o.items[0].name || 'Product'}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <Package size={24} />
                      )}
                    </div>

                    <div className="ordersSplitContent">
                      <div className="ordersSplitTopMeta">
                        <span className="ordersSplitId">#{o.orderId || o.id}</span>
                        <span
                          className={`ordersSplitStatusTag ${
                            isOrderDelivered
                              ? 'delivered'
                              : isOrderInTransit
                              ? 'transit'
                              : 'cancelled'
                          }`}
                        >
                          {isOrderInTransit && <span className="statusPulseDot" />}
                          {labels[st] || st}
                        </span>
                      </div>

                      <h4 className="ordersSplitTitle">
                        {o.items?.[0]?.name || 'MOTO DC Order'}
                      </h4>

                      <div className="ordersSplitBottomMeta">
                        <span className="ordersSplitDate">{formatDate(o.createdAt)}</span>
                        <span className="ordersSplitPrice">{money(o.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN: FOCUSED ORDER INSPECTOR (7 cols) */}
          {activeOrder && (
            <div className="ordersSplitInspectorCol">
              {/* Header Box */}
              <div className="inspectorHeader">
                <div>
                  <div className="inspectorSubMeta">
                    <span className="inspectorOrderId">
                      ORDER #{activeOrder.orderId || activeOrder.id}
                    </span>
                    <span className="metaDivider">•</span>
                    <span className="inspectorPayment">
                      {activeOrder.paymentMethod === 'cod'
                        ? 'Cash on Delivery'
                        : 'Online Payment (Verified)'}
                    </span>
                  </div>
                  <h2 className="inspectorHeadline">
                    {isDelivered
                      ? `Delivered on ${formatDate(activeOrder.createdAt)}`
                      : isCancelled
                      ? 'Order Cancelled'
                      : activeMeta.eta
                      ? `Estimated Delivery: ${activeMeta.eta}`
                      : 'In Express Fulfillment'}
                  </h2>
                  <p className="inspectorLocation">
                    {activeMeta.phase} · {activeMeta.location}
                  </p>
                </div>

                <div className="inspectorHeaderActions">
                  <button
                    type="button"
                    className="inspectorInvoiceBtn"
                    onClick={() => downloadInvoice(activeOrder)}
                  >
                    <Download size={14} /> Tax Invoice (PDF)
                  </button>
                </div>
              </div>

              {/* DOORSTEP HANDOVER PIN CALLOUT BOX */}
              {!isCancelled && !isDelivered && (
                <div className="inspectorPinBox">
                  <div className="inspectorPinLeft">
                    <div className="inspectorPinIconWrap">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <div className="inspectorPinHeading">Doorstep Handover PIN</div>
                      <p className="inspectorPinDesc">
                        Share this 4-digit security code with your MotoDC delivery partner upon parcel
                        arrival.
                      </p>
                    </div>
                  </div>
                  <div className="inspectorPinCodeBadge">
                    {getDeliveryPin(activeOrder)}
                  </div>
                </div>
              )}

              {isDelivered && (
                <div className="inspectorDeliveredVerifiedBox">
                  <div className="deliveredCheckIcon">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <div className="deliveredVerifiedTitle">Doorstep Handover Verified</div>
                    <p className="deliveredVerifiedSub">
                      Delivered securely with driver barcode scan and recipient OTP verification.
                    </p>
                  </div>
                </div>
              )}

              {/* VERTICAL STEPPER TIMELINE */}
              <div className="inspectorTimeline">
                <div className="inspectorTimelineItem">
                  <span className="timelineDot completed">✓</span>
                  <div>
                    <div className="timelineTitle">Order Placed & Confirmed</div>
                    <div className="timelineSub">
                      {formatDate(activeOrder.createdAt)} · MotoDC Central Warehouse
                    </div>
                  </div>
                </div>

                <div className="inspectorTimelineItem">
                  <span
                    className={`timelineDot ${
                      ['packed', 'shipped', 'out_for_delivery', 'delivered'].includes(activeStatus)
                        ? 'completed'
                        : activeStatus === 'confirmed'
                        ? 'current'
                        : 'pending'
                    }`}
                  >
                    {['packed', 'shipped', 'out_for_delivery', 'delivered'].includes(activeStatus)
                      ? '✓'
                      : '2'}
                  </span>
                  <div>
                    <div className="timelineTitle">Packed & Quality Verified</div>
                    <div className="timelineSub">
                      Dual-layer protective automotive boxing & barcode staging
                    </div>
                  </div>
                </div>

                <div className="inspectorTimelineItem">
                  <span
                    className={`timelineDot ${
                      ['shipped', 'out_for_delivery', 'delivered'].includes(activeStatus)
                        ? activeStatus === 'shipped'
                          ? 'current'
                          : 'completed'
                        : 'pending'
                    }`}
                  >
                    {['out_for_delivery', 'delivered'].includes(activeStatus)
                      ? '✓'
                      : activeStatus === 'shipped'
                      ? '🚚'
                      : '3'}
                  </span>
                  <div>
                    <div className="timelineTitle">
                      In Transit — Regional Logistics Corridor
                    </div>
                    <div className="timelineSub">
                      {activeMeta.location} · Telemetry Speed: {activeMeta.speed}
                    </div>
                  </div>
                </div>

                <div className="inspectorTimelineItem">
                  <span
                    className={`timelineDot ${
                      activeStatus === 'delivered'
                        ? 'completed'
                        : activeStatus === 'out_for_delivery'
                        ? 'current'
                        : 'pending'
                    }`}
                  >
                    {activeStatus === 'delivered' ? '✓' : '4'}
                  </span>
                  <div>
                    <div className="timelineTitle">Out for Delivery (Doorstep Route)</div>
                    <div className="timelineSub">
                      {activeStatus === 'out_for_delivery'
                        ? 'Courier Unit is en route to your address'
                        : 'Scheduled final-mile delivery'}
                    </div>
                  </div>
                </div>
              </div>

              {/* DELIVERY ADDRESS & PAYMENT BREAKDOWN */}
              <div className="inspectorDetailsGrid">
                <div className="inspectorDetailsCard">
                  <span className="cardLabel">DELIVERING TO</span>
                  <div className="cardName">{activeOrder.customer?.name || 'Customer'}</div>
                  <div className="cardAddress">
                    {[
                      activeOrder.shipping?.address,
                      activeOrder.shipping?.city,
                      activeOrder.shipping?.state,
                      activeOrder.shipping?.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Address on file'}
                  </div>
                  {activeOrder.customer?.phone && (
                    <div className="cardPhone">Ph: {activeOrder.customer.phone}</div>
                  )}
                </div>

                <div className="inspectorDetailsCard">
                  <span className="cardLabel">PAYMENT & SUMMARY</span>
                  <div className="cardPaymentMethod">
                    {activeOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment (Paid)'}
                  </div>
                  <div className="cardAmountRow">
                    <span>Order Total:</span>
                    <strong>{money(activeOrder.total)}</strong>
                  </div>
                  <div className="cardShippingNote">Free Express Priority Shipping</div>
                </div>
              </div>

              {/* ORDER ITEMS LIST */}
              <div className="inspectorItemsSection">
                <h4 className="inspectorItemsTitle">
                  <Package size={15} /> Consignment Items ({activeOrder.items?.length || 1})
                </h4>
                <div className="inspectorItemsList">
                  {(activeOrder.items || []).map((x, i) => (
                    <div className="inspectorItemRow" key={i}>
                      <div className="inspectorItemImg">
                        {x.image ? (
                          <img src={x.image} alt={x.name || 'Item'} loading="lazy" />
                        ) : (
                          <Package size={20} />
                        )}
                      </div>
                      <div className="inspectorItemInfo">
                        <b>{x.name}</b>
                        <small>
                          {x.variant || 'Standard'} · Qty: {x.qty || 1}
                        </small>
                      </div>
                      <div className="inspectorItemPrice">
                        {money((x.price || 0) * (x.qty || 1))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="inspectorActionFooter">
                {/* 1-Click WhatsApp Support with pre-filled Order ID */}
                <a
                  href={`https://wa.me/918903993371?text=${encodeURIComponent(
                    `Hi MotoDC Team, I need assistance with my Order #${activeOrder.orderId || activeOrder.id} (${activeOrder.items?.[0]?.name || 'Parts'})`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inspectorHelpBtn"
                >
                  <MessageSquare size={15} />
                  <span>Need Help with this Order?</span>
                </a>

                {/* Buy Again / Re-order */}
                <button
                  type="button"
                  className="inspectorReorderBtn"
                  onClick={() => nav('/products')}
                >
                  <RotateCcw size={14} /> Buy Again
                </button>

                {canCancel && (
                  <button
                    type="button"
                    className="inspectorCancelBtn"
                    onClick={() => cancelOrder(activeOrder, removeLocal)}
                  >
                    <Ban size={15} /> Cancel Order
                  </button>
                )}

                {isDelivered && (
                  <button
                    type="button"
                    className="inspectorReturnBtn"
                    onClick={() => nav('/returns')}
                  >
                    <RotateCcw size={15} /> Return / Replace
                  </button>
                )}

                {(isDelivered || isCancelled) && (
                  <button
                    type="button"
                    className="inspectorDeleteBtn"
                    onClick={() => deleteCompletedOrder(activeOrder, removeLocal)}
                  >
                    <XCircle size={15} /> Delete Order
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ON-DEMAND LIVE GPS RADAR MODAL */}
      <TrackingRadarModal
        activeOrder={activeOrder}
        isOpen={showRadarModal}
        onClose={() => setShowRadarModal(false)}
      />
    </section>
  );
}
