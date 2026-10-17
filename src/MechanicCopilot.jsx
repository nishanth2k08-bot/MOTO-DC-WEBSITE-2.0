import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Wrench, ShieldAlert, CheckCircle2, Clock, ArrowRight, 
  ShoppingCart, Sparkles, AlertTriangle, Layers, Send, MessageSquare, 
  Bot, User, RotateCcw, HelpCircle, Package, Truck, ShieldCheck, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

// Diagnostic Knowledge Base for Library View
export const SYMPTOMS_DATABASE = [
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

// Smart Automotive & MotoDC Q&A Knowledge Engine
function answerUserQuestion(rawQuery) {
  const q = rawQuery.toLowerCase().trim();

  // 1. Order, Delivery, COD & Return Doubts
  if (q.includes('cod') || q.includes('cash on delivery') || q.includes('pay on delivery')) {
    return {
      badge: 'Order & Payment',
      title: 'Cash on Delivery (COD) Policy',
      answer: 'Yes! MotoDC provides Cash on Delivery (COD) across India with zero advance payment required. You only pay the courier when your genuine spare parts arrive at your doorstep.',
      tips: [
        'Select "Cash on Delivery" at checkout.',
        'An SMS & Email confirmation is sent immediately once your order is placed.',
        'Have the exact amount or UPI scanner ready for the delivery agent.'
      ],
      parts: []
    };
  }

  if (q.includes('return') || q.includes('replace') || q.includes('refund') || q.includes('exchange')) {
    return {
      badge: 'Customer Guarantee',
      title: '7-Day Hassle-Free Returns & Replacements',
      answer: 'All parts ordered on MotoDC are backed by our 7-Day Hassle-Free Return & Replacement Guarantee. If a part is damaged, defective, or does not fit your machine, we will arrange a replacement or complete refund.',
      tips: [
        'Go to "My Orders" in your MotoDC account or visit /returns.',
        'Select the item and specify whether you want a replacement part or full refund.',
        'Keep the original product box and manufacturer seals intact.'
      ],
      parts: []
    };
  }

  if (q.includes('delivery') || q.includes('shipping') || q.includes('how long') || q.includes('courier')) {
    return {
      badge: 'Logistics',
      title: 'Fast Dispatch & Express Delivery',
      answer: 'All orders are dispatched within 24 hours of confirmation. Delivery typically takes 3 to 5 business days across India. Orders above ₹2,000 automatically receive 100% Free Express Shipping!',
      tips: [
        'Real-time tracking link is sent to your email as soon as dispatched.',
        'Orders are securely packed in heavy-duty impact-cushioned packaging to safeguard fragile parts.'
      ],
      parts: []
    };
  }

  // 2. Engine Oil & Lubricant Doubts
  if (q.includes('oil') || q.includes('motul') || q.includes('castrol') || q.includes('10w40') || q.includes('10w50') || q.includes('20w50') || q.includes('synthetic')) {
    return {
      badge: 'Fluids & Lubrication',
      title: 'Engine Oil Selection & Grade Guide',
      answer: 'Selecting the right viscosity and formulation keeps your engine running cooler and prevents clutch slippage. For high-performance / high-RPM motorcycles (like KTM, Yamaha R15, Pulsar), 100% Fully Synthetic 10W40 or 10W50 with JASO MA2 rating is ideal. For air-cooled cruisers (Royal Enfield), 15W50 or 20W50 semi-synthetic gives superior thermal cushioning.',
      tips: [
        'Always replace your oil filter whenever you change your engine oil.',
        'Never use automotive car oil in a motorcycle with a wet clutch (causes clutch slip).',
        'Standard change interval: Every 3,000 km (Semi-Synthetic) or 5,000–6,000 km (Fully Synthetic).'
      ],
      parts: [
        { name: 'Motul 7100 10W50 100% Synthetic 4T Oil', price: 1150, query: 'motul' },
        { name: 'Castrol Power1 Ultimate 10W40 Synthetic', price: 820, query: 'castrol' },
        { name: 'High-Flow Magnetic Oil Filter', price: 290, query: 'oil filter' }
      ]
    };
  }

  // 3. Brake Issues & Squeal
  if (q.includes('brake') || q.includes('squeal') || q.includes('stopping') || q.includes('rotor') || q.includes('pad') || q.includes('spongy') || q.includes('abs')) {
    return {
      badge: 'Braking System',
      title: 'Brake Noise, Wear & Stopping Power Analysis',
      answer: 'High-pitched brake screeching or grinding usually occurs when friction pad lining wears below 2mm, allowing the metal backing plate to drag against the rotor. A "spongy" or soft lever feel means moisture or air bubbles have entered the hydraulic brake lines.',
      tips: [
        'Inspect pad thickness through the caliper inspection slot.',
        'Clean rotor surfaces with dedicated Brake Parts Cleaner to remove brake dust & road grime.',
        'Bleed hydraulic brake lines and replace brake fluid with fresh DOT 4 every 12 to 18 months.'
      ],
      parts: [
        { name: 'Ceramic High-Friction Brake Pads', price: 899, query: 'brake pad' },
        { name: 'Cross-Drilled Ventilated Disc Rotor', price: 2199, query: 'disc rotor' },
        { name: 'Brembo DOT 4 Racing Brake Fluid', price: 449, query: 'brake fluid' }
      ]
    };
  }

  // 4. Chain, Sprocket & Drivetrain
  if (q.includes('chain') || q.includes('sprocket') || q.includes('slack') || q.includes('lube') || q.includes('rattle') || q.includes('swingarm')) {
    return {
      badge: 'Drivetrain',
      title: 'Chain Slack, Sprocket Wear & Maintenance',
      answer: 'A rattling or slapping drive chain indicates excessive slack (over 35mm) or dry, seized chain links. Worn sprockets develop sharp, hooked teeth that cause dangerous chain slippage under acceleration.',
      tips: [
        'Maintain correct chain slack: typically 25mm to 30mm of vertical play at midpoint.',
        'Clean with dedicated chain cleaner or kerosene and lubricate with O-Ring safe chain wax every 500 km.',
        'Always replace chain and both front/rear sprockets together as a matched kit for even wear.'
      ],
      parts: [
        { name: 'Rolon Brass Solid O-Ring Drive Chain', price: 2390, query: 'chain' },
        { name: 'Hardened Steel Front & Rear Sprocket Set', price: 1680, query: 'sprocket' },
        { name: 'Motul Chain Clean + Lube Touring Duo', price: 890, query: 'motul chain' }
      ]
    };
  }

  // 5. Engine Misfire, Spark Plug & Fuel
  if (q.includes('misfire') || q.includes('spark') || q.includes('sputter') || q.includes('jerk') || q.includes('starting') || q.includes('rpm') || q.includes('acceleration')) {
    return {
      badge: 'Ignition & Fuel',
      title: 'Combustion Hesitation & Spark Restoration',
      answer: 'Engine sputtering or hesitation under acceleration is commonly caused by fouled spark plugs with eroded electrodes, an obstructed air filter restricting intake airflow, or dirty fuel injector nozzles.',
      tips: [
        'Remove spark plug and inspect electrode tip: tan/light brown is healthy; black soot indicates carbon fouling.',
        'Upgrading to Fine-Wire Laser Iridium plugs provides a 30% hotter spark and cleaner combustion.',
        'Inspect air filter: replace if paper element is dark grey or clogged.'
      ],
      parts: [
        { name: 'NGK Laser Iridium Spark Plug', price: 680, query: 'spark plug' },
        { name: 'High-Flow Cotton Replacement Air Filter', price: 1450, query: 'air filter' },
        { name: 'High-Output Performance Ignition Coil', price: 1250, query: 'ignition coil' }
      ]
    };
  }

  // 6. Overheating & Cooling
  if (q.includes('heat') || q.includes('overheat') || q.includes('coolant') || q.includes('radiator') || q.includes('temperature') || q.includes('fan')) {
    return {
      badge: 'Thermal Management',
      title: 'Engine Overheating & Radiator Efficiency',
      answer: 'If your engine temperature needle runs high or radiator fan stays on constantly, the cooling system is losing pressure or suffering from low coolant level, clogged radiator exterior fins, or a faulty 1.1/1.3 bar radiator cap.',
      tips: [
        'Never open radiator cap when engine is warm (extreme scalding hazard).',
        'Inspect coolant expansion bottle level and top up with premixed ethylene glycol coolant.',
        'Use low-pressure water or a fin comb to clear bugs and road dirt blocking radiator core air passages.'
      ],
      parts: [
        { name: 'Engine Ice High-Performance Coolant 1.89L', price: 1450, query: 'coolant' },
        { name: 'High-Pressure 1.3 Bar Radiator Cap', price: 380, query: 'radiator' },
        { name: 'Radiator Protective Aluminium Grille Guard', price: 950, query: 'radiator guard' }
      ]
    };
  }

  // 7. Battery, Starter & Electrical
  if (q.includes('battery') || q.includes('click') || q.includes('crank') || q.includes('light') || q.includes('horn') || q.includes('electrical')) {
    return {
      badge: 'Electrical System',
      title: '12V Cranking, Charging & Stator Diagnostics',
      answer: 'A rapid clicking noise when pressing the starter button means the starter relay is engaging, but battery voltage drops too low under motor load (< 10.5V). This is caused by sulfated battery plates, loose battery terminals, or a weak magneto stator coil.',
      tips: [
        'Test battery terminal voltage: resting should be 12.6V–12.8V. When running, stator should charge at 14.0V–14.4V.',
        'Clean white/blue corrosion powder off battery posts using baking soda water and coat with terminal grease.',
        'If battery is over 3 years old and won’t hold charge, replace with a maintenance-free AGM battery.'
      ],
      parts: [
        { name: 'High-CCA Sealed Maintenance-Free AGM Battery', price: 2450, query: 'battery' },
        { name: 'Copper Wound High-Output Magneto Stator Coil', price: 1750, query: 'stator' },
        { name: '6500K Ultra-Bright LED Headlamp Bulb H4/H7', price: 990, query: 'led bulb' }
      ]
    };
  }

  // 8. Clutch Slipping
  if (q.includes('clutch') || q.includes('gear') || q.includes('shift') || q.includes('neutral')) {
    return {
      badge: 'Transmission',
      title: 'Clutch Engagement & Friction Plate Service',
      answer: 'When the engine revs up quickly but the speedometer climbs sluggishly, the clutch friction plates are worn past minimum thickness or glazed from heat. Hard gear shifts often mean clutch cable freeplay is out of spec.',
      tips: [
        'Check clutch lever freeplay: ensure 2mm to 3mm free movement at the lever pivot before tension engages.',
        'Always soak new friction plates in fresh engine oil for 15 minutes before installing.',
        'Replace clutch springs along with plates to ensure maximum clamping pressure.'
      ],
      parts: [
        { name: 'Kevlar Reinforced Clutch Friction Plate Set', price: 1850, query: 'clutch' },
        { name: 'High-Tension Heavy Duty Clutch Springs', price: 420, query: 'clutch spring' },
        { name: 'Motul 7100 10W50 100% Synthetic 4T Oil', price: 1150, query: 'motul' }
      ]
    };
  }

  // Default intelligent automotive response
  return {
    badge: 'Diagnostic Advice',
    title: `Automotive Technical Assessment: "${rawQuery}"`,
    answer: `Based on your query, here is the professional mechanical breakdown for "${rawQuery}": For safety and vehicle longevity, inspect components starting with the easiest wear items (filters, fluids, fasteners) before taking apart complex assemblies. Ensure parts match your vehicle OEM specifications.`,
    tips: [
      'Inspect physical components for oil leaks, unusual vibration, or scorched surfaces.',
      'Always refer to your vehicle service manual for exact factory torque ratings and fluid specifications.',
      'Use the search bar on MotoDC to find direct OEM and performance replacement parts with exact fitment.'
    ],
    parts: [
      { name: 'Browse Full Spare Parts Catalog', price: 499, query: rawQuery.slice(0, 15) }
    ]
  };
}

// Main Component exported for modal
export default function MechanicCopilot({ isModal = true, onClose }) {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'library'

  // Chat State
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello Rider! 👋 I'm your **MotoDC AI Mechanic & Assistant**.\n\nDescribe any issue with your vehicle (noises, vibrations, hesitation, fluid leaks) or ask any questions about spare parts, fitment, orders, and delivery.\n\nHow can I help clear your doubts today?",
      suggestions: [
        "🛑 Squealing brakes or spongy lever",
        "⚡ Engine misfire or sputtering",
        "🛢️ Which engine oil should I choose?",
        "🔗 Chain loose or rattling",
        "🔋 Battery clicking / won't start",
        "📦 COD, delivery & return questions"
      ]
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const chatEndRef = useRef(null);

  // Library State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeSymptom, setActiveSymptom] = useState(SYMPTOMS_DATABASE[0]);

  const categories = ['All', 'Braking', 'Engine', 'Transmission', 'Drivetrain', 'Cooling', 'Electrical'];

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

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = (textToSend) => {
    const q = (textToSend || inputQuery).trim();
    if (!q) return;

    const userMsg = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: q
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');

    // Simulate intelligent analysis response
    setTimeout(() => {
      const result = answerUserQuestion(q);
      const aiMsg = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        badge: result.badge,
        title: result.title,
        text: result.answer,
        tips: result.tips,
        parts: result.parts
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 350);
  };

  const handleAddBundleToCart = (symptom) => {
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
    if (onClose) onClose();
    nav(`/products?q=${encodeURIComponent(p.query)}`);
  };

  const handleInspectPart = (query) => {
    if (onClose) onClose();
    nav(`/products?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="copilotModalContainer">
      {/* View Switcher Tabs */}
      <div className="copilotViewTabs">
        <button
          type="button"
          className={`copilotTabBtn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={16} /> Ask AI Mechanic (Q&A)
        </button>
        <button
          type="button"
          className={`copilotTabBtn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          <Wrench size={16} /> Workshop Symptom Library
        </button>
      </div>

      {/* =========================================================
          VIEW 1: INTERACTIVE AI CHAT & DOUBT CLEARING
          ========================================================= */}
      {activeTab === 'chat' && (
        <div className="copilotChatContainer">
          <div className="copilotChatStream">
            {messages.map((m) => (
              <div key={m.id} className={`chatMessageRow ${m.sender}`}>
                {m.sender === 'ai' ? (
                  <div className="chatAvatar aiAvatar">
                    <Bot size={17} />
                  </div>
                ) : (
                  <div className="chatAvatar userAvatar">
                    <User size={17} />
                  </div>
                )}

                <div className="chatBubble">
                  {m.badge && (
                    <div className="chatBubbleBadge">
                      <Sparkles size={12} /> {m.badge}
                    </div>
                  )}

                  {m.title && <h4 className="chatBubbleTitle">{m.title}</h4>}

                  <p className="chatBubbleText">{m.text}</p>

                  {/* Troubleshooting & Advice Tips */}
                  {m.tips && m.tips.length > 0 && (
                    <div className="chatTipsList">
                      <strong>
                        <CheckCircle2 size={14} /> Actionable Steps & Best Practices:
                      </strong>
                      <ul>
                        {m.tips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Matching Spare Parts */}
                  {m.parts && m.parts.length > 0 && (
                    <div className="chatPartsCard">
                      <span className="chatPartsHeading">
                        <Package size={14} /> Recommended Genuine Parts on MotoDC:
                      </span>
                      <div className="chatPartsList">
                        {m.parts.map((p, idx) => (
                          <div key={idx} className="chatPartItem">
                            <span className="chatPartName">{p.name}</span>
                            {p.price > 0 && (
                              <span className="chatPartPrice">₹{p.price.toLocaleString('en-IN')}</span>
                            )}
                            <button
                              type="button"
                              className="chatPartBtn"
                              onClick={() => handleInspectPart(p.query)}
                            >
                              View Part <ArrowRight size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Suggestions for Initial Greeting */}
                  {m.suggestions && (
                    <div className="chatSuggestionsWrap">
                      <span className="suggestionsLabel">Suggested Topics & Common Doubts:</span>
                      <div className="suggestionsGrid">
                        {m.suggestions.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="suggestionChip"
                            onClick={() => handleSendMessage(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            className="copilotChatInputBar"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask any question (e.g. engine knocking, which oil for Duke 390, delivery time)..."
              className="chatTextInput"
              autoFocus
            />
            <button
              type="submit"
              className="chatSendBtn"
              disabled={!inputQuery.trim()}
              aria-label="Send query to AI Mechanic"
            >
              <Send size={16} />
              <span>Ask</span>
            </button>
          </form>
        </div>
      )}

      {/* =========================================================
          VIEW 2: WORKSHOP SYMPTOM LIBRARY (DETAILED DOSSIERS)
          ========================================================= */}
      {activeTab === 'library' && (
        <div className="copilotContainer inModal">
          <div className="copilotSearchRow">
            <div className="copilotSearchInputWrap">
              <Search size={18} className="copilotSearchIcon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search symptoms (e.g. squealing, misfire, clutch, overheating)..."
                className="copilotSearchInput"
                aria-label="Search symptoms in library"
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

          <div className="copilotLayout">
            {/* Symptoms list */}
            <div className="copilotSymptomsCol">
              <span className="copilotColTitle">OBSERVED VEHICLE SYMPTOMS ({filteredSymptoms.length})</span>
              <div className="symptomsScrollList">
                {filteredSymptoms.map((s) => {
                  const isActive = activeSymptom?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`symptomCard ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveSymptom(s)}
                    >
                      <div className="symptomCardTop">
                        <span className="symptomCardBadge">
                          {s.icon} {s.category.toUpperCase()}
                        </span>
                        <span className="symptomCardProb">{s.probability}% PROBABILITY</span>
                      </div>
                      <h4 className="symptomCardTitle">{s.title}</h4>
                      <p className="symptomCardPreview">
                        <strong>Root cause:</strong> {s.rootCause.slice(0, 48)}...
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dossier Detail */}
            <div className="copilotDossierCol">
              {activeSymptom && (
                <div className="dossierCard">
                  <div className="dossierHeadRow">
                    <div>
                      <span className="dossierEyebrow">
                        {activeSymptom.icon} {activeSymptom.category.toUpperCase()} SYSTEM ANALYSIS
                      </span>
                      <h3 className="dossierTitle">{activeSymptom.title}</h3>
                    </div>
                    <div className="confidenceMeter">
                      <span className="meterVal">{activeSymptom.probability}%</span>
                      <span className="meterLabel">AI CONFIDENCE</span>
                    </div>
                  </div>

                  <div className="dossierCauseCard">
                    <div className="causeLabelWrap">
                      <ShieldAlert size={18} className="causeAlertIcon" />
                      <strong>PROBABLE ROOT CAUSE</strong>
                    </div>
                    <div className="causeHeading">{activeSymptom.rootCause}</div>
                    <p className="causeDesc">{activeSymptom.description}</p>
                  </div>

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

                  <div className="dossierBundleCard">
                    <div className="bundleHeader">
                      <div>
                        <span className="bundleEyebrow">RECOMMENDED REPAIR BUNDLE</span>
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
                          <div className="bundleItemBullet"><Layers size={14} /></div>
                          <span className="bundleItemName">{p.name}</span>
                          <strong className="bundleItemPrice">₹{p.price.toLocaleString('en-IN')}</strong>
                          <button
                            type="button"
                            className="bundleItemInspectBtn"
                            onClick={() => handleInspectPart(p.query)}
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
      )}
    </div>
  );
}

// Floating AI Launcher Icon & Slide-Over Modal for ALL pages
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
        title="AI Mechanic Diagnostic Copilot - Ask any question"
      >
        <span className="aiFloatIconWrap">
          <Wrench size={19} className="aiWrenchIcon" />
          <Sparkles size={13} className="aiSparkleBadge" />
        </span>
        <span className="aiFloatText">Ask AI Mechanic</span>
        <span className="aiPulseDot" />
      </button>

      {/* Slide-over / Centered AI Diagnostic Modal */}
      {isOpen && (
        <div className="aiModalOverlay" onClick={() => setIsOpen(false)}>
          <div className="aiModalContent" onClick={(e) => e.stopPropagation()}>
            <div className="aiModalTopBar">
              <div className="aiModalTitleGroup">
                <span className="aiModalBadge">
                  <Sparkles size={14} /> AI MECHANIC COPILOT
                </span>
                <h3>MotoDC Virtual Workshop Assistant</h3>
              </div>
              <button
                type="button"
                className="aiModalCloseBtn"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI Assistant"
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
