import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Printer, X, ShieldAlert, Package } from 'lucide-react';
import { getDeliveryPin } from './deliveryPinUtil';
import './shipping-label.css';

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function ShippingLabelModal({ order, onClose }) {
  const barcodeRef = useRef(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const barcodeValue = String(order?.orderId || order?.id || 'MDC-0000').trim();
  const isCod = String(order?.paymentMethod || '').toLowerCase() === 'cod';
  const deliveryPin = getDeliveryPin(order);

  useEffect(() => {
    // 1. Generate QR Code Data URL (High speed 2D barcode)
    if (barcodeValue) {
      QRCode.toDataURL(barcodeValue, {
        width: 140,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.warn('QR code generation error:', err));
    }

    // 2. Render Code-128 Linear Barcode on SVG
    const timer = setTimeout(() => {
      if (barcodeRef.current && barcodeValue) {
        try {
          const barcodeFn =
            typeof JsBarcode === 'function'
              ? JsBarcode
              : JsBarcode?.default || (typeof window !== 'undefined' ? window.JsBarcode : null);

          if (typeof barcodeFn === 'function') {
            barcodeFn(barcodeRef.current, barcodeValue, {
              format: 'CODE128',
              width: 2.2,
              height: 52,
              displayValue: true,
              font: 'monospace',
              fontSize: 12,
              textMargin: 3,
              margin: 2,
              background: '#ffffff',
              lineColor: '#000000',
            });
          }
        } catch (err) {
          console.warn('JsBarcode rendering error:', err);
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [barcodeValue]);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="shippingLabelOverlay" onClick={onClose}>
      <div className="shippingLabelModal" onClick={(e) => e.stopPropagation()}>
        {/* Top Control Bar */}
        <div className="shippingLabelTopBar">
          <h3>
            <Package size={18} color="#ff3157" /> Shipping Label & Dispatch Slip
          </h3>
          <div className="shippingLabelActions">
            <button type="button" className="shippingPrintBtn" onClick={handlePrint}>
              <Printer size={15} /> Print Label
            </button>
            <button type="button" className="shippingCloseBtn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Physical Shipping Label Sheet */}
        <div className="shippingLabelSheet" id="shipping-label-printable">
          {/* Header */}
          <div className="labelBrandHeader">
            <div className="brandName">
              Moto<span>DC</span> Express
            </div>
            <div className="labelServiceBadge">
              SURFACE PRIORITY // DOORSTEP
            </div>
          </div>

          {/* Dual Barcode & QR Code Section */}
          <div className="labelBarcodeSection">
            <div className="labelBarcodeDualWrap">
              <div className="labelBarcodeBox">
                <svg ref={barcodeRef} aria-label={`Barcode for ${barcodeValue}`} />
                <div className="labelBarcodeHint">
                  DOORSTEP SCAN VERIFIED // SCAN VIA MOTODC DELIVERY APP
                </div>
              </div>
              {qrDataUrl && (
                <div className="labelQrBox">
                  <img src={qrDataUrl} alt={`QR Code for ${barcodeValue}`} />
                  <small>QUICK SCAN</small>
                </div>
              )}
            </div>
          </div>

          {/* Address & Shipper Grid */}
          <div className="labelAddressGrid">
            <div className="labelToBlock">
              <h4>SHIP TO (CUSTOMER):</h4>
              <div className="recipientName">{order.customer?.name || 'Customer'}</div>
              <div className="recipientAddress">
                {order.shipping?.address || 'Standard Delivery Address'}
                <br />
                {order.shipping?.city ? `${order.shipping.city}, ` : ''}
                {order.shipping?.state || 'India'}
              </div>
              <div><b>Phone:</b> {order.customer?.phone || 'No phone'}</div>
              <div className="labelPincodeBox">
                PIN: {order.shipping?.pincode || '600001'}
              </div>
            </div>

            <div className="labelFromBlock">
              <h4>DISPATCHED FROM:</h4>
              <b>MotoDC Central Fulfillment Hub</b>
              <div>Gate 3, Logistics Corridor</div>
              <div>Chennai, Tamil Nadu - 600032</div>
              <div>Support: support@motodc.in</div>
              <div style={{ marginTop: '8px' }}>
                <b>Date:</b> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Payment Type Banner */}
          <div className={`labelPaymentBanner ${isCod ? 'cod' : 'prepaid'}`}>
            <span className="payType">
              {isCod ? '⚠ CASH ON DELIVERY (COD)' : '✓ PREPAID ORDER (PAID ONLINE)'}
            </span>
            <span className="payAmount">
              {isCod ? `COLLECT: ${money(order.total)}` : 'COLLECT: ₹0'}
            </span>
          </div>

          {/* Manifest of Items inside box */}
          <table className="labelItemsTable">
            <thead>
              <tr>
                <th style={{ width: '65%' }}>Product Description</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Qty</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((it, idx) => (
                <tr key={idx}>
                  <td>{it.name || 'Automotive Spare Part'}</td>
                  <td style={{ textAlign: 'center' }}>{it.qty || 1}</td>
                  <td style={{ textAlign: 'right' }}>{money((it.price || 0) * (it.qty || 1))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Security Notice for Delivery Agent */}
          <div className="labelSecurityNotice">
            <ShieldAlert size={28} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <b>AMAZON-STYLE BARCODE VERIFICATION:</b> Delivery partner must scan this barcode at doorstep via the MotoDC Delivery Portal (<b>/delivery</b>) and enter customer's 4-digit handover PIN (<b>{deliveryPin}</b>) to confirm handover.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
