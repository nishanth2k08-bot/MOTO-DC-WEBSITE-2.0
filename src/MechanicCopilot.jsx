import React, { useState, useMemo, useEffect } from 'react';
import { Search, Wrench, ShieldAlert, CheckCircle2, Clock, ArrowRight, ShoppingCart, Sparkles, AlertTriangle, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

// Diagnostic Knowledge Base
const SYMPTOMS_DATABASE = [
  {
    id: 'brake-squeal',
    title: 'High-Pitched Brake Squeal or Metal Grinding',
    category: 'Braking',
    categoryIcon: '🛑',
    icon: '🛑',
    keywords: ['brake', 'squeal', 'grinding', 'noise', 'stopping', 'pads', 'rotor'],
    rootCause: 'Worn Friction Lining & Glazed Rotor Surface',
    probability: 95,
    severity: 'High (Immediate Service Recommended)',
    severityType: 'danger',
    description: 'When brake friction pads wear past the 2mm wear indicator shim, metal-on-metal contact scores the disc rotor, causing high-frequency screeching and compromised stopping distance.',
    diyDifficulty: 'Moderate (DIY Friendly)',
    diyTime: '35 - 45 mins',
    toolsRequired: ['10mm / 12mm Hex Socket', 'Caliper Piston Spreader', 'Brake Parts Cleaner', 'Torque Wrench'],
    bundleName: 'Complete Stopping Power Refresh Kit',
    bundleProducts: [
      { name: 'Ceramic High-Friction Brake Pads', price: 899, query: 'brake pad' },
      { name: 'Cross-Drilled Ventilated Disc Rotor', price: 2199, query: 'disc rotor' },
      { name: 'Brembo DOT 4 Racing Brake Fluid 500ml', price: 449, query: 'brake fluid' }
    ]
  },
  {
    id: 'engine-misfire',
    title: 'Engine Sputtering, Hesitation & Misfire at High RPM',
    category: 'Engine',
    categoryIcon: '⚡',
    icon: '⚡',
    keywords: ['misfire', 'sputter', 'hesitation', 'spark', 'rpm', 'plug', 'ignition'],
    rootCause: 'Fouled Spark Plug Electrodes or Weak Ignition Coil',
    probability: 92,
    severity: 'Medium (May damage catalytic converter)',
    severityType: 'warning',
    description: 'Carbon deposits or widened spark plug gaps prevent consistent combustion under cylinder load, causing unburnt fuel, jerkiness, and loss of top-end power.',
    diyDifficulty: 'Easy (Beginner Friendly)',
    diyTime: '20 - 30 mins',
    toolsRequired: ['16mm Magnetic Spark Plug Socket', 'Extension Bar', 'Wire Feeler Gauge'],
    bundleName: 'Ignition Spark & Combustive Restoration Bundle',
    bundleProducts: [
      { name: 'NGK Laser Iridium Spark Plug (CR9EIX)', price: 680, query: 'spark plug' },
      { name: 'High-Output Performance Ignition Coil', price: 1250, query: 'ignition coil' },
      { name: 'High-Flow Cotton Replacement Air Filter', price: 1450, query: 'air filter' }
    ]
  },
  {
    id: 'clutch-slip',
    title: 'Clutch Slipping: Engine Revs Up But Vehicle Doesn’t Accelerate',
    category: 'Transmission',
    categoryIcon: '⚙️',
    icon: '⚙️',
    keywords: ['clutch', 'slipping', 'acceleration', 'revs', 'gear', 'friction', 'plates'],
    rootCause: 'Worn Clutch Friction Plates & Weakened Diaphragm Springs',
    probability: 94,
    severity: 'High (Vehicle may become undriveable)',
    severityType: 'danger',
    description: 'Friction plates have lost their composite material or contaminated with low-grade engine oil, slipping against the steel pressure plates during peak engine torque transfer.',
    diyDifficulty: 'Advanced (Intermediate Mechanic)',
    diyTime: '1.5 - 2 hours',
    toolsRequired: ['Clutch Holding Tool', '8mm / 10mm T-Handle', 'Impact Driver', 'Fresh Engine Oil'],
    bundleName: 'Heavy-Duty Clutch & Drivetrain Overhaul Kit',
    bundleProducts: [
      { name: 'Kevlar Reinforced Clutch Friction Plate Set', price: 1850, query: 'clutch' },
      { name: 'High-Tension Heavy Duty Clutch Springs', price: 420, query: 'clutch spring' },
      { name: 'Motul 7100 10W50 100% Synthetic 4T Oil', price: 1150, query: 'motul' }
    ]
  },
  {
    id: 'chain-slap',
    title: 'Loud Chain Rattle, Slap & Jerky Low-Speed Acceleration',
    category: 'Drivetrain',
    categoryIcon: '🔗',
    icon: '🔗',
    keywords: ['chain', 'slack', 'rattle', 'sprocket', 'drive', 'jerk', 'teeth'],
    rootCause: 'Excessive Chain Slack & Hooked Sprocket Teeth',
    probability: 96,
    severity: 'Critical (Risk of chain derailment / engine case crack)',
    severityType: 'danger',
    description: 'Drive chains stretch over mileage and sprockets wear into sharp hook shapes. Loose chain links slap against the swingarm slider and introduce backlash during throttle modulation.',
    diyDifficulty: 'Moderate (Standard Workshop)',
    diyTime: '45 - 60 mins',
    toolsRequired: ['Rear Axle Wrench (27mm/32mm)', 'Chain Alignment Tool', 'Chain Clean & Lube'],
    bundleName: 'Solid O-Ring Final Drive Chain & Sprocket Combo',
    bundleProducts: [
      { name: 'Rolon Brass Solid O-Ring Drive Chain 520 Pitch', price: 2390, query: 'chain' },
      { name: 'Hardened Steel Front & Rear Sprocket Set', price: 1680, query: 'sprocket' },
      { name: 'Motul Chain Clean + Lube Touring Duo', price: 890, query: 'motul chain' }
    ]
  },
  {
    id: 'engine-overheat',
    title: 'Engine Temperature Gauge in Redline & Fan Running Continuously',
    category: 'Cooling',
    categoryIcon: '🌡️',
    icon: '🌡️',
    keywords: ['overheat', 'temperature', 'coolant', 'radiator', 'fan', 'hot', 'boiling'],
    rootCause: 'Low Coolant Level, Clogged Radiator Fins or Faulty Thermostat',
    probability: 90,
    severity: 'High (Risk of cylinder head gasket warping)',
    severityType: 'danger',
    description: 'Insufficient liquid cooling efficiency causes thermal expansion beyond safe tolerances. Operating while overheated risks cylinder head warping and catastrophic engine seizure.',
    diyDifficulty: 'Moderate',
    diyTime: '40 mins',
    toolsRequired: ['Funnel', 'Radiator Fin Comb', 'Distilled Water', 'Pliers'],
    bundleName: 'Extreme Heat Radiator & Coolant Flush Bundle',
    bundleProducts: [
      { name: 'Engine Ice High-Performance Coolant 1.89L', price: 1450, query: 'coolant' },
      { name: 'High-Pressure 1.3 Bar Radiator Cap', price: 380, query: 'radiator' },
      { name: 'Radiator Protective Aluminium Grille Guard', price: 950, query: 'radiator guard' }
    ]
  },
  {
    id: 'battery-drain',
    title: 'Starter Clicking Only, Slow Cranking & Dim Headlights at Idle',
    category: 'Electrical',
    categoryIcon: '🔋',
    icon: '🔋',
    keywords: ['battery', 'starting', 'crank', 'click', 'dead', 'stator', 'alternator'],
    rootCause: 'Sulfated 12V Battery Cell or Failing Magneto Stator Coil',
    probability: 91,
    severity: 'Medium (Vehicle stranded)',
    severityType: 'warning',
    description: 'The 12V battery cannot deliver the cold cranking amps (CCA) required by the starter motor pinion, or the charging stator is no longer supplying 14.2V to the regulator rectifier.',
    diyDifficulty: 'Easy',
    diyTime: '20 mins',
    toolsRequired: ['10mm Wrench', 'Digital Multimeter', 'Terminal Grease'],
    bundleName: '12V Cranking & Stator Charging Kit',
    bundleProducts: [
      { name: 'High-CCA Sealed Maintenance-Free AGM Battery', price: 2450, query: 'battery' },
      { name: 'Copper Wound High-Output Magneto Stator Coil', price: 1750, query: 'stator' },
      { name: '6500K Ultra-Bright LED Headlamp Bulb H4/H7', price: 990, query: 'led bulb' }
    ]
  }
];

export default function MechanicCopilot({ isModal = false, onClose }) {
  const nav = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeSymptom, setActiveSymptom] = useState(SYMPTOMS_DATABASE[0]);

  // Categories
  const categories = ['All', 'Braking', 'Engine', 'Transmission', 'Drivetrain', 'Cooling', 'Electrical'];

  // Filtered symptoms
  const filteredSymptoms = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return SYMPTOMS_DATABASE.filter((s) => {
      const matchCat = selectedCategory === 'All' || s.category === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;
      const haystack = [s.title, s.rootCause, s.description, ...s.keywords].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [searchTerm, selectedCategory]);

  const handleSelectSymptom = (s) => {
    setActiveSymptom(s);
  };

  const handleAddBundleToCart = (symptom) => {
    // Add first item directly and notify user
    const p = symptom.bundleProducts[0];
    try {
      const cart = JSON.parse(localStorage.getItem('motodc-cart') || '[]');
      const item = {
        id: `bundle-${symptom.id}`,
        name: `${symptom.bundleName} (${p.name})`,
        price: p.price,
        image: '/motodc-hero.jpg',
        category: symptom.category,
        qty: 1,
        stock: 10
      };
      const existing = cart.findIndex((x) => x.id === item.id);
      if (existing >= 0) cart[existing].qty += 1;
      else cart.push(item);
      localStorage.setItem('motodc-cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartchange'));
      toast.success(`Diagnostic bundle added to cart! (${p.name})`);
    } catch (_) {
      toast.success(`Bundle saved. Navigating to catalog.`);
    }
    nav(`/products?q=${encodeURIComponent(p.query)}`);
  };

  return (
    <div className={isModal ? 'copilotModalContainer' : 'section mechanicCopilotSection'} id={isModal ? undefined : 'ai-mechanic'}>
      {!isModal && (
        <>
          <div className="sectionhead">
            <div>
              <p className="eyebrow">
                <Sparkles size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                MOTODC INTELLIGENT WORKSHOP
              </p>
              <h2>AI Mechanic Copilot: Instant Symptom Diagnosis</h2>
            </div>
            <button type="button" onClick={() => nav('/products')}>
              Explore Full Parts Catalog <ArrowRight size={16} />
            </button>
          </div>

          <p className="copilotSubtitle">
            Don’t know the part number? Describe what your car or motorcycle is doing. Our AI Mechanic diagnoses probable root causes, rates DIY difficulty, and matches precision repair bundles.
          </p>
        </>
      )}

      {/* Main Copilot Card */}
      <div className={`copilotContainer ${isModal ? 'inModal' : ''}`}>
        {/* Search & Category Filter Toolbar */}
        <div className="copilotSearchRow">
          <div className="copilotSearchInputWrap">
            <Search size={18} className="copilotSearchIcon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search symptoms (e.g. squealing noise, engine misfire, clutch slipping, overheating)..."
              className="copilotSearchInput"
              aria-label="Search vehicle symptoms"
            />
            {searchTerm && (
              <button
                type="button"
                className="copilotSearchClear"
                onClick={() => setSearchTerm('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="copilotCategoryPills" role="tablist">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`copilotCategoryPill ${selectedCategory === c ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Master Diagnostic Grid: Left Symptoms List, Right In-Depth Dossier */}
        <div className="copilotGrid">
          {/* Left Symptoms Browser */}
          <div className="copilotSymptomsList">
            <span className="copilotListHeader">OBSERVED VEHICLE SYMPTOMS ({filteredSymptoms.length})</span>
            {filteredSymptoms.length === 0 ? (
              <div className="copilotEmptySearch">
                <AlertTriangle size={24} />
                <p>No symptoms matched "{searchTerm}". Try general terms like "brake", "engine", or "chain".</p>
              </div>
            ) : (
              filteredSymptoms.map((s) => {
                const isSelected = activeSymptom?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`symptomItemCard ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectSymptom(s)}
                  >
                    <div className="symptomIconBadge">{s.categoryIcon}</div>
                    <div className="symptomItemMeta">
                      <div className="symptomItemTop">
                        <span className="symptomCategoryTag">{s.category}</span>
                        <span className="symptomProbBadge">{s.probability}% PROBABILITY</span>
                      </div>
                      <h4 className="symptomItemTitle">{s.title}</h4>
                      <small className="symptomItemCause">Root cause: {s.rootCause}</small>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Live Diagnostic Dossier */}
          {activeSymptom && (
            <div className="copilotDossier">
              {/* Header Box */}
              <div className="dossierTop">
                <div className="dossierHeaderLeft">
                  <div className="dossierCategoryPill">{activeSymptom.category} SYSTEM ANALYSIS</div>
                  <h3 className="dossierTitle">{activeSymptom.title}</h3>
                </div>
                <div className="dossierProbabilityMeter">
                  <span className="meterVal">{activeSymptom.probability}%</span>
                  <span className="meterLabel">AI DIAGNOSTIC CONFIDENCE</span>
                </div>
              </div>

              {/* Diagnosis Summary Card */}
              <div className="dossierCauseCard">
                <div className="causeLabelWrap">
                  <ShieldAlert size={18} className="causeAlertIcon" />
                  <strong>PROBABLE ROOT CAUSE</strong>
                </div>
                <div className="causeHeading">{activeSymptom.rootCause}</div>
                <p className="causeDesc">{activeSymptom.description}</p>
              </div>

              {/* Specs & Metrics Bar */}
              <div className="dossierMetricsGrid">
                <div className="metricBox">
                  <span className="metricTitle"><Clock size={14} /> EST. DIY TIME</span>
                  <strong className="metricValue">{activeSymptom.diyTime}</strong>
                </div>
                <div className="metricBox">
                  <span className="metricTitle"><Wrench size={14} /> DIFFICULTY</span>
                  <strong className="metricValue">{activeSymptom.diyDifficulty}</strong>
                </div>
                <div className="metricBox">
                  <span className="metricTitle"><AlertTriangle size={14} /> RISK LEVEL</span>
                  <strong className={`metricValue severity-${activeSymptom.severityType}`}>
                    {activeSymptom.severity.split('(')[0].trim()}
                  </strong>
                </div>
              </div>

              {/* Garage Tools Required */}
              <div className="dossierToolsSection">
                <span className="dossierSubhead">RECOMMENDED GARAGE TOOLS</span>
                <div className="toolsChipsList">
                  {activeSymptom.toolsRequired.map((t, idx) => (
                    <span key={idx} className="toolChip">
                      <CheckCircle2 size={13} /> {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommended Parts Bundle */}
              <div className="dossierBundleCard">
                <div className="bundleHeader">
                  <div>
                    <span className="bundleEyebrow">RECOMMENDED OEM / RACE SPEC REPAIR BUNDLE</span>
                    <h4 className="bundleTitle">{activeSymptom.bundleName}</h4>
                  </div>
                  <button
                    type="button"
                    className="bundleAddToCartBtn"
                    onClick={() => handleAddBundleToCart(activeSymptom)}
                  >
                    <ShoppingCart size={16} /> Add Bundle to Cart
                  </button>
                </div>

                <div className="bundleItemsList">
                  {activeSymptom.bundleProducts.map((p, idx) => (
                    <div key={idx} className="bundleItemRow">
                      <div className="bundleItemBullet">
                        <Layers size={14} />
                      </div>
                      <span className="bundleItemName">{p.name}</span>
                      <strong className="bundleItemPrice">₹{p.price.toLocaleString('en-IN')}</strong>
                      <button
                        type="button"
                        className="bundleItemInspectBtn"
                        onClick={() => nav(`/products?q=${encodeURIComponent(p.query)}`)}
                      >
                        Inspect Part
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Floating AI Launcher & Slide-Over Modal for ALL pages
export function MechanicCopilotFloatingLauncher() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating AI Icon Launcher on all pages */}
      <button
        type="button"
        className={`aiMechanicFloatBtn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI Mechanic Diagnostic Copilot"
        title="AI Mechanic Diagnostic Copilot"
      >
        <span className="aiFloatIconWrap">
          <Wrench size={19} className="aiWrenchIcon" />
          <Sparkles size={13} className="aiSparkleBadge" />
        </span>
        <span className="aiFloatText">AI Mechanic</span>
        <span className="aiPulseDot" />
      </button>

      {/* Slide-over Diagnostic Modal */}
      {isOpen && (
        <div className="aiModalOverlay" onClick={() => setIsOpen(false)}>
          <div className="aiModalContent" onClick={(e) => e.stopPropagation()}>
            <div className="aiModalTopBar">
              <div className="aiModalTitleGroup">
                <span className="aiModalBadge">
                  <Sparkles size={14} /> AI DIAGNOSTIC COPILOT
                </span>
                <h3>MotoDC Workshop Assistant</h3>
              </div>
              <button
                type="button"
                className="aiModalCloseBtn"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI Mechanic Copilot"
              >
                ✕
              </button>
            </div>
            <div className="aiModalBody">
              <MechanicCopilot isModal={true} onClose={() => setIsOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
