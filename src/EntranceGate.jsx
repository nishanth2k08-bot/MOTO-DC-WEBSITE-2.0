import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import './entrance-gate.css';

/**
 * Synthesizes an authentic mechanical relay click and engine ignition power-surge
 * using native Web Audio API oscillators (zero external dependencies).
 */
function playIgnitionSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;

    // 1. Mechanical solenoid click (tactile snap)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(220, t);
    clickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.06);
    clickGain.gain.setValueAtTime(0.4, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(t);
    clickOsc.stop(t + 0.06);

    // 2. High-torque starter motor whine & rev surge
    const surgeOsc = ctx.createOscillator();
    const surgeGain = ctx.createGain();
    surgeOsc.type = 'sawtooth';
    surgeOsc.frequency.setValueAtTime(75, t + 0.05);
    surgeOsc.frequency.exponentialRampToValueAtTime(340, t + 0.45);
    surgeGain.gain.setValueAtTime(0.01, t);
    surgeGain.gain.linearRampToValueAtTime(0.28, t + 0.15);
    surgeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    surgeOsc.connect(surgeGain);
    surgeGain.connect(ctx.destination);
    surgeOsc.start(t + 0.05);
    surgeOsc.stop(t + 0.6);

    // 3. Low rumble sub-bass ignition roar
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(60, t + 0.08);
    bassOsc.frequency.exponentialRampToValueAtTime(30, t + 0.7);
    bassGain.gain.setValueAtTime(0.01, t);
    bassGain.gain.linearRampToValueAtTime(0.45, t + 0.2);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    bassOsc.connect(bassGain);
    bassGain.connect(ctx.destination);
    bassOsc.start(t + 0.08);
    bassOsc.stop(t + 0.75);
  } catch (_) {}
}

export default function EntranceGate({ user }) {
  const nav = useNavigate();
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('motodc-entrance-unlocked') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [isDepressed, setIsDepressed] = useState(false);
  const [isFiring, setIsFiring] = useState(false);
  const [isIgnited, setIsIgnited] = useState(false);

  if (unlocked) return null;

  const handleStart = () => {
    if (isFiring || isIgnited) return;

    // 1. Mechanical button depression
    setIsDepressed(true);
    setIsFiring(true);

    // 2. Play tactile ignition audio feedback
    playIgnitionSound();

    // 3. Mark session unlocked
    try {
      sessionStorage.setItem('motodc-entrance-unlocked', 'true');
    } catch (_) {}

    // 4. Trigger high-energy ignition flare & routing transition
    setTimeout(() => {
      // Check auth state:
      // Signed in ➔ Home page (/)
      // Guest / New visitor ➔ Account page (/account)
      const currentUser = user || auth.currentUser;
      if (currentUser) {
        nav('/', { replace: true });
      } else {
        nav('/account', { replace: true });
      }

      // Dissolve overlay
      setIsIgnited(true);

      setTimeout(() => {
        setUnlocked(true);
      }, 750);
    }, 450);
  };

  return (
    <>
      <div 
        className={`entranceOverlay ${isIgnited ? 'ignited' : ''}`}
        aria-label="MotoDC Engine Start Gateway"
        role="dialog"
        aria-modal="true"
      >
        <div className="entranceStage">
          {/* Base High-Resolution Artwork */}
          <img
            src="/entrance-start-button.png"
            alt="MotoDC Start Engine"
            className="entranceArtwork"
            fetchPriority="high"
            decoding="async"
          />

          {/* Interactive Button Host positioned over the center button */}
          <div 
            className="entranceButtonHost"
            onClick={handleStart}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStart();
              }
            }}
            aria-label="Start Engine to enter MotoDC"
          >
            {/* Ambient UI Ripples rippling outward across the screen */}
            <div className="entranceRippleRing r1" aria-hidden="true" />
            <div className="entranceRippleRing r2" aria-hidden="true" />
            <div className="entranceRippleRing r3" aria-hidden="true" />

            {/* Heartbeat Seam Glow (Breathing red neon halo ring) */}
            <div className="entranceHaloSeam" aria-hidden="true" />

            {/* Hover Reflection Glint Shimmer */}
            <div className="entranceShimmerSweep" aria-hidden="true" />

            {/* Interactive Click Target */}
            <button
              type="button"
              className={`entranceInteractiveButton ${isDepressed ? 'depressed' : ''}`}
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

          {/* Bottom Guidance Indicator */}
          <div className="entrancePrompt" aria-hidden="true">
            <span className="entrancePromptTitle">SYSTEM READY</span>
            <span className="entrancePromptSub">
              <span>●</span> TAP ENGINE START TO ENTER
            </span>
          </div>
        </div>
      </div>

      {/* Fullscreen Radial Ignition Power Burst */}
      <div 
        className={`ignitionFlashOverlay ${isFiring ? 'firing' : ''}`}
        aria-hidden="true"
      />
    </>
  );
}
