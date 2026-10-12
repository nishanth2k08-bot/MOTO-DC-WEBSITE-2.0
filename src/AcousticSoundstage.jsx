import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Flame, Zap, ArrowRight, Play, Square, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Preset Vehicle Sound Profiles
const SOUND_PROFILES = [
  {
    id: 'superbike-i4',
    name: 'Inline-4 1000cc Superbike',
    vehicle: 'Kawasaki Ninja ZX-10R / BMW S1000RR',
    type: 'bike',
    icon: '🏍️',
    stockRpmFreq: 110,
    raceRpmFreq: 880,
    stockFilterFreq: 500,
    raceFilterFreq: 4500,
    tag: 'Titanium Full System',
    description: 'High-revving 14,500 RPM screaming inline-4 sound profile.',
    query: 'exhaust',
    oemDb: '84 dB (Muffled Quiet)',
    raceDb: '108 dB (Open Race Pipe)',
    hpGain: '+9.4 HP'
  },
  {
    id: 'twin-650',
    name: '270° Parallel Twin 650cc',
    vehicle: 'Royal Enfield Interceptor / Continental GT 650',
    type: 'bike',
    icon: '🏍️',
    stockRpmFreq: 85,
    raceRpmFreq: 420,
    stockFilterFreq: 400,
    raceFilterFreq: 2600,
    tag: 'Dual Stainless Megaphones',
    description: 'Deep, thumping bass rumble with authentic crossplane firing order.',
    query: 'exhaust',
    oemDb: '82 dB (Factory Euro 5)',
    raceDb: '102 dB (Deep Roar)',
    hpGain: '+6.2 HP'
  },
  {
    id: 'thumper-390',
    name: 'High-Compression 373cc Single',
    vehicle: 'KTM Duke 390 / RC 390',
    type: 'bike',
    icon: '🏍️',
    stockRpmFreq: 95,
    raceRpmFreq: 560,
    stockFilterFreq: 420,
    raceFilterFreq: 3400,
    tag: 'Carbon Slip-on & Header',
    description: 'Aggressive single-cylinder braap with sharp throttle response.',
    query: 'exhaust',
    oemDb: '86 dB (Stock Baffled)',
    raceDb: '104 dB (Race Spec)',
    hpGain: '+4.8 HP'
  },
  {
    id: 'supercar-v8',
    name: 'Twin-Turbo 4.0L V8 Supercar',
    vehicle: 'AMG GT / McLaren 720S / Audi RS',
    type: 'auto',
    icon: '🏎️',
    stockRpmFreq: 70,
    raceRpmFreq: 520,
    stockFilterFreq: 320,
    raceFilterFreq: 3800,
    tag: 'Valvetronic Inconel System',
    description: 'Thunderous low-end roar with anti-lag turbo flutter and flame pops.',
    query: 'exhaust',
    oemDb: '88 dB (Valves Closed)',
    raceDb: '116 dB (Valves Open Track)',
    hpGain: '+28.0 HP'
  }
];

