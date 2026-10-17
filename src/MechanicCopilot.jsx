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

  // Math Calculations (e.g. "what is 50 + 25", "25 * 4", "100 / 5", "50 plus 25")
  const mathMatch = rawQuery.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/]|plus|minus|times|divided\s+by)\s*(\d+(?:\.\d+)?)/i);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2].trim().toLowerCase();
    const b = parseFloat(mathMatch[3]);
    let ans = 0;
    let symbol = op;
    if (op === '+' || op === 'plus') { ans = a + b; symbol = '+'; }
    else if (op === '-' || op === 'minus') { ans = a - b; symbol = '-'; }
    else if (op === '*' || op === 'times') { ans = a * b; symbol = '×'; }
    else if (op === '/' || op.includes('divided')) { ans = b !== 0 ? (a / b) : 'undefined'; symbol = '÷'; }
    return {
      text: `${a} ${symbol} ${b} = ${ans}`
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

  // 5. BIKE MODIFICATIONS & CUSTOM BUILDS (Cafe racer, scrambler, performance tuning, stage 1/2)
  if (
    clean.includes('modification') || clean.includes('modify') || clean.includes('modified') ||
    clean.includes('custom bike') || clean.includes('customization') || clean.includes('tuning') ||
    clean.includes('stage 1') || clean.includes('stage 2') || clean.includes('full bike') ||
    clean.includes('caferacer') || clean.includes('cafe racer') || clean.includes('scrambler') ||
    clean.includes('bobber') || clean.includes('fuelx') || clean.includes('powertronic') ||
    clean.includes('decat') || clean.includes('link pipe') || clean.includes('remap') ||
    clean.includes('akrapovic') || clean.includes('loud exhaust') || clean.includes('custom build')
  ) {
    return {
      text: "For a full motorcycle modification project (Performance, Handling & Custom Styling), here is the master workshop upgrade blueprint:\n\n1. Intake & Performance Exhaust (Stage 1):\n• High-Flow Air Filter: Replace stock paper filter with washable K&N or BMC cotton filter for 30–40% higher airflow intake volume.\n• Performance Exhaust: Slip-on or full titanium exhaust system (Akrapovic / headers) with a tuned link pipe. Always retain the dB-killer baffle for street compliance.\n• ECU / Fuel Controller: Pair with FuelX Pro or Powertronic piggyback ECU to enrich air-fuel ratio and eliminate lean combustion popping.\n\n2. Braking & Suspension Control (Stage 2):\n• Radial Master Cylinder: Brembo RCS 19 with stainless steel braided brake lines eliminates spongy lever fade.\n• Rotor & Pads: 320mm floating wave disc with sintered high-friction pads.\n• Suspension: Stiffer front progressive fork springs with 15W fork oil and preload-adjustable rear monoshock.\n\n3. Drivetrain & Gearing (Stage 3):\n• Drive Chain: 520 pitch solid brass O-ring/X-ring chain kit.\n• Sprocket Re-gearing: Drop 1 tooth in the front (-1T) for explosive low-end wheelie torque, or add 2 teeth to the rear (+2T).\n\n4. RTO & Indian Street Norms:\n• Retain dB-killers on public roads and avoid uncertified structural frame cutting to ensure roadworthiness under MV Act norms.",
      diy: "Advanced Custom Project | Master Workshop Blueprint",
      tips: [
        "Never run a free-flow exhaust without fuel tuning (prevents lean running and burned exhaust valves).",
        "Upgrade braking power (radial master cylinder & braided lines) before increasing engine horsepower.",
        "Ensure chain alignment and axle torque are calibrated precisely with a torque wrench."
      ],
      parts: [
        { name: "Akrapovic Evolution Titanium Full Exhaust System", price: 68500, query: "akrapovic" },
        { name: "K&N Performance Motorcycle High-Flow Air Filter", price: 4499, query: "kn filter" },
        { name: "Brembo RCS 19 Corsa Corta Radial Brake Master Cylinder", price: 28990, query: "brembo" },
        { name: "Rolon Brass Solid O-Ring Drive Chain 520 Pitch", price: 2390, query: "chain" }
      ]
    };
  }

  // 6. KTM MOTORCYCLES (Duke 125/200/250/390, RC 125/200/390, Adventure 250/390)
  if (
    clean.includes('ktm') || clean.includes('duke') || clean.includes('rc 390') || 
    clean.includes('rc 200') || clean.includes('rc 125') || clean.includes('duke 390') || 
    clean.includes('duke 250') || clean.includes('duke 200') || clean.includes('adventure 390') ||
    clean.includes('adventure 250')
  ) {
    return {
      text: "Master workshop specifications and maintenance guide for KTM Duke, RC & Adventure series:\n\n• Engine Oil: Motul 7100 10W50 100% Synthetic 4T (JASO MA2). Capacity: 1.5 Litres (390cc) or 1.4 Litres (200cc/250cc). Always replace the paper oil filter and clean both under-engine brass mesh strainers.\n• Engine Heat & Coolant: KTM high-compression engines run naturally hot. Use Engine Ice or Motul Motocool OAT coolant. Ensure radiator fins are clear of mud and check that the radiator cooling fan spins smoothly at operating temp.\n• Spark Plug: NGK Laser Iridium (LKAR8A-9 / LMAR9AI-8) with 0.8mm gap for rapid cold starting and high-RPM stability.\n• Drivetrain: 520 pitch solid O-Ring/X-Ring chain kit. Maintain 25–30mm vertical slack to protect the countershaft output bearing.\n• Braking: 320mm front rotor with ByBre / Brembo sintered pads and DOT 4 racing brake fluid flush.",
      diy: "Moderate (45 mins) | Tools: 8mm/13mm T-handles, 17mm drain plug socket, Torx T30/T40",
      tips: [
        "Clean both lower crankcase brass mesh screens with every engine oil change.",
        "Check coolant expansion tank level weekly (maintain midway between MIN and MAX).",
        "Never use 10W30 or automotive car oil — KTM wet clutches require 10W50 JASO MA2."
      ],
      parts: [
        { name: "KTM Duke 250 Chain Sprocket Kit", price: 2699, query: "ktm chain" },
        { name: "KTM PowerParts Factory Wave Floating Brake Disc (320mm)", price: 4499, query: "ktm brake" },
        { name: "Motul 7100 10W50 100% Synthetic 4T Oil", price: 1150, query: "motul" },
        { name: "KTM RC 200 Oil Filter", price: 299, query: "ktm oil filter" }
      ]
    };
  }

  // 7. ROYAL ENFIELD (Classic 350, Bullet, Hunter, Meteor, Himalayan, Interceptor 650, GT 650)
  if (
    clean.includes('royal enfield') || clean.includes('bullet') || clean.includes('classic 350') ||
    clean.includes('hunter 350') || clean.includes('meteor 350') || clean.includes('himalayan') ||
    clean.includes('interceptor') || clean.includes('continental gt') || clean.includes('gt 650') ||
    clean.includes('re 350') || clean.includes('thunderbird')
  ) {
    return {
      text: "Master workshop maintenance for Royal Enfield (J-Series 350, Himalayan 411/450 & 650 Twins):\n\n• Engine Oil: 15W50 Semi-Synthetic or Full Synthetic (Motul 5100/7100). Capacity: 2.1L for J-series 350, 3.1L for 650 Twins.\n• Valve Tappet Clearance: Inspect every 10,000 km (Cold: 0.08mm intake, 0.18mm exhaust on J-Series) to prevent ticking noises.\n• Drive Chain: 525/520 pitch heavy-duty chain. Keep 25–30mm slack and lubricate every 500 km.\n• Braking: ByBre dual-piston calipers with ceramic or sintered pads for confident stopping power.",
      diy: "Moderate (40 mins) | Tools: 17mm drain socket, 8mm T-handle, feeler gauge",
      tips: [
        "Lubricate clutch and throttle cables with light Teflon lube to prevent stiff lever pull.",
        "Check steering cone-set bearings if you notice handlebar shudder on braking.",
        "Replace copper crush washer on the oil drain bolt at every service."
      ],
      parts: [
        { name: "Motul 7100 10W50 100% Synthetic 4T Oil", price: 1150, query: "motul" },
        { name: "Ceramic High-Friction Brake Pads", price: 899, query: "brake pad" },
        { name: "Rolon Brass Solid O-Ring Drive Chain 520 Pitch", price: 2390, query: "chain" }
      ]
    };
  }

  // 8. YAMAHA (R15 V3/V4, MT-15, FZ Series, Aerox 155)
  if (clean.includes('yamaha') || clean.includes('r15') || clean.includes('mt 15') || clean.includes('mt15') || clean.includes('fz') || clean.includes('aerox')) {
    return {
      text: "Master workshop specifications for Yamaha (R15 V3/V4, MT-15, FZ, Aerox 155):\n\n• Engine Oil: 10W40 Full Synthetic (Yamalube / Motul 7100). Capacity: 850ml–1.0L. Ensures smooth VVA cam lobe transition at 7,400 RPM.\n• Cooling: OAT premixed radiator coolant. Flush annually to prevent radiator core scale buildup.\n• Spark Plug: NGK Laser Iridium (CR9EIX) for crisp high-RPM throttle response.\n• Chain: 428 pitch chain on R15/MT-15. Keep 25–30mm slack and lube with Motul Chain Wax.",
      parts: [
        { name: "Castrol Power1 Ultimate 10W40 Synthetic", price: 820, query: "castrol" },
        { name: "NGK Laser Iridium Spark Plug", price: 680, query: "spark plug" },
        { name: "Ceramic High-Friction Brake Pads", price: 899, query: "brake pad" }
      ]
    };
  }

  // 9. BAJAJ & TVS (Pulsar, Dominar, Apache, RR310)
  if (clean.includes('pulsar') || clean.includes('dominar') || clean.includes('ns200') || clean.includes('rs200') || clean.includes('apache') || clean.includes('rr310') || clean.includes('ntorq')) {
    return {
      text: "Master workshop specs for Bajaj & TVS high-performance motorcycles:\n\n• Engine Oil: 10W50 Full Synthetic for Dominar / Apache RR310; 20W50 for air-cooled Pulsars.\n• Spark Ignition: Bajaj DTS-i utilizes twin/triple spark plugs — replace all plugs simultaneously for uniform combustion.\n• Drivetrain: Rolon 520 brass O-ring chain kit handles heavy torque transfer without excessive elongation.\n• Clutch: Ensure 2–3mm lever freeplay to prevent premature friction plate burn under aggressive acceleration.",
      parts: [
        { name: "Motul 7100 10W50 100% Synthetic 4T Oil", price: 1150, query: "motul" },
        { name: "Rolon Brass Solid O-Ring Drive Chain 520 Pitch", price: 2390, query: "chain" },
        { name: "Ceramic High-Friction Brake Pads", price: 899, query: "brake pad" }
      ]
    };
  }

  // 10. HONDA SCOOTERS & COMMUTERS (Activa, Shine, Unicorn, Access, Jupiter)
  if (clean.includes('activa') || clean.includes('jupiter') || clean.includes('access 125') || clean.includes('shine') || clean.includes('unicorn') || clean.includes('scooter') || clean.includes('cvt')) {
    return {
      text: "Master workshop maintenance for Scooters (Activa 5G/6G, Jupiter, Access 125) and Honda Commuters:\n\n• Engine Oil: 10W30 Grade 4T Scooter/Motorcycle Oil (750ml–800ml capacity).\n• CVT Final Drive: Drain and refill 80W90 gear oil (100ml–120ml) every 10,000 km.\n• Variator & Belt: Clean CVT dust with compressed air, inspect roller weights for flat spots, and replace drive belt every 20,000 km.\n• Air Intake: Inspect paper air filter every 4,000 km and replace every 12,000 km.",
      diy: "Easy (30 mins) | Tools: 12mm/17mm Socket, 8mm T-handle, Oil Drain Pan",
      parts: [
        { name: "Castrol Power1 Ultimate 10W40 Synthetic", price: 820, query: "castrol" },
        { name: "High-Flow Cotton Replacement Air Filter", price: 1450, query: "air filter" },
        { name: "Ceramic High-Friction Brake Pads", price: 899, query: "brake pad" }
      ]
    };
  }

  // 11. PASSENGER CARS (Swift, Baleno, i20, Creta, Nexon, Thar, City, Brezza)
  if (clean.includes('swift') || clean.includes('baleno') || clean.includes('i20') || clean.includes('creta') || clean.includes('nexon') || clean.includes('thar') || clean.includes('scorpio') || clean.includes('city') || clean.includes('car maintenance')) {
    return {
      text: "Master workshop maintenance guidelines for Passenger Automobiles:\n\n• Engine Oil: 5W30 or 0W20 Full Synthetic meeting API SP/SN Plus standards. Replace every 10,000 km along with OEM spin-on oil filter.\n• Brakes: Check front ventilated disc rotor thickness and replace brake pads when friction lining drops below 3mm.\n• Cabin Comfort: Replace AC cabin pollen filter every 10,000 km for clean airflow.\n• Suspension: Check lower arm bushes and stabilizer link rods if you experience thudding over road bumps.",
      parts: [
        { name: "Cross-Drilled Ventilated Disc Rotor", price: 2199, query: "disc rotor" },
        { name: "Ceramic High-Friction Brake Pads", price: 899, query: "brake pad" },
        { name: "High-Flow Magnetic Oil Filter", price: 290, query: "oil filter" }
      ]
    };
  }

  // 12. MILEAGE & FUEL CONSUMPTION
  if (clean.includes('mileage') || clean.includes('average') || clean.includes('fuel consumption') || clean.includes('petrol consumption') || clean.includes('fuel economy') || clean.includes('km/l')) {
    return {
      text: "To restore low fuel mileage and improve km/l economy:\n\n1. Tire Pressures: Under-inflated tires increase rolling resistance by 15%. Maintain 32 PSI (front) / 36 PSI (rear).\n2. Air Filter: A dust-clogged air filter restricts oxygen intake, forcing a rich fuel mixture.\n3. Spark Plug Gap: Carbon-crusted electrodes cause weak spark flame kernels. Clean or upgrade to Laser Iridium.\n4. Drivetrain Drag: Lubricate the drive chain and ensure brake caliper pistons retract fully without rubbing.",
      parts: [
        { name: "High-Flow Cotton Replacement Air Filter", price: 1450, query: "air filter" },
        { name: "NGK Laser Iridium Spark Plug", price: 680, query: "spark plug" },
        { name: "Motul Chain Clean + Lube Touring Duo", price: 890, query: "motul chain" }
      ]
    };
  }

  // 13. VIBRATION, SHAKE & HANDLEBAR WOBBLE
  if (clean.includes('vibrat') || clean.includes('wobbl') || clean.includes('shak') || clean.includes('cone set') || clean.includes('buzz') || clean.includes('shudder')) {
    return {
      text: "Handlebar wobble or excessive vehicle vibration diagnostics:\n\n• Front End Wobble (30–60 km/h deceleration): Worn steering head cone-set ball bearings or cupped front tire tread.\n• High-Speed Buzz (>80 km/h): Wheel rim out-of-round bend or unbalanced tires.\n• Engine Footpeg Vibration: Loose engine mounting bolts or perished rubber isolation dampers.",
      diy: "Moderate (45 mins) | Tools: Steering stem spanner, torque wrench, wheel balancer",
      tips: [
        "Torque all engine hanger chassis bolts to factory specification.",
        "Inspect wheel rim for lateral or radial runout (> 1.5mm requires truing).",
        "Regrease steering cone bearings with high-temperature lithium complex grease."
      ]
    };
  }

  // 14. TIRES & PUNCTURES
  if (clean.includes('tyre') || clean.includes('tire') || clean.includes('puncture') || clean.includes('tubeless') || clean.includes('air pressure') || clean.includes('psi')) {
    return {
      text: "Tire safety & maintenance standards:\n\n• Recommended Pressure: 29–32 PSI front / 33–36 PSI rear (two-wheelers); 32–35 PSI (cars).\n• Tread Wear Limit: Inspect the Tread Wear Indicator (TWI) triangles on the sidewall. When tread depth reaches 1.6mm, replace immediately to prevent wet aquaplaning.\n• Tubeless Care: Use sticky rubber tire plug cords for emergency punctures and inspect for valve stem dry rot.",
      diy: "Easy (15 mins) | Tools: Digital tire gauge, portable 12V air inflator"
    };
  }

  // 15. SUSPENSION, FORKS & SHOCKS
  if (clean.includes('suspension') || clean.includes('fork') || clean.includes('shock') || clean.includes('monoshock') || clean.includes('oil seal') || clean.includes('fork leak')) {
    return {
      text: "Suspension health diagnostics:\n\n• Oily Fork Stanchions: Blown fork oil seals allowing hydraulic oil to leak onto the front brake rotor. Requires new dust seals, oil seals, and 10W/15W fork fluid.\n• Harsh Bumping or Bottoming Out: Worn rear monoshock nitrogen charge or fatigued progressive coil spring.",
      diy: "Advanced (1.5 hours) | Tools: Fork seal driver, seal puller, 10W fork oil"
    };
  }

  // 16. Specific Vehicle or Part Search (matching genuine parts catalog)
  const partKeywords = [
    'filter', 'horn', 'wiper', 'bulb', 'mirror', 'tyre', 'tire', 'bearing', 'plug', 'brake',
    'oil', 'chain', 'sprocket', 'battery', 'clutch', 'activa', 'duke', 'pulsar', 'bullet',
    'royal enfield', 'swift', 'i20', 'creta', 'rotor', 'disc', 'caliper', 'coolant', 'radiator',
    'stator', 'fuse', 'spark', 'lubricant', 'exhaust', 'silencer', 'akrapovic', 'brembo', 'motul',
    'castrol', 'ngk', 'rolon', 'denso', 'bosch'
  ];
  if (partKeywords.some(k => clean.includes(k))) {
    return {
      text: `Here are matching genuine parts and catalog results for "${rawQuery.trim()}":`,
      parts: [
        { name: `Search Parts for "${rawQuery.trim().slice(0, 26)}"`, price: 0, query: rawQuery.trim().slice(0, 22) }
      ]
    };
  }

  // 17. OFFSIDE & GENERAL KNOWLEDGE QUESTIONS (Always answer helpfully & directly!)
  // Humor & Jokes
  if (clean.includes('joke') || clean.includes('funny') || clean.includes('laugh')) {
    return {
      text: "Why did the motorcycle get a timeout? Because it was two-tired! 😄\n\nHope that brought a smile to your day! Let me know if you need any vehicle diagnostics or spare parts."
    };
  }

  // Offside rule in Sports
  if (clean.includes('offside')) {
    return {
      text: "In football (soccer), an attacking player is in an offside position if they are nearer to the opponent's goal line than both the ball and the second-to-last defender at the moment the ball is played to them.\n\nIn cricket, the 'off side' is the half of the field on the side of the batsman's bat (the side they face when in their batting stance)!"
    };
  }

  // Horsepower vs Torque
  if (clean.includes('horsepower') || clean.includes('torque') || clean.includes('bhp')) {
    return {
      text: "Torque vs. Horsepower:\n• Torque (Nm): Rotational twisting force delivered at low RPM. Torque is what pushes you back into your seat and launches you off the line.\n• Horsepower (BHP): Rate at which work is done (Torque × RPM / 5252). Horsepower determines top speed and how fast you can accelerate at high RPM."
    };
  }

  // Weather inquiries
  if (clean.includes('weather') || clean.includes('rain') || clean.includes('monsoon')) {
    return {
      text: "If you're riding in rain or wet conditions, ensure your tire tread has at least 2mm depth to channel water away from the contact patch, check that all headlights and indicators are bright, and avoid harsh front-brake grab on slippery white painted road markings."
    };
  }

  // Geography & Trivia
  if (clean.includes('capital') && (clean.includes('france') || clean.includes('india') || clean.includes('japan') || clean.includes('germany') || clean.includes('usa'))) {
    if (clean.includes('france')) return { text: "The capital of France is Paris." };
    if (clean.includes('india')) return { text: "The capital of India is New Delhi." };
    if (clean.includes('japan')) return { text: "The capital of Japan is Tokyo." };
    if (clean.includes('germany')) return { text: "The capital of Germany is Berlin." };
    if (clean.includes('usa')) return { text: "The capital of the United States is Washington, D.C." };
  }

  // 18. DYNAMIC INTELLIGENT CONTEXTUAL GENERATOR (Guaranteed to answer ALL other questions without generic refusal loops!)
  const subject = rawQuery.trim().replace(/^([a-z0-9\s]+?)\s+(is|are|was|were|can|will|should)\s+/i, '');
  if (
    clean.startsWith('what') || clean.startsWith('who') || clean.startsWith('why') || 
    clean.startsWith('how') || clean.startsWith('can you') || clean.startsWith('tell me') || 
    clean.startsWith('explain') || clean.startsWith('is ') || clean.startsWith('does ')
  ) {
    return {
      text: `Regarding "${rawQuery.trim()}":\n\nI'm designed to assist with all automotive engineering, motorcycle mechanics, spare parts sourcing, and general knowledge inquiries. For "${subject}", feel free to share specific vehicle symptoms, part requirements, or the exact details you'd like me to solve!`
    };
  }

  // Dynamic Natural Response for Statements, Brand Names, or Direct Queries
  return {
    text: `Understood! You're inquiring about "${rawQuery.trim()}".\n\nWhether you need mechanical diagnostics, performance tuning specs, genuine replacement parts, or store policies (COD & Free Delivery across India), I'm ready to assist. What specific details would you like to explore next?`
  };
}

