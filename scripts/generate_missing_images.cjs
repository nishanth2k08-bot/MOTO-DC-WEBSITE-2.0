const fs = require('fs');
const path = require('path');

const outDir = path.resolve('public/images/products');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function wrapSVG(defs, content, watermark) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <radialGradient id="studioBg" cx="50%" cy="42%" r="65%">
      <stop offset="0%" stop-color="#1e222d"/>
      <stop offset="55%" stop-color="#111318"/>
      <stop offset="100%" stop-color="#08090c"/>
    </radialGradient>
    <radialGradient id="floorSpot" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.08)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <filter id="studioShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000000" flood-opacity="0.75"/>
    </filter>
    <linearGradient id="metalChrome" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="25%" stop-color="#94a3b8"/>
      <stop offset="50%" stop-color="#f8fafc"/>
      <stop offset="75%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="rotorSteel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8a95a5"/>
      <stop offset="35%" stop-color="#4a5568"/>
      <stop offset="70%" stop-color="#9aa5b8"/>
      <stop offset="100%" stop-color="#2d3748"/>
    </linearGradient>
    ${defs || ''}
  </defs>

  <!-- Studio Canvas -->
  <rect width="600" height="600" fill="url(#studioBg)"/>
  <ellipse cx="300" cy="515" rx="220" ry="32" fill="url(#floorSpot)"/>
  <ellipse cx="300" cy="515" rx="160" ry="18" fill="rgba(0,0,0,0.65)"/>

  <!-- Content -->
  ${content}

  <!-- Studio Watermark Tag -->
  <text x="32" y="568" fill="#475569" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5">MOTODC AUTHENTIC PART • ${watermark}</text>
