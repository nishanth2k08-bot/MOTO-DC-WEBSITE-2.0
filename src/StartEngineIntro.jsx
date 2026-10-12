import React, { useState } from 'react';
import { Power, Zap, Flame, Volume2 } from 'lucide-react';

// ========================================================
// 1. SUPERBIKE REV SOUND (Crisp Inline-4 14,000 RPM Screamer)
// ========================================================
function playSuperbikeRevSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const t0 = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.9, t0);
  master.connect(ctx.destination);

  // Starter crank click (0.0s - 0.08s)
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(220, t0);
  clickOsc.frequency.exponentialRampToValueAtTime(80, t0 + 0.07);
  clickGain.gain.setValueAtTime(0.25, t0);
  clickGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);
  clickOsc.connect(clickGain);
  clickGain.connect(master);
  clickOsc.start(t0);
  clickOsc.stop(t0 + 0.08);

  // High-rev screaming inline-4 dual harmonics (0.08s - 1.1s)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'sawtooth';

  // Pitch ramp: 95Hz idle -> 760Hz redline scream -> settles to 260Hz
  osc1.frequency.setValueAtTime(95, t0 + 0.08);
  osc1.frequency.exponentialRampToValueAtTime(760, t0 + 0.52);
  osc1.frequency.exponentialRampToValueAtTime(260, t0 + 1.05);

  osc2.frequency.setValueAtTime(190, t0 + 0.08);
  osc2.frequency.exponentialRampToValueAtTime(1520, t0 + 0.52);
  osc2.frequency.exponentialRampToValueAtTime(520, t0 + 1.05);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(420, t0 + 0.08);
  filter.frequency.exponentialRampToValueAtTime(5200, t0 + 0.52);
  filter.frequency.exponentialRampToValueAtTime(800, t0 + 1.05);
  filter.Q.setValueAtTime(3.8, t0 + 0.08);

  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(0.65, t0 + 0.22);
  gain.gain.setValueAtTime(0.72, t0 + 0.52);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.12);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  osc1.start(t0 + 0.08);
  osc2.start(t0 + 0.08);
  osc1.stop(t0 + 1.15);
  osc2.stop(t0 + 1.15);

  // Exhaust crackle pop on throttle release (0.62s)
  const popBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
  const data = popBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.22));
  const pop = ctx.createBufferSource();
  pop.buffer = popBuffer;
  const popGain = ctx.createGain();
  popGain.gain.setValueAtTime(0.35, t0 + 0.62);
  popGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
  pop.connect(popGain);
  popGain.connect(master);
  pop.start(t0 + 0.62);
}

// ========================================================
// 2. SUPERCAR FIRE BLAST SOUND (Anti-lag Gunshot Flame Blast)
// ========================================================
function playSupercarFireBlastSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const t0 = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.95, t0);
  master.connect(ctx.destination);

  // Twin-turbo spool roll (0.0s - 0.22s)
  const spoolOsc = ctx.createOscillator();
  const spoolFilter = ctx.createBiquadFilter();
  const spoolGain = ctx.createGain();
  spoolOsc.type = 'sawtooth';
  spoolOsc.frequency.setValueAtTime(60, t0);
  spoolOsc.frequency.exponentialRampToValueAtTime(340, t0 + 0.2);
  spoolFilter.type = 'lowpass';
  spoolFilter.frequency.setValueAtTime(300, t0);
  spoolFilter.frequency.exponentialRampToValueAtTime(2400, t0 + 0.2);
  spoolGain.gain.setValueAtTime(0.05, t0);
  spoolGain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.18);
  spoolGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
  spoolOsc.connect(spoolFilter);
  spoolFilter.connect(spoolGain);
  spoolGain.connect(master);
  spoolOsc.start(t0);
  spoolOsc.stop(t0 + 0.23);

  // Gunshot Exhaust Fire Blast Bang (at 0.22s)
  const burstTime = t0 + 0.22;
  const bufferLen = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
  const out = buffer.getChannelData(0);
  for (let i = 0; i < bufferLen; i++) {
    out[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferLen, 4.5);
  }

  const blastSource = ctx.createBufferSource();
  blastSource.buffer = buffer;
  const blastFilter = ctx.createBiquadFilter();
  blastFilter.type = 'bandpass';
  blastFilter.frequency.setValueAtTime(640, burstTime);
  blastFilter.Q.setValueAtTime(1.5, burstTime);

  const blastGain = ctx.createGain();
  blastGain.gain.setValueAtTime(0.92, burstTime);
  blastGain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.22);

  blastSource.connect(blastFilter);
  blastFilter.connect(blastGain);
  blastGain.connect(master);
  blastSource.start(burstTime);

  // Sub-bass Acoustic Concussion Thump (42Hz shockwave)
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(130, burstTime);
  sub.frequency.exponentialRampToValueAtTime(38, burstTime + 0.16);
  subGain.gain.setValueAtTime(0.85, burstTime);
  subGain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.18);
  sub.connect(subGain);
  subGain.connect(master);
  sub.start(burstTime);
  sub.stop(burstTime + 0.2);

  // Echoing secondary anti-lag pop at 0.42s
  const pop2Time = burstTime + 0.19;
  const subPop = ctx.createOscillator();
  const subPopGain = ctx.createGain();
  subPop.type = 'sine';
  subPop.frequency.setValueAtTime(95, pop2Time);
  subPop.frequency.exponentialRampToValueAtTime(42, pop2Time + 0.08);
  subPopGain.gain.setValueAtTime(0.42, pop2Time);
  subPopGain.gain.exponentialRampToValueAtTime(0.001, pop2Time + 0.1);
  subPop.connect(subPopGain);
  subPopGain.connect(master);
  subPop.start(pop2Time);
  subPop.stop(pop2Time + 0.12);
}