export default function AcousticSoundstage() {
  const nav = useNavigate();
  const [selectedProfile, setSelectedProfile] = useState(SOUND_PROFILES[0]);
  const [mode, setMode] = useState('race'); // 'stock' or 'race'
  const [isPlaying, setIsPlaying] = useState(false);
  const [throttleRev, setThrottleRev] = useState(false);

  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const osc1Ref = useRef(null);
  const osc2Ref = useRef(null);
  const filterRef = useRef(null);
  const masterGainRef = useRef(null);
  const animFrameRef = useRef(null);

  // Initialize or cleanup Web Audio nodes
  const stopAudio = () => {
    try {
      if (osc1Ref.current) {
        osc1Ref.current.stop();
        osc1Ref.current.disconnect();
        osc1Ref.current = null;
      }
      if (osc2Ref.current) {
        osc2Ref.current.stop();
        osc2Ref.current.disconnect();
        osc2Ref.current = null;
      }
      if (masterGainRef.current) {
        masterGainRef.current.gain.setValueAtTime(0, audioCtxRef.current?.currentTime || 0);
      }
    } catch (_) {}
    setIsPlaying(false);
    setThrottleRev(false);
  };

  const startAudio = (profile = selectedProfile, targetMode = mode) => {
    stopAudio();

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;

    // Analyser node for neon oscilloscope
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    // Master output
    const master = ctx.createGain();
    const isRace = targetMode === 'race';
    master.gain.setValueAtTime(0.001, t);
    master.gain.exponentialRampToValueAtTime(isRace ? 0.42 : 0.22, t + 0.15);
    master.connect(analyser);
    analyser.connect(ctx.destination);
    masterGainRef.current = master;

    // Primary & Harmonic Oscillators
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();

    osc1.type = isRace ? 'sawtooth' : 'triangle';
    osc2.type = isRace ? 'sawtooth' : 'sine';

    const baseFreq = profile.stockRpmFreq;
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc2.frequency.setValueAtTime(baseFreq * (profile.type === 'bike' ? 2 : 1.5), t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isRace ? profile.raceFilterFreq * 0.4 : profile.stockFilterFreq, t);
    filter.Q.setValueAtTime(isRace ? 3.5 : 1.0, t);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(master);

    osc1.start(t);
    osc2.start(t);

    osc1Ref.current = osc1;
    osc2Ref.current = osc2;
    filterRef.current = filter;

    setIsPlaying(true);
  };

  // Handle Throttle Rev Blip
  const blipThrottle = () => {
    if (!isPlaying) {
      startAudio();
    }
    const ctx = audioCtxRef.current;
    if (!ctx || !osc1Ref.current || !filterRef.current) return;

    setThrottleRev(true);
    const t = ctx.currentTime;
    const isRace = mode === 'race';
    const maxFreq = isRace ? selectedProfile.raceRpmFreq : selectedProfile.stockRpmFreq * 1.8;
    const filterMax = isRace ? selectedProfile.raceFilterFreq : selectedProfile.stockFilterFreq * 1.6;

    // Rev up
    osc1Ref.current.frequency.cancelScheduledValues(t);
    osc1Ref.current.frequency.setValueAtTime(osc1Ref.current.frequency.value, t);
    osc1Ref.current.frequency.exponentialRampToValueAtTime(maxFreq, t + 0.38);
    osc1Ref.current.frequency.exponentialRampToValueAtTime(selectedProfile.stockRpmFreq, t + 0.95);

    if (osc2Ref.current) {
      osc2Ref.current.frequency.cancelScheduledValues(t);
      osc2Ref.current.frequency.setValueAtTime(osc2Ref.current.frequency.value, t);
      osc2Ref.current.frequency.exponentialRampToValueAtTime(maxFreq * 1.7, t + 0.38);
      osc2Ref.current.frequency.exponentialRampToValueAtTime(selectedProfile.stockRpmFreq * 1.5, t + 0.95);
    }

    filterRef.current.frequency.cancelScheduledValues(t);
    filterRef.current.frequency.setValueAtTime(filterRef.current.frequency.value, t);
    filterRef.current.frequency.exponentialRampToValueAtTime(filterMax, t + 0.38);
    filterRef.current.frequency.exponentialRampToValueAtTime(isRace ? selectedProfile.raceFilterFreq * 0.4 : selectedProfile.stockFilterFreq, t + 0.95);

    // If race mode, trigger an exhaust crackle pop on throttle release
    if (isRace) {
      setTimeout(() => {
        try {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
          const popCtx = audioCtxRef.current;
          const pt = popCtx.currentTime;
          const buf = popCtx.createBuffer(1, Math.floor(popCtx.sampleRate * 0.12), popCtx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.2));
          const popSource = popCtx.createBufferSource();
          popSource.buffer = buf;
          const popGain = popCtx.createGain();
          popGain.gain.setValueAtTime(0.45, pt);
          popGain.gain.exponentialRampToValueAtTime(0.001, pt + 0.1);
          popSource.connect(popGain);
          popGain.connect(popCtx.destination);
          popSource.start(pt);
        } catch (_) {}
      }, 420);
    }

    setTimeout(() => {
      setThrottleRev(false);
    }, 1000);
  };

  // Canvas visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.strokeStyle = 'rgba(255, 49, 87, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 32) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 24) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      if (!isPlaying || !analyserRef.current) {
        // Idle heartbeat line
        const now = Date.now() * 0.003;
        ctx.strokeStyle = 'rgba(255, 49, 87, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * 0.05 + now) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        return;
      }

      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Render Neon Frequency Spectrum Bars
      const barWidth = (width / bufferLength) * 2.2;
      let barX = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (height * 0.85);

        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        if (mode === 'race') {
          gradient.addColorStop(0, 'rgba(255, 49, 87, 0.85)');
          gradient.addColorStop(0.6, 'rgba(255, 140, 0, 0.95)');
          gradient.addColorStop(1, '#fffae0');
        } else {
          gradient.addColorStop(0, 'rgba(0, 168, 255, 0.7)');
          gradient.addColorStop(0.7, 'rgba(0, 220, 180, 0.85)');
          gradient.addColorStop(1, '#e0ffff');
        }

        ctx.fillStyle = gradient;
        ctx.shadowColor = mode === 'race' ? '#ff3157' : '#00a8ff';
        ctx.shadowBlur = 12;
        ctx.fillRect(barX, height - barHeight, barWidth - 2, barHeight);

        barX += barWidth;
      }

      ctx.shadowBlur = 0;
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, mode]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleSelectProfile = (p) => {
    setSelectedProfile(p);
    if (isPlaying) {
      startAudio(p, mode);
    }
  };

  const handleToggleMode = (newMode) => {
    setMode(newMode);
    if (isPlaying) {
      startAudio(selectedProfile, newMode);
    }
  };

  return (
    <section className="section acousticSoundstageSection" id="soundstage">
      <div className="sectionhead">
        <div>
          <p className="eyebrow">
            <Sparkles size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            MOTODC ACOUSTIC LAB
          </p>
          <h2>Acoustic Soundstage: Hear the Difference</h2>
        </div>
        <button
          type="button"
          onClick={() => nav(`/products?q=${encodeURIComponent(selectedProfile.query)}`)}
        >
          Shop Performance Exhausts <ArrowRight size={16} />
        </button>
      </div>

      <p className="soundstageSubtitle">
        Audition authentic exhaust notes before ordering. Compare factory stock acoustics against MotoDC race-spec systems in real time with high-fidelity Web Audio synthesis.
      </p>

      {/* Main Soundstage Container */}
      <div className="soundstageBox">
        {/* Left Side: Vehicle Profile Selector */}
        <div className="soundstageSidebar">
          <span className="soundstageBoxLabel">SELECT POWERPLANT</span>
          <div className="soundstageProfilesList">
            {SOUND_PROFILES.map((p) => {
              const active = p.id === selectedProfile.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`soundProfileCard ${active ? 'active' : ''}`}
                  onClick={() => handleSelectProfile(p)}
                >
                  <div className="profileIcon">{p.icon}</div>
                  <div className="profileInfo">
                    <span className="profileName">{p.name}</span>
                    <small className="profileVehicle">{p.vehicle}</small>
                  </div>
                  <span className="profileTag">{p.tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center / Right: Live Waveform Visualizer & Controls */}
        <div className="soundstageDisplayArea">
          {/* Top Info Bar */}
          <div className="soundstageDisplayHeader">
            <div>
              <h3>{selectedProfile.name}</h3>
              <p>{selectedProfile.vehicle}</p>
            </div>
            <div className="soundstageSpecsBadge">
              <span className="soundDb">{mode === 'race' ? selectedProfile.raceDb : selectedProfile.oemDb}</span>
              {mode === 'race' && <span className="soundGain">{selectedProfile.hpGain}</span>}
            </div>
          </div>

          {/* Visualizer Canvas */}
          <div className="waveformCanvasWrap">
            <canvas ref={canvasRef} width={640} height={200} className="waveformCanvas" />
            <div className="canvasLiveBadge">
              <span className={`liveDot ${isPlaying ? 'pulsing' : ''}`} />
              <span>{isPlaying ? (throttleRev ? 'WOT REDLINE PEAK' : 'ENGINE IDLE ACTIVE') : 'STANDBY'}</span>
            </div>
          </div>

          {/* Mode Switcher: Stock vs Race */}
          <div className="soundstageControls">
            <div className="soundModeToggle">
              <button
                type="button"
                className={`modeBtn stockBtn ${mode === 'stock' ? 'active' : ''}`}
                onClick={() => handleToggleMode('stock')}
              >
                <span>Stock OEM Quiet</span>
              </button>
              <button
                type="button"
                className={`modeBtn raceBtn ${mode === 'race' ? 'active' : ''}`}
                onClick={() => handleToggleMode('race')}
              >
                <Flame size={15} />
                <span>MotoDC Race Spec</span>
              </button>
            </div>

            {/* Play / Stop / Rev Action Buttons */}
            <div className="soundActionsRow">
              <button
                type="button"
                className={`soundPlayBtn ${isPlaying ? 'isPlaying' : ''}`}
                onClick={() => (isPlaying ? stopAudio() : startAudio())}
              >
                {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                <span>{isPlaying ? 'MUTE AUDIO' : 'START AUDITION'}</span>
              </button>

              <button
                type="button"
                className={`soundRevBtn ${throttleRev ? 'isRevving' : ''}`}
                onClick={blipThrottle}
                title="Blip the throttle to hit high RPM and exhaust flame pops"
              >
                <Zap size={16} />
                <span>REV THROTTLE (BLIP)</span>
              </button>
            </div>
          </div>

          {/* Direct Part Link Callout */}
          <div className="soundstageFooterCallout">
            <div>
              <strong>Looking for this exhaust setup?</strong>
              <p>Direct bolt-on fitment available for {selectedProfile.vehicle.split('/')[0].trim()}.</p>
            </div>
            <button
              type="button"
              className="soundstageShopPartBtn"
              onClick={() => nav(`/products?q=${encodeURIComponent(selectedProfile.query)}`)}
            >
              View Upgrades <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
