import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  QrCode,
  CheckCircle2,
  Clock,
  MapPin,
  Barcode,
  Truck,
  ShieldCheck,
  Copy,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
  Radio,
  FileText,
  Key,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import './hub-station.css';

// Default fallback version configuration
const DEFAULT_VERSION_CONFIG = {
  version: '1.0.1',
  buildNumber: 2,
  appName: 'MotoDC Hub Station',
  packageId: 'com.motodc.hub',
  apkFileName: 'MotoDC-Hub.apk',
  apkUrl: '/MotoDC-Hub.apk?v=1.0.1',
  updatedAt: new Date().toISOString(),
  fileSize: '5.5 MB',
  minAndroidVersion: 'Android 8.0 (Oreo) or later',
  releaseNotes: 'Karaikal Warehouse Fulfillment App with dual barcode scanner support (Hardware USB/Bluetooth Wedge + Camera 60FPS Laser Reticle), real-time Firestore synchronization, corridor rack staging, and 8:30 PM shift security.'
};

export default function HubStation() {
  const [versionInfo, setVersionInfo] = useState(DEFAULT_VERSION_CONFIG);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock update (every second)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch the latest version manifest dynamically whenever the page loads
  // Ensures the QR code and download links ALWAYS show the newest version
  useEffect(() => {
    let isMounted = true;
    const fetchLatestVersion = async () => {
      try {
        const res = await fetch(`/hub-version.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.version) {
            setVersionInfo(data);
          }
        }
      } catch (err) {
        console.warn('Could not fetch dynamic hub-version.json, using bundled version:', err);
      }
    };

    fetchLatestVersion();
    return () => { isMounted = false; };
  }, []);

  // Compute canonical download URL
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const fullApkDownloadUrl = `${origin}/MotoDC-Hub.apk?v=${encodeURIComponent(versionInfo.version)}`;
  const installPortalUrl = `${origin}/hub/install`;

  // Dynamically regenerate the QR Code whenever versionInfo changes
  useEffect(() => {
    if (!origin) return;
    try {
      QRCode.toDataURL(fullApkDownloadUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#05070b',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.warn('QR Code generation error:', err));
    } catch (e) {
      console.warn('QR Code generation exception:', e);
    }
  }, [fullApkDownloadUrl, origin]);

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
      navigator.clipboard.writeText(fullApkDownloadUrl);
      setCopiedLink(true);
      toast.success('App download link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleDirectDownload = () => {
    toast.success(`Starting download: MotoDC-Hub.apk (v${versionInfo.version})`, { duration: 4000 });
    const link = document.createElement('a');
    link.href = fullApkDownloadUrl;
    link.setAttribute('download', 'MotoDC-Hub.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatLastUpdated = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Latest';
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

            {/* Primary CTA: Install App Button */}
            <div className="hubHeroActions">
              <button
                type="button"
                className="hubInstallAppBtn"
                onClick={() => setShowQrModal(true)}
                aria-label="Install MotoDC Hub Mobile App"
              >
                <div className="hubInstallBtnIcon">
                  <Smartphone size={22} />
                </div>
                <div className="hubInstallBtnText">
                  <span className="hubInstallBtnTitle">Install Hub App</span>
                  <span className="hubInstallBtnSubtitle">
                    Scan QR to Install • v{versionInfo.version}
                  </span>
                </div>
                <div className="hubInstallBtnBadge">
                  <QrCode size={16} />
                </div>
              </button>

              <button
                type="button"
                className="hubDirectDownloadBtn"
                onClick={handleDirectDownload}
                title="Download APK directly to your computer or phone"
              >
                <Download size={16} /> Direct APK ({versionInfo.fileSize || '5.5 MB'})
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
              To maintain high mobility on the warehouse floor and support direct hardware barcode scanners,
              all order staging, thermal shipping label printing, and rider parcel transfers are conducted
              exclusively on the <strong>MotoDC Hub Mobile App</strong>.
            </p>
            <div className="hubNoticePills">
              <span><Zap size={13} /> Dual Barcode Scanner (Hardware Wedge + 60FPS Camera)</span>
              <span><Layers size={13} /> 4-Corridor Geographic Rack Staging</span>
              <span><ShieldCheck size={13} /> 8:30 PM Shift Auto-Lock Security</span>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3. ESSENTIAL HUB DETAILS GRID                                     */}
        {/* ================================================================= */}
        <section className="hubDetailsGrid">
          
          {/* Card 1: Station Identity */}
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

          {/* Card 2: Operating Shift & Security */}
          <div className="hubDetailCard">
            <div className="hubCardHeader">
              <div className="hubCardIconBox hubIconAmber">
                <Clock size={20} />
              </div>
              <div>
                <h3>Operating Shift & PIN</h3>
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
                <span className="hubInfoLabel">Default Station PIN</span>
                <span className="hubInfoValue hubHighlightCode">
                  <Key size={13} style={{ display: 'inline', marginRight: 4 }} />
                  1234
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
        {/* 4. DYNAMIC APP VERSION & UPDATE CARD                              */}
        {/* ================================================================= */}
        <section className="hubVersionBanner">
          <div className="hubVersionLeft">
            <div className="hubVersionPill">
              <Sparkles size={14} /> Production Build • Always Up-to-Date
            </div>
            <h2>
              MotoDC Hub Fulfillment App <span>v{versionInfo.version}</span>
            </h2>
            <p>
              Whenever an update or bug fix is committed, the QR code automatically encodes
              and delivers the latest build with cache-busting version tags.
            </p>
            <div className="hubVersionMetaRow">
              <span><strong>Updated:</strong> {formatLastUpdated(versionInfo.updatedAt)}</span>
              <span><strong>Package:</strong> {versionInfo.packageId}</span>
              <span><strong>Size:</strong> {versionInfo.fileSize || '5.5 MB'}</span>
              <span><strong>Compatibility:</strong> {versionInfo.minAndroidVersion}</span>
            </div>
          </div>

          <div className="hubVersionRight">
            <button
              type="button"
              className="hubShowQrActionBtn"
              onClick={() => setShowQrModal(true)}
            >
              <QrCode size={18} /> Show Install QR Code
            </button>
            <button
              type="button"
              className="hubCopyLinkBtn"
              onClick={handleCopyLink}
            >
              {copiedLink ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
              {copiedLink ? 'Link Copied!' : 'Copy Direct Link'}
            </button>
          </div>
        </section>

      </div>

      {/* ================================================================= */}
      {/* 5. QR CODE INSTALLATION MODAL                                     */}
      {/* ================================================================= */}
      {showQrModal && (
        <div className="hubQrModalOverlay" onClick={() => setShowQrModal(false)}>
          <div className="hubQrModal" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="hubQrModalHeader">
              <div className="hubQrModalTitle">
                <div className="hubQrModalIconBox">
                  <Smartphone size={22} />
                </div>
                <div>
                  <h3>Scan to Install Hub App</h3>
                  <p>Instant Android installation for warehouse floor staff</p>
                </div>
              </div>
              <button
                type="button"
                className="hubQrModalCloseBtn"
                onClick={() => setShowQrModal(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* QR Code Presentation Frame */}
            <div className="hubQrModalBody">
              <div className="hubQrCodeWrapper">
                <div className="hubQrCodeBox">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt={`Scan QR Code to install MotoDC Hub App v${versionInfo.version}`}
                      className="hubQrCodeImg"
                    />
                  ) : (
                    <div className="hubQrLoading">Generating latest QR code...</div>
                  )}

                  {/* High-tech corner bracket guides */}
                  <div className="hubQrCorner hubCornerTL" />
                  <div className="hubQrCorner hubCornerTR" />
                  <div className="hubQrCorner hubCornerBL" />
                  <div className="hubQrCorner hubCornerBR" />
                </div>

                <div className="hubQrVersionBadge">
                  <Download size={13} />
                  <span>Latest Release: MotoDC-Hub.apk (v{versionInfo.version})</span>
                </div>
              </div>

              {/* Step-by-Step Scan Instructions */}
              <div className="hubQrSteps">
                <div className="hubQrStepItem">
                  <div className="hubStepCircle">1</div>
                  <div className="hubStepText">
                    <strong>Open Camera or Google Lens</strong>
                    <p>Open the camera app or QR code scanner on any Android phone.</p>
                  </div>
                </div>

                <div className="hubQrStepItem">
                  <div className="hubStepCircle">2</div>
                  <div className="hubStepText">
                    <strong>Point at the QR Code</strong>
                    <p>Align the camera with this screen. A direct download prompt will pop up.</p>
                  </div>
                </div>

                <div className="hubQrStepItem">
                  <div className="hubStepCircle">3</div>
                  <div className="hubStepText">
                    <strong>Tap to Install</strong>
                    <p>Tap the banner to download and install. Allow "Install unknown apps" if prompted.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="hubQrModalFooter">
              <button
                type="button"
                className="hubQrModalDownloadBtn"
                onClick={handleDirectDownload}
              >
                <Download size={16} /> Download APK (v{versionInfo.version})
              </button>

              <button
                type="button"
                className="hubQrModalCopyBtn"
                onClick={handleCopyLink}
              >
                {copiedLink ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                {copiedLink ? 'Copied' : 'Copy Link'}
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
