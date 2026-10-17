import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Wrench, ShieldAlert, CheckCircle2, Clock, ArrowRight, 
  ShoppingCart, Sparkles, AlertTriangle, Layers, Send, MessageSquare, 
  Bot, User, RotateCcw, HelpCircle, Package, Truck, ShieldCheck, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './mechanic-copilot.css';

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

// Comprehensive Automotive & MotoDC Q&A Knowledge Engine
function answerUserQuestion(rawQuery) {
  const q = rawQuery.toLowerCase().trim();

  // 1. Order, Payment & Cash on Delivery (COD)
  if (q.includes('cod') || q.includes('cash on delivery') || q.includes('pay on delivery') || q.includes('payment') || q.includes('upi') || q.includes('card')) {
    return {
      badge: 'Order & Payment',
      title: 'Cash on Delivery (COD) & Payment Methods',
      answer: 'Yes! MotoDC provides 100% Cash on Delivery (COD) across India with zero advance payment required. You only pay when your genuine parts arrive at your doorstep.\n\nWe also support fast online payments via UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards, and Net Banking.',
      tips: [
        'Select "Cash on Delivery" or "Pay Online" at checkout.',
        'SMS & Email order confirmation is dispatched immediately upon placing your order.',
        'Free Express Shipping is automatically applied on orders above ₹2,000.'
      ],
      parts: []
    };
  }

  // 2. Returns, Replacements & Refunds
  if (q.includes('return') || q.includes('replace') || q.includes('refund') || q.includes('exchange') || q.includes('wrong') || q.includes('defect') || q.includes('damage')) {
    return {
      badge: 'Customer Guarantee',
      title: '7-Day Hassle-Free Returns & Replacements',
      answer: 'All items on MotoDC come with our 7-Day Hassle-Free Return & Replacement Guarantee. If a part arrives damaged, defective, or does not fit your vehicle, we arrange a free courier pickup and issue a direct replacement or 100% refund.',
      tips: [
        'Go to "My Orders" in your MotoDC account or visit /returns.',
        'Select the item and choose whether you want a replacement or a full refund.',
        'Keep the product in original packaging with manufacturer labels intact.'
      ],
      parts: []
    };
  }

  // 3. Delivery Speed, Shipping Time & Courier
  if (q.includes('delivery') || q.includes('shipping') || q.includes('how long') || q.includes('courier') || q.includes('track') || q.includes('days') || q.includes('dispatch')) {
    return {
      badge: 'Logistics',
      title: 'Fast Dispatch & Express Delivery (3–5 Days)',
      answer: 'Orders are dispatched within 24 hours from our automotive logistics hub. Express delivery takes 3 to 5 business days anywhere in India.\n\nOrders above ₹2,000 automatically qualify for 100% Free Express Shipping!',
      tips: [
        'A real-time SMS & Email tracking link is provided as soon as your package is dispatched.',
        'All spare parts are packed in shock-proof, heavy-duty protective packaging.'
      ],
      parts: []
    };
  }

  // 4. Authenticity & Genuine OEM Quality
  if (q.includes('genuine') || q.includes('original') || q.includes('fake') || q.includes('oem') || q.includes('quality') || q.includes('brand')) {
    return {
      badge: 'Quality Assurance',
      title: '100% Genuine OEM & Certified Parts',
      answer: 'Every spare part listed on MotoDC is 100% genuine and sourced directly from certified OEM/OES manufacturers including Brembo, Bosch, Castrol, Motul, NGK, K&N, Rolon, and Philips.\n\nAll items come with manufacturer warranty and authentic tamper-evident security packaging.',
      tips: [
        'Check product specifications and brand markings on the product page.',
        'Full brand warranty is supported with your MotoDC invoice.'
      ],
      parts: []
    };
  }

  // 5. Engine Oil & Lubrication
  if (q.includes('oil') || q.includes('motul') || q.includes('castrol') || q.includes('10w40') || q.includes('10w50') || q.includes('20w50') || q.includes('15w50') || q.includes('synthetic') || q.includes('lubricant')) {
    return {
      badge: 'Fluids & Lubrication',
      title: 'Engine Oil Selection & Viscosity Guide',
      answer: 'Selecting the correct engine oil grade protects cylinder walls and ensures smooth clutch engagement without slippage:\n\n• High-RPM Motorcycles (KTM, Yamaha R15, Pulsar, Apache): 100% Fully Synthetic 10W40 or 10W50 with JASO MA2 specification.\n• Cruisers & Long-Stroke Engines (Royal Enfield): 15W50 Semi-Synthetic or Synthetic.\n• Modern Automobiles (Cars): 5W30 or 0W20 Full Synthetic.',
      tips: [
        'Always replace your oil filter during an oil change to keep fresh oil clean.',
        'Never put automotive car oil in a motorcycle with a wet clutch (causes severe clutch slip).',
        'Standard change interval: Every 3,000 km (Semi-Synthetic) or 5,000–6,000 km (Full Synthetic).'
      ],
      parts: [
        { name: 'Motul 7100 10W50 100% Synthetic 4T Oil', price: 1150, query: 'motul' },
        { name: 'Castrol Power1 Ultimate 10W40 Synthetic', price: 820, query: 'castrol' },
        { name: 'High-Flow Magnetic Oil Filter', price: 290, query: 'oil filter' }
      ]
    };
  }

  // 6. Brakes, Squeal, Rotor & Grinding
  if (q.includes('brake') || q.includes('squeal') || q.includes('grind') || q.includes('stopping') || q.includes('rotor') || q.includes('pad') || q.includes('spongy') || q.includes('abs') || q.includes('caliper')) {
    return {
      badge: 'Braking System',
      title: 'Brake Noise, Rotor Wear & Stopping Power',
      answer: 'High-pitched brake screeching or metal grinding occurs when friction pads wear below 2mm, dragging the metal backing shim against the disc rotor. A soft or "spongy" brake lever indicates moisture or air trapped in the hydraulic brake fluid lines.',
      tips: [
        'Inspect pad thickness through the caliper inspection slot.',
        'Clean rotor discs with specialized Brake Parts Cleaner to remove brake dust & oily road film.',
        'Flush and bleed hydraulic lines with fresh DOT 4 racing brake fluid every 12 months.'
      ],
      parts: [
        { name: 'Ceramic High-Friction Brake Pads', price: 899, query: 'brake pad' },
        { name: 'Cross-Drilled Ventilated Disc Rotor', price: 2199, query: 'disc rotor' },
        { name: 'Brembo DOT 4 Racing Brake Fluid', price: 449, query: 'brake fluid' }
      ]
    };
  }

  // 7. Chain, Sprockets & Drive Rattling
  if (q.includes('chain') || q.includes('sprocket') || q.includes('slack') || q.includes('lube') || q.includes('rattle') || q.includes('slap') || q.includes('swingarm')) {
    return {
      badge: 'Drivetrain',
      title: 'Chain Slack, Sprocket Wear & Rattle Diagnostics',
      answer: 'A loud rattling or slapping sound on deceleration means excessive chain slack (over 35mm) hitting the swingarm slider. Worn sprockets develop sharp, hooked teeth that cause the chain to skip links under hard acceleration.',
      tips: [
        'Maintain correct chain slack: typically 25mm to 30mm vertical free-play at midpoint.',
        'Clean with kerosene or chain cleaner, and lube every 500 km using O-Ring safe wax.',
        'Always replace chain and front/rear sprockets together as a matched kit.'
      ],
      parts: [
        { name: 'Rolon Brass Solid O-Ring Drive Chain', price: 2390, query: 'chain' },
        { name: 'Hardened Steel Front & Rear Sprocket Set', price: 1680, query: 'sprocket' },
        { name: 'Motul Chain Clean + Lube Touring Duo', price: 890, query: 'motul chain' }
      ]
    };
  }

  // 8. Engine Sputtering, Misfire & Spark Plugs
  if (q.includes('misfire') || q.includes('spark') || q.includes('sputter') || q.includes('jerk') || q.includes('starting') || q.includes('rpm') || q.includes('plug') || q.includes('ignition') || q.includes('hesitation')) {
    return {
      badge: 'Ignition & Fuel',
      title: 'Combustion Misfire & Spark Plug Diagnostics',
      answer: 'Engine jerking or sputtering under throttle acceleration is typically caused by carbon-fouled spark plug electrodes, a clogged air filter restricting intake airflow, or a weakening ignition coil struggling under cylinder pressure.',
      tips: [
        'Inspect spark plug tip: tan/light brown is optimal; black soot indicates carbon fouling.',
        'Upgrade to Fine-Wire Laser Iridium spark plugs for a 30% hotter spark and cleaner ignition.',
        'Replace air filter if paper element is dark grey or clogged.'
      ],
      parts: [
        { name: 'NGK Laser Iridium Spark Plug', price: 680, query: 'spark plug' },
        { name: 'High-Flow Cotton Replacement Air Filter', price: 1450, query: 'air filter' },
        { name: 'High-Output Performance Ignition Coil', price: 1250, query: 'ignition coil' }
      ]
    };
  }

  // 9. Overheating & Cooling
  if (q.includes('heat') || q.includes('overheat') || q.includes('coolant') || q.includes('radiator') || q.includes('temperature') || q.includes('fan') || q.includes('boil')) {
    return {
      badge: 'Thermal Management',
      title: 'Engine Overheating & Radiator Diagnostics',
      answer: 'If your temperature gauge is high or radiator fan stays on constantly, the cooling system is suffering from low coolant, airlocks in hoses, bent radiator cooling fins, or a failed 1.1/1.3 bar radiator pressure cap.',
      tips: [
        'Never open radiator cap when the engine is warm (severe scalding danger).',
        'Inspect expansion reservoir and top up with premixed ethylene glycol coolant.',
        'Gently clean mud and road debris off radiator fins using low-pressure water.'
      ],
      parts: [
        { name: 'Engine Ice High-Performance Coolant 1.89L', price: 1450, query: 'coolant' },
        { name: 'High-Pressure 1.3 Bar Radiator Cap', price: 380, query: 'radiator' },
        { name: 'Radiator Protective Aluminium Grille Guard', price: 950, query: 'radiator guard' }
      ]
    };
  }

  // 10. Battery & Electrical
  if (q.includes('battery') || q.includes('click') || q.includes('crank') || q.includes('light') || q.includes('headlight') || q.includes('starter') || q.includes('stator') || q.includes('electrical')) {
    return {
      badge: 'Electrical System',
      title: '12V Cranking, Stator Charging & Battery Care',
      answer: 'A rapid clicking noise when pressing the starter button means the starter relay is engaging, but battery voltage drops under motor load (< 10.5V). This is caused by sulfated battery plates, loose terminals, or a weak magneto charging stator coil.',
      tips: [
        'Test battery voltage: healthy rest is 12.6V–12.8V; charging voltage at 3000 RPM should be 14.0V–14.4V.',
        'Clean terminal corrosion with warm baking soda water and coat with petroleum jelly.',
        'Replace aging lead-acid batteries with high-cranking Sealed AGM units.'
      ],
      parts: [
        { name: 'High-CCA Sealed Maintenance-Free AGM Battery', price: 2450, query: 'battery' },
        { name: 'Copper Wound High-Output Magneto Stator Coil', price: 1750, query: 'stator' },
        { name: '6500K Ultra-Bright LED Headlamp Bulb H4/H7', price: 990, query: 'led bulb' }
      ]
    };
  }

  // 11. Clutch & Transmission
  if (q.includes('clutch') || q.includes('gear') || q.includes('shift') || q.includes('neutral') || q.includes('slip')) {
    return {
      badge: 'Transmission',
      title: 'Clutch Engagement & Friction Plate Service',
      answer: 'When the engine revs up quickly but vehicle speed climbs sluggishly, the clutch friction plates are slipping due to heat glazing or worn lining. Hard gear shifts usually mean clutch cable free-play is out of adjustment.',
      tips: [
        'Check clutch lever freeplay: ensure 2mm to 3mm of free play before cable tension engages.',
        'Always soak new clutch friction plates in fresh engine oil for 15 minutes before assembly.',
        'Replace clutch springs together with plates to restore full clamping force.'
      ],
      parts: [
        { name: 'Kevlar Reinforced Clutch Friction Plate Set', price: 1850, query: 'clutch' },
        { name: 'High-Tension Heavy Duty Clutch Springs', price: 420, query: 'clutch spring' },
        { name: 'Motul 7100 10W50 100% Synthetic 4T Oil', price: 1150, query: 'motul' }
      ]
    };
  }

  // 12. Exhaust Smoke Diagnostics
  if (q.includes('smoke') || q.includes('exhaust') || q.includes('smell') || q.includes('burn')) {
    return {
      badge: 'Exhaust Diagnostics',
      title: 'Exhaust Smoke Color Analysis',
      answer: 'Exhaust smoke color directly identifies internal engine conditions:\n\n• Blue Smoke: Engine oil burning in combustion chamber due to worn piston rings or valve stem oil seals.\n• Black Smoke: Rich fuel mixture / unburnt fuel due to clogged air filter or leaking fuel injectors.\n• White Smoke: Normal condensation on cold starts, or coolant leaking into combustion chamber (blown head gasket) if accompanied by sweet smell.',
      tips: [
        'Check oil dipstick level regularly if noticing bluish smoke.',
        'Inspect and replace the air filter element to resolve rich fuel mixture black smoke.'
      ],
      parts: [
        { name: 'High-Flow Cotton Replacement Air Filter', price: 1450, query: 'air filter' },
        { name: 'NGK Laser Iridium Spark Plug', price: 680, query: 'spark plug' }
      ]
    };
  }

  // 13. Suspension & Steering
  if (q.includes('suspension') || q.includes('fork') || q.includes('shock') || q.includes('wobble') || q.includes('vibration') || q.includes('handlebar')) {
    return {
      badge: 'Chassis & Suspension',
      title: 'Front Fork, Shock Absorber & Steering Stability',
      answer: 'Front-end wobble or harsh bottoming-out occurs when front fork oil seals weep oil onto the stanchions, leaving insufficient hydraulic dampening. Loose or notched steering cone bearings also cause wandering at highway speeds.',
      tips: [
        'Check fork stanchion chrome tubes for oil rings or dust seal cracking.',
        'Service front forks with fresh high-viscosity 10W fork oil and OEM seals.'
      ],
      parts: [
        { name: 'Heavy-Duty Fork Oil Seal & Dust Seal Set', price: 480, query: 'fork' },
        { name: 'Motul Fork Oil Expert Medium 10W 1L', price: 650, query: 'fork oil' }
      ]
    };
  }

  // 14. Friendly Greeting
  if (q === 'hi' || q === 'hello' || q === 'hey' || q === 'help' || q.startsWith('hi ') || q.startsWith('hello ')) {
    return {
      badge: 'MotoDC Assistant',
      title: 'Welcome to MotoDC AI Copilot! 👋',
      answer: 'Hello! I am your 24/7 MotoDC AI Workshop Assistant. I can help you with:\n\n• Diagnosing vehicle symptoms (noises, vibrations, starting issues)\n• Recommending genuine OEM spare parts and oils\n• Clarifying Cash on Delivery (COD), order dispatch, shipping & returns\n\nWhat can I assist you with today?',
      tips: [
        'Type any vehicle symptom (e.g. "brake noise" or "which oil for Duke 390").',
        'Ask questions about delivery, COD, or return policies.',
        'Click any suggested chip below for quick answers!'
      ],
      parts: []
    };
  }

  // 15. Intelligent Fallback with Smart Search
  return {
    badge: 'Diagnostic Advice',
    title: `Automotive Assessment: "${rawQuery}"`,
    answer: `Here is the technical recommendation for "${rawQuery}":\n\nAlways inspect the simplest wear items first (air filter, spark plug, fluids, and fasteners) before taking apart complex mechanical assemblies. Ensure all replacement parts match your vehicle OEM fitment specifications.`,
    tips: [
      'Check for visible fluid leaks, abnormal vibrations, or scorched surfaces.',
      'Refer to your vehicle manual for recommended maintenance intervals and torque values.',
      'Search our catalog to find exact replacement parts backed by MotoDC 7-Day Guarantee.'
    ],
    parts: [
      { name: `Search Parts for "${rawQuery.slice(0, 22)}"`, price: 0, query: rawQuery.slice(0, 20) }
    ]
  };
}

