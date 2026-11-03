import React, { useEffect, useRef } from 'react';
import { Truck, CheckCircle2, Sparkles, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const FREE_DELIVERY_THRESHOLD = 799;
export const STANDARD_DELIVERY_FEE = 99;

export default function FreeDeliveryCelebrationModal({ isOpen, onClose, subtotal = 0 }) {
  const canvasRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    // Haptic feedback for tactile satisfaction
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([70, 40, 100]);
      }
    } catch (_) {}

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#22c55e', '#10b981', '#38bdf8', '#ff3157', '#fbbf24', '#a855f7', '#ffffff'];
    const particles = Array.from({ length: 80 }, () => ({
      x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 260,
      y: window.innerHeight * 0.38 + (Math.random() - 0.5) * 120,
      vx: (Math.random() - 0.5) * 15,
      vy: Math.random() * -12 - 5,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
      opacity: 1,
    }));

    let startTime = performance.now();

    const render = (now) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = (now - startTime) / 1000;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.32; // gravity
        p.vx *= 0.985; // air resistance
        p.rotation += p.rotationSpeed;

        if (elapsed > 2.8) {
          p.opacity = Math.max(0, p.opacity - 0.025);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (elapsed < 5.5) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    const timer = setTimeout(() => {
      onClose();
    }, 6000);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timer);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="celebrationOverlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
    >
      <canvas ref={canvasRef} className="celebrationCanvas" />
      <div className="celebrationCard" onClick={(e) => e.stopPropagation()}>
        <button className="celebrationCloseBtn" onClick={onClose} aria-label="Close celebration modal">
          <X size={18} />
        </button>

        <div className="celebrationBadge">
          <Sparkles size={14} /> FREE DELIVERY UNLOCKED!
        </div>

        <div className="celebrationTruckWrap">
          <div className="celebrationTruckGlow" />
          <div className="celebrationTruckIcon">
            <Truck size={42} />
          </div>
          <span className="celebrationSpeedLine line1" />
          <span className="celebrationSpeedLine line2" />
          <span className="celebrationSpeedLine line3" />
        </div>

        <h2 id="celebration-title" className="celebrationTitle">
          Congratulations! <span className="celebrationPartyEmoji">🎉</span>
        </h2>
        <p className="celebrationSubtitle">
          Your cart crossed <b>₹{FREE_DELIVERY_THRESHOLD}</b> and unlocked <b>100% FREE Express Doorstep Delivery</b> on this order!
        </p>

        <div className="celebrationSavingsBox">
          <div className="savingsNumber">
            <span className="savingsLabel">YOU SAVED</span>
            <strong>₹{STANDARD_DELIVERY_FEE}</strong>
          </div>
          <div className="savingsDivider" />
          <div className="savingsDesc">
            <CheckCircle2 size={16} />
            <span>Zero shipping charges applied directly to your checkout.</span>
          </div>
        </div>

        <div className="celebrationActions">
          <button
            type="button"
            className="celebrationCheckoutBtn"
            onClick={() => {
              onClose();
              nav('/checkout');
            }}
          >
            Proceed to Checkout <ArrowRight size={16} />
          </button>
          <button type="button" className="celebrationKeepShoppingBtn" onClick={onClose}>
            Keep Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