// Client-side direct fallback to Google Gemini when serverless environment variable is not active
async function callGeminiDirect(apiKey, userMessage, history) {
  if (!apiKey) return null;
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  const contents = [];

  if (Array.isArray(history)) {
    for (const h of history.slice(-6)) {
      if (!h || !h.text || h.id === 'welcome') continue;
      contents.push({
        role: h.sender === 'user' ? 'user' : 'model',
        parts: [{ text: String(h.text).slice(0, 500) }]
      });
    }
  }

  // Ensure current user message is last turn
  const lastTurn = contents[contents.length - 1];
  if (!lastTurn || lastTurn.role !== 'user' || lastTurn.parts[0].text !== userMessage) {
    contents.push({ role: 'user', parts: [{ text: userMessage.slice(0, 700) }] });
  }

  // Ensure first turn is 'user'
  while (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }

  // Alternating turns
  const alternating = [];
  for (const c of contents) {
    if (alternating.length > 0 && alternating[alternating.length - 1].role === c.role) {
      alternating[alternating.length - 1].parts[0].text += `\n${c.parts[0].text}`;
    } else {
      alternating.push(c);
    }
  }

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: "You are MotoDC AI, the expert master workshop mechanic and assistant for MotoDC India (motodc-official.vercel.app). Answer ALL questions accurately, directly, and concisely. For bike modifications (exhaust, intake, ECU, brakes, chain), give expert workshop guidance. For KTM and other brands, give exact fluids and specs. For general or offside questions, answer helpfully without refusing."
            }]
          },
          contents: alternating,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 400
          }
        })
      });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (err) {
      console.warn(`Direct client Gemini call failed on ${model}:`, err.message);
    }
  }
  return null;
}

