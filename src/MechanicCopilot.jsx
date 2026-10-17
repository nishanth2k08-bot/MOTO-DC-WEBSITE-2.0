import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Wrench, ShieldAlert, CheckCircle2, Clock, ArrowRight, 
  ShoppingCart, Sparkles, AlertTriangle, Layers, Send, MessageSquare, 
  Bot, User, RotateCcw, HelpCircle, Package, Truck, ShieldCheck, X, Key
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

// Clean, Precise & Intelligent AI Engine for MotoDC
function answerUserQuestion(rawQuery) {
  if (!rawQuery) return { text: "How can I help you today?" };

  // Normalize query: trim, lowercase, strip punctuation
  const clean = rawQuery
    .toLowerCase()
    .trim()
    .replace(/[?!.,;:_~@#$%^&*()\-+]/g, ' ')
    .replace(/\s+/g, ' ');

  const words = clean.split(' ').filter(Boolean);

  // 1. GREETINGS & CASUAL TALK (Precise & friendly, no bulky essays)
  const isGreeting = 
    /^(hi+|hey+|hello+|heya+|yo+|howdy|sup|hola|namaste|hlo)\b/i.test(clean) ||
    /^(good\s+(morning|afternoon|evening|day))/i.test(clean) ||
    words.some(w => /^h+i+$/i.test(w) || /^h+e+y+$/i.test(w) || /^hello+$/i.test(w) || w === 'yo');

  if (isGreeting && words.length <= 4) {
    return {
      text: "Hello! 👋 I'm your MotoDC AI Assistant. How can I help you today? Ask me about bike or car spare parts, symptoms, order tracking, COD, or return policies."
    };
  }

  // 2. COURTESIES & SMALL TALK
  if (/^(thanks|thank\s*you|thx|ty|tq|appreciate\s*it)\b/i.test(clean)) {
    return {
      text: "You're very welcome! Let me know if you need help with anything else. Ride safe!"
    };
  }

  if (/^(bye|goodbye|see\s*you|cya|take\s*care)\b/i.test(clean)) {
    return {
      text: "Goodbye! Have a safe and great ride on the road."
    };
  }

  if (/^(ok|okay|k|got\s*it|cool|sure|alright|fine|done)\b/i.test(clean) && words.length <= 3) {
    return {
      text: "Got it! Feel free to ask whenever you have questions."
    };
  }

  if (clean.includes('who are you') || clean.includes('what are you') || clean.includes('what can you do') || clean.includes('your name')) {
    return {
      text: "I'm MotoDC Copilot, your virtual automotive assistant. I can diagnose car and motorcycle issues, suggest genuine OEM replacement parts, and answer questions about orders, delivery, COD, and returns."
    };
  }

  if (clean.includes('how are you') || clean.includes('how are u') || clean.includes('how r u')) {
    return {
      text: "I'm running smoothly and ready to assist! What vehicle issue or parts can I help you with today?"
    };
  }

  // 3. STORE POLICIES (Precise & to the point)
  // Cash on Delivery & Payment
  if (clean.includes('cod') || clean.includes('cash on delivery') || clean.includes('pay on delivery') || clean.includes('payment method') || clean.includes('payment options') || clean.includes('upi') || clean.includes('gpay')) {
    return {
      text: "Yes! 100% Cash on Delivery (COD) is available across all serviceable pin codes in India with zero advance payment. You only pay when your parcel arrives.\n\nWe also accept online payments via UPI (GPay, PhonePe, Paytm), Debit/Credit Cards, and Net Banking."
    };
  }

  // Delivery time & shipping cost
  if (clean.includes('delivery') || clean.includes('shipping') || clean.includes('how long') || clean.includes('courier') || clean.includes('dispatch') || clean.includes('when will i get') || clean.includes('track order') || clean.includes('tracking')) {
    return {
      text: "• Dispatch: Orders are dispatched within 24 hours.\n• Delivery: 3 to 5 business days across India.\n• Free Shipping: Automatically applied on all orders above ₹2,000 (otherwise ₹99 flat rate).\n• Tracking: Real-time tracking link is sent via SMS & Email as soon as your order is shipped."
    };
  }

  // Returns, Replacements & Refunds
  if (clean.includes('return') || clean.includes('replace') || clean.includes('refund') || clean.includes('exchange') || clean.includes('wrong part') || clean.includes('damaged') || clean.includes('broken')) {
    return {
      text: "MotoDC offers a 7-Day Hassle-Free Return & Replacement Guarantee. If a part doesn't fit your vehicle or arrives defective, go to 'My Orders' and select Return/Replace. We arrange a free pickup and provide an instant replacement or full refund."
    };
  }

  // Genuine / Original OEM Guarantee
  if (clean.includes('genuine') || clean.includes('original') || clean.includes('fake') || clean.includes('oem') || clean.includes('authentic') || clean.includes('quality') || clean.includes('warranty')) {
    return {
      text: "All parts on MotoDC are 100% genuine OEM/OES components sourced directly from authorized brand distributors (Brembo, Bosch, Castrol, Motul, NGK, Philips, Rolon, etc.) and backed by manufacturer warranty."
    };
  }

  // How to order
  if (clean.includes('how to order') || clean.includes('how to buy') || clean.includes('place order')) {
    return {
      text: "To place an order:\n1. Search for your vehicle part using the search bar or catalog.\n2. Click 'Add to Cart' or 'Buy Now'.\n3. Proceed to Checkout, enter your address, and choose Cash on Delivery (COD) or Online Payment."
    };
  }

    // 4. AUTOMOTIVE SYMPTOMS & WORKSHOP MECHANIC DIAGNOSTICS
  // Brakes
  if (clean.includes('brake') || clean.includes('squeal') || clean.includes('grind') || clean.includes('rotor') || clean.includes('pad') || clean.includes('caliper') || clean.includes('stopping')) {
    return {
      text: "Brake squealing or grinding indicates your brake pads have worn past the 2mm wear indicator shim and the metal backing is rubbing against the rotor disc. A spongy lever means air or moisture is trapped in the hydraulic brake fluid.",
      diy: "Moderate (35 - 45 mins) | Tools: 10mm/12mm Hex Socket, Caliper Piston Spreader, Torque Wrench",
      tips: [
        "Inspect brake pad thickness inside the caliper slot.",
        "Clean rotor surfaces with brake parts cleaner to remove dust and glaze.",
        "Replace worn pads with ceramic high-friction pads and bleed with DOT 4 fluid."
      ],
      parts: [
        { name: "Ceramic High-Friction Brake Pads", price: 899, query: "brake pad" },
        { name: "Cross-Drilled Ventilated Disc Rotor", price: 2199, query: "disc rotor" },
        { name: "Brembo DOT 4 Racing Brake Fluid 500ml", price: 449, query: "brake fluid" }
      ]
    };
  }

  // Engine Sputter, Misfire, Spark Plugs
  if (clean.includes('misfire') || clean.includes('sputter') || clean.includes('hesitat') || clean.includes('jerk') || clean.includes('spark plug') || clean.includes('plug') || clean.includes('ignition') || clean.includes('starting trouble')) {
    return {
      text: "Engine hesitation or sputtering under throttle acceleration is usually caused by carbon-fouled spark plug electrodes, a clogged air intake filter, or a failing ignition coil.",
      diy: "Easy (20 - 30 mins) | Tools: 16mm Magnetic Spark Plug Socket, Feeler Gauge",
      tips: [
        "Inspect spark plug tip: tan/light brown is normal; heavy black soot means fouling.",
        "Check and replace dirty air filter element.",
        "Upgrade to Fine-Wire Laser Iridium plugs for cleaner and stronger combustion."
      ],
      parts: [
        { name: "NGK Laser Iridium Spark Plug", price: 680, query: "spark plug" },
        { name: "High-Flow Cotton Replacement Air Filter", price: 1450, query: "air filter" },
        { name: "High-Output Ignition Coil", price: 1250, query: "ignition coil" }
      ]
    };
  }

  // Engine Oil & Lubrication
  if (clean.includes('oil') || clean.includes('motul') || clean.includes('castrol') || clean.includes('10w40') || clean.includes('10w50') || clean.includes('15w50') || clean.includes('20w50') || clean.includes('synthetic') || clean.includes('lubricant')) {
    return {
      text: "Recommended oil viscosities:\n• High-RPM Bikes (KTM, R15, Pulsar): 10W40 or 10W50 Full Synthetic (JASO MA2 rating).\n• Cruisers (Royal Enfield): 15W50 Semi-Synthetic.\n• Modern Automobiles (Cars): 5W30 or 0W20 Full Synthetic.\n\nAlways change your oil filter when draining engine oil. Never use car oil in a motorcycle wet clutch.",
      diy: "Easy (25 mins) | Tools: 17mm/19mm Drain Bolt Wrench, Oil Drain Pan, Funnel",
      parts: [
        { name: "Motul 7100 10W50 100% Synthetic 4T Oil", price: 1150, query: "motul" },
        { name: "Castrol Power1 Ultimate 10W40 Synthetic", price: 820, query: "castrol" },
        { name: "High-Flow Magnetic Oil Filter", price: 290, query: "oil filter" }
      ]
    };
  }

  // Chain, Sprockets & Drivetrain
  if (clean.includes('chain') || clean.includes('sprocket') || clean.includes('slack') || clean.includes('rattle') || clean.includes('slap') || clean.includes('lube')) {
    return {
      text: "A loud chain rattling or slapping noise means excessive chain slack (> 35mm) striking the swingarm. Worn sprockets develop hooked teeth that slip under acceleration.",
      diy: "Moderate (45 - 60 mins) | Tools: Rear Axle Wrench (27mm/32mm), Chain Alignment Tool",
      tips: [
        "Set chain slack to 25–30mm of vertical play at the midpoint.",
        "Clean and lubricate every 500 km with O-Ring safe chain wax.",
        "Always replace chain and front/rear sprockets as a matched set."
      ],
      parts: [
        { name: "Rolon Brass Solid O-Ring Drive Chain 520 Pitch", price: 2390, query: "chain" },
        { name: "Hardened Steel Front & Rear Sprocket Set", price: 1680, query: "sprocket" },
        { name: "Motul Chain Clean + Lube Touring Duo", price: 890, query: "motul chain" }
      ]
    };
  }

  // Battery & Electrical
  if (clean.includes('battery') || clean.includes('click') || clean.includes('crank') || clean.includes('headlight') || clean.includes('starter') || clean.includes('stator') || clean.includes('bulb')) {
    return {
      text: "A rapid clicking sound with no engine crank indicates battery voltage drops below 10.5V under load. This is caused by sulfated battery plates, loose terminals, or a weak charging stator.",
      diy: "Easy (20 mins) | Tools: 10mm Wrench, Digital Multimeter, Terminal Grease",
      tips: [
        "Resting battery voltage should be 12.6V–12.8V. When running, stator should charge at 14.0V–14.4V.",
        "Clean terminal corrosion with warm baking soda water and coat with terminal grease."
      ],
      parts: [
        { name: "High-CCA Sealed Maintenance-Free AGM Battery", price: 2450, query: "battery" },
        { name: "Copper Wound Magneto Stator Coil", price: 1750, query: "stator" },
        { name: "6500K Ultra-Bright LED Headlamp Bulb H4/H7", price: 990, query: "led bulb" }
      ]
    };
  }

  // Clutch Slipping
  if (clean.includes('clutch') || clean.includes('slip') || clean.includes('gear') || clean.includes('shift')) {
    return {
      text: "When engine RPM revs up quickly but vehicle speed climbs sluggishly, your clutch friction plates are slipping due to heat glazing or worn friction lining.",
      diy: "Advanced (1.5 - 2 hrs) | Tools: Clutch Holding Tool, 8mm/10mm T-Handle, Fresh Engine Oil",
      tips: [
        "Check clutch cable freeplay: ensure 2–3mm of free play before tension engages.",
        "Soak new friction plates in fresh engine oil for 15 minutes before installing.",
        "Replace clutch springs together with plates to restore full clamping force."
      ],
      parts: [
        { name: "Kevlar Reinforced Clutch Friction Plate Set", price: 1850, query: "clutch" },
        { name: "High-Tension Heavy Duty Clutch Springs", price: 420, query: "clutch spring" }
      ]
    };
  }

  // Overheating & Coolant
  if (clean.includes('heat') || clean.includes('overheat') || clean.includes('coolant') || clean.includes('radiator') || clean.includes('temperature') || clean.includes('fan')) {
    return {
      text: "Engine overheating is caused by low coolant level, clogged radiator core fins, airlocks in hoses, or a faulty radiator pressure cap.",
      diy: "Moderate (40 mins) | Tools: Funnel, Radiator Fin Comb, Distilled Water",
      tips: [
        "Never open radiator cap while engine is warm (scalding danger).",
        "Inspect expansion bottle and top up with premixed coolant.",
        "Check cooling fan operation when temperature reaches operating threshold."
      ],
      parts: [
        { name: "Engine Ice High-Performance Coolant 1.89L", price: 1450, query: "coolant" },
        { name: "High-Pressure 1.3 Bar Radiator Cap", price: 380, query: "radiator" }
      ]
    };
  }

  // Exhaust Smoke
  if (clean.includes('smoke') || clean.includes('exhaust')) {
    return {
      text: "Exhaust smoke diagnostics:\n• Blue Smoke: Engine oil burning (worn piston rings or valve stem seals).\n• Black Smoke: Rich fuel mixture / unburnt fuel (clogged air filter or leaky injectors).\n• White Smoke: Normal cold morning condensation, or coolant leaking into combustion if sweet-smelling.",
      parts: [
        { name: "High-Flow Cotton Replacement Air Filter", price: 1450, query: "air filter" }
      ]
    };
  }

  // Specific Vehicle or Part Search (e.g. Duke 390, Activa, Swift, Horn, Disc)
  const partKeywords = ['filter', 'horn', 'wiper', 'bulb', 'mirror', 'tyre', 'tire', 'bearing', 'plug', 'brake', 'oil', 'chain', 'sprocket', 'battery', 'clutch', 'activa', 'duke', 'pulsar', 'bullet', 'royal enfield', 'swift', 'i20', 'creta'];
  if (partKeywords.some(k => clean.includes(k))) {
    return {
      text: `Here are matching genuine parts and catalog results for "${rawQuery.trim()}":`,
      parts: [
        { name: `Search Parts for "${rawQuery.trim().slice(0, 24)}"`, price: 0, query: rawQuery.trim().slice(0, 20) }
      ]
    };
  }

  // 5. OFFSIDE & GENERAL KNOWLEDGE QUESTIONS (Always answer helpfully!)
  // Math Calculations (e.g. "what is 2 + 2", "25 * 4")
  const mathMatch = clean.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let ans = 0;
    if (op === '+') ans = a + b;
    else if (op === '-') ans = a - b;
    else if (op === '*') ans = a * b;
    else if (op === '/') ans = b !== 0 ? (a / b) : 'undefined';
    return {
      text: `${a} ${op} ${b} = ${ans}`
    };
  }

  // Humor & Jokes
  if (clean.includes('joke') || clean.includes('funny') || clean.includes('laugh')) {
    return {
      text: "Why did the motorcycle get a timeout? Because it was two-tired! 😄\n\nHope that brought a smile to your ride today! Let me know if you need any vehicle diagnostics or spare parts."
    };
  }

  // Offside rule in Sports
  if (clean.includes('offside')) {
    return {
      text: "In football (soccer), an attacking player is in an offside position if they are nearer to the opponent's goal line than both the ball and the second-to-last defender at the moment the ball is passed to them.\n\nIn cricket, the 'off side' is the side of the field in front of the batsman's body (the side they face when in their batting stance)!"
    };
  }

  // Weather inquiries
  if (clean.includes('weather') || clean.includes('rain') || clean.includes('temperature today')) {
    return {
      text: "I don't have access to live meteorological weather radar right now, but always check your local forecast before heading out on a ride. Make sure your tire tread depth is safe and headlights/wipers are working if wet roads are expected!"
    };
  }

  // General Questions / Friendly Intelligent Fallback (NO REJECTIONS!)
  if (clean.startsWith('what') || clean.startsWith('who') || clean.startsWith('why') || clean.startsWith('how') || clean.startsWith('can you') || clean.startsWith('tell me') || clean.startsWith('explain')) {
    return {
      text: `That's an interesting question regarding "${rawQuery.trim()}"! While I specialize in master workshop mechanics, diagnostics, and genuine spare parts for MotoDC, I'm always happy to assist. Is there any particular detail about this or your vehicle you'd like me to explain?`
    };
  }

  // Clean Natural Fallback (Welcoming and helpful, never refuses!)
  return {
    text: `I'm here to help! Feel free to ask any question — whether it's vehicle diagnostics (brakes, misfire, chain, oil, battery), genuine spare parts, Cash on Delivery, returns, or general questions.`
  };
}

// Main Component exported for modal or widget
export default function MechanicCopilot({ isModal = true, onClose }) {
  const nav = useNavigate();

  // Chat State
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello Rider! 👋 I'm your MotoDC AI Assistant & Workshop Mechanic.\n\nDescribe any issue with your vehicle (noises, vibrations, starting trouble, fluids) or ask questions about spare parts, COD, delivery, and returns.\n\nHow can I help you today?",
      suggestions: [
        "🛑 Squealing brakes or grinding",
        "⚡ Engine sputtering / misfire",
        "⚙️ Clutch slipping under revs",
        "🔗 Chain loose or rattling",
        "🌡️ Engine overheating & coolant",
        "🔋 Battery clicking / won't start",
        "🛢️ Which engine oil should I choose?",
        "📦 COD & Free Delivery policy",
        "🔄 7-Day Returns & Guarantee"
      ]
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const chatEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    const q = (textToSend || inputQuery).trim();
    if (!q || isTyping) return;

    const userMsg = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: q
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputQuery('');
    setIsTyping(true);

    try {
      const storedKey = localStorage.getItem('motodc_gemini_key') || '';
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          history: nextMessages.slice(-6),
          apiKey: storedKey || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text && !data.fallback) {
          const aiMsg = {
            id: 'ai-' + Date.now(),
            sender: 'ai',
            text: data.text,
            diy: data.diy,
            parts: data.parts,
            source: 'gemini'
          };
          setMessages((prev) => [...prev, aiMsg]);
          setIsTyping(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Gemini endpoint unreachable, falling back to local engine:', err);
    }

    // Instant local intelligent response fallback (Always reliable)
    setTimeout(() => {
      const result = answerUserQuestion(q);
      const aiMsg = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        badge: result.badge,
        title: result.title,
        text: result.text || result.answer || '',
        diy: result.diy,
        tips: result.tips,
        parts: result.parts,
        source: 'local'
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 280);
  };

  const handleInspectPart = (query) => {
    if (onClose) onClose();
    nav(`/products?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="copilotModalContainer">
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
                {m.source === 'gemini' && (
                  <span className="geminiPill">
                    <Sparkles size={10} /> Gemini AI
                  </span>
                )}

                {m.badge && (
                  <div className="chatBubbleBadge">
                    <Sparkles size={12} /> {m.badge}
                  </div>
                )}

                {m.title && <h4 className="chatBubbleTitle">{m.title}</h4>}

                <p className="chatBubbleText">{m.text}</p>

                {/* Workshop Mechanic DIY Badge */}
                {m.diy && (
                  <div className="chatDiyBadge">
                    <Wrench size={12} /> {m.diy}
                  </div>
                )}

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
                    <span className="suggestionsLabel">Suggested Workshop & Store Topics:</span>
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

          {/* Live AI Typing Indicator */}
          {isTyping && (
            <div className="chatMessageRow ai">
              <div className="chatAvatar aiAvatar">
                <Bot size={17} />
              </div>
              <div className="chatBubble chatBubbleTyping">
                <span className="typingDot" />
                <span className="typingDot" />
                <span className="typingDot" />
              </div>
            </div>
          )}

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
            placeholder="Ask anything about mechanics, symptoms, parts, or any topic..."
            className="chatTextInput"
            disabled={isTyping}
            autoFocus
          />
          <button
            type="submit"
            className="chatSendBtn"
            disabled={!inputQuery.trim() || isTyping}
            aria-label="Send query to AI Assistant"
          >
            <Send size={15} />
            <span>{isTyping ? 'Thinking...' : 'Ask'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

// Floating AI Launcher Icon & Slide-Over Chat Widget for ALL pages
export function MechanicCopilotFloatingLauncher() {
  const [isOpen, setIsOpen] = useState(false);

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
            <X size={22} className="aiFloatCloseSvg" />
          ) : (
            <div className="aiIconComposition">
              <Bot size={24} className="aiBotSvg" />
              <span className="aiSparkleDot" aria-hidden="true">
                <Sparkles size={11} />
              </span>
            </div>
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
                  <span className="aiHeaderTag">AI MECHANIC</span>
                </div>
                <span className="aiHeaderSubtext">
                  ● Online · Master Workshop & Live AI
                </span>
              </div>
            </div>

            <div className="aiHeaderActions">
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
              onClose={() => setIsOpen(false)}
            />
          </div>
        </aside>
      )}
    </>
  );
}
