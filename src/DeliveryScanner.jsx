import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from './firebase';
import { collection, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import {
  Camera,
  CheckCircle2,
  Package,
  ShieldCheck,
  Phone,
  MapPin,
  RefreshCw,
  Search,
  Check,
  AlertCircle,
  ArrowLeft,
  Truck,
  RotateCcw
} from 'lucide-react';
import { getDeliveryPin, verifyDeliveryPin } from './deliveryPinUtil';
import './delivery-scanner.css';

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

function playScanChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (_) {}
}

export default function DeliveryScanner() {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [manualId, setManualId] = useState('');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [verifiedOrder, setVerifiedOrder] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [codCollected, setCodCollected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deliveredSuccess, setDeliveredSuccess] = useState(null);
  const [todayCount, setTodayCount] = useState(() => {
    try {
      return Number(localStorage.getItem('motodc_deliveries_today') || 0);
    } catch {
      return 0;
    }
  });

  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);

  // Initialize and start camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('reader');
      }

      const config = {
        fps: 12,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.333,
      };

      await scannerRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {
          // Frame scan error (normal when nothing in view)
        }
      );

      setCameraActive(true);
      isScanningRef.current = true;
    } catch (err) {
      console.warn('Camera start issue:', err);
      setCameraError('Camera access unavailable or denied. You can still enter the Order ID manually below.');
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (_) {}
      isScanningRef.current = false;
      setCameraActive(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // When barcode is decoded by camera or entered manually
  const handleBarcodeDetected = (rawCode) => {
    if (!rawCode || loadingOrder) return;
    const clean = String(rawCode).trim();
    if (!clean) return;

    // Trigger audio chime and vibration
    playScanChime();
    if (navigator.vibrate) {
      navigator.vibrate([80, 40, 100]);
    }

    lookupOrder(clean);
  };

  // Find order in Firestore
  const lookupOrder = async (queryId) => {
    setLoadingOrder(true);
    setVerifiedOrder(null);
    setPinInput('');
    setCodCollected(false);

    try {
      // Pause camera while reviewing verified package
      await stopCamera();

      // Query both collections
      const [codSnap, onlineSnap] = await Promise.all([
        getDocs(collection(db, 'orders', 'cod orders', 'records')),
        getDocs(collection(db, 'orders', 'online orders', 'records')),
      ]);

      const all = [
        ...codSnap.docs.map((d) => ({ ...d.data(), id: d.id, collectionType: 'cod orders' })),
        ...onlineSnap.docs.map((d) => ({ ...d.data(), id: d.id, collectionType: 'online orders' })),
      ];

      const match = all.find((o) => {
        const id1 = String(o.orderId || '').toLowerCase().trim();
        const id2 = String(o.id || '').toLowerCase().trim();
        const q = String(queryId).toLowerCase().trim();
        return id1 === q || id2 === q || id1.includes(q) || q.includes(id1);
      });

      if (!match) {
        toast.error(`No order found matching "${queryId}". Check package barcode.`);
        startCamera();
      } else {
        toast.success(`Package verified: #${match.orderId || match.id}`);
        setVerifiedOrder(match);
      }
    } catch (err) {
      console.error('Lookup order error:', err);
      toast.error('Could not verify barcode with server.');
      startCamera();
    } finally {
      setLoadingOrder(false);
    }
  };

  // Handle manual form search
  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    handleBarcodeDetected(manualId.trim());
  };

  // Confirm Handover and mark order Delivered
  const handleConfirmDelivery = async () => {
    if (!verifiedOrder) return;

    const isCod = String(verifiedOrder.paymentMethod || '').toLowerCase() === 'cod';
    if (isCod && !codCollected) {
      toast.error('Please confirm that COD cash has been collected before completing delivery.');
      return;
    }

    // Verify 4-digit Handover PIN
    const isValidPin = verifyDeliveryPin(verifiedOrder, pinInput);
    if (!isValidPin) {
      toast.error('Invalid Handover PIN. Ask the customer to check their MotoDC Orders page.');
      return;
    }

    setSubmitting(true);
    try {
      const colName = verifiedOrder.collectionType || (isCod ? 'cod orders' : 'online orders');
      const orderRef = doc(db, 'orders', colName, 'records', verifiedOrder.id);

      const updates = {
        orderStatus: 'delivered',
        deliveredAt: new Date().toISOString(),
        statusHistory: arrayUnion({
          status: 'delivered',
          updatedAt: new Date().toISOString(),
          note: 'Verified via Doorstep Barcode Scan & PIN',
        }),
      };

      if (isCod) {
        updates.paymentStatus = 'paid';
      }

      await updateDoc(orderRef, updates);

      // Play victory sound & vibrate
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 150, 50, 200]);
      }
      playScanChime();

      // Increment tally
      const nextCount = todayCount + 1;
      setTodayCount(nextCount);
      try {
        localStorage.setItem('motodc_deliveries_today', String(nextCount));
      } catch (_) {}

      setDeliveredSuccess({
        orderId: verifiedOrder.orderId || verifiedOrder.id,
        customerName: verifiedOrder.customer?.name || 'Customer',
        total: verifiedOrder.total,
        isCod,
      });

      setVerifiedOrder(null);
    } catch (err) {
      console.error('Delivery confirmation error:', err);
      toast.error('Could not update delivery status in database.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextScan = () => {
    setDeliveredSuccess(null);
    setVerifiedOrder(null);
    setPinInput('');
    setCodCollected(false);
    setManualId('');
    startCamera();
  };

  return (
    <div className="deliveryPortal">
      {/* Top Header */}
      <header className="deliveryPortalHeader">
        <div className="deliveryPortalBrand">
          <Truck size={22} color="#ff3157" />
          <b>Moto<span>DC</span> Logistics</b>
          <div className="deliveryPortalBadge">
            <span className="deliveryPortalBadgeDot" />
            Scanner Active
          </div>
        </div>
        <div className="deliveryNavLinks">
          <a href="/admin" className="deliveryNavBtn">
            Admin Panel
          </a>
          <a href="/" className="deliveryNavBtn">
            Store
          </a>
        </div>
      </header>

      <div className="deliveryContainer">
        {/* Tally Bar */}
        <div className="deliveryTallyBar">
          <div className="tallyInfo">
            Doorstep Deliveries Verified Today: <b>{todayCount}</b>
          </div>
          <span className="tallyCount">Shift Active</span>
        </div>

        {/* 1. Camera Viewport / Scanner Card (When no package actively being verified) */}
        {!verifiedOrder && !deliveredSuccess && (
          <div className="scannerCard">
            <div className="scannerCardHeader">
              <h2>
                <Camera size={18} color="#ff3157" />
                Amazon-Style Doorstep Scanner
              </h2>
              <div className="scannerControls">
                <button
                  type="button"
                  className={`scannerControlBtn ${cameraActive ? 'active' : ''}`}
                  onClick={cameraActive ? stopCamera : startCamera}
                >
                  <RefreshCw size={13} />
                  {cameraActive ? 'Restart' : 'Start Camera'}
                </button>
              </div>
            </div>

            {/* Video Feed Box */}
            <div className="cameraViewport">
              <div id="reader" />
              {cameraActive && (
                <div className="reticleOverlay">
                  <div className="reticleFrame">
                    <span className="reticleCorner tl" />
                    <span className="reticleCorner tr" />
                    <span className="reticleCorner bl" />
                    <span className="reticleCorner br" />
                    <span className="laserScanLine" />
                  </div>
                  <span className="reticleInstruction">Align Barcode on Box</span>
                </div>
              )}
              {cameraError && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#f87171', fontSize: '13px' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                  {cameraError}
                </div>
              )}
            </div>

            {/* Fallback Manual Input */}
            <div className="manualInputWrap">
              <form onSubmit={handleManualSearch}>
                <input
                  type="text"
                  placeholder="Scan failed? Enter Order ID (e.g. MDC-08492)"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                />
                <button type="submit" disabled={loadingOrder}>
                  {loadingOrder ? 'Searching...' : 'Verify'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 2. Verified Package Details Screen */}
        {verifiedOrder && (
          <div className="orderVerifiedCard">
            <div className="orderVerifiedHeader">
              <div>
                <h3>
                  <CheckCircle2 size={20} color="#22c55e" />
                  Package Verified & Grounded
                </h3>
                <div className="orderVerifiedId">
                  Order #{verifiedOrder.orderId || verifiedOrder.id}
                </div>
              </div>
              <button
                type="button"
                className="deliveryNavBtn"
                onClick={handleNextScan}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                <RotateCcw size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Cancel Scan
              </button>
            </div>

            {/* Payment Collection Banner */}
            {String(verifiedOrder.paymentMethod || '').toLowerCase() === 'cod' ? (
              <div className="deliveryPaymentNotice cod">
                <div>
                  <b>⚠ CASH ON DELIVERY (COD)</b>
                  <small>Collect full cash from customer before handing over the parcel</small>
                </div>
                <div className="deliveryAmountHighlight">{money(verifiedOrder.total)}</div>
              </div>
            ) : (
              <div className="deliveryPaymentNotice prepaid">
                <div>
                  <b>✓ PREPAID ORDER (PAID ONLINE)</b>
                  <small>Payment fully settled via Razorpay. Do NOT collect any cash.</small>
                </div>
                <div className="deliveryAmountHighlight">₹0 TO COLLECT</div>
              </div>
            )}

            {/* Customer & Address Card */}
            <div className="deliveryCustomerInfo">
              <h4>Deliver To:</h4>
              <div className="deliveryCustomerName">{verifiedOrder.customer?.name || 'Customer'}</div>
              <div className="deliveryAddressText">
                <MapPin size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                {verifiedOrder.shipping?.address || 'Doorstep Address'}, {verifiedOrder.shipping?.city || ''},{' '}
                {verifiedOrder.shipping?.state || ''} - {verifiedOrder.shipping?.pincode || ''}
              </div>

              <div className="deliveryQuickActions">
                {verifiedOrder.customer?.phone && (
                  <a href={`tel:${verifiedOrder.customer.phone}`} className="deliveryActionLink">
                    <Phone size={14} /> Call Customer
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${verifiedOrder.shipping?.address || ''} ${verifiedOrder.shipping?.city || ''} ${verifiedOrder.shipping?.pincode || ''}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="deliveryActionLink"
                >
                  <MapPin size={14} /> Open in Maps
                </a>
              </div>
            </div>

            {/* Parcel Contents */}
            <div className="deliveryItemsList">
              <h4>Package Contents ({verifiedOrder.items?.length || 0} items):</h4>
              {(verifiedOrder.items || []).map((it, idx) => (
                <div className="deliveryItemRow" key={idx}>
                  <span>{it.name || 'Automotive Part'}</span>
                  <b>Qty {it.qty || 1}</b>
                </div>
              ))}
            </div>

            {/* Amazon-Style Handover PIN Verification Box */}
            <div className="handoverPinBox">
              <h4>
                <ShieldCheck size={18} color="#ff3157" />
                Customer Handover PIN Verification
              </h4>
              <p>
                Ask customer for their <b>4-digit Security PIN</b> (shown on their MotoDC Orders screen).
              </p>
              <div className="handoverPinInput">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </div>
            </div>

            {/* If COD, mandatory checkbox */}
            {String(verifiedOrder.paymentMethod || '').toLowerCase() === 'cod' && (
              <label className="codCollectedCheckbox">
                <input
                  type="checkbox"
                  checked={codCollected}
                  onChange={(e) => setCodCollected(e.target.checked)}
                />
                <span>I have collected <b>{money(verifiedOrder.total)}</b> cash from the customer.</span>
              </label>
            )}

            {/* Final Confirmation Button */}
            <button
              type="button"
              className="completeDeliveryBtn"
              disabled={submitting || pinInput.length !== 4 || (String(verifiedOrder.paymentMethod || '').toLowerCase() === 'cod' && !codCollected)}
              onClick={handleConfirmDelivery}
            >
              <Check size={20} />
              {submitting ? 'Confirming in Database...' : 'CONFIRM HANDOVER & MARK DELIVERED'}
            </button>
          </div>
        )}

        {/* 3. Delivery Completed Success Celebration Screen */}
        {deliveredSuccess && (
          <div className="deliverySuccessView">
            <div className="deliverySuccessIcon">
              <Check size={42} />
            </div>
            <h2>Order Handed Over Successfully!</h2>
            <p>
              Order <b>#{deliveredSuccess.orderId}</b> has been verified and marked as <b>DELIVERED</b> in real-time.
              {deliveredSuccess.isCod && ' Payment has been recorded as PAID.'}
            </p>
            <button type="button" className="scanNextBtn" onClick={handleNextScan}>
              <Camera size={18} />
              Scan Next Package
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
