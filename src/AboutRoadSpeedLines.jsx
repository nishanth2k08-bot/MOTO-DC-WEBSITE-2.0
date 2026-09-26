import React from 'react';

/**
 * AboutRoadSpeedLines
 * High-speed glowing automotive speed lines and light trails overlaid onto the
 * scenic winding coastal road background image (/about-road-journey.jpg).
 * Uses exact 1657x949 coordinates with preserveAspectRatio="xMidYMid slice" to perfectly
 * match the road perspective on any screen resolution and aspect ratio.
 */
export default function AboutRoadSpeedLines() {
  return (
    <div className="motodc-road-speed-layer" aria-hidden="true">
      <div className="motodc-asphalt-flare" />
      <svg
        className="motodc-road-speed-lines"
        viewBox="0 0 1657 949"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Intense Laser Neon Bloom Filter */}
          <filter id="motodcLaserGlowIntense" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="blur3" />
            <feMerge>
              <feMergeNode in="blur3" />
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Broad Diffuse Road Filter */}
          <filter id="motodcSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Crimson to White-Hot Laser Gradient */}
          <linearGradient id="motodcLaserGradRed" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff1e42" stopOpacity="0.2" />
            <stop offset="35%" stopColor="#ff2a55" stopOpacity="0.8" />
            <stop offset="75%" stopColor="#ff6280" stopOpacity="1" />
            <stop offset="96%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>

          {/* Amber/Orange High-Velocity Nitro Gradient */}
          <linearGradient id="motodcNitroGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff4800" stopOpacity="0" />
            <stop offset="40%" stopColor="#ff6a00" stopOpacity="0.75" />
            <stop offset="85%" stopColor="#ffbb44" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>

          {/* Straight Velocity Acceleration Beam Gradient */}
          <linearGradient id="motodcStraightBeamGrad" x1="85%" y1="0%" x2="15%" y2="100%">
            <stop offset="0%" stopColor="#ff1e42" stopOpacity="0" />
            <stop offset="30%" stopColor="#ff2e59" stopOpacity="0.7" />
            <stop offset="80%" stopColor="#ff7391" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>

          {/* Guardrail Metallic Glow Gradient */}
          <linearGradient id="motodcGuardrailGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff3157" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#ff607d" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* LAYER 1: Ambient Road Ribbon Glows (diffuse light on wet asphalt) */}
        <path
          d="M 1150 515 C 1220 515, 1245 522, 1210 535 C 1175 545, 1180 555, 1225 570 C 1290 590, 1370 615, 1445 645 C 1515 675, 1500 710, 1405 745 C 1260 790, 980 850, 380 949"
          fill="none"
          stroke="#ff2048"
          strokeWidth="26"
          opacity="0.22"
          filter="url(#motodcSoftGlow)"
        />
        <path
          d="M 1220 518 C 1250 522, 1260 530, 1230 540 C 1200 550, 1215 562, 1260 575 C 1330 595, 1420 622, 1485 650 C 1545 680, 1530 715, 1445 755 C 1315 805, 1065 870, 560 949"
          fill="none"
          stroke="#ff5030"
          strokeWidth="20"
          opacity="0.15"
          filter="url(#motodcSoftGlow)"
        />

        {/* LAYER 2: Guardrail Edge Reflection Flow */}
        <path
          className="motodc-rail-reflection"
          d="M 1330 575 C 1200 615, 950 670, 700 715 C 450 755, 200 790, 0 825"
          fill="none"
          stroke="url(#motodcGuardrailGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#motodcLaserGlowIntense)"
        />

        {/* LAYER 3: Highway Curves along the Mountain Cliffs */}
        {/* Outer Cliffside Curve - Amber/Orange Trail */}
        <path
          className="motodc-stream-slow"
          d="M 1220 518 C 1250 522, 1260 530, 1230 540 C 1200 550, 1215 562, 1260 575 C 1330 595, 1420 622, 1485 650 C 1545 680, 1530 715, 1445 755 C 1315 805, 1065 870, 560 949"
          fill="none"
          stroke="url(#motodcNitroGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          filter="url(#motodcLaserGlowIntense)"
          opacity="0.82"
        />

        {/* Far Right Edge Speed Line */}
        <path
          className="motodc-stream-medium"
          d="M 1340 585 C 1410 605, 1480 635, 1530 665 C 1580 700, 1560 735, 1485 775 C 1360 830, 1140 890, 780 949"
          fill="none"
          stroke="#ff385c"
          strokeWidth="2"
          strokeLinecap="round"
          filter="url(#motodcLaserGlowIntense)"
          opacity="0.75"
        />

        {/* Inner Lane Speed Line (Towards guardrail) */}
        <path
          className="motodc-stream-fast"
          d="M 1170 525 C 1215 525, 1225 532, 1195 542 C 1165 550, 1170 560, 1210 575 C 1265 595, 1340 625, 1400 655 C 1450 685, 1435 715, 1345 750 C 1205 795, 905 860, 220 949"
          fill="none"
          stroke="url(#motodcLaserGradRed)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#motodcLaserGlowIntense)"
          opacity="0.9"
        />

        {/* Inner Lane White Core */}
        <path
          className="motodc-stream-fast"
          d="M 1170 525 C 1215 525, 1225 532, 1195 542 C 1165 550, 1170 560, 1210 575 C 1265 595, 1340 625, 1400 655 C 1450 685, 1435 715, 1345 750 C 1205 795, 905 860, 220 949"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* Main Central Taillight Laser Highway Beam */}
        <path
          className="motodc-stream-medium"
          d="M 1150 515 C 1220 515, 1245 522, 1210 535 C 1175 545, 1180 555, 1225 570 C 1290 590, 1370 615, 1445 645 C 1515 675, 1500 710, 1405 745 C 1260 790, 980 850, 380 949"
          fill="none"
          stroke="url(#motodcLaserGradRed)"
          strokeWidth="6.5"
          strokeLinecap="round"
          filter="url(#motodcLaserGlowIntense)"
          opacity="0.95"
        />

        {/* Main Beam White-Hot Core */}
        <path
          className="motodc-stream-medium"
          d="M 1150 515 C 1220 515, 1245 522, 1210 535 C 1175 545, 1180 555, 1225 570 C 1290 590, 1370 615, 1445 645 C 1515 675, 1500 710, 1405 745 C 1260 790, 980 850, 380 949"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* High-frequency Laser Beads (Distant S-curves) */}
        <path
          className="motodc-stream-laser"
          d="M 1080 500 C 1140 505, 1200 512, 1240 520 C 1210 532, 1160 545, 1205 565 C 1270 585, 1350 610, 1430 640 C 1495 670, 1485 705, 1410 740 C 1285 780, 1025 840, 420 949"
          fill="none"
          stroke="#ff809b"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
          filter="url(#motodcLaserGlowIntense)"
        />

        {/* LAYER 4: Foreground High-Speed Velocity Streaks (Straight perspective streaks rushing down to the camera) */}
        {/* Streak 1: Main Red Rocket Trail */}
        <line
          className="motodc-straight-streak-1"
          x1="1435"
          y1="705"
          x2="360"
          y2="949"
          stroke="url(#motodcStraightBeamGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          filter="url(#motodcLaserGlowIntense)"
        />
        <line
          className="motodc-straight-streak-1"
          x1="1435"
          y1="705"
          x2="360"
          y2="949"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Streak 2: Inner Parallel Dash */}
        <line
          className="motodc-straight-streak-2"
          x1="1380"
          y1="720"
          x2="240"
          y2="949"
          stroke="url(#motodcStraightBeamGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          filter="url(#motodcLaserGlowIntense)"
        />
        <line
          className="motodc-straight-streak-2"
          x1="1380"
          y1="720"
          x2="240"
          y2="949"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Streak 3: Outer Crimson Streak */}
        <line
          className="motodc-straight-streak-3"
          x1="1485"
          y1="715"
          x2="520"
          y2="949"
          stroke="url(#motodcStraightBeamGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          filter="url(#motodcLaserGlowIntense)"
        />

        {/* Streak 4: Wide Right Shoulder Velocity Beam */}
        <line
          className="motodc-straight-streak-4"
          x1="1530"
          y1="735"
          x2="710"
          y2="949"
          stroke="url(#motodcNitroGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#motodcLaserGlowIntense)"
        />

        {/* Streak 5: Fast Micro-Streak */}
        <line
          className="motodc-straight-streak-2"
          x1="1340"
          y1="740"
          x2="160"
          y2="949"
          stroke="#ff4065"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#motodcLaserGlowIntense)"
          opacity="0.75"
        />

        {/* Streak 6: Far Right Cliff Wall Reflection */}
        <line
          className="motodc-straight-streak-3"
          x1="1560"
          y1="755"
          x2="890"
          y2="949"
          stroke="#ff6040"
          strokeWidth="2.2"
          strokeLinecap="round"
          filter="url(#motodcLaserGlowIntense)"
          opacity="0.65"
        />
      </svg>
    </div>
  );
}