// Main Component exported for modal or widget
export default function MechanicCopilot({ isModal = true, onClose, activeTab: externalTab, setActiveTab: setExternalTab }) {
  const nav = useNavigate();
  const [internalTab, setInternalTab] = useState('chat');
  const activeTab = externalTab || internalTab;
  const setActiveTab = setExternalTab || setInternalTab;

  // Chat State
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello Rider! 👋 I'm your **MotoDC AI Mechanic & Assistant**.\n\nDescribe any issue with your vehicle (noises, vibrations, hesitation, fluid leaks) or ask any questions about spare parts, fitment, orders, and delivery.\n\nHow can I help clear your doubts today?",
      suggestions: [
        "📦 COD & Free Delivery policy",
        "🔄 7-Day Returns & Guarantee",
        "🛑 Squealing brakes or grinding",
        "⚡ Engine sputtering / misfire",
        "🛢️ Which engine oil should I choose?",
        "🔗 Chain loose or rattling",
        "🔋 Battery clicking / won't start",
        "⚙️ Clutch slipping under revs"
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

    // Instant intelligent response
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
    }, 280);
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
                        <CheckCircle2 size={14} /> Actionable Steps & Guidance:
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
              placeholder="Ask anything about parts, symptoms, COD, delivery..."
              className="chatTextInput"
              autoFocus
            />
            <button
              type="submit"
              className="chatSendBtn"
              disabled={!inputQuery.trim()}
              aria-label="Send query to AI Assistant"
            >
              <Send size={15} />
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
              <Search size={16} className="copilotSearchIcon" />
              <input
                type="text"
                placeholder="Search symptom (e.g., squeal, rattle, misfire)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="copilotSearchInput"
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

            <div className="copilotCategoryPills">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`copilotCategoryPill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="copilotGrid">
            <div className="copilotSymptomsList">
              {filteredSymptoms.map((s) => (
                <div
                  key={s.id}
                  className={`symptomItemCard ${activeSymptom.id === s.id ? 'selected' : ''}`}
                  onClick={() => setActiveSymptom(s)}
                >
                  <span className="symptomIconBadge">{s.icon}</span>
                  <div className="symptomItemMeta">
                    <h5 className="symptomItemTitle">{s.title}</h5>
                    <p className="symptomItemDesc">{s.rootCause}</p>
                  </div>
                </div>
              ))}
            </div>

            {activeSymptom && (
              <div className="copilotDossierPanel">
                <h4 className="dossierTitle">{activeSymptom.title}</h4>
                <div className="dossierCauseText">
                  <strong>Root Cause:</strong> {activeSymptom.rootCause}
                </div>
                <p className="symptomItemDesc" style={{ marginBottom: 10 }}>
                  {activeSymptom.description}
                </p>
                <button
                  type="button"
                  className="bundleAddToCartBtn"
                  onClick={() => handleAddBundleToCart(activeSymptom)}
                >
                  <ShoppingCart size={15} /> Add Bundle ({activeSymptom.bundleProducts[0].name})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Floating AI Launcher Icon & Slide-Over Chat Widget for ALL pages
export function MechanicCopilotFloatingLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'library'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating AI Icon Launcher on all pages (Hovering Circular FAB) */}
      <button
        type="button"
        className={`aiMechanicFloatBtn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close MotoDC AI Assistant' : 'Open MotoDC AI Assistant'}
        title="MotoDC AI Assistant - Ask any question"
      >
        <span className="aiFloatIcon">
          {isOpen ? (
            <X size={24} />
          ) : (
            <>
              <Bot size={26} className="aiBotSvg" />
              <span className="aiWrenchBadge">
                <Wrench size={11} />
              </span>
            </>
          )}
        </span>
        <span className="aiPulseRing" aria-hidden="true" />
        <span className="aiOnlineDot" aria-hidden="true" />
        <span className="aiFloatTooltip" aria-hidden="true">
          {isOpen ? 'Close Assistant' : 'Ask AI Copilot'}
        </span>
      </button>

      {/* Docked Bottom-Right AI Assistant Chat Widget */}
      {isOpen && (
        <aside
          className="aiFloatingChatWidget"
          role="dialog"
          aria-label="MotoDC AI Assistant"
        >
          <div className="aiChatWidgetHeader">
            <div className="aiHeaderProfile">
              <div className="aiHeaderAvatar">
                <Bot size={20} />
                <span className="aiHeaderOnlineDot" />
              </div>
              <div className="aiHeaderInfo">
                <div className="aiHeaderTitleRow">
                  <h4>MotoDC AI Copilot</h4>
                  <span className="aiHeaderTag">AI HELP</span>
                </div>
                <span className="aiHeaderSubtext">
                  ● Online · Solves all vehicle & parts doubts
                </span>
              </div>
            </div>

            <div className="aiHeaderActions">
              <button
                type="button"
                className={`aiHeaderTabBtn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
                title="Q&A Chat"
                aria-label="Q&A Chat view"
              >
                <MessageSquare size={15} />
              </button>
              <button
                type="button"
                className={`aiHeaderTabBtn ${activeTab === 'library' ? 'active' : ''}`}
                onClick={() => setActiveTab('library')}
                title="Symptom Library"
                aria-label="Workshop Symptom Library"
              >
                <Wrench size={15} />
              </button>
              <button
                type="button"
                className="aiChatCloseBtn"
                onClick={() => setIsOpen(false)}
                aria-label="Close Assistant"
                title="Close Assistant"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="aiChatWidgetBody">
            <MechanicCopilot
              isModal={true}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </aside>
      )}
    </>
  );
}
