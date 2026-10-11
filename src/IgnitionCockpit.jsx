import React, { useState, useEffect, useRef } from 'react';
import { Power, Volume2, VolumeX, Gauge, Zap, Flame } from 'lucide-react';

class EngineSoundSynth {
  constructor() {
    this.ctx = null;
    this.osc1 = null;
    this.osc2 = null;
    this.filter = null;
    this.gain = null;
    this.lfo = null;
    this.lfoGain = null;
    this.isMuted = false;
    this.isRunning = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  start() {
    this.init();
    if (!this.ctx) return;

    this.stop();
    this.isRunning = true;

    const t = this.ctx.currentTime;

    // Master gain
    this.gain = this.ctx.createGain();
    this.gain.gain.setValueAtTime(0.0001, t);
    this.gain.gain.exponentialRampToValueAtTime(this.isMuted ? 0.0001 : 0.18, t + 0.35);
    this.gain.connect(this.ctx.destination);

    // Low-pass filter for deep exhaust rumble
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(220, t);
    this.filter.Q.setValueAtTime(2.5, t);
    this.filter.connect(this.gain);

    // Primary engine cylinder oscillator (sawtooth)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(34, t);

    // Harmonic pulse oscillator
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(68, t);

    // LFO for rhythmic cylinder combustion pulse
    this.lfo = this.ctx.createOscillator();
    this.lfo.frequency.setValueAtTime(7.5, t);
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.setValueAtTime(9, t);
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.osc1.frequency);

    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);

    this.osc1.start(t);
    this.osc2.start(t);
    this.lfo.start(t);

    // Starter crank snap sound
    this.playCrankBurst();
  }

  playCrankBurst() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.28);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  rev(targetRatio = 1) {
    if (!this.ctx || !this.isRunning) return;
    const t = this.ctx.currentTime;
    const clamped = Math.min(Math.max(targetRatio, 0), 1);
    const targetFreq1 = 34 + clamped * 125;
    const targetFreq2 = 68 + clamped * 250;
    const targetFilter = 220 + clamped * 950;
    const targetLfo = 7.5 + clamped * 22;

    this.osc1?.frequency.cancelScheduledValues(t);
    this.osc1?.frequency.linearRampToValueAtTime(targetFreq1, t + 0.12);

    this.osc2?.frequency.cancelScheduledValues(t);
    this.osc2?.frequency.linearRampToValueAtTime(targetFreq2, t + 0.12);

    this.filter?.frequency.cancelScheduledValues(t);
    this.filter?.frequency.linearRampToValueAtTime(targetFilter, t + 0.12);

    this.lfo?.frequency.cancelScheduledValues(t);
    this.lfo?.frequency.linearRampToValueAtTime(targetLfo, t + 0.12);

    if (!this.isMuted && this.gain) {
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.linearRampToValueAtTime(0.24 + clamped * 0.14, t + 0.12);
    }
  }

  idle() {
    if (!this.ctx || !this.isRunning) return;
    const t = this.ctx.currentTime;
    this.osc1?.frequency.cancelScheduledValues(t);
    this.osc1?.frequency.linearRampToValueAtTime(34, t + 0.35);

    this.osc2?.frequency.cancelScheduledValues(t);
    this.osc2?.frequency.linearRampToValueAtTime(68, t + 0.35);

    this.filter?.frequency.cancelScheduledValues(t);
    this.filter?.frequency.linearRampToValueAtTime(220, t + 0.35);

    this.lfo?.frequency.cancelScheduledValues(t);
    this.lfo?.frequency.linearRampToValueAtTime(7.5, t + 0.35);

    if (!this.isMuted && this.gain) {
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.linearRampToValueAtTime(0.18, t + 0.35);
    }

    // Occasional exhaust snap on throttle lift
    this.playExhaustPop();
  }

  playExhaustPop() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime + 0.08;
    const bufferSize = this.ctx.sampleRate * 0.06;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(380, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    noise.connect(f);
    f.connect(g);
    g.connect(this.ctx.destination);
    noise.start(t);
  }

  stop() {
    if (!this.ctx) return;
    this.isRunning = false;
    try {
      this.osc1?.stop();
      this.osc2?.stop();
      this.lfo?.stop();
      this.osc1?.disconnect();
      this.osc2?.disconnect();
      this.lfo?.disconnect();
    } catch (_) {}
  }

  setMute(mute) {
    this.isMuted = mute;
    if (this.gain && this.ctx) {
      const t = this.ctx.currentTime;
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.setValueAtTime(mute ? 0.0001 : 0.18, t);
    }
  }
}