</svg>`;
}

// 1. OIL BOTTLE TEMPLATE
function makeOilBottle({ id, file, brand, name, viscosity, sub, color1, color2, capColor, vol, extra }) {
  const defs = `
    <linearGradient id="body_${id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${color1}"/>
      <stop offset="50%" stop-color="${color2}"/>
      <stop offset="100%" stop-color="${color1}"/>
    </linearGradient>
    <linearGradient id="cap_${id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${capColor}"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${capColor}"/>
    </linearGradient>
  `;

  const isAerosol = extra === 'spray';
  let bodyContent = '';

  if (isAerosol) {
    // Aerosol Spray Can
    bodyContent = `
      <g filter="url(#studioShadow)">
        <!-- Nozzle & Cap -->
        <rect x="278" y="110" width="44" height="24" rx="4" fill="#ffffff"/>
        <circle cx="300" cy="100" r="10" fill="#dc2626"/>
        <rect x="255" y="134" width="90" height="30" rx="4" fill="url(#cap_${id})"/>
        <!-- Cylinder Can -->
        <rect x="240" y="164" width="120" height="330" rx="12" fill="url(#body_${id})"/>
        <!-- Label Area -->
        <rect x="246" y="180" width="108" height="295" rx="6" fill="#111317" stroke="${color2}" stroke-width="1.5"/>
        <rect x="252" y="195" width="96" height="42" rx="4" fill="#ffffff"/>
        <text x="300" y="224" fill="${color1}" font-family="Arial, sans-serif" font-size="20" font-weight="900" text-anchor="middle">${brand}</text>
        <text x="300" y="275" fill="#f8fafc" font-family="Arial, sans-serif" font-size="16" font-weight="900" text-anchor="middle">${name}</text>
        <text x="300" y="298" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="1">${sub || 'SYNTHETIC FORMULA'}</text>
        <!-- Spray Badge -->
        <circle cx="300" cy="355" r="32" fill="${color1}" stroke="#ffffff" stroke-width="2"/>
        <text x="300" y="352" fill="#ffffff" font-family="Arial, sans-serif" font-size="13" font-weight="900" text-anchor="middle">AEROSOL</text>
        <text x="300" y="368" fill="#ffffff" font-family="Arial, sans-serif" font-size="11" font-weight="800" text-anchor="middle">SPRAY</text>
        <rect x="275" y="430" width="50" height="24" rx="4" fill="#1e293b"/>
        <text x="300" y="446" fill="#94a3b8" font-family="Arial, sans-serif" font-size="12" font-weight="800" text-anchor="middle">${vol || '400ml'}</text>
      </g>
    `;
  } else {
    // 1L or 4L Oil Canister
    const isJug = vol && vol.includes('4L') || vol && vol.includes('3.5L') || vol && vol.includes('2.5L');
    bodyContent = `
      <g filter="url(#studioShadow)">
        <!-- Cap -->
        <rect x="262" y="105" width="76" height="32" rx="5" fill="url(#cap_${id})"/>
        ${[272, 284, 296, 308, 320].map(x => `<line x1="${x}" y1="105" x2="${x}" y2="137" stroke="#000000" stroke-width="1.5" opacity="0.3"/>`).join('')}
        <!-- Bottle Neck & Shoulder -->
        <path d="M272 137 L272 165 L225 210 L225 490 Q225 502 237 502 L363 502 Q375 502 375 490 L375 210 L328 165 L328 137 Z" fill="url(#body_${id})"/>
        ${isJug ? `
        <!-- Handle for Jug -->
        <path d="M375 230 Q425 255 425 330 Q425 405 375 430" fill="none" stroke="url(#body_${id})" stroke-width="34" stroke-linecap="round"/>
        <path d="M375 244 Q410 268 410 330 Q410 392 375 416" fill="none" stroke="#0f172a" stroke-width="14" stroke-linecap="round"/>
        ` : ''}
        <!-- Front Label -->
        <rect x="238" y="215" width="124" height="268" rx="8" fill="#0f172a" stroke="${color2}" stroke-width="2"/>
        <!-- Brand Header Banner -->
        <rect x="244" y="225" width="112" height="42" rx="4" fill="#ffffff"/>
        <text x="300" y="253" fill="${color1}" font-family="Arial, sans-serif" font-size="20" font-weight="900" text-anchor="middle" letter-spacing="1">${brand}</text>
        <!-- Product Name -->
        <text x="300" y="295" fill="#f8fafc" font-family="Arial, sans-serif" font-size="17" font-weight="900" text-anchor="middle">${name}</text>
        <text x="300" y="315" fill="#94a3b8" font-family="Arial, sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="1">${sub || 'FULL SYNTHETIC'}</text>
        <!-- Viscosity Pill -->
        ${viscosity ? `
        <rect x="252" y="330" width="96" height="38" rx="6" fill="${color1}"/>
        <text x="300" y="356" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="900" text-anchor="middle">${viscosity}</text>
        ` : ''}
        <!-- Tech Specifications -->
        <text x="300" y="398" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="9" font-weight="700" text-anchor="middle">PREMIUM ENGINE PROTECTION</text>
        <text x="300" y="414" fill="#64748b" font-family="Arial, sans-serif" font-size="8" font-weight="700" text-anchor="middle">API SP / SN PLUS • ACEA A3/B4</text>
        <!-- Volume badge -->
        <rect x="275" y="440" width="50" height="24" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1"/>
        <text x="300" y="456" fill="#f8fafc" font-family="Arial, sans-serif" font-size="12" font-weight="900" text-anchor="middle">${vol || '1L'}</text>
      </g>
    `;
  }

  const svg = wrapSVG(defs, bodyContent, `${brand.toUpperCase()} • ${name.toUpperCase()} ${viscosity || ''}`);
  fs.writeFileSync(path.join(outDir, file), svg);
  console.log('Generated oil bottle:', file);
}

// 2. BRAKE DISC TEMPLATE
function makeBrakeDisc({ file, brand, model, lugs = 5, wave = false, grooved = true, pcd = '114.3' }) {
  const angles = [];
  for (let i = 0; i < lugs; i++) angles.push((i * 360) / lugs);
  const ventHoles = [];
  for (let i = 0; i < 24; i++) {
    const a = (i * 360) / 24 * Math.PI / 180;
    const r1 = 185, r2 = 210;
    ventHoles.push(`<circle cx="${300 + Math.cos(a) * r1}" cy="${300 + Math.sin(a) * r1}" r="4" fill="#0f172a"/>`);
    ventHoles.push(`<circle cx="${300 + Math.cos(a + 0.08) * r2}" cy="${300 + Math.sin(a + 0.08) * r2}" r="3.5" fill="#0f172a"/>`);
  }

  const content = `
    <g filter="url(#studioShadow)">
      <!-- Outer Rotor Ring -->
      ${wave ? `
      <!-- Wave Rotor Profile -->
      <path d="
        M300 65 Q335 60 370 75 Q405 90 435 118 Q465 146 480 181 Q495 216 500 252 Q505 288 495 324 Q485 360 460 390 Q435 420 405 442 Q375 464 338 474 Q301 484 265 478 Q229 472 196 454 Q163 436 138 408 Q113 380 99 346 Q85 312 85 276 Q85 240 98 205 Q111 170 134 141 Q157 112 189 92 Q221 72 258 66 Z
      " fill="url(#metalChrome)" stroke="#475569" stroke-width="4"/>
      ` : `
      <circle cx="300" cy="300" r="235" fill="url(#metalChrome)" stroke="#334155" stroke-width="4"/>
      `}
      <circle cx="300" cy="300" r="145" fill="none" stroke="#64748b" stroke-width="2"/>
      
      <!-- Ventilation slots / grooves -->
      ${grooved ? [0, 45, 90, 135, 180, 225, 270, 315].map(deg => `
        <path d="M300 300 m${Math.cos(deg*Math.PI/180)*155},${Math.sin(deg*Math.PI/180)*155} q${Math.cos((deg+30)*Math.PI/180)*30},${Math.sin((deg+30)*Math.PI/180)*30} ${Math.cos((deg+10)*Math.PI/180)*60},${Math.sin((deg+10)*Math.PI/180)*60}" fill="none" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
      `).join('') : ''}

      <!-- Cross Drilled Holes -->
      ${ventHoles.join('')}

      <!-- Center Carrier Hub -->
      <circle cx="300" cy="300" r="125" fill="#1e222d" stroke="#d4af37" stroke-width="2"/>
      <circle cx="300" cy="300" r="122" fill="#0f172a"/>
      <circle cx="300" cy="300" r="50" fill="#090a0f" stroke="#334155" stroke-width="4"/>

      <!-- Lug Bolt Holes -->
      ${angles.map(deg => {
        const rad = deg * Math.PI / 180;
        const x = 300 + Math.cos(rad) * 85;
        const y = 300 + Math.sin(rad) * 85;
        return `
          <circle cx="${x}" cy="${y}" r="14" fill="#334155" stroke="#94a3b8" stroke-width="2.5"/>
          <circle cx="${x}" cy="${y}" r="8" fill="#090a0f"/>
        `;
      }).join('')}

      <!-- Center Hub Specs -->
      <text x="300" y="278" fill="#f8fafc" font-family="Arial, sans-serif" font-size="15" font-weight="900" text-anchor="middle" letter-spacing="1">${brand.toUpperCase()}</text>
      <text x="300" y="296" fill="#94a3b8" font-family="Arial, sans-serif" font-size="11" font-weight="700" text-anchor="middle">${model}</text>
      <text x="300" y="328" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="10" font-weight="700" text-anchor="middle">VENTILATED DISC</text>
      <text x="300" y="342" fill="#64748b" font-family="Arial, sans-serif" font-size="9" font-weight="600" text-anchor="middle">PCD ${lugs}x${pcd} • MIN THK 22mm</text>
    </g>
  `;

  const svg = wrapSVG('', content, `${brand.toUpperCase()} • ${model.toUpperCase()} BRAKE ROTOR`);
  fs.writeFileSync(path.join(outDir, file), svg);
  console.log('Generated brake disc:', file);
}

// 3. CALIPER & BRAKE SYSTEM TEMPLATE
function makeCaliper({ file, brand, name, color = '#dc2626' }) {
  const content = `
    <g filter="url(#studioShadow)">
      <!-- Caliper Body -->
      <path d="M160 220 Q220 180 300 180 Q380 180 440 220 Q460 250 450 320 Q440 380 380 400 L220 400 Q160 380 150 320 Q140 250 160 220 Z" fill="${color}" stroke="#ffffff" stroke-width="3"/>
      <!-- Caliper Pistons / Cutouts -->
      <rect x="200" y="240" width="85" height="110" rx="12" fill="#0f172a" stroke="#cbd5e1" stroke-width="3"/>
      <circle cx="242" cy="275" r="26" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
      <circle cx="242" cy="325" r="22" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
      
      <rect x="315" y="240" width="85" height="110" rx="12" fill="#0f172a" stroke="#cbd5e1" stroke-width="3"/>
      <circle cx="358" cy="275" r="26" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
      <circle cx="358" cy="325" r="22" fill="#334155" stroke="#94a3b8" stroke-width="2"/>

      <!-- Mounting Lugs -->
      <circle cx="150" cy="340" r="18" fill="#1e293b" stroke="#cbd5e1" stroke-width="3"/>
      <circle cx="150" cy="340" r="9" fill="#000000"/>
      <circle cx="450" cy="340" r="18" fill="#1e293b" stroke="#cbd5e1" stroke-width="3"/>
      <circle cx="450" cy="340" r="9" fill="#000000"/>

      <!-- Brand Logo in Center -->
      <rect x="235" y="365" width="130" height="28" rx="5" fill="#000000" opacity="0.6"/>
      <text x="300" y="384" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="900" text-anchor="middle" letter-spacing="1.5">${brand.toUpperCase()}</text>
      <text x="300" y="212" fill="#ffffff" font-family="Arial, sans-serif" font-size="12" font-weight="800" text-anchor="middle">${name}</text>
    </g>
  `;
  const svg = wrapSVG('', content, `${brand.toUpperCase()} • ${name.toUpperCase()}`);
  fs.writeFileSync(path.join(outDir, file), svg);
  console.log('Generated caliper:', file);
}

// 4. MASTER CYLINDER TEMPLATE
function makeMasterCylinder({ file, brand, name }) {
  const content = `
    <g filter="url(#studioShadow)">
      <!-- Lever Pivot Body -->
      <rect x="180" y="250" width="140" height="90" rx="14" fill="#1e293b" stroke="#64748b" stroke-width="3"/>
      <!-- Reservoir Cup -->
      <rect x="220" y="160" width="60" height="70" rx="8" fill="#38bdf8" fill-opacity="0.3" stroke="#e2e8f0" stroke-width="3"/>
      <rect x="215" y="150" width="70" height="16" rx="4" fill="#0f172a" stroke="#cbd5e1" stroke-width="2"/>
      <!-- Radial Brake Lever -->
      <path d="M220 320 Q280 340 370 340 Q440 340 480 370 Q495 385 485 400 Q470 405 440 380 Q370 365 220 340 Z" fill="#0f172a" stroke="#d4af37" stroke-width="2.5"/>
      <circle cx="485" cy="385" r="14" fill="#d4af37"/>
      <!-- Clamp Bracket -->
      <path d="M180 260 L140 260 Q120 295 140 330 L180 330" fill="none" stroke="#475569" stroke-width="16" stroke-linecap="round"/>
      <!-- Adjuster Knob -->
      <circle cx="310" cy="270" r="16" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
      <!-- Label -->
      <text x="250" y="300" fill="#f8fafc" font-family="Arial, sans-serif" font-size="13" font-weight="900">${brand}</text>
      <text x="250" y="318" fill="#94a3b8" font-family="Arial, sans-serif" font-size="10" font-weight="700">RCS CORSA CORTA</text>
    </g>
  `;
  const svg = wrapSVG('', content, `${brand.toUpperCase()} • ${name.toUpperCase()}`);
  fs.writeFileSync(path.join(outDir, file), svg);
  console.log('Generated master cylinder:', file);
}

// 5. EXHAUST SYSTEM & SILENCER TEMPLATE
function makeExhaust({ file, brand, name, isFullSystem = false }) {
  const content = `
    <g filter="url(#studioShadow)">
      ${isFullSystem ? `
      <!-- Full Headers -->
      <path d="M120 180 Q160 280 200 320 L300 340" fill="none" stroke="url(#metalChrome)" stroke-width="18" stroke-linecap="round"/>
      <path d="M150 170 Q185 270 220 320 L300 340" fill="none" stroke="url(#metalChrome)" stroke-width="18" stroke-linecap="round"/>
      ` : ''}
      <!-- Muffler Body -->
      <path d="M220 380 L390 280 Q450 250 490 270 L510 330 Q470 380 400 410 L240 430 Z" fill="#181a20" stroke="#475569" stroke-width="3"/>
      <!-- Carbon Texture Overlay -->
      <path d="M240 370 L390 285 Q445 258 480 275 L500 325 Q460 370 400 400 L255 418 Z" fill="#262933"/>
      <!-- End Cap Carbon -->
      <path d="M490 270 L520 285 L530 320 L505 340 Z" fill="#0f172a" stroke="#d4af37" stroke-width="2"/>
      <circle cx="512" cy="305" r="16" fill="#000000" stroke="#cbd5e1" stroke-width="3"/>
      <!-- Inlet Pipe -->
      <path d="M180 420 L240 390 L250 425 L190 445 Z" fill="url(#metalChrome)"/>
      <!-- Akrapovic Red/White Scorpion Logo -->
      <rect x="320" y="325" width="80" height="34" rx="4" fill="#000000" stroke="#dc2626" stroke-width="1.5"/>
      <text x="360" y="348" fill="#ffffff" font-family="Arial, sans-serif" font-size="13" font-weight="900" text-anchor="middle" letter-spacing="1">AKRAPOVIČ</text>
    </g>
  `;
  const svg = wrapSVG('', content, `${brand.toUpperCase()} • ${name.toUpperCase()}`);
  fs.writeFileSync(path.join(outDir, file), svg);
  console.log('Generated exhaust:', file);
}

// 6. ELECTRICAL & ACCESSORIES TEMPLATE
function makeAccessory({ file, brand, name, category, iconType }) {
  let accessoryGraphic = '';

  if (iconType === 'starter') {
    accessoryGraphic = `
      <!-- Starter Motor Cylinder & Solenoid -->
      <rect x="200" y="240" width="220" height="100" rx="20" fill="#334155" stroke="#cbd5e1" stroke-width="3"/>
      <rect x="230" y="180" width="130" height="60" rx="12" fill="#1e293b" stroke="#94a3b8" stroke-width="2.5"/>
      <!-- Starter Pinion Gear -->
      <rect x="145" y="270" width="55" height="40" rx="4" fill="url(#metalChrome)"/>
      ${[150, 160, 170, 180, 190].map(x => `<line x1="${x}" y1="265" x2="${x}" y2="315" stroke="#0f172a" stroke-width="3"/>`).join('')}
      <!-- Solenoid Terminal -->
      <circle cx="250" cy="210" r="10" fill="#d97706" stroke="#ffffff" stroke-width="2"/>
      <circle cx="280" cy="210" r="8" fill="#d97706"/>
      <!-- Mounting Flange -->
      <path d="M190 220 L210 220 L210 360 L190 360 Q170 360 170 290 Z" fill="#64748b"/>
      <circle cx="180" cy="240" r="7" fill="#000000"/>
      <circle cx="180" cy="340" r="7" fill="#000000"/>
    `;
  } else if (iconType === 'carburetor') {
    accessoryGraphic = `
      <!-- Carburetor Body -->
      <rect x="210" y="210" width="180" height="150" rx="16" fill="url(#metalChrome)" stroke="#475569" stroke-width="3"/>
      <circle cx="300" cy="285" r="45" fill="#0f172a" stroke="#64748b" stroke-width="4"/>
      <!-- Butterfly / Slide -->
      <line x1="260" y1="285" x2="340" y2="285" stroke="#d4af37" stroke-width="6"/>
      <!-- Float Bowl -->
      <path d="M225 360 L375 360 Q380 430 300 440 Q220 430 225 360 Z" fill="#334155" stroke="#94a3b8" stroke-width="3"/>
      <circle cx="300" cy="415" r="8" fill="#d97706"/>
      <!-- Throttle Bell & Linkage -->
      <rect x="250" y="160" width="100" height="50" rx="8" fill="#1e293b" stroke="#cbd5e1" stroke-width="2"/>
    `;
  } else if (iconType === 'stator') {
    accessoryGraphic = `
      <!-- Stator Ring -->
      <circle cx="300" cy="300" r="160" fill="none" stroke="#334155" stroke-width="45"/>
      ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
        const rad = deg * Math.PI / 180;
        const x = 300 + Math.cos(rad) * 160;
        const y = 300 + Math.sin(rad) * 160;
        return `
          <rect x="${x - 16}" y="${y - 12}" width="32" height="24" rx="4" transform="rotate(${deg} ${x} ${y})" fill="#b45309" stroke="#fbbf24" stroke-width="1.5"/>
        `;
      }).join('')}
      <!-- Center Mounting Core -->
      <circle cx="300" cy="300" r="100" fill="#0f172a" stroke="#64748b" stroke-width="4"/>
      <circle cx="300" cy="300" r="40" fill="#000000"/>
      <!-- Pickup Sensor -->
      <rect x="420" y="270" width="50" height="40" rx="6" fill="#1e293b" stroke="#ffffff" stroke-width="2"/>
    `;
  } else if (iconType === 'seat') {
    accessoryGraphic = `
      <!-- KTM Ergonomic Seat Contour -->
      <path d="M120 350 Q220 280 380 290 Q460 300 500 340 Q470 380 380 380 Q240 390 120 350 Z" fill="#181a20" stroke="#f97316" stroke-width="4"/>
      <path d="M160 335 Q240 300 370 305 Q430 310 470 345" fill="none" stroke="#f97316" stroke-width="2.5" stroke-dasharray="6,4"/>
      <rect x="270" y="335" width="80" height="24" rx="4" fill="#000000" stroke="#f97316" stroke-width="1.5"/>
      <text x="310" y="352" fill="#f97316" font-family="Arial, sans-serif" font-size="12" font-weight="900" text-anchor="middle">KTM POWERPARTS</text>
    `;
  } else if (iconType === 'mirror') {
    accessoryGraphic = `
      <!-- Round Bar-End Mirror -->
      <circle cx="300" cy="270" r="110" fill="#0f172a" stroke="#cbd5e1" stroke-width="6"/>
      <circle cx="300" cy="270" r="98" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <ellipse cx="280" cy="240" rx="55" ry="30" fill="url(#metalChrome)" opacity="0.3" transform="rotate(-30 280 240)"/>
      <!-- Mirror Stem & Bar Clamp -->
      <path d="M300 380 L300 460 Q300 480 270 480 L230 480" fill="none" stroke="#334155" stroke-width="18" stroke-linecap="round"/>
      <circle cx="230" cy="480" r="22" fill="#1e293b" stroke="#cbd5e1" stroke-width="4"/>
      <circle cx="230" cy="480" r="10" fill="#000000"/>
    `;
  } else if (iconType === 'bashplate') {
    accessoryGraphic = `
      <!-- Sump Guard / Bash Plate -->
      <path d="M180 180 L420 180 L400 420 Q300 460 200 420 Z" fill="#475569" stroke="#cbd5e1" stroke-width="4"/>
      <!-- Laser cut ventilation slots -->
      ${[230, 270, 310, 350].map(y => `
        <rect x="230" y="${y}" width="140" height="12" rx="6" fill="#0f172a"/>
      `).join('')}
      <!-- RE Badge -->
      <rect x="250" y="380" width="100" height="24" rx="4" fill="#0f172a"/>
      <text x="300" y="396" fill="#fbbf24" font-family="Arial, sans-serif" font-size="11" font-weight="900" text-anchor="middle">ROYAL ENFIELD</text>
    `;
  } else if (iconType === 'light') {
    accessoryGraphic = `
      <!-- LED Fog / Headlight Assembly -->
      <rect x="200" y="200" width="200" height="200" rx="100" fill="#0f172a" stroke="#38bdf8" stroke-width="4"/>
      <circle cx="300" cy="300" r="85" fill="#1e293b" stroke="#60a5fa" stroke-width="3"/>
      <!-- LED Projector Lens -->
      <circle cx="300" cy="300" r="50" fill="#38bdf8" fill-opacity="0.4" stroke="#ffffff" stroke-width="3"/>
      <!-- Angel Eye Ring -->
      <circle cx="300" cy="300" r="75" fill="none" stroke="#67e8f9" stroke-width="4" stroke-dasharray="14,6"/>
      <!-- Heat Sink Fins -->
      ${[160, 175, 190].map(y => `<line x1="220" y1="${y}" x2="380" y2="${y}" stroke="#475569" stroke-width="6"/>`).join('')}
    `;
  } else if (iconType === 'switch') {
    accessoryGraphic = `
      <!-- Handlebar Switchgear -->
      <rect x="210" y="200" width="180" height="230" rx="24" fill="#181a20" stroke="#475569" stroke-width="3"/>
      <!-- Turn Signal Switch -->
      <rect x="260" y="240" width="80" height="34" rx="6" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
      <polygon points="275,257 285,250 285,264" fill="#fbbf24"/>
      <polygon points="325,257 315,250 315,264" fill="#fbbf24"/>
      <!-- Horn Button -->
      <circle cx="300" cy="330" r="28" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
      <text x="300" y="336" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="900" text-anchor="middle">HORN</text>
      <!-- Pass Light Trigger -->
      <rect x="250" y="380" width="100" height="28" rx="6" fill="#eab308"/>
      <text x="300" y="398" fill="#000000" font-family="Arial, sans-serif" font-size="11" font-weight="900" text-anchor="middle">PASS LIGHT</text>
    `;
  } else if (iconType === 'charger') {
    accessoryGraphic = `
      <!-- Waterproof USB Charger -->
      <circle cx="300" cy="290" r="95" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
      <rect x="250" y="255" width="100" height="36" rx="6" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
      <text x="300" y="278" fill="#38bdf8" font-family="Arial, sans-serif" font-size="14" font-weight="900" text-anchor="middle">QC 3.0 • 18W</text>
      <!-- Dual Ports -->
      <rect x="265" y="305" width="30" height="14" rx="2" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <rect x="305" y="305" width="30" height="14" rx="2" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <!-- Weatherproof Silicone Cap -->
      <path d="M220 290 Q220 180 300 180 Q380 180 380 290" fill="none" stroke="#0f172a" stroke-width="18" stroke-linecap="round"/>
    `;
  } else {
    // General high tech electronic / electrical unit
    accessoryGraphic = `
      <rect x="200" y="220" width="200" height="180" rx="18" fill="#1e293b" stroke="#475569" stroke-width="3"/>
      <rect x="220" y="240" width="160" height="140" rx="10" fill="#0f172a"/>
      <circle cx="300" cy="310" r="38" fill="#3b82f6" stroke="#60a5fa" stroke-width="3"/>
      <text x="300" y="316" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="900" text-anchor="middle">OEM</text>
    `;
  }

  const content = `
    <g filter="url(#studioShadow)">
      ${accessoryGraphic}
      <!-- Tech Badge -->
      <rect x="200" y="460" width="200" height="32" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <text x="300" y="481" fill="#f8fafc" font-family="Arial, sans-serif" font-size="13" font-weight="900" text-anchor="middle">${brand} • ${category}</text>
    </g>
  `;
  const svg = wrapSVG('', content, `${brand.toUpperCase()} • ${name.toUpperCase()}`);
  fs.writeFileSync(path.join(outDir, file), svg);
  console.log('Generated accessory:', file);
}

// 7. OIL FILTER CANISTER TEMPLATE
function makeOilFilter({ file, brand, name, color = '#181a20', isCartridge = false }) {
  const content = `
    <g filter="url(#studioShadow)">
      ${isCartridge ? `
      <!-- Pleated Filter Cartridge -->
      <rect x="220" y="190" width="160" height="230" rx="12" fill="#d97706" stroke="#b45309" stroke-width="2"/>
      ${[230, 245, 260, 275, 290, 305, 320, 335, 350, 365].map(x => `
        <line x1="${x}" y1="190" x2="${x}" y2="420" stroke="#78350f" stroke-width="3"/>
      `).join('')}
      <rect x="210" y="175" width="180" height="22" rx="5" fill="#1e293b"/>
      <rect x="210" y="415" width="180" height="22" rx="5" fill="#1e293b"/>
      ` : `
      <!-- Spin-On Canister -->
      <rect x="210" y="180" width="180" height="240" rx="20" fill="${color}" stroke="#475569" stroke-width="3"/>
      <!-- Removal Nut on Top (K&N Style) -->
      <rect x="275" y="150" width="50" height="32" rx="4" fill="#d4af37" stroke="#000000" stroke-width="2"/>
      <!-- Rubber Base Gasket -->
      <rect x="200" y="415" width="200" height="20" rx="6" fill="#0f172a" stroke="#dc2626" stroke-width="3"/>
      `}
      <!-- Brand Logo on Filter -->
      <rect x="235" y="270" width="130" height="50" rx="6" fill="#000000" stroke="#dc2626" stroke-width="2"/>
      <text x="300" y="302" fill="#ffffff" font-family="Arial, sans-serif" font-size="18" font-weight="900" text-anchor="middle">${brand}</text>
      <text x="300" y="345" fill="#f8fafc" font-family="Arial, sans-serif" font-size="12" font-weight="800" text-anchor="middle">OIL FILTER</text>
      <text x="300" y="365" fill="#94a3b8" font-family="Arial, sans-serif" font-size="10" font-weight="700" text-anchor="middle">HIGH EFFICIENCY</text>
    </g>
  `;
  const svg = wrapSVG('', content, `${brand.toUpperCase()} • ${name.toUpperCase()}`);
  fs.writeFileSync(path.join(outDir, file), svg);
  console.log('Generated filter:', file);
}

// 8. BULB / LIGHTING TEMPLATE
function makeBulb({ file, brand, name, isLed = false, isPair = true }) {
  const content = `
    <g filter="url(#studioShadow)">
      <!-- Dual Bulbs if pair -->
      ${isPair ? `
      <!-- Left Bulb -->
      <g transform="translate(-55, 0)">
        <rect x="260" y="310" width="80" height="90" rx="6" fill="url(#metalChrome)" stroke="#475569" stroke-width="2"/>
        <path d="M280 310 L280 200 Q280 180 300 180 Q320 180 320 200 L320 310 Z" fill="${isLed ? '#38bdf8' : '#60a5fa'}" fill-opacity="0.3" stroke="#cbd5e1" stroke-width="2"/>
        <line x1="300" y1="200" x2="300" y2="280" stroke="#fef08a" stroke-width="4"/>
        <circle cx="300" cy="230" r="10" fill="#fef08a"/>
      </g>
      <!-- Right Bulb -->
      <g transform="translate(55, 0)">
        <rect x="260" y="310" width="80" height="90" rx="6" fill="url(#metalChrome)" stroke="#475569" stroke-width="2"/>
        <path d="M280 310 L280 200 Q280 180 300 180 Q320 180 320 200 L320 310 Z" fill="${isLed ? '#38bdf8' : '#60a5fa'}" fill-opacity="0.3" stroke="#cbd5e1" stroke-width="2"/>
        <line x1="300" y1="200" x2="300" y2="280" stroke="#fef08a" stroke-width="4"/>
        <circle cx="300" cy="230" r="10" fill="#fef08a"/>
      </g>
      ` : `
      <rect x="260" y="310" width="80" height="90" rx="6" fill="url(#metalChrome)" stroke="#475569" stroke-width="2"/>
      <path d="M280 310 L280 200 Q280 180 300 180 Q320 180 320 200 L320 310 Z" fill="${isLed ? '#38bdf8' : '#60a5fa'}" fill-opacity="0.3" stroke="#cbd5e1" stroke-width="2"/>
      <line x1="300" y1="200" x2="300" y2="280" stroke="#fef08a" stroke-width="4"/>
      `}
      <!-- Brand Specification Badge -->
      <rect x="210" y="430" width="180" height="34" rx="6" fill="#0f172a" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="300" y="452" fill="#ffffff" font-family="Arial, sans-serif" font-size="14" font-weight="900" text-anchor="middle">${brand} • ${isLed ? 'LED' : '5000K'}</text>
    </g>
  `;
  const svg = wrapSVG('', content, `${brand.toUpperCase()} • ${name.toUpperCase()}`);
  fs.writeFileSync(path.join(outDir, file), svg);
  console.log('Generated bulb:', file);
}

// ----------------------------------------------------
// RUN GENERATION FOR ALL 56 PRODUCTS
// ----------------------------------------------------

console.log('Starting full image asset generation for all 56 products...');

// Castrol Oils
makeOilBottle({ id: 'sp-107', file: 'sp-107_castrol_edge_5w-40_advanced_full_synthetic.svg', brand: 'Castrol', name: 'EDGE', viscosity: '5W-40', sub: 'FLUID TITANIUM', color1: '#854d0e', color2: '#eab308', capColor: '#15803d', vol: '4L' });
makeOilBottle({ id: 'sp-108', file: 'sp-108_castrol_radicool_sf_longlife_oat_coolant.svg', brand: 'Castrol', name: 'RADICOOL SF', viscosity: 'OAT COOLANT', sub: 'LONGLIFE CONCENTRATE', color1: '#701a75', color2: '#c026d3', capColor: '#0284c7', vol: '1L' });
makeOilBottle({ id: 'sp-109', file: 'sp-109_castrol_syntrans_75w-90_manual_transmission_fluid.svg', brand: 'Castrol', name: 'SYNTRANS', viscosity: '75W-90', sub: 'MANUAL TRANSMISSION', color1: '#334155', color2: '#94a3b8', capColor: '#16a34a', vol: '1L' });
makeOilBottle({ id: 'sp-110', file: 'sp-110_castrol_power1_4t_15w-50_semi-synthetic_oil.svg', brand: 'Castrol', name: 'POWER1 4T', viscosity: '15W-50', sub: 'POWER RELEASE FORMULA', color1: '#b45309', color2: '#f59e0b', capColor: '#dc2626', vol: '2.5L' });
makeOilBottle({ id: 'sp-202', file: 'sp-202_castrol_gtx_20w-50_high_mileage_engine_oil.svg', brand: 'Castrol', name: 'GTX', viscosity: '20W-50', sub: 'DOUBLE ACTION FORMULA', color1: '#1e293b', color2: '#f8fafc', capColor: '#15803d', vol: '3.5L' });
makeOilBottle({ id: 'sp-203', file: 'sp-203_castrol_chain_lube_racing_synthetic_spray.svg', brand: 'Castrol', name: 'CHAIN LUBE', viscosity: '', sub: 'RACING SYNTHETIC', color1: '#dc2626', color2: '#ffffff', capColor: '#15803d', vol: '400ml', extra: 'spray' });

// Motul Fluids
makeOilBottle({ id: 'sp-113', file: 'sp-113_motul_c1_chain_clean_plus_c2_chain_lube_road_combo.svg', brand: 'Motul', name: 'C1 + C2 COMBO', viscosity: '', sub: 'CHAIN CLEAN & LUBE', color1: '#dc2626', color2: '#181a20', capColor: '#dc2626', vol: '400ml x 2', extra: 'spray' });
makeOilBottle({ id: 'sp-114', file: 'sp-114_motul_rbf_660_factory_line_racing_brake_fluid.svg', brand: 'Motul', name: 'RBF 660', viscosity: 'DOT 4', sub: 'RACING BRAKE FLUID 328°C', color1: '#b45309', color2: '#f59e0b', capColor: '#f8fafc', vol: '500ml' });
makeOilBottle({ id: 'sp-115', file: 'sp-115_motul_motocool_expert_ready-to-use_hybrid_coolant.svg', brand: 'Motul', name: 'MOTOCOOL', viscosity: '-37°C', sub: 'EXPERT HYBRID COOLANT', color1: '#ca8a04', color2: '#facc15', capColor: '#16a34a', vol: '1L' });
makeOilBottle({ id: 'sp-204', file: 'sp-204_motul_8100_x-cess_5w-40_synthetic_car_oil.svg', brand: 'Motul', name: '8100 X-CESS', viscosity: '5W-40', sub: '100% SYNTHETIC ESTER', color1: '#0f172a', color2: '#334155', capColor: '#dc2626', vol: '4L' });
makeOilBottle({ id: 'sp-205', file: 'sp-205_motul_fork_oil_expert_medium_10w_technosynthese.svg', brand: 'Motul', name: 'FORK OIL', viscosity: '10W MEDIUM', sub: 'TECHNOSYNTHESE SUSPENSION', color1: '#1e293b', color2: '#475569', capColor: '#38bdf8', vol: '1L' });

// Brembo Brake Fluid & Calipers
makeOilBottle({ id: 'sp-104', file: 'sp-104_brembo_dot_4_high-performance_brake_fluid.svg', brand: 'Brembo', name: 'SPORT FLUID', viscosity: 'DOT 4', sub: 'HIGH-PERFORMANCE BRAKE', color1: '#991b1b', color2: '#ef4444', capColor: '#f8fafc', vol: '500ml' });
makeCaliper({ file: 'sp-105_brembo_p4-32_radial_4-piston_caliper_kit.svg', brand: 'Brembo', name: 'P4-32 RADIAL 4-PISTON', color: '#b91c1c' });
makeCaliper({ file: 'sp-200_brembo_prime_carbon_ceramic_rear_brake_pads.svg', brand: 'Brembo', name: 'PRIME CERAMIC PADS', color: '#1e293b' });
makeMasterCylinder({ file: 'sp-201_brembo_rcs_19_corsa_corta_radial_brake_master_cylinder.svg', brand: 'Brembo', name: 'RCS 19 CORSA CORTA' });
makeMasterCylinder({ file: 'sp-168_endurance_disc_brake_master_cylinder_assembly.svg', brand: 'Endurance', name: 'HANDLEBAR MASTER CYLINDER' });
makeCaliper({ file: 'sp-223_suzuki_access_125_front_disc_brake_caliper_and_pad_kit.svg', brand: 'Suzuki', name: 'ACCESS 125 CALIPER', color: '#334155' });

// Mobil 1 Oils
makeOilBottle({ id: 'sp-133', file: 'sp-133_mobil_1_esp_5w-30_advanced_full_synthetic.svg', brand: 'Mobil 1', name: 'ESP FORMULA', viscosity: '5W-30', sub: 'EMISSION SYSTEM PROTECTION', color1: '#334155', color2: '#64748b', capColor: '#16a34a', vol: '4L' });
makeOilBottle({ id: 'sp-134', file: 'sp-134_mobil_super_moto_15w-50_4t_semi-synthetic_oil.svg', brand: 'Mobil 1', name: 'SUPER MOTO 4T', viscosity: '15W-50', sub: 'FOUR-STROKE MOTORCYCLE', color1: '#0f172a', color2: '#dc2626', capColor: '#dc2626', vol: '1L' });
makeOilBottle({ id: 'sp-160', file: 'sp-160_mobil_1_0w-40_ultimate_all-round_performance.svg', brand: 'Mobil 1', name: 'EUROPEAN CAR', viscosity: '0W-40', sub: 'ULTIMATE PERFORMANCE', color1: '#475569', color2: '#cbd5e1', capColor: '#eab308', vol: '4L' });
makeOilBottle({ id: 'sp-161', file: 'sp-161_mobil_1_racing_4t_10w-40_motorcycle_oil.svg', brand: 'Mobil 1', name: 'RACING 4T', viscosity: '10W-40', sub: 'FULL SYNTHETIC MOTORCYCLE', color1: '#1e293b', color2: '#94a3b8', capColor: '#dc2626', vol: '1L' });
makeOilBottle({ id: 'sp-162', file: 'sp-162_mobil_1_synthetic_atf_multi-vehicle_transmission.svg', brand: 'Mobil 1', name: 'SYNTHETIC ATF', viscosity: 'DEXRON / MERCON', sub: 'AUTOMATIC TRANSMISSION', color1: '#991b1b', color2: '#dc2626', capColor: '#1e293b', vol: '1L' });

// Shell Oils
makeOilBottle({ id: 'sp-135', file: 'sp-135_shell_advance_ultra_4t_10w-40_pureplus_synthetic.svg', brand: 'Shell', name: 'ADVANCE ULTRA', viscosity: '10W-40', sub: 'PUREPLUS TECHNOLOGY', color1: '#1e40af', color2: '#3b82f6', capColor: '#eab308', vol: '1L' });
makeOilBottle({ id: 'sp-136', file: 'sp-136_shell_helix_ultra_5w-40_fully_synthetic_car_oil.svg', brand: 'Shell', name: 'HELIX ULTRA', viscosity: '5W-40', sub: 'ACTIVE CLEANSING TECH', color1: '#334155', color2: '#64748b', capColor: '#eab308', vol: '4L' });
makeOilBottle({ id: 'sp-163', file: 'sp-163_shell_advance_4t_ultra_15w-50_pureplus_synthetic.svg', brand: 'Shell', name: 'ADVANCE 4T', viscosity: '15W-50', sub: 'PUREPLUS MOTORCYCLE', color1: '#1e3a8a', color2: '#2563eb', capColor: '#dc2626', vol: '1L' });
makeOilBottle({ id: 'sp-164', file: 'sp-164_shell_helix_ultra_ect_c3_5w-30_synthetic_car_oil.svg', brand: 'Shell', name: 'HELIX ECT C3', viscosity: '5W-30', sub: 'EMISSION COMPATIBLE TECH', color1: '#334155', color2: '#475569', capColor: '#16a34a', vol: '4L' });
makeOilBottle({ id: 'sp-165', file: 'sp-165_shell_spirax_s4_g_75w-90_synthetic_gear_oil.svg', brand: 'Shell', name: 'SPIRAX S4 G', viscosity: '75W-90', sub: 'AXLE & MANUAL GEAR OIL', color1: '#1e293b', color2: '#475569', capColor: '#eab308', vol: '1L' });

// Brake Discs (Brezza, KTM Wave, VW, Nissan, Kia, Toyota, Honda, Hyundai, Thar)
makeBrakeDisc({ file: 'sp-55_maruti_suzuki_brezza_front_brake_disc.svg', brand: 'Maruti Suzuki', model: 'Brezza Front Disc', lugs: 5, pcd: '114.3' });
makeBrakeDisc({ file: 'sp-144_ktm_powerparts_factory_wave_floating_brake_disc_320mm.svg', brand: 'KTM PowerParts', model: 'Factory Wave 320mm', lugs: 6, wave: true, pcd: '120.0' });
makeBrakeDisc({ file: 'sp-189_volkswagen_front_brake_disc_rotor_set_pair.svg', brand: 'Volkswagen', model: 'Vented Rotor Pair', lugs: 5, pcd: '112.0' });
makeBrakeDisc({ file: 'sp-193_nissan_front_brake_disc_rotors_pair.svg', brand: 'Nissan', model: 'Front Disc Pair', lugs: 5, pcd: '114.3' });
makeBrakeDisc({ file: 'sp-196_kia_front_ventilated_brake_disc_rotors_pair.svg', brand: 'Kia', model: 'Ventilated Disc Pair', lugs: 5, pcd: '114.3' });
makeBrakeDisc({ file: 'sp-198_toyota_front_brake_disc_rotor_set_pair.svg', brand: 'Toyota', model: 'Front Rotor Set', lugs: 5, pcd: '114.3' });
makeBrakeDisc({ file: 'sp-219_honda_city_vented_front_brake_disc_set_pair.svg', brand: 'Honda', model: 'City Vented Disc', lugs: 4, pcd: '100.0' });
makeBrakeDisc({ file: 'sp-226_hyundai_creta_front_brake_disc_rotors_pair.svg', brand: 'Hyundai', model: 'Creta Front Disc', lugs: 5, pcd: '114.3' });
makeBrakeDisc({ file: 'sp-228_mahindra_thar_front_heavy_duty_brake_disc_rotors_pair.svg', brand: 'Mahindra', model: 'Thar HD Rotor Pair', lugs: 5, pcd: '139.7' });

// Filters & Service (K&N)
makeOilFilter({ file: 'sp-122_kn_pro_series_heavy_duty_spin_on_oil_filter.svg', brand: 'K&N', name: 'HP-1002 Spin-On', color: '#181a20' });
makeOilFilter({ file: 'sp-209_kn_powersports_high_performance_oil_filter_kn155.svg', brand: 'K&N', name: 'KN-155 Powersports', color: '#1e293b', isCartridge: true });
makeAccessory({ file: 'sp-208_kn_air_filter_recharge_cleaning_and_oiling_kit.svg', brand: 'K&N', name: 'Recharge Service Kit', category: 'Air Filter Care', iconType: 'spray' });

// Akrapovic Systems
makeExhaust({ file: 'sp-145_akrapovic_evolution_titanium_full_exhaust_system.svg', brand: 'Akrapovič', name: 'Evolution Full System', isFullSystem: true });
makeExhaust({ file: 'sp-146_akrapovic_carbon_slip_on_track_silencer.svg', brand: 'Akrapovič', name: 'Carbon Track Silencer', isFullSystem: false });
makeExhaust({ file: 'sp-147_akrapovic_stainless_link_pipe_kit.svg', brand: 'Akrapovič', name: 'Stainless Link Pipe Kit', isFullSystem: false });

// Philips Lighting
makeBulb({ file: 'sp-119_philips_ultinon_pro3021_led_fog_light_kit.svg', brand: 'Philips', name: 'Ultinon Fog LED', isLed: true, isPair: true });
makeBulb({ file: 'sp-206_philips_diamondvision_5000k_halogen_headlight_bulb.svg', brand: 'Philips', name: 'DiamondVision 5000K', isLed: false, isPair: true });
makeBulb({ file: 'sp-207_philips_ultinon_pro6000_led_interior_festoon_bulb.svg', brand: 'Philips', name: 'Pro6000 Festoon LED', isLed: true, isPair: true });

// Electricals & Mechanical
makeAccessory({ file: 'sp-143_uno_minda_heavy_duty_starter_motor_assembly.svg', brand: 'Uno Minda', name: 'Heavy Duty Starter Motor', category: 'Starter Motor', iconType: 'starter' });
makeAccessory({ file: 'sp-184_denso_high_torque_starter_motor_assembly.svg', brand: 'Denso', name: 'High-Torque Starter Motor', category: 'Starter Motor', iconType: 'starter' });
makeAccessory({ file: 'sp-172_pricol_electric_windshield_washer_pump_12v.svg', brand: 'Pricol', name: 'Windshield Washer Pump', category: 'Pump Assembly', iconType: 'pump' });
makeAccessory({ file: 'sp-173_uno_minda_handlebar_switch_control_assembly_lh.svg', brand: 'Uno Minda', name: 'Handlebar Switch Control', category: 'Switchgear', iconType: 'switch' });
makeAccessory({ file: 'sp-174_uno_minda_automotive_ignition_coil_pack.svg', brand: 'Uno Minda', name: 'Direct Ignition Coil Pack', category: 'Ignition System', iconType: 'ignition' });
makeAccessory({ file: 'sp-175_minda_waterproof_motorcycle_usb_fast_charger_18w.svg', brand: 'Minda', name: 'Waterproof USB Charger', category: '18W Fast Charge', iconType: 'charger' });
makeAccessory({ file: 'sp-214_royal_enfield_touring_handlebar_deluxe_mirror_set.svg', brand: 'Royal Enfield', name: 'Deluxe Bar-End Mirrors', category: 'Handlebar Mirrors', iconType: 'mirror' });
makeAccessory({ file: 'sp-215_royal_enfield_heavy_duty_sump_guard_bash_plate.svg', brand: 'Royal Enfield', name: 'Heavy Duty Sump Guard', category: 'Skid Bash Plate', iconType: 'bashplate' });
makeAccessory({ file: 'sp-220_hero_splendor_carburetor_and_intake_manifold_assembly.svg', brand: 'Hero', name: 'Carburetor & Manifold', category: 'Fuel Intake System', iconType: 'carburetor' });
makeAccessory({ file: 'sp-221_bajaj_pulsar_220f_high_output_magneto_stator_coil.svg', brand: 'Bajaj', name: 'Magneto Stator Coil Ring', category: 'Electrical Stator', iconType: 'stator' });
makeAccessory({ file: 'sp-224_ktm_powerparts_ergonomic_rider_comfort_seat.svg', brand: 'KTM', name: 'Ergonomic Comfort Seat', category: 'PowerParts Ergonomics', iconType: 'seat' });

console.log('All 56 image assets generated successfully!');
