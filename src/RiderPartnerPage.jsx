import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, Smartphone, MapPin, CheckCircle2, Navigation, 
  QrCode, WifiOff, Boxes, Wallet, ArrowRight, Phone, 
  HelpCircle, ShieldCheck, Award, Bike, Calendar, 
  DollarSign, AlertCircle, ExternalLink, FileText, 
  ChevronDown, ChevronUp, MessageCircle, Check, 
  Upload, Eye, Clock, X, AlertTriangle, Shield, ShieldAlert,
  Zap, ArrowUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode';
import ThemeToggle from './ThemeToggle';
import './rider-partner.css';

export default function RiderPartnerPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [dailyDrops, setDailyDrops] = useState(18);

  // KYC Modal States
  const [showKycGateModal, setShowKycGateModal] = useState(false);
  const [kycTab, setKycTab] = useState('submit'); // 'submit' | 'status'
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [kycSubmittedData, setKycSubmittedData] = useState(null);

  // Checking status state
  const [statusQuery, setStatusQuery] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusResult, setStatusResult] = useState(null);

  // Verified state from localStorage
  const [isVerifiedRider, setIsVerifiedRider] = useState(() => {
    try {
      return localStorage.getItem('motodc_partner_verified') === 'true';
    } catch {
      return false;
    }
  });

  const [verifiedPartnerData, setVerifiedPartnerData] = useState(() => {
    try {
      const saved = localStorage.getItem('motodc_partner_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Scroll to Top visibility state
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Desktop / Laptop QR Code Download Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Device detection: identify smartphones vs laptops/desktops/tablets
  const isPhoneDevice = () => {
    if (typeof window === 'undefined') return false;
    const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
    const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(ua);
    if (isTablet) return false;
    return /mobi|android.*mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua);
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock background scroll when KYC form modal or QR modal is active
  useEffect(() => {
    if (showKycGateModal || showQrModal) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [showKycGateModal, showQrModal]);

  // Generate QR Code pointing to full APK download URL
  useEffect(() => {
    try {
      const origin = typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://motodc-official.vercel.app';
      const fullApkUrl = APK_DOWNLOAD_URL.startsWith('http') ? APK_DOWNLOAD_URL : `${origin}${APK_DOWNLOAD_URL}`;

      QRCode.toDataURL(fullApkUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#05070c',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.warn('QR Code generation error:', err));
    } catch (e) {
      console.warn('QR Code error:', e);
    }
  }, []);

  // KYC Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    serviceMode: 'Standard',
    vehicleType: 'Motorcycle',
    vehicleNumber: '',
    licenseNumber: '',
    dlPhoto: '',
    rcPhoto: '',
  });

  const dlInputRef = useRef(null);
  const rcInputRef = useRef(null);

  // App version constant - automatically synchronized across QR code, download URL, and release badges
  const LATEST_APP_VERSION = '1.0.31';
  const GITHUB_RELEASE_APK_URL = `https://github.com/nishanth2k08-bot/MOTODC-APP/releases/download/v${LATEST_APP_VERSION}/MotoDC-Partner.apk`;
  const LOCAL_MIRROR_APK_URL = `/MotoDC-Partner.apk?v=${LATEST_APP_VERSION}`;
  const APK_DOWNLOAD_URL = GITHUB_RELEASE_APK_URL;
  const WHATSAPP_ONBOARDING_URL = 'https://wa.me/918903993371?text=Hello%20MotoDC,%20I%20have%20submitted%20my%20KYC%20documents%20for%20delivery%20partner%20onboarding.';

  // Helper to compress uploaded image using Canvas
  const processImageFile = (file, callback) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG/JPG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDlUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        setFormData((prev) => ({ ...prev, dlPhoto: dataUrl }));
        toast.success('Driving License photo attached');
      });
    }
  };

  const handleRcUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        setFormData((prev) => ({ ...prev, rcPhoto: dataUrl }));
        toast.success('Vehicle RC photo attached');
      });
    }
  };

  // Trigger real download for approved riders (used on mobile phones)
  const triggerApkDownload = () => {
    toast.success('Starting MotoDC Partner APK download...', { id: 'apk-download-toast', duration: 4000 });
    const link = document.createElement('a');
    link.href = APK_DOWNLOAD_URL;
    link.setAttribute('download', 'MotoDC-Partner.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Device-aware app download handler:
  // - On phones: directly downloads the APK
  // - On laptops / desktops: displays QR code popup modal so they can scan with phone
  const handleDownloadApp = () => {
    if (isPhoneDevice()) {
      setShowKycGateModal(false);
      triggerApkDownload();
    } else {
      setShowKycGateModal(false);
      setShowQrModal(true);
    }
  };

  // Mandatory KYC Gate Handler
  const handleInstallClick = () => {
    if (isVerifiedRider) {
      handleDownloadApp();
      return;
    }

    // Show KYC Gate modal
    setShowKycGateModal(true);
  };

  // Submit KYC form
  const handleSubmitKyc = async (e) => {
    e.preventDefault();
    const cleanName = formData.name.trim();
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    const cleanEmail = formData.email.trim();

    if (!cleanName) {
      toast.error('Please enter your full name');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!formData.licenseNumber && !formData.dlPhoto) {
      toast.error('Please provide your Driving License number or photo proof');
      return;
    }

    setSubmittingKyc(true);
    try {
      const res = await fetch('/api/delivery-auth?action=submit-kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit KYC documents');
      }

      setKycSubmittedData(data);
      toast.success('KYC documents submitted successfully!');
    } catch (err) {
      toast.error(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmittingKyc(false);
    }
  };

  // Auto-fill demo candidate details and sample proofs for frictionless workflow testing
  const handleAutoFillDemo = async () => {
    try {
      toast.loading('Loading demo details and proofs...', { id: 'demo-fill' });
      const [dlRes, rcRes] = await Promise.all([
        fetch('/sample-dl-vignesh.png').then(r => r.blob()),
        fetch('/sample-rc-vignesh.png').then(r => r.blob()),
      ]);

      const toBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const [dlBase64, rcBase64] = await Promise.all([toBase64(dlRes), toBase64(rcRes)]);

      setFormData({
        name: 'Vignesh Pandian',
        phone: '9840881234',
        email: 'vignesh.moto@gmail.com',
        serviceMode: 'Standard',
        vehicleType: 'Motorcycle',
        vehicleNumber: 'PY-02-DN-8491',
        licenseNumber: 'PY02 20230067182',
        dlPhoto: dlBase64,
        rcPhoto: rcBase64,
      });

      toast.success('Demo details & proofs filled! Ready to submit.', { id: 'demo-fill' });
    } catch (err) {
      toast.error('Could not load demo files', { id: 'demo-fill' });
    }
  };

  // Reset saved rider session from browser localStorage
  const handleResetVerifiedSession = () => {
    localStorage.removeItem('motodc_partner_verified');
    localStorage.removeItem('motodc_partner_data');
    setIsVerifiedRider(false);
    setVerifiedPartnerData(null);
    setStatusResult(null);
    toast.success('Rider session cleared. You can now register or verify another rider.');
  };

  // Check KYC status by phone or email
  const handleCheckStatus = async (e) => {
    e?.preventDefault();
    const q = statusQuery.trim();
    if (!q) {
      toast.error('Please enter your registered mobile number or email');
      return;
    }

    if (/^\d+$/.test(q) && q.length !== 10) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }

    setCheckingStatus(true);
    setStatusResult(null);
    try {
      const res = await fetch(`/api/delivery-auth?action=check-kyc-status&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Status check failed');
      }

      setStatusResult(data);

      if (data.canInstall && data.status === 'approved') {
        setIsVerifiedRider(true);
        setVerifiedPartnerData(data);
        localStorage.setItem('motodc_partner_verified', 'true');
        localStorage.setItem('motodc_partner_data', JSON.stringify(data));
        toast.success(`KYC Approved! Welcome, ${data.name || 'Partner'}!`, { id: 'kyc-approved-toast', duration: 4000 });

        // Laptop / Desktop: Automatically show QR code modal so rider can scan with mobile phone
        // Phone: Never show QR code modal; user stays on screen and downloads APK directly
        if (!isPhoneDevice()) {
          setShowKycGateModal(false);
          setShowQrModal(true);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error checking verification status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Earnings estimates
  const baseEarnings = dailyDrops * 45;
  const weeklyEarnings = baseEarnings * 6;
  const monthlyEarnings = weeklyEarnings * 4;

  const faqs = [
    {
      q: "Why do I need KYC verification before installing the partner app?",
      a: "To ensure safety and security for vehicle spare part deliveries, all MotoDC delivery partners undergo a quick verification of their Driving License and Vehicle RC. Once verified by our fleet team, you can immediately download and log in to the Partner App."
    },
    {
      q: "How long does KYC verification take?",
      a: "Our Karaikal Fleet Operations team reviews submitted documents within 2 to 4 hours during working hours (8:00 AM to 8:30 PM). You will receive an email confirmation and can also check status anytime on this page."
    },
    {
      q: "How and when do I get paid for my deliveries?",
      a: "MotoDC pays every delivery partner via direct NEFT / IMPS bank transfer every Friday. You earn ₹45 per completed drop, plus distance bonuses, peak incentives, and keep 100% of customer tips."
    },
    {
      q: "Can I deliver part-time or choose my own working hours?",
      a: "Yes! We offer flexible shifts for part-time riders (Morning Garage Shift 9:00 AM - 1:30 PM, Evening Rush Shift 3:30 PM - 8:00 PM) as well as full-time daily run sheets."
    },
    {
      q: "What if a Cash-on-Delivery (COD) customer wants to pay via UPI?",
      a: "The MotoDC Partner App features a built-in Dynamic NPCI UPI QR code. Simply tap 'Show UPI QR' inside the app during delivery. The customer can scan using GPay, PhonePe, Paytm, or BHIM, and your shift cash balance updates automatically!"
    },
    {
      q: "What happens if I lose mobile internet signal in a garage basement?",
      a: "No problem at all! The app includes Offline-First Handover Sync. You can verify the customer PIN and complete drops offline. When your phone reconnects to 4G/5G, all handovers sync automatically to the central server."
    }
  ];

  return (
    <div className="riderPartnerRoot">
      {/* Top Isolated Navigation Bar - Clean MotoDC branding without badges */}
      <header className="partnerNavbar">
        <div className="partnerNavContainer">
          <div className="partnerBrand">
            <div 
              className="partnerBrandLogoWrap" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              title="MotoDC Delivery Partner Fleet"
              role="button"
              tabIndex={0}
            >
              <img 
                src="/motodc-new-logo.webp?v=4" 
                alt="MotoDC Delivery Fleet" 
                className="partnerHeaderLogoImg" 
              />
            </div>
          </div>

          {/* TOP RIGHT "INSTALL APP" BUTTON (Clean high-contrast text, version tag removed) */}
          <div className="partnerTopActions">
            <ThemeToggle />
            {isVerifiedRider ? (
              <button 
                type="button" 
                className="installTopBtn verifiedBtn" 
                onClick={handleDownloadApp}
                aria-label="Download MotoDC Partner APK"
              >
                <Download size={18} className="installBtnIcon" />
                <span className="installBtnText">Download APK</span>
              </button>
            ) : (
              <button 
                type="button" 
                className="installTopBtn" 
                onClick={handleInstallClick}
                aria-label="Install MotoDC Partner App"
              >
                <Download size={18} className="installBtnIcon" />
                <span className="installBtnText">Install App</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="partnerHero">
        <div className="partnerHeroGlow partnerHeroGlow1" />
        <div className="partnerHeroGlow partnerHeroGlow2" />

        <div className="partnerHeroContainer">
          <div className="partnerHeroBadge">
            <span className="livePulsingDot" aria-hidden="true" />
            <Zap size={14} className="badgeZapIcon" />
            <span className="badgeGradientText">EXPRESS AUTOMOTIVE DELIVERY NETWORK</span>
            <span className="badgeNetworkTag">24/7 ACTIVE</span>
          </div>

          <h1 className="partnerHeroTitle">
            Earn <span className="highlightRed">₹45 / Drop</span> Delivering<br />
            Genuine Vehicle Spare Parts
          </h1>

          <p className="partnerHeroSub">
            Join MotoDC as an independent two-wheeler delivery partner in Karaikal. Enjoy flexible shifts, 
            instant turn-by-turn motorcycle routes, weekly Friday bank deposits, and 100% of all customer tips.
          </p>

          <div className="partnerHeroCtaGroup">
            {isVerifiedRider ? (
              <button type="button" className="heroCtaPrimary" onClick={handleDownloadApp}>
                <Download size={20} />
                <span className="heroCtaText">Download Partner App (APK)</span>
              </button>
            ) : (
              <button type="button" className="heroCtaPrimary" onClick={handleInstallClick}>
                <Download size={20} />
                <span className="heroCtaText">Install Partner App (Android)</span>
              </button>
            )}

            <button 
              type="button" 
              className="heroCtaSecondary" 
              onClick={() => {
                setKycTab('submit');
                setShowKycGateModal(true);
              }}
            >
              <ShieldCheck size={20} />
              <span className="heroCtaSecondaryText">Apply for KYC Verification</span>
            </button>
          </div>

          {isVerifiedRider && (
            <div className="verifiedRiderNoticeBanner">
              <CheckCircle2 size={18} />
              <span>
                Verified Delivery Partner: <strong>{verifiedPartnerData?.name || 'Driver'}</strong> ({verifiedPartnerData?.partnerCode || 'Approved'}). App download is unlocked!
              </span>
              <button
                type="button"
                className="switchRiderBtn"
                onClick={handleResetVerifiedSession}
                title="Clear saved rider from this browser to register or check another rider"
              >
                Switch / New Rider
              </button>
            </div>
          )}

          {/* Quick Perks Strip */}
          <div className="partnerPerksStrip">
            <div className="perkItem">
              <div className="perkIconWrap"><DollarSign size={20} /></div>
              <div className="perkDetails">
                <strong>₹45 Base Payout</strong>
                <small>Per completed drop</small>
              </div>
            </div>
            <div className="perkDivider" />
            <div className="perkItem">
              <div className="perkIconWrap"><Calendar size={20} /></div>
              <div className="perkDetails">
                <strong>Weekly Payouts</strong>
                <small>Every Friday direct to bank</small>
              </div>
            </div>
            <div className="perkDivider" />
            <div className="perkItem">
              <div className="perkIconWrap"><Navigation size={20} /></div>
              <div className="perkDetails">
                <strong>2-Wheeler Routing</strong>
                <small>Live Google Maps directions</small>
              </div>
            </div>
            <div className="perkDivider" />
            <div className="perkItem">
              <div className="perkIconWrap"><ShieldCheck size={20} /></div>
              <div className="perkDetails">
                <strong>Zero Deposit</strong>
                <small>Free bag & ID kit</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Features Spotlight (Built for Riders) */}
      <section className="partnerSection partnerFeaturesSection">
        <div className="sectionContainer">
          <div className="sectionHeader">
            <p className="sectionEyebrow">CUSTOM DRIVER TECHNOLOGY</p>
            <h2 className="sectionTitle">Built Specially for Motorcycle Delivery</h2>
            <p className="sectionSubtitle">
              We developed our native Android Partner App from the ground up to solve daily driver hassles.
            </p>
          </div>

          <div className="featuresGrid">
            <div className="featureCard featureCardHot">
              <div className="featureCardIcon">
                <Navigation size={28} />
              </div>
              <h3>1-Tap Two-Wheeler Google Maps</h3>
              <p>
                Launches Google Maps turn-by-turn directions instantly optimized for two-wheelers, avoiding traffic jams 
                and taking bike-accessible shortcuts to workshops and homes.
              </p>
              <span className="featureBadge">Motorcycle Mode</span>
            </div>

            <div className="featureCard">
              <div className="featureCardIcon">
                <QrCode size={28} />
              </div>
              <h3>Doorstep Dynamic UPI QR Code</h3>
              <p>
                No cash change? No problem. Display an NPCI-compliant UPI QR code on your phone screen. Customers can scan 
                with Google Pay, PhonePe, Paytm, or BHIM for instant verified settlement.
              </p>
              <span className="featureBadge">Zero Cash Hassle</span>
            </div>

            <div className="featureCard">
              <div className="featureCardIcon">
                <Boxes size={28} />
              </div>
              <h3>1-Scan Multi-Parcel Batch Handover</h3>
              <p>
                Delivering 5 different boxes to the same garage or mechanic? Scan them all into your Batch Tray and 
                complete the entire delivery with just 1 single customer PIN.
              </p>
              <span className="featureBadge">Fast Workshop Drops</span>
            </div>

            <div className="featureCard">
              <div className="featureCardIcon">
                <WifiOff size={28} />
              </div>
              <h3>Offline Handover Sync</h3>
              <p>
                Works seamlessly in basement garages, underground parking, and industrial dead zones. Complete drops offline; 
                the app safely queues records and auto-syncs when you regain signal.
              </p>
              <span className="featureBadge">Dead-Zone Proof</span>
            </div>

            <div className="featureCard">
              <div className="featureCardIcon">
                <Wallet size={28} />
              </div>
              <h3>Shift Cash HUD & Denomination Counter</h3>
              <p>
                Built-in banknote tally counter (₹500, ₹200, ₹100, ₹50) keeps your cash collections 100% accurate. 
                Generate an instant WhatsApp cashier reconciliation slip at end of shift.
              </p>
              <span className="featureBadge">100% Accurate Cash</span>
            </div>

            <div className="featureCard">
              <div className="featureCardIcon">
                <Smartphone size={28} />
              </div>
              <h3>Lightweight Android App (Under 5 MB)</h3>
              <p>
                Fast, battery-optimized, and works smoothly on budget Android smartphones (Android 7.0+). Does not drain 
                battery or waste mobile data during all-day delivery runs.
              </p>
              <span className="featureBadge">Battery Friendly</span>
            </div>
          </div>
        </div>
      </section>

      {/* Earnings Estimator */}
      <section className="partnerSection partnerEarningsSection">
        <div className="sectionContainer">
          <div className="earningsCard">
            <div className="earningsHeader">
              <div>
                <span className="earningsBadge">TRANSPARENT PAYOUTS</span>
                <h2>Estimate Your MotoDC Weekly Earnings</h2>
                <p>Calculate your take-home pay based on your daily completed spare part deliveries.</p>
              </div>
              <div className="payoutDayPill">
                <Calendar size={18} />
                <span>Weekly Bank Transfer Every Friday</span>
              </div>
            </div>

            <div className="earningsInteractive">
              <div className="sliderArea">
                <div className="sliderLabels">
                  <span>Daily Drops: <strong>{dailyDrops} parcels</strong></span>
                  <span className="calcRate">@ ₹45 / drop base pay</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="35" 
                  value={dailyDrops} 
                  onChange={(e) => setDailyDrops(Number(e.target.value))}
                  className="dropsSlider"
                  aria-label="Daily drops slider"
                />
                <div className="sliderTicks">
                  <button 
                    type="button" 
                    className={`sliderTickBtn ${dailyDrops === 8 ? 'active' : ''}`}
                    onClick={() => setDailyDrops(8)}
                    title="Quick select: 8 drops per day"
                  >
                    Part-Time (8 drops)
                  </button>
                  <button 
                    type="button" 
                    className={`sliderTickBtn ${dailyDrops === 18 ? 'active' : ''}`}
                    onClick={() => setDailyDrops(18)}
                    title="Quick select: 18 drops per day"
                  >
                    Standard (18 drops)
                  </button>
                  <button 
                    type="button" 
                    className={`sliderTickBtn ${dailyDrops === 30 ? 'active' : ''}`}
                    onClick={() => setDailyDrops(30)}
                    title="Quick select: 30 drops per day"
                  >
                    Power Rider (30 drops)
                  </button>
                </div>
              </div>

              <div className="earningsDisplayGrid">
                <div className="earningBox">
                  <small>Daily Payout</small>
                  <strong>₹{baseEarnings.toLocaleString('en-IN')}</strong>
                  <span>Per working day</span>
                </div>
                <div className="earningBox earningBoxHighlight">
                  <small>Weekly Bank Deposit</small>
                  <strong>₹{weeklyEarnings.toLocaleString('en-IN')}</strong>
                  <span>Paid every Friday</span>
                </div>
                <div className="earningBox">
                  <small>Estimated Monthly</small>
                  <strong>₹{monthlyEarnings.toLocaleString('en-IN')}*</strong>
                  <span>+ Distance & Peak bonuses</span>
                </div>
              </div>
            </div>

            <div className="earningsFooterNote">
              <AlertCircle size={16} />
              <span>
                *Estimates based on 6 days/week. Actual earnings may be higher with garage multi-box incentives, 
                customer cash tips (100% kept by rider), and monsoon rain surge bonuses.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility & Requirements */}
      <section className="partnerSection partnerRequirementsSection">
        <div className="sectionContainer">
          <div className="sectionHeader">
            <p className="sectionEyebrow">WHAT YOU NEED TO JOIN</p>
            <h2 className="sectionTitle">Simple Eligibility Checklist</h2>
            <p className="sectionSubtitle">
              Get onboarded and start delivering within 24 hours once your KYC is approved.
            </p>
          </div>

          <div className="requirementsGrid">
            <div className="requirementCard">
              <div className="reqNumber">1</div>
              <div className="reqContent">
                <h3>Two-Wheeler Vehicle</h3>
                <p>Any motorcycle, scooter, or gearless two-wheeler in roadworthy condition.</p>
                <div className="reqDocs">
                  <span><CheckCircle2 size={14} /> RC Book / Smart Card</span>
                  <span><CheckCircle2 size={14} /> Valid Vehicle Insurance</span>
                </div>
              </div>
            </div>

            <div className="requirementCard">
              <div className="reqNumber">2</div>
              <div className="reqContent">
                <h3>Valid Driving License</h3>
                <p>Permanent MCWG (Motor Cycle with Gear) or standard two-wheeler license.</p>
                <div className="reqDocs">
                  <span><CheckCircle2 size={14} /> Age 18 Years or above</span>
                  <span><CheckCircle2 size={14} /> Valid original or DigiLocker DL</span>
                </div>
              </div>
            </div>

            <div className="requirementCard">
              <div className="reqNumber">3</div>
              <div className="reqContent">
                <h3>Android Smartphone</h3>
                <p>A functioning smartphone with GPS location and camera for barcode scanning.</p>
                <div className="reqDocs">
                  <span><CheckCircle2 size={14} /> Android 7.0 or higher</span>
                  <span><CheckCircle2 size={14} /> Active 4G/5G data connection</span>
                </div>
              </div>
            </div>

            <div className="requirementCard">
              <div className="reqNumber">4</div>
              <div className="reqContent">
                <h3>Bank Account & PAN</h3>
                <p>For direct weekly electronic payout transfer every Friday without delay.</p>
                <div className="reqDocs">
                  <span><CheckCircle2 size={14} /> Bank Passbook / Cheque</span>
                  <span><CheckCircle2 size={14} /> PAN Card copy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Easy Steps to Join */}
      <section className="partnerSection partnerStepsSection">
        <div className="sectionContainer">
          <div className="sectionHeader">
            <p className="sectionEyebrow">EASY ONBOARDING</p>
            <h2 className="sectionTitle">How to Become a MotoDC Rider</h2>
            <p className="sectionSubtitle">
              Follow 3 straightforward steps to start receiving delivery runs today.
            </p>
          </div>

          <div className="stepsGrid">
            <div className="stepCard">
              <div className="stepBadge">STEP 01</div>
              <h3>Submit KYC Verification</h3>
              <p>
                Fill in your contact details and upload clear photos of your Driving License and Vehicle RC.
              </p>
              <button 
                type="button" 
                className="stepActionBtn" 
                onClick={() => {
                  setKycTab('submit');
                  setShowKycGateModal(true);
                }}
              >
                <ShieldCheck size={16} /> Submit Documents
              </button>
            </div>

            <div className="stepCard">
              <div className="stepBadge">STEP 02</div>
              <h3>Admin Review & Approval</h3>
              <p>
                Our Karaikal Fleet Operations team verifies your proofs and generates your unique Rider Code (MDC-XXXX).
              </p>
              <button 
                type="button" 
                className="stepActionBtn stepActionBtnSecondary"
                onClick={() => {
                  setKycTab('status');
                  setShowKycGateModal(true);
                }}
              >
                <Clock size={16} /> Check Status
              </button>
            </div>

            <div className="stepCard">
              <div className="stepBadge">STEP 03</div>
              <h3>Download App & Start Earning</h3>
              <p>
                Once approved, download the MotoDC Partner APK, collect your delivery kit at Karaikal Hub, and hit the road!
              </p>
              <div className="hubLocationBadge">
                <MapPin size={15} />
                <span>Karaikal Central Depot</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="partnerSection partnerFaqSection">
        <div className="sectionContainer">
          <div className="sectionHeader">
            <p className="sectionEyebrow">QUESTIONS & ANSWERS</p>
            <h2 className="sectionTitle">Frequently Asked Questions</h2>
            <p className="sectionSubtitle">
              Everything you need to know about KYC, shifts, and app installation.
            </p>
          </div>

          <div className="faqAccordion">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className={`faqItem ${openFaq === idx ? 'faqOpen' : ''}`}
                onClick={() => toggleFaq(idx)}
              >
                <div className="faqQuestion">
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                {openFaq === idx && (
                  <div className="faqAnswer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hub Location & Contact Card */}
      <section className="partnerSection partnerContactSection">
        <div className="sectionContainer">
          <div className="contactCard">
            <div className="contactDetails">
              <h2>Visit Our Fleet Depot</h2>
              <p className="contactAddress">
                <MapPin size={18} className="contactIcon" />
                <span>
                  <strong>MotoDC Central Logistics Hub</strong><br />
                  Main Road, Near Town Bus Stand, Karaikal, Puducherry - 609602
                </span>
              </p>
              <p className="contactPhone">
                <Phone size={18} className="contactIcon" />
                <span>Fleet Support Hotline: <strong>+91 89039 93371</strong></span>
              </p>
              <p className="contactHours">
                <Calendar size={18} className="contactIcon" />
                <span>Depot Hours: Monday – Saturday (8:00 AM – 8:30 PM)</span>
              </p>
            </div>

            <div className="contactActions">
              <a 
                href={WHATSAPP_ONBOARDING_URL} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="contactWhatsappBtn"
              >
                <MessageCircle size={22} />
                <div>
                  <strong>Chat with Fleet Manager</strong>
                  <small>Get instant answers on WhatsApp</small>
                </div>
              </a>
              <button 
                type="button" 
                className="contactDownloadBtn" 
                onClick={handleInstallClick}
              >
                <ShieldCheck size={20} className="contactDownloadIcon" />
                <span className="contactDownloadBtnText">
                  {isVerifiedRider ? 'Download Partner App APK' : 'Verify KYC & Install App'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =======================================================================
          MANDATORY USER SPEC: KYC VERIFICATION GATE POPUP MODAL
          ======================================================================= */}
      {showKycGateModal && (
        <div className="modalOverlay" onClick={() => setShowKycGateModal(false)}>
          <div className="modalContent kycGateModalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitleWrap">
                <ShieldAlert size={24} className="highlightRed" />
                <div>
                  <h3>KYC registration is not completed</h3>
                  <p className="modalSub">App installation requires verified delivery partner status</p>
                </div>
              </div>
              <button 
                type="button" 
                className="modalCloseBtn" 
                onClick={() => setShowKycGateModal(false)}
                aria-label="Close KYC modal"
              >
                ×
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="kycModalTabs">
              <button 
                type="button" 
                className={`kycModalTab ${kycTab === 'submit' ? 'active' : ''}`}
                onClick={() => setKycTab('submit')}
              >
                <FileText size={16} /> 1. Submit KYC Proofs
              </button>
              <button 
                type="button" 
                className={`kycModalTab ${kycTab === 'status' ? 'active' : ''}`}
                onClick={() => setKycTab('status')}
              >
                <Clock size={16} /> 2. Check Verification Status
              </button>
            </div>

            <div className="modalBody">
              {/* TAB 1: SUBMIT KYC DOCUMENTS */}
              {kycTab === 'submit' && (
                <>
                  {kycSubmittedData ? (
                    <div className="kycSuccessState">
                      <div className="kycSuccessIcon"><Check size={32} /></div>
                      <h4>Documents Received Successfully!</h4>
                      <div className="kycRefPill">
                        Application Ref: <strong>{kycSubmittedData.applicationId}</strong>
                      </div>
                      <p className="kycSuccessMsg">
                        {kycSubmittedData.message || 'Your KYC documents have been received and you can download the partner app after verification. Thank you for joining as a MotoDC delivery partner!'}
                      </p>

                      <div className="emailConfirmNote">
                        <AlertCircle size={16} />
                        <span>A confirmation notice has been dispatched to your email address. Our Karaikal fleet admin will review your proofs shortly.</span>
                      </div>

                      <div className="kycSuccessActions">
                        <button 
                          type="button" 
                          className="modalDoneBtn"
                          onClick={() => {
                            setKycTab('status');
                            setStatusQuery(formData.phone || formData.email);
                          }}
                        >
                          Check Application Status
                        </button>
                        <a 
                          href={WHATSAPP_ONBOARDING_URL} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="heroCtaSecondary"
                          style={{ padding: '10px 18px', fontSize: '14px' }}
                        >
                          <MessageCircle size={16} /> WhatsApp Fleet Manager
                        </a>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitKyc} className="kycForm">
                      <div className="kycFormNotice">
                        <AlertTriangle size={18} className="warnIcon" />
                        <div>
                          <strong>Verification Required Before Installation</strong>
                          <p>Upload clear photos of your Driving License and Vehicle RC. Our admin team will verify and approve your account.</p>
                        </div>
                      </div>

                      <div className="kycFormGrid">
                        <label className="kycField">
                          <span>Full Name (as on Driving License) *</span>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. S. Karthik" 
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </label>

                        <label className="kycField">
                          <span>Mobile Number (for App OTP) *</span>
                          <input 
                            type="tel" 
                            required 
                            maxLength={10}
                            placeholder="10-digit mobile number" 
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </label>

                        <label className="kycField">
                          <span>Email Address (for Status Updates) *</span>
                          <input 
                            type="email" 
                            required 
                            placeholder="e.g. karthik@gmail.com" 
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </label>

                        <label className="kycField">
                          <span>Vehicle Type</span>
                          <select 
                            value={formData.vehicleType}
                            onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                          >
                            <option value="Motorcycle">Motorcycle / Bike (with Gear)</option>
                            <option value="Scooter">Scooter / Scooty (Gearless)</option>
                            <option value="Electric">Electric Two-Wheeler (EV)</option>
                          </select>
                        </label>

                        <label className="kycField">
                          <span>Planned Mode of Service *</span>
                          <select 
                            value={formData.serviceMode || 'Standard'}
                            onChange={(e) => setFormData({ ...formData, serviceMode: e.target.value })}
                          >
                            <option value="Part-Time">Part-Time (~8 drops/day · 2–4 hrs)</option>
                            <option value="Standard">Standard (~18 drops/day · Full-Day)</option>
                            <option value="Power Rider">Power Rider (~30 drops/day · High-Volume)</option>
                          </select>
                        </label>

                        <label className="kycField">
                          <span>Vehicle Registration Plate No. *</span>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. PY-02-AB-1234" 
                            value={formData.vehicleNumber}
                            onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                          />
                        </label>

                        <label className="kycField">
                          <span>Driving License Number *</span>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. PY02 20180012345" 
                            value={formData.licenseNumber}
                            onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                          />
                        </label>
                      </div>

                      {/* Document Uploads */}
                      <div className="kycUploadsRow">
                        <div className="kycUploadBox">
                          <span>Driving License Proof *</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            ref={dlInputRef} 
                            style={{ display: 'none' }}
                            onChange={handleDlUpload}
                          />
                          {formData.dlPhoto ? (
                            <div className="proofThumbnailWrap">
                              <img src={formData.dlPhoto} alt="Driving License Preview" className="proofThumb" />
                              <button 
                                type="button" 
                                className="changeProofBtn" 
                                onClick={() => dlInputRef.current?.click()}
                              >
                                Change Photo
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button" 
                              className="uploadProofBtn" 
                              onClick={() => dlInputRef.current?.click()}
                            >
                              <Upload size={18} />
                              <span>Attach Driving License Photo</span>
                            </button>
                          )}
                        </div>

                        <div className="kycUploadBox">
                          <span>Vehicle RC Book / Smart Card Proof *</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            ref={rcInputRef} 
                            style={{ display: 'none' }}
                            onChange={handleRcUpload}
                          />
                          {formData.rcPhoto ? (
                            <div className="proofThumbnailWrap">
                              <img src={formData.rcPhoto} alt="RC Preview" className="proofThumb" />
                              <button 
                                type="button" 
                                className="changeProofBtn" 
                                onClick={() => rcInputRef.current?.click()}
                              >
                                Change Photo
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button" 
                              className="uploadProofBtn" 
                              onClick={() => rcInputRef.current?.click()}
                            >
                              <Upload size={18} />
                              <span>Attach Vehicle RC Photo</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="kycFormFooter">
                        <button 
                          type="submit" 
                          className="kycSubmitBtn"
                          disabled={submittingKyc}
                        >
                          {submittingKyc ? 'Submitting Proofs...' : 'Submit Documents for Verification'}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {/* TAB 2: CHECK KYC STATUS */}
              {kycTab === 'status' && (
                <div className="kycStatusTabBody">
                  <div className="statusSearchWrap">
                    <p>Enter your 10-digit mobile number, email, or application ID to check if your KYC has been verified:</p>
                    <form onSubmit={handleCheckStatus} className="statusSearchForm">
                      <input 
                        type="text" 
                        placeholder="10-digit mobile number, email, or KYC ID..." 
                        value={statusQuery}
                        maxLength={40}
                        onChange={(e) => {
                          const val = e.target.value;
                          // If numeric (mobile number), strictly cap at 10 digits
                          if (/^\d+$/.test(val)) {
                            if (val.length <= 10) setStatusQuery(val);
                          } else {
                            if (val.length <= 40) setStatusQuery(val);
                          }
                        }}
                        required
                      />
                      <button type="submit" disabled={checkingStatus}>
                        {checkingStatus ? 'Checking...' : 'Check Status'}
                      </button>
                    </form>
                  </div>

                  {statusResult && (
                    <div className="statusResultCard">
                      {statusResult.status === 'approved' && (
                        <div className="statusBanner approvedBanner">
                          <CheckCircle2 size={28} />
                          <div>
                            <h4>KYC Registration Approved! 🎉</h4>
                            <p>
                              Welcome to MotoDC Fleet, <strong>{statusResult.name}</strong>! Your account is active.
                              {statusResult.partnerCode && (
                                <> Assigned Rider Code: <strong>{statusResult.partnerCode}</strong></>
                              )}
                            </p>
                            <button 
                              type="button" 
                              className="unlockedDownloadBtn" 
                              onClick={handleDownloadApp}
                            >
                              <Download size={18} /> Download MotoDC Partner APK
                            </button>
                          </div>
                        </div>
                      )}

                      {statusResult.status === 'pending' && (
                        <div className="statusBanner pendingBanner">
                          <Clock size={28} />
                          <div>
                            <h4>Verification Under Review</h4>
                            <p>
                              Hello <strong>{statusResult.name || 'Applicant'}</strong>, your KYC documents are currently being checked by our Karaikal Fleet Admin.
                            </p>
                            <small>You will be able to download the partner app as soon as your proofs are approved.</small>
                          </div>
                        </div>
                      )}

                      {statusResult.status === 'rejected' && (
                        <div className="statusBanner rejectedBanner">
                          <AlertTriangle size={28} />
                          <div>
                            <h4>KYC Documents Declined</h4>
                            <p>Reason: {statusResult.rejectionReason || 'Proofs were unclear or expired.'}</p>
                            <button 
                              type="button" 
                              className="resubmitBtn"
                              onClick={() => setKycTab('submit')}
                            >
                              Re-Upload Clear Documents
                            </button>
                          </div>
                        </div>
                      )}

                      {statusResult.status === 'not_found' && (
                        <div className="statusBanner notFoundBanner">
                          <AlertCircle size={28} />
                          <div>
                            <h4>No Application Found</h4>
                            <p>We could not find any KYC application registered with this mobile number or email.</p>
                            <button 
                              type="button" 
                              className="resubmitBtn"
                              onClick={() => setKycTab('submit')}
                            >
                              Submit KYC Application Now
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          QR CODE DOWNLOAD MODAL FOR LAPTOPS / DESKTOPS
          (Only triggered on laptops/desktops, never on mobile phones)
          ======================================================================= */}
      {showQrModal && (
        <div className="modalOverlay" onClick={() => setShowQrModal(false)}>
          <div className="modalContent qrDownloadModalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitleWrap">
                <QrCode size={24} className="highlightRed" />
                <div>
                  <h3>Scan to Download Partner App</h3>
                  <p className="modalSub">Install directly on your Android smartphone</p>
                </div>
              </div>
              <button 
                type="button" 
                className="modalCloseBtn" 
                onClick={() => setShowQrModal(false)}
                aria-label="Close QR modal"
              >
                ×
              </button>
            </div>

            <div className="modalBody qrModalBody">
              <div className="qrNoticeBox">
                <Smartphone size={18} className="qrNoticeIcon" />
                <span>
                  Delivery runs require an Android smartphone for barcode scanning and live GPS routing. Please scan this QR code with your mobile camera to download the app.
                </span>
              </div>

              {verifiedPartnerData && (
                <div className="qrVerifiedRiderBadge">
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>
                    Verified Partner: <strong>{verifiedPartnerData.name || 'Rider'}</strong>
                    {verifiedPartnerData.partnerCode || verifiedPartnerData.riderCode 
                      ? ` • Code: ${verifiedPartnerData.partnerCode || verifiedPartnerData.riderCode}` 
                      : ''}
                  </span>
                </div>
              )}

              <div className="qrCodeFrameWrap">
                <div className="qrCodeFrame">
                  {qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Scan QR code with your phone to download MotoDC Partner App APK" 
                      className="qrCodeImg" 
                    />
                  ) : (
                    <div className="qrCodePlaceholder">Generating QR Code...</div>
                  )}
                  <div className="qrFrameCorner qrCornerTL" />
                  <div className="qrFrameCorner qrCornerTR" />
                  <div className="qrFrameCorner qrCornerBL" />
                  <div className="qrFrameCorner qrCornerBR" />
                </div>
                <div className="qrVersionTag">
                  <Download size={13} />
                  <span>Latest Release • MotoDC-Partner.apk (v{LATEST_APP_VERSION} - Latest)</span>
                </div>
              </div>

              <div className="qrInstructionSteps">
                <div className="qrStepItem">
                  <span className="qrStepNum">1</span>
                  <span>Open the <strong>Camera</strong> or <strong>QR Scanner / Google Lens</strong> on your Android phone</span>
                </div>
                <div className="qrStepItem">
                  <span className="qrStepNum">2</span>
                  <span>Point your phone camera at this QR code on your screen</span>
                </div>
                <div className="qrStepItem">
                  <span className="qrStepNum">3</span>
                  <span>Tap the detected link to download & install the latest MotoDC Partner APK</span>
                </div>
              </div>

              <div className="qrModalFooter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={APK_DOWNLOAD_URL}
                    download="MotoDC-Partner.apk"
                    style={{
                      color: '#ff3157',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Download size={14} /> Download APK (v{LATEST_APP_VERSION})
                  </a>
                  <a
                    href={LOCAL_MIRROR_APK_URL}
                    download="MotoDC-Partner.apk"
                    style={{
                      color: '#94a3b8',
                      fontSize: '11px',
                      textDecoration: 'underline'
                    }}
                    title="Direct Download from Vercel Server"
                  >
                    Vercel Mirror
                  </a>
                </div>
                <button 
                  type="button" 
                  className="modalDoneBtn"
                  onClick={() => setShowQrModal(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Install Bar */}
      <aside className="mobileStickyInstallBar" aria-label="Quick App Download">
        <div className="stickyBarInner">
          <div className="stickyBarInfo">
            <strong className="stickyBarTitle">MotoDC Partner App</strong>
            <small className="stickyBarSub">Android • Karaikal Fleet</small>
          </div>
          <button 
            type="button" 
            className="stickyInstallBtn" 
            onClick={handleInstallClick}
          >
            <Download size={18} />
            <span className="stickyInstallText">{isVerifiedRider ? 'Download APK' : 'Install App'}</span>
          </button>
        </div>
      </aside>

      {/* Isolated Partner Footer (Zero Links to Consumer Store) */}
      <footer className="partnerFooter">
        <div className="partnerFooterContainer">
          <div className="footerBrand">
            <span className="footerLogo">Moto<span className="logoRed">DC</span></span>
            <p>Empowering local motorcycle delivery partners with fast payouts and cutting-edge logistics technology.</p>
          </div>

          <div className="footerInfoBlock">
            <h4>Fleet Operations</h4>
            <p>Central Logistics Hub, Karaikal, Puducherry - 609602</p>
            <p>Hotline: +91 89039 93371 (Mon - Sat, 8 AM - 8:30 PM)</p>
          </div>

          <div className="footerLegalBlock">
            <p>© {new Date().getFullYear()} MotoDC Fleet Operations. All rights reserved.</p>
            <small>This portal is exclusively dedicated to MotoDC Two-Wheeler Delivery Partners.</small>
          </div>
        </div>
      </footer>

      {/* Scroll Up Button - exact same as MotoDC website BackToTop */}
      {showScrollTop && (
        <button
          type="button"
          className="backToTopBtn"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          title="Back to top"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