const engineAudio = new EngineSoundSynth();

export default function IgnitionCockpit() {
  const [engineState, setEngineState] = useState('off'); // 'off' | 'starting' | 'running'
  const [rpm, setRpm] = useState(0);
  const [isRevving, setIsRevving] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [boost, setBoost] = useState(0);
  const revIntervalRef = useRef(null);

  // Sync headlight intensity with hero
  useEffect(() => {
    const heroElem = document.querySelector('.hero');
    if (!heroElem) return;

    if (engineState === 'running') {
      heroElem.classList.add('hero-ignition-active');
    } else {
      heroElem.classList.remove('hero-ignition-active');
    }
  }, [engineState]);

  // Handle engine idle jitter
  useEffect(() => {
    if (engineState !== 'running' || isRevving) return;

    const jitterInterval = setInterval(() => {
      setRpm(1150 + Math.floor(Math.random() * 80 - 40));
      setBoost(Number((Math.random() * 0.08).toFixed(2)));
    }, 180);

    return () => clearInterval(jitterInterval);
  }, [engineState, isRevving]);

  const toggleEngine = () => {
    if (engineState === 'off') {
      setEngineState('starting');
      engineAudio.start();

      // Needle sweep sequence
      let cur = 0;
      const sweepUp = setInterval(() => {
        cur += 350;
        setRpm(cur);
        if (cur >= 7800) {
          clearInterval(sweepUp);
          const sweepDown = setInterval(() => {
            cur -= 420;
            setRpm(cur);
            if (cur <= 1180) {
              clearInterval(sweepDown);
              setRpm(1180);
              setEngineState('running');
            }
          }, 25);
        }
      }, 20);
    } else {
      setEngineState('off');
      engineAudio.stop();
      setRpm(0);
      setBoost(0);
      setIsRevving(false);
    }
  };

  const startRev = () => {
    if (engineState !== 'running') return;
    setIsRevving(true);
    let targetRpm = rpm;
    clearInterval(revIntervalRef.current);

    revIntervalRef.current = setInterval(() => {
      targetRpm = Math.min(7400, targetRpm + 480);
      setRpm(targetRpm);
      setBoost(Number((0.4 + (targetRpm / 7400) * 1.1).toFixed(2)));
      const ratio = (targetRpm - 1150) / (7400 - 1150);
      engineAudio.rev(ratio);
    }, 35);
  };

  const stopRev = () => {
    if (engineState !== 'running') return;
    clearInterval(revIntervalRef.current);
    setIsRevving(false);
    engineAudio.idle();

    revIntervalRef.current = setInterval(() => {
      setRpm((prev) => {
        if (prev <= 1250) {
          clearInterval(revIntervalRef.current);
          setBoost(0);
          return 1180;
        }
        setBoost((b) => Math.max(0, b - 0.2));
        return prev - 520;
      });
    }, 35);
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    engineAudio.setMute(next);
  };

  // 0 to 8000 RPM mapped to gauge angle (-120deg to +120deg)
  const gaugeAngle = -120 + (Math.min(rpm, 8000) / 8000) * 240;

  return (
    <div className={`ignitionCockpitWrap ${engineState === 'running' ? 'cockpitActive' : ''}`}>
      <div className="cockpitHeader">
        <div className="cockpitBadge">
          <Gauge size={13} />
          <span>TELEMETRY COCKPIT</span>
        </div>
        <button
          type="button"
          className="cockpitMuteBtn"
          onClick={toggleMute}
          title={isMuted ? 'Unmute engine audio' : 'Mute engine audio'}
          aria-label={isMuted ? 'Unmute engine sound' : 'Mute engine sound'}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>

      <div className="cockpitMain">
        {/* Analog Tachometer Gauge */}
        <div className="gaugeCluster">
          <div className="gaugeDial">
            <svg viewBox="0 0 200 130" className="gaugeSvg">
              {/* Dial Track */}
              <path
                d="M 25 115 A 75 75 0 1 1 175 115"
                fill="none"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Active RPM Fill Arc */}
              <path
                d="M 25 115 A 75 75 0 1 1 175 115"
                fill="none"
                stroke={rpm > 6200 ? '#ff3157' : '#00e5ff'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="270"
                strokeDashoffset={270 - (Math.min(rpm, 8000) / 8000) * 270}
                className="gaugeFillArc"
              />
              {/* Tick Marks */}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => {
                const angle = (-120 + (k / 8) * 240) * (Math.PI / 180);
                const x1 = 100 + 64 * Math.sin(angle);
                const y1 = 115 - 64 * Math.cos(angle);
                const x2 = 100 + 72 * Math.sin(angle);
                const y2 = 115 - 72 * Math.cos(angle);
                const isRedline = k >= 6.5;
                return (
                  <line
                    key={k}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isRedline ? '#ff3157' : 'rgba(255, 255, 255, 0.45)'}
                    strokeWidth={k % 2 === 0 ? '2' : '1.2'}
                  />
                );
              })}
            </svg>

            {/* Gauge Needle */}
            <div
              className="gaugeNeedle"
              style={{ transform: `translateX(-50%) rotate(${gaugeAngle}deg)` }}
            />
            <div className="gaugeHub" />

            {/* Live Digital Readout */}
            <div className="gaugeDigital">
              <span className="gaugeValue">
                {engineState === 'off' ? '0' : rpm.toLocaleString()}
              </span>
              <span className="gaugeUnit">RPM</span>
            </div>
          </div>
        </div>

        {/* Ignition Controls */}
        <div className="cockpitControls">
          <button
            type="button"
            className={`engineStartBtn ${engineState === 'running' ? 'btnRunning' : engineState === 'starting' ? 'btnStarting' : ''}`}
            onClick={toggleEngine}
            aria-label="Engine start stop button"
          >
            <span className="engineStartHalo" />
            <Power size={22} className="engineStartIcon" />
            <span className="engineStartText">
              {engineState === 'off'
                ? 'START'
                : engineState === 'starting'
                ? 'CRANK'
                : 'STOP'}
            </span>
            <small>ENGINE</small>
          </button>

          {engineState === 'running' && (
            <button
              type="button"
              className={`revThrottleBtn ${isRevving ? 'revving' : ''}`}
              onMouseDown={startRev}
              onMouseUp={stopRev}
              onMouseLeave={stopRev}
              onTouchStart={startRev}
              onTouchEnd={stopRev}
              title="Hold to rev engine"
            >
              <Flame size={18} />
              <span>REV THROTTLE</span>
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Status Bar */}
      <div className="cockpitTelemetry">
        <div className="telemetryItem">
          <span>STATUS</span>
          <strong className={engineState === 'running' ? 'statusLive' : ''}>
            {engineState === 'off'
              ? 'STANDBY'
              : engineState === 'starting'
              ? 'CRANKING'
              : 'IDLE / RUNNING'}
          </strong>
        </div>
        <div className="telemetryItem">
          <span>TURBO BOOST</span>
          <strong>{boost.toFixed(1)} BAR</strong>
        </div>
        <div className="telemetryItem">
          <span>HEADLIGHTS</span>
          <strong className={engineState === 'running' ? 'xenonOn' : ''}>
            {engineState === 'running' ? 'XENON ACTIVE' : 'OFF'}
          </strong>
        </div>
      </div>
    </div>
  );
}
