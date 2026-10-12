import React, { useState, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';

export default function StartEngineIntro({ onIgnite }) {
  const [igniting, setIgniting] = useState(false);
  const [ignited, setIgnited] = useState(false);
  const [needleRpm, setNeedleRpm] = useState(0);
  const audioRef = useRef(null);

  // Preload superbike audio on component mount
  useEffect(() => {
    try {
      const a = new Audio('/audio/superbike-short-rev.mp3');
      a.preload = 'auto';
      audioRef.current = a;
    } catch (_) {}
  }, []);

  const handleIgnite = () => {
    if (igniting || ignited) return;
    setIgniting(true);

    // 1. Play quick single superbike rev (snappy ~1.2s blip, no 5-second drag)
    try {
      const a = audioRef.current || new Audio('/audio/superbike-short-rev.mp3');
      a.currentTime = 0;
      a.volume = 0.95;
      const playPromise = a.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => playWebAudioRevFallback());
      }
      // Stop/fade out sound right after single rev completes (~1.25s)
      setTimeout(() => {
        try {
          a.pause();
          a.currentTime = 0;
        } catch (_) {}
      }, 1250);
    } catch (_) {
      playWebAudioRevFallback();
    }

    // 2. Animate tachometer needle sweep
    setNeedleRpm(14000);

    // 3. Smooth transition into website home page immediately after the single rev
    setTimeout(() => {
      setIgnited(true);
      setTimeout(() => {
        if (onIgnite) onIgnite();
      }, 450);
    }, 1100);
  };

  const handleSkip = (e) => {
    e.stopPropagation();
    if (onIgnite) onIgnite();
  };

  // Safe Web Audio fallback if media playback is restricted
  const playWebAudioRevFallback = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      // Crisp 1.1s single rev blip
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(820, t + 0.45);
      osc.frequency.exponentialRampToValueAtTime(260, t + 1.05);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.55, t + 0.15);
      gain.gain.setValueAtTime(0.6, t + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.15);
    } catch (_) {}
  };

  return (
    <div className={`engineGateway ${igniting ? 'isIgniting' : ''} ${ignited ? 'isFinished' : ''}`}>
      {/* Cinematic Dark Garage Atmosphere */}
      <div className="gatewayAtmosphere" aria-hidden="true">
        <div className="gatewayVignette" />
        <div className="gatewaySpotlight" />
        <div className="gatewaySmokeHaze" />
      </div>

      {/* Top Header Navigation */}
      <header className="gatewayHeader">
        <div className="gatewayBrand">
          <span className="gatewayLogo">MOTO<span>DC</span></span>
          <span className="gatewayDivider">/</span>
          <span className="gatewaySubtitle">PERFORMANCE SPARES</span>
        </div>

        <button
          type="button"
          className="gatewaySkipBtn"
          onClick={handleSkip}
          aria-label="Skip intro and enter website"
        >
          Skip intro <span>→</span>
        </button>
      </header>

      {/* Centerpiece: Mechanical Engine Start Console */}
      <main className="gatewayConsole">
        {/* Analog Racing Tachometer Arc */}
        <div className="gaugeArcWrap">
          <svg className="gaugeArcSvg" viewBox="0 0 320 180" aria-hidden="true">
            {/* Background Track */}
            <path
              d="M 40 160 A 120 120 0 0 1 280 160"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="5"
              strokeDasharray="4 6"
            />
            {/* Redline Zone Track */}
            <path
              d="M 230 75 A 120 120 0 0 1 280 160"
              fill="none"
              stroke={igniting ? '#ff3157' : 'rgba(255, 49, 87, 0.35)'}
              strokeWidth="6"
            />
            {/* Active Needle */}
            <line
              x1="160"
              y1="160"
              x2="160"
              y2="48"
              className={`gaugeNeedle ${igniting ? 'needleSweeping' : ''}`}
            />
            <circle cx="160" cy="160" r="14" fill="#1c212a" stroke="#384152" strokeWidth="3" />
          </svg>

          <div className="gaugeNumbers">
            <span>0</span>
            <span>4</span>
            <span>8</span>
            <span>12</span>
            <span className="gaugeRedlineLabel">14k</span>
          </div>

          <div className="gaugeRpmValue">
            <strong>{igniting ? '14,200' : '0'}</strong>
            <small>RPM</small>
          </div>
        </div>

        {/* Physical Billet Console Plate */}
        <div className="consolePlate crystalConsolePlate">
          {/* 4 Machine Screws for Industrial Realism */}
          <span className="hexScrew hexScrewTl" />
          <span className="hexScrew hexScrewTr" />
          <span className="hexScrew hexScrewBl" />
          <span className="hexScrew hexScrewBr" />

          {/* Outer Breathing Jewel Halo Ring */}
          <div className={`crystalAmbientHalo ${igniting ? 'haloFired' : ''}`} />

          {/* Titanium Knurled Bezel with Smoked Ruby Core */}
          <div className="starterBezel crystalBezel">
            <button
              type="button"
              className={`starterPushBtn crystalButton ${igniting ? 'btnDepressed' : ''}`}
              onClick={handleIgnite}
              aria-label="Start Engine"
            >
              {/* Internal Glass Facet Reflections */}
              <span className="crystalGlassFacet" aria-hidden="true" />
              <span className="crystalCoreGlow" aria-hidden="true" />

              {/* Status Indicator LED */}
              <div className={`starterLedBar crystalLedBar ${igniting ? 'ledFired' : 'ledStandby'}`} />

              <div className="starterTypography crystalTypography">
                <span className="starterWordTop">ENGINE</span>
                <span className="starterWordMain">START</span>
                <span className="starterWordBottom">STOP</span>
              </div>
            </button>
          </div>
        </div>

        {/* Human Instruction & Audio Hint */}
        <div className="starterPromptWrap">
          <p className="starterPrompt">
            {igniting ? 'IGNITION FIRING...' : 'PRESS TO START ENGINE'}
          </p>
          <div className="starterAudioHint">
            <Volume2 size={14} />
            <span>Turn up volume for superbike audio</span>
          </div>
        </div>
      </main>

      {/* Headlight Xenon Projection Flare on Start */}
      <div className={`xenonFlareBeam ${igniting ? 'flareActive' : ''}`} aria-hidden="true" />

      {/* Footer Discreet Note */}
      <footer className="gatewayFooter">
        <span>© 2026 MotoDC Performance Group • Direct Fit Spares</span>
      </footer>
    </div>
  );
}