export default function StartEngineIntro({ onIgnite }) {
  // Sound mode: 'superbike' or 'supercar' (user can choose or defaults to superbike)
  const [soundMode, setSoundMode] = useState('superbike');
  const [igniting, setIgniting] = useState(false);
  const [ignited, setIgnited] = useState(false);

  const handleStart = () => {
    if (igniting || ignited) return;

    setIgniting(true);

    // Play exactly ONE sound as requested: superbike rev sound OR supercar fire blast sound
    try {
      if (soundMode === 'supercar') {
        playSupercarFireBlastSound();
      } else {
        playSuperbikeRevSound();
      }
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }

    // Trigger visual blast and smoothly enter home page
    setTimeout(() => {
      setIgnited(true);
      setTimeout(() => {
        if (onIgnite) onIgnite();
      }, 500);
    }, 1150);
  };

  return (
    <div className={`engineIntroOverlay ${igniting ? 'introIgniting' : ''} ${ignited ? 'introFinished' : ''}`}>
      {/* Background Ambience & Road Glow */}
      <div className="introBackdrop" aria-hidden="true">
        <div className="introRadialGlow" />
        <div className="introGridFloor" />
        <div className="introSpeedLines" />
      </div>

      {/* Top Branding & Sound Selection */}
      <div className="introTopBar">
        <div className="introBrand">
          <span className="introLogo">Moto<span>DC</span></span>
          <p className="introTagline">HYPER-PERFORMANCE AUTO & BIKE SPARE PARTS</p>
        </div>

        {/* Machine Mode Selector (Any One Sound Only) */}
        <div className="introSoundSelector" role="group" aria-label="Engine Sound Profile">
          <button
            type="button"
            className={`soundChoiceBtn ${soundMode === 'superbike' ? 'active' : ''}`}
            onClick={() => !igniting && setSoundMode('superbike')}
            disabled={igniting}
          >
            <span>🏍️ Superbike Rev</span>
          </button>
          <button
            type="button"
            className={`soundChoiceBtn ${soundMode === 'supercar' ? 'active' : ''}`}
            onClick={() => !igniting && setSoundMode('supercar')}
            disabled={igniting}
          >
            <span>🏎️ Supercar Blast</span>
          </button>
        </div>
      </div>

      {/* Centered High-Tech Start Engine Button */}
      <div className="introCenterBox">
        <div className="introButtonRings">
          <span className="introRing introRing1" />
          <span className="introRing introRing2" />
          <span className="introRing introRing3" />
        </div>

        <button
          type="button"
          className={`introStartBtn ${igniting ? 'btnIgniting' : ''} ${soundMode === 'supercar' ? 'supercarTheme' : 'superbikeTheme'}`}
          onClick={handleStart}
          aria-label={`Start Engine - ${soundMode === 'supercar' ? 'Supercar Fire Blast' : 'Superbike Rev'}`}
        >
          <span className="btnMetallicBezel" />
          <span className="btnLedGlow" />
          <div className="btnInnerContent">
            <Power className="btnPowerIcon" size={38} />
            <span className="btnMainText">{igniting ? 'IGNITING' : 'START'}</span>
            <small className="btnSubText">
              {igniting
                ? soundMode === 'supercar' ? 'FIRE BLAST' : '14,000 RPM'
                : 'ENGINE'}
            </small>
          </div>
        </button>

        <div className="introHintWrap">
          <p className="introHint">
            {igniting ? (
              <span className="introHintRevving">
                <Flame size={16} />{' '}
                {soundMode === 'supercar' ? 'SUPERCAR FIRE BLAST ACTIVE' : 'SUPERBIKE REV REDLINE ACTIVE'}
              </span>
            ) : (
              <span>TOUCH OR CLICK TO IGNITE</span>
            )}
          </p>
          <div className="introAudioBadge">
            <Volume2 size={13} />
            <span>
              {soundMode === 'supercar'
                ? 'EXHAUST FIRE BLAST AUDIO ACTIVE'
                : 'SUPERBIKE HIGH-REV AUDIO ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* Flash shockwave overlay on ignition */}
      <div className="introIgnitionFlash" aria-hidden="true" />
    </div>
  );
}
