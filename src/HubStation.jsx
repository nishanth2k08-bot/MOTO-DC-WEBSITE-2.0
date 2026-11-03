import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  Clock,
  MapPin,
  Barcode,
  Truck,
  ShieldCheck,
  Copy,
  Layers,
  Radio,
  Lock,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import './hub-station.css';

export default function HubStation() {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock update (every second)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute canonical mobile Hub Terminal URL
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const hubMobileAppUrl = `${origin}/hub-app`;

  // Dynamically generate the QR Code pointing directly to the mobile Hub Station App
  useEffect(() => {
    if (!origin) return;
    try {
      QRCode.toDataURL(hubMobileAppUrl, {
        width: 220,
        margin: 1,
        color: {
          dark: '#05070b',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.warn('QR Code generation error:', err));
    } catch (e) {
      console.warn('QR Code generation exception:', e);
    }
  }, [hubMobileAppUrl, origin]);

  // Lock background scroll when QR modal is active
  useEffect(() => {
    if (showQrModal) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [showQrModal]);

  // Operational shift status check: 7:00 AM – 8:30 PM IST (Daily)
  const isShiftOpen = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    const shiftStart = 7 * 60; // 07:00 AM
    const shiftEnd = 20 * 60 + 30; // 08:30 PM (20:30)
    return currentMinutes >= shiftStart && currentMinutes < shiftEnd;
  };

  const handleCopyLink = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(hubMobileAppUrl);
      setCopiedLink(true);
      toast.success('Mobile Hub App link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="hubStationContainer">
      <div className="hubStationInner">
        
        {/* ================================================================= */}
        {/* 1. HERO & STATION IDENTITY BANNER                                 */}
        {/* ================================================================= */}
        <section className="hubHeroCard">
          <div className="hubHeroBadgeRow">
            <span className="hubBadge hubBadgePrimary">
              <MapPin size={12} /> Karaikal Central Logistics HQ • HUB-KKL-01
            </span>
            <span className={`hubBadge ${isShiftOpen() ? 'hubBadgeSuccess' : 'hubBadgeWarning'}`}>
              <Radio size={12} className={isShiftOpen() ? 'hubPulseDot' : ''} />
              {isShiftOpen() ? 'Live Operations Active (7:00 AM – 8:30 PM)' : 'Shift Closed (Auto-Lock Active)'}
            </span>
            <span className="hubBadge hubBadgeMuted">
              <Clock size={12} /> {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="hubHeroContent">
            <div className="hubHeroText">
              <h1>
                Karaikal Hub <span>Fulfillment Station</span>
              </h1>
              <p className="hubHeroSubtitle">
                Official warehouse dispatch facility for Karaikal district. Parcel staging racks,
                thermal barcode labeling, and courier handovers are conducted via the handheld mobile terminal.
              </p>
            </div>

            {/* Primary Action: Install Hub App on Phone (Laptop / PC Gateway) */}
            <div className="hubHeroActions">
              <button
                type="button"
                className="hubInstallAppBtn"
                onClick={() => setShowQrModal(true)}
                aria-label="Install MotoDC Hub Mobile App on Phone"
              >
                <div className="hubInstallBtnIcon">
                  <Smartphone size={22} />
                </div>
                <div className="hubInstallBtnText">
                  <span className="hubInstallBtnTitle">Install Hub App</span>
                  <span className="hubInstallBtnSubtitle">Scan QR to Open on Phone</span>
                </div>
                <div className="hubInstallBtnBadge">
                  <QrCode size={18} />
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 2. MOBILE FULFILLMENT TRANSITION NOTICE                           */}
        {/* ================================================================= */}
        <section className="hubTransitionNotice">
          <div className="hubNoticeIconWrap">
            <Smartphone size={24} />
          </div>
          <div className="hubNoticeBody">
            <h3>Handheld Mobile Operations Standard</h3>
            <p>
              To maintain high mobility across warehouse shelves and support direct barcode scanners,
              all order staging, thermal shipping label printing, and rider parcel handovers are conducted
              on the handheld <strong>MotoDC Hub Mobile App</strong>.
            </p>
            <div className="hubNoticePills">
              <span><Barcode size={13} /> Dual Barcode Scanner (Hardware Wedge + 60FPS Camera)</span>
              <span><Layers size={13} /> 4-Corridor Geographic Rack Staging</span>
              <span><ShieldCheck size={13} /> 8:30 PM Shift Auto-Lock Security</span>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3. ESSENTIAL HUB DETAILS GRID                                     */}
        {/* ================================================================= */}
        <section className="hubDetailsGrid">
          
          {/* Card 1: Station Information */}
          <div className="hubDetailCard">
            <div className="hubCardHeader">
              <div className="hubCardIconBox hubIconBlue">
                <MapPin size={20} />
              </div>
              <div>
                <h3>Station Information</h3>
                <small>Facility Details & Geography</small>
              </div>
            </div>
            <div className="hubCardContent">
              <div className="hubInfoRow">
                <span className="hubInfoLabel">Facility Name</span>
                <span className="hubInfoValue">Karaikal Central Warehouse</span>
              </div>
              <div className="hubInfoRow">
                <span className="hubInfoLabel">Station Code</span>
                <span className="hubInfoValue hubHighlightCode">HUB-KKL-01</span>
              </div>
              <div className="hubInfoRow">
                <span className="hubInfoLabel">Physical Address</span>
                <span className="hubInfoValue">
                  14, Perumal Koil Street, Nedungadu, Karaikal, Puducherry - 609603
                </span>
              </div>
              <div className="hubInfoRow">
                <span className="hubInfoLabel">Dispatch Radius</span>
                <span className="hubInfoValue">All Karaikal + Nagore Transit Borders</span>
              </div>
            </div>
          </div>

          {/* Card 2: Operating Shift & Security (Secret PIN omitted for security) */}
          <div className="hubDetailCard">
            <div className="hubCardHeader">
              <div className="hubCardIconBox hubIconAmber">
                <Clock size={20} />
              </div>
              <div>
                <h3>Operating Shift & Access</h3>
                <small>Terminal Authorization & Shift Rules</small>
              </div>
            </div>
            <div className="hubCardContent">
              <div className="hubInfoRow">
                <span className="hubInfoLabel">Operating Hours</span>
                <span className="hubInfoValue">07:00 AM – 08:30 PM IST (Daily)</span>
              </div>
              <div className="hubInfoRow">
                <span className="hubInfoLabel">Shift Cutoff Time</span>
                <span className="hubInfoValue">08:30 PM IST (Overnight Security Lock)</span>
              </div>
              <div className="hubInfoRow">
                <span className="hubInfoLabel">Terminal Access</span>
                <span className="hubInfoValue">
                  <Lock size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  Confidential Staff PIN (Issued Internally)
                </span>
              </div>
              <div className="hubInfoRow">
                <span className="hubInfoLabel">Staff Clearance</span>
                <span className="hubInfoValue">Authorized MotoDC Warehouse Personnel</span>
              </div>
            </div>
          </div>

          {/* Card 3: 4 Active Corridor Staging Racks */}
          <div className="hubDetailCard">
            <div className="hubCardHeader">
              <div className="hubCardIconBox hubIconGreen">
                <Layers size={20} />
              </div>
              <div>
                <h3>Staging Racks & Corridors</h3>
                <small>Geographic Parcel Segregation</small>
              </div>
            </div>
            <div className="hubCardContent">
              <div className="hubRackItem">
                <div className="hubRackBadge">Rack A • CTC-01</div>
                <div className="hubRackText">
                  <strong>Central Town Corridor</strong>
                  <p>Karaikal Port, Church Road, Market Area, Beach Road</p>
                </div>
              </div>
              <div className="hubRackItem">
                <div className="hubRackBadge">Rack B • NRC-02</div>
                <div className="hubRackText">
                  <strong>Neravy - TR Pattinam Coastal</strong>
                  <p>Polagam, Vizhidiyur, Vanjore, Southern Coastal Belt</p>
                </div>
              </div>
              <div className="hubRackItem">
                <div className="hubRackBadge">Rack C • SRC-03</div>
                <div className="hubRackText">
                  <strong>Nedungadu - Kottucherry</strong>
                  <p>Thirunallar, Ambagarathur, Kurumbagaram, Western Sector</p>
                </div>
              </div>
              <div className="hubRackItem">
                <div className="hubRackBadge">Rack D • WTC-04</div>
                <div className="hubRackText">
                  <strong>Nagore Border Express Transit</strong>
                  <p>National Highway Corridor, Inter-district Handover</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Terminal Hardware & Scanner Specs */}
          <div className="hubDetailCard">
            <div className="hubCardHeader">
              <div className="hubCardIconBox hubIconPurple">
                <Barcode size={20} />
              </div>
              <div>
                <h3>Hardware & Scanner Specs</h3>
                <small>Barcode & Printing Standards</small>
              </div>
            </div>
            <div className="hubCardContent">
              <div className="hubInfoRow">
                <span className="hubInfoLabel">Handheld Scanners</span>
                <span className="hubInfoValue">Bluetooth / USB HID Keyboard Wedge</span>
              </div>
              <div className="hubInfoRow">
                <span className="hubInfoLabel">Phone Camera Scanner</span>
                <span className="hubInfoValue">60 FPS Auto-Focus with Laser Reticle</span>
              </div>
              <div className="hubInfoRow">
                <span className="hubInfoLabel">Barcode Symbology</span>
                <span className="hubInfoValue">1D Code-128 & 2D QR Code Compatible</span>
              </div>
              <div className="hubInfoRow">
                <span className="hubInfoLabel">Thermal Label Printing</span>
                <span className="hubInfoValue">4×6 Inch Standard Shipping Consignment</span>
              </div>
            </div>
          </div>

        </section>

        {/* ================================================================= */}
        {/* 4. CLEAN MOBILE TERMINAL ACCESS BANNER                            */}
        {/* ================================================================= */}
        <section className="hubVersionBanner">
          <div className="hubVersionLeft">
            <h2>
              MotoDC Hub <span>Mobile Terminal</span>
            </h2>
            <p>
              Point your Android phone camera at the QR code to open the fulfillment station
              and install it directly to your home screen for high-speed warehouse barcode scanning.
            </p>
          </div>

          <div className="hubVersionRight">
            <button
              type="button"
              className="hubShowQrActionBtn"
              onClick={() => setShowQrModal(true)}
            >
              <QrCode size={18} /> Show QR Code
            </button>
            <button
              type="button"
              className="hubCopyLinkBtn"
              onClick={handleCopyLink}
            >
              {copiedLink ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
              {copiedLink ? 'Link Copied!' : 'Copy Mobile Link'}
            </button>
          </div>
        </section>

      </div>

      {/* ================================================================= */}
      {/* 5. QR CODE INSTALLATION MODAL (Fits Screen Perfectly)             */}
      {/* ================================================================= */}
      {showQrModal && (
        <div className="hubQrModalOverlay" onClick={() => setShowQrModal(false)}>
          <div className="hubQrModal" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="hubQrModalHeader">
              <div className="hubQrModalTitle">
                <div className="hubQrModalIconBox">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3>Scan to Install Hub App</h3>
                  <p>Point phone camera to launch MotoDC Hub on your phone</p>
                </div>
              </div>
              <button
                type="button"
                className="hubQrModalCloseBtn"
                onClick={() => setShowQrModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* QR Code Presentation Frame (Compact & Centered) */}
            <div className="hubQrModalBody">
              <div className="hubQrCodeWrapper">
                <div className="hubQrCodeBox">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Scan QR Code to open MotoDC Hub Terminal"
                      className="hubQrCodeImg"
                    />
                  ) : (
                    <div className="hubQrLoading">Generating QR code...</div>
                  )}

                  {/* Corner bracket guides */}
                  <div className="hubQrCorner hubCornerTL" />
                  <div className="hubQrCorner hubCornerTR" />
                  <div className="hubQrCorner hubCornerBL" />
                  <div className="hubQrCorner hubCornerBR" />
                </div>

                <div className="hubQrVersionBadge">
                  <Smartphone size={13} />
                  <span>MotoDC Hub Warehouse Terminal</span>
                </div>
              </div>

              {/* Step-by-Step Scan Instructions (Compact) */}
              <div className="hubQrSteps">
                <div className="hubQrStepItem">
                  <span className="hubStepCircle">1</span>
                  <span>Open <strong>Camera</strong> or <strong>Google Lens</strong> on your mobile phone</span>
                </div>

                <div className="hubQrStepItem">
                  <span className="hubStepCircle">2</span>
                  <span>Point at this QR code & tap the link to launch the <strong>MotoDC Hub Terminal</strong></span>
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="hubQrModalFooter">
              <button
                type="button"
                className="hubQrModalCopyBtn"
                onClick={handleCopyLink}
              >
                {copiedLink ? <CheckCircle2 size={15} color="#10b981" /> : <Copy size={15} />}
                {copiedLink ? 'Link Copied!' : 'Copy Mobile Link'}
              </button>

              <button
                type="button"
                className="hubQrModalDoneBtn"
                onClick={() => setShowQrModal(false)}
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
