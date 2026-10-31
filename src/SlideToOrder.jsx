import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsRight, Check, Loader2, ShieldCheck } from 'lucide-react';
import './slide-to-order.css';

/**
 * Triggers physical haptic vibration using the W3C Vibration API.
 * Works natively on Android mobile browsers (Chrome, Firefox, Opera, etc.).
 * Safely ignored on devices without vibration motors (Desktop, iOS Safari).
 */
export const triggerHaptic = (pattern = [80, 40, 120]) => {
  try {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
      return true;
    }
  } catch (_) {}
  return false;
};

export default function SlideToOrder({
  onConfirm,
  loading = false,
  disabled = false,
  payment = 'cod',
  totalText = '',
  formRef,
  validate
}) {
  const trackRef = useRef(null);
  const thumbRef = useRef(null);

  const [dragX, setDragX] = useState(0);
  const [maxTravel, setMaxTravel] = useState(240);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const hasNearEndHapticFired = useRef(false);

  // Recalculate track & thumb dimensions on resize
  const measure = useCallback(() => {
    if (trackRef.current && thumbRef.current) {
      const trackW = trackRef.current.clientWidth;
      const thumbW = thumbRef.current.clientWidth;
      // padding inside track is 4px on each side
      const travel = Math.max(80, trackW - thumbW - 8);
      setMaxTravel(travel);
    }
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // If loading becomes false and order is not confirmed, reset thumb
  useEffect(() => {
    if (!loading && isCompleted) {
      const timer = setTimeout(() => {
        setIsCompleted(false);
        setDragX(0);
        currentXRef.current = 0;
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, isCompleted]);

  // Pointer Down (Mouse, Touch, Stylus)
  const handlePointerDown = (e) => {
    if (disabled || loading || isCompleted) return;

    // Capture pointer events so drag works even if pointer slips outside button
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    startXRef.current = e.clientX - currentXRef.current;
    setIsDragging(true);
    hasNearEndHapticFired.current = false;
  };

  // Pointer Move
  const handlePointerMove = (e) => {
    if (!isDragging || disabled || loading || isCompleted) return;

    const deltaX = e.clientX - startXRef.current;
    const clampedX = Math.max(0, Math.min(deltaX, maxTravel));
    currentXRef.current = clampedX;
    setDragX(clampedX);

    // Subtle micro-tick haptic when user pulls thumb near the completion finish line (>= 85%)
    const ratio = maxTravel > 0 ? clampedX / maxTravel : 0;
    if (ratio >= 0.85 && !hasNearEndHapticFired.current) {
      triggerHaptic(20);
      hasNearEndHapticFired.current = true;
    } else if (ratio < 0.8) {
      hasNearEndHapticFired.current = false;
    }
  };

  // Execute verification and submission
  const finalizeSlide = useCallback(() => {
    // 1. Verify HTML5 required fields
    if (formRef?.current && typeof formRef.current.reportValidity === 'function') {
      const isValidForm = formRef.current.reportValidity();
      if (!isValidForm) {
        triggerHaptic([50, 40, 50]);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setDragX(0);
        currentXRef.current = 0;
        return;
      }
    }

    // 2. Custom validation checks (Phone digits, Pincode length, Cart items)
    if (typeof validate === 'function') {
      const isCustomValid = validate();
      if (!isCustomValid) {
        triggerHaptic([50, 40, 50]);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setDragX(0);
        currentXRef.current = 0;
        return;
      }
    }

    // 3. Validation passed - complete slide!
    setDragX(maxTravel);
    currentXRef.current = maxTravel;
    setIsCompleted(true);

    // Physical vibration confirmation (Swiggy / Instamart signature haptic feel)
    triggerHaptic([80, 40, 120]);

    // Invoke order submission
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
  }, [formRef, validate, maxTravel, onConfirm]);

  // Pointer Up / Cancel
  const handlePointerUp = (e) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setIsDragging(false);

    // Threshold: 82% of track length to trigger completion
    const ratio = maxTravel > 0 ? currentXRef.current / maxTravel : 0;
    if (ratio >= 0.82) {
      finalizeSlide();
    } else {
      // Snap back smoothly
      setDragX(0);
      currentXRef.current = 0;
      hasNearEndHapticFired.current = false;
    }
  };

  // Keyboard accessibility (Space or Enter key slides and places order)
  const handleKeyDown = (e) => {
    if (disabled || loading || isCompleted) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      finalizeSlide();
    }
  };

  // Progress percentage (0 to 1)
  const progressRatio = maxTravel > 0 ? Math.min(1, dragX / maxTravel) : 0;
  // Dynamic text opacity fades out as thumb travels past it
  const textOpacity = Math.max(0, 1 - progressRatio * 1.6);
  // Filled track width behind thumb
  const filledWidth = dragX + 24;

  return (
    <div className="slideToOrderContainer">
      <div
        ref={trackRef}
        className={`slideToOrderTrack ${isDragging ? 'dragging' : ''} ${
          isCompleted || loading ? 'completed' : ''
        } ${disabled ? 'disabled' : ''} ${isShaking ? 'shakeError' : ''}`}
        aria-label="Slide to place order"
      >
        {/* Animated ambient light wave */}
        {!isCompleted && !loading && (
          <div className="slideToOrderAmbientWave" aria-hidden="true" />
        )}

        {/* Dynamic Colored Progress Fill */}
        <div
          className={`slideToOrderProgress ${!isDragging ? 'snapBack' : ''} ${
            isCompleted ? 'successFill' : ''
          }`}
          style={{ width: `${filledWidth}px` }}
          aria-hidden="true"
        />

        {/* Center Shimmer Label */}
        <div
          className="slideToOrderLabel"
          style={{ opacity: isCompleted || loading ? 1 : textOpacity }}
        >
          {loading ? (
            <span className="slideToOrderShimmerText">
              <Loader2 size={16} className="animate-spin" /> Processing Order...
            </span>
          ) : isCompleted ? (
            <span className="slideToOrderShimmerText" style={{ color: '#22c55e' }}>
              <Check size={16} /> Order Initiated!
            </span>
          ) : payment === 'online' ? (
            <span className="slideToOrderShimmerText">
              Slide to Pay · {totalText}
              <ShieldCheck size={15} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
              <span className="slideToOrderChevrons">
                <ChevronsRight size={17} />
              </span>
            </span>
          ) : (
            <span className="slideToOrderShimmerText">
              Slide to Place Order · {totalText}
              <span className="slideToOrderChevrons">
                <ChevronsRight size={17} />
              </span>
            </span>
          )}
        </div>

        {/* Draggable Thumb Button */}
        <div
          ref={thumbRef}
          role="slider"
          tabIndex={disabled || loading ? -1 : 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressRatio * 100)}
          aria-label={payment === 'online' ? `Slide to pay ${totalText}` : `Slide to place order ${totalText}`}
          className={`slideToOrderThumb ${isDragging ? 'dragging' : ''} ${
            !isDragging ? 'snapBack' : ''
          } ${isCompleted || loading ? 'completed' : ''}`}
          style={{ transform: `translate3d(${dragX}px, 0, 0)` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
        >
          <div className="slideToOrderThumbIcon">
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : isCompleted ? (
              <Check size={22} strokeWidth={3} />
            ) : (
              <ChevronsRight size={22} strokeWidth={2.5} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