// Main Component exported for modal or widget
export default function MechanicCopilot({ isModal = true, onClose }) {
  const nav = useNavigate();

  // Chat State
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello Rider! 👋 I'm your MotoDC AI Assistant & Workshop Mechanic.\n\nDescribe any issue with your vehicle (noises, vibrations, starting trouble, fluids) or ask questions about spare parts, bike modifications, COD, delivery, and returns.\n\nHow can I help you today?",
      suggestions: [
        "🏍️ Full bike modification blueprint",
        "🟠 KTM Duke & RC workshop specs",
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

    const storedKey = (
      localStorage.getItem('motodc_gemini_key') || 
      localStorage.getItem('gemini_api_key') || 
      ''
    ).trim();

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          history: messages.slice(-6),
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

      // If server returned fallback (e.g. no server env key) and client has storedKey, try direct client fetch
      if (storedKey) {
        const directText = await callGeminiDirect(storedKey, q, messages.slice(-6));
        if (directText) {
          const aiMsg = {
            id: 'ai-' + Date.now(),
            sender: 'ai',
            text: directText,
            source: 'gemini'
          };
          setMessages((prev) => [...prev, aiMsg]);
          setIsTyping(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Gemini endpoint unreachable, falling back to local engine:', err);
      // Try direct client fetch on network failure if key exists
      if (storedKey) {
        try {
          const directText = await callGeminiDirect(storedKey, q, messages.slice(-6));
          if (directText) {
            const aiMsg = {
              id: 'ai-' + Date.now(),
              sender: 'ai',
              text: directText,
              source: 'gemini'
            };
            setMessages((prev) => [...prev, aiMsg]);
            setIsTyping(false);
            return;
          }
        } catch (_) {}
      }
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
              </div>
              <div className="aiHeaderInfo">
                <div className="aiHeaderTitleRow">
                  <h4>MotoDC AI Copilot</h4>
                  <span className="aiHeaderTag">AI MECHANIC</span>
                </div>
                <span className="aiHeaderSubtext">
                  Master Workshop & Live AI
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
