import React, { useState } from 'react';
import { 
  Download, Smartphone, MapPin, CheckCircle2, Navigation, 
  QrCode, WifiOff, Boxes, Wallet, ArrowRight, Phone, 
  HelpCircle, ShieldCheck, Award, Bike, Calendar, 
  DollarSign, AlertCircle, ExternalLink, FileText, 
  ChevronDown, ChevronUp, MessageCircle 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import './rider-partner.css';

export default function RiderPartnerPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [downloadModal, setDownloadModal] = useState(false);
  const [dailyDrops, setDailyDrops] = useState(18);

  const APK_DOWNLOAD_URL = '/MotoDC-Partner.apk';
  const GITHUB_FALLBACK_URL = 'https://github.com/nishanth2k08-bot/MOTODC-APP/releases/latest/download/MotoDC-Partner.apk';
  const WHATSAPP_ONBOARDING_URL = 'https://wa.me/918903993371?text=Hello%20MotoDC,%20I%20want%20to%20join%20as%20a%20Delivery%20Partner.%20Please%20guide%20me%20with%20onboarding.';

  const handleInstallClick = (e) => {
    // Show download guidance
    toast.success('Starting MotoDC Partner APK download...', { duration: 4000 });
    setDownloadModal(true);
    
    // Create invisible anchor to trigger direct browser download
    const link = document.createElement('a');
    link.href = APK_DOWNLOAD_URL;
    link.setAttribute('download', 'MotoDC-Partner.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Earnings estimates
  const baseEarnings = dailyDrops * 45;
  const weeklyEarnings = baseEarnings * 6; // 6 day week
  const monthlyEarnings = weeklyEarnings * 4;

  const faqs = [
    {
      q: "How do I install the MotoDC Partner APK on my Android phone?",
      a: "Tap the 'Install App' button on the top right. Once the APK finishes downloading, tap on the notification or open your phone's 'Downloads' folder. If prompted with 'File might be harmful' or 'Blocked from unknown source', tap 'Download anyway' and enable 'Allow from this source' in your Android Settings. Then tap 'Install'."
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
    },
    {
      q: "What documents do I need to start delivering?",
      a: "You only need 4 things: 1) A valid two-wheeler Driving License, 2) Bike Registration Certificate (RC) & Insurance, 3) Android smartphone (Android 7.0+), and 4) Bank passbook / UPI details for weekly payouts."
    }
  ];

  return (
    <div className="riderPartnerRoot">
      {/* Top Isolated Navigation Bar */}
      <header className="partnerNavbar">
        <div className="partnerNavContainer">
          <div className="partnerBrand">
            <div className="partnerLogoBadge">
              <span className="logoMain">Moto<span className="logoRed">DC</span></span>
              <span className="partnerTag">PARTNER FLEET</span>
            </div>
            <div className="partnerHubBadge">
              <span className="pulseDot" />
              <span>Karaikal Logistics Hub</span>
            </div>
          </div>

          {/* TOP RIGHT "INSTALL APP" BUTTON - MANDATORY USER SPEC */}
          <div className="partnerTopActions">
            <button 
              type="button" 
              className="installTopBtn" 
              onClick={handleInstallClick}
              aria-label="Install MotoDC Partner App"
            >
              <Download size={18} className="installBtnIcon" />
              <span className="installBtnText">Install App</span>
              <span className="installBtnVersion">v1.0.9 APK</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="partnerHero">
        <div className="partnerHeroGlow partnerHeroGlow1" />
        <div className="partnerHeroGlow partnerHeroGlow2" />

        <div className="partnerHeroContainer">
          <div className="partnerHeroBadge">
            <Bike size={16} />
            <span>EXPRESS AUTOMOTIVE DELIVERY NETWORK</span>
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
            <button type="button" className="heroCtaPrimary" onClick={handleInstallClick}>
              <Download size={20} />
              <span>Install Partner App (Android)</span>
            </button>
            <a 
              href={WHATSAPP_ONBOARDING_URL} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="heroCtaSecondary"
            >
              <MessageCircle size={20} />
              <span>Fast Track on WhatsApp</span>
              <ExternalLink size={15} />
            </a>
          </div>

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
                  <span>Part-Time (8 drops)</span>
                  <span>Standard (18 drops)</span>
                  <span>Power Rider (30 drops)</span>
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
              Get onboarded and start delivering within 24 hours if you have these 4 basic items.
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
              No complicated interviews. Follow 3 straightforward steps to start receiving runs today.
            </p>
          </div>

          <div className="stepsGrid">
            <div className="stepCard">
              <div className="stepBadge">STEP 01</div>
              <h3>Download & Install App</h3>
              <p>
                Click <strong>"Install App"</strong> in the top right to download our official Android APK 
                file directly to your mobile phone.
              </p>
              <button type="button" className="stepActionBtn" onClick={handleInstallClick}>
                <Download size={16} /> Download APK
              </button>
            </div>

            <div className="stepCard">
              <div className="stepBadge">STEP 02</div>
              <h3>WhatsApp Your Documents</h3>
              <p>
                Snap a clear photo of your Driving License, Bike RC, and Bank Passbook and send it 
                to our Karaikal Fleet Onboarding Manager.
              </p>
              <a 
                href={WHATSAPP_ONBOARDING_URL} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="stepActionBtn stepActionBtnSecondary"
              >
                <MessageCircle size={16} /> Send via WhatsApp
              </a>
            </div>

            <div className="stepCard">
              <div className="stepBadge">STEP 03</div>
              <h3>Collect Bag & Start Delivering</h3>
              <p>
                Visit our Karaikal Logistics Hub to collect your official waterproof delivery bag, receive your 
                login OTP, and take your first parcel run!
              </p>
              <div className="hubLocationBadge">
                <MapPin size={15} />
                <span>Karaikal Hub, Puducherry</span>
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
              Everything you need to know about working with MotoDC Fleet.
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
              <span className="contactTag">LOCAL KARAIKAL OPERATIONS</span>
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
              <button type="button" className="contactDownloadBtn" onClick={handleInstallClick}>
                <Download size={20} />
                <span>Download Partner App APK</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* APK Installation Guide Modal */}
      {downloadModal && (
        <div className="modalOverlay" onClick={() => setDownloadModal(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitleWrap">
                <Smartphone size={24} className="highlightRed" />
                <h3>Installing MotoDC Partner APK</h3>
              </div>
              <button 
                type="button" 
                className="modalCloseBtn" 
                onClick={() => setDownloadModal(false)}
                aria-label="Close installation guide"
              >
                ×
              </button>
            </div>

            <div className="modalBody">
              <p className="modalIntro">
                Your browser should automatically start downloading <strong>MotoDC-Partner.apk</strong> (4.99 MB).
              </p>

              <div className="installStepsList">
                <div className="installStepItem">
                  <span className="installStepNum">1</span>
                  <div>
                    <strong>Tap "Download anyway"</strong>
                    <p>Android displays a standard prompt for APK files downloaded outside Google Play. Tap "Download anyway".</p>
                  </div>
                </div>

                <div className="installStepItem">
                  <span className="installStepNum">2</span>
                  <div>
                    <strong>Open the Downloaded File</strong>
                    <p>When the download finishes, tap the notification or open Chrome's Downloads menu and tap <strong>MotoDC-Partner.apk</strong>.</p>
                  </div>
                </div>

                <div className="installStepItem">
                  <span className="installStepNum">3</span>
                  <div>
                    <strong>Enable "Allow from this source"</strong>
                    <p>If your phone asks for permission, toggle "Allow from this source" in Settings, then tap <strong>Install</strong>.</p>
                  </div>
                </div>
              </div>

              <div className="modalFallback">
                <p>Didn't download automatically?</p>
                <div className="modalFallbackLinks">
                  <a href={APK_DOWNLOAD_URL} download="MotoDC-Partner.apk" className="modalLinkBtn">
                    Direct Server Download
                  </a>
                  <a href={GITHUB_FALLBACK_URL} target="_blank" rel="noopener noreferrer" className="modalLinkBtn secondary">
                    GitHub Release Mirror
                  </a>
                </div>
              </div>
            </div>

            <div className="modalFooter">
              <button type="button" className="modalDoneBtn" onClick={() => setDownloadModal(false)}>
                Got It, Thank You!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Install Bar */}
      <aside className="mobileStickyInstallBar" aria-label="Quick App Download">
        <div className="stickyBarInner">
          <div className="stickyBarInfo">
            <strong>MotoDC Partner App</strong>
            <small>v1.0.9 • 4.99 MB • Android</small>
          </div>
          <button type="button" className="stickyInstallBtn" onClick={handleInstallClick}>
            <Download size={18} />
            <span>Install App</span>
          </button>
        </div>
      </aside>

      {/* Isolated Partner Footer (Zero Links to Consumer Store) */}
      <footer className="partnerFooter">
        <div className="partnerFooterContainer">
          <div className="footerBrand">
            <span className="footerLogo">Moto<span className="logoRed">DC</span></span>
            <span className="footerTag">DELIVERY PARTNER NETWORK</span>
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
    </div>
  );
}
