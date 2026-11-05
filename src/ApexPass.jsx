import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Truck,
  ShieldCheck,
  Wrench,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  X,
  Flame,
  Award,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import './apex-pass.css';

export function isApexMember() {
  try {
    return localStorage.getItem('motodc-apex-member') === 'true';
  } catch (_) {
    return false;
  }
}

export function setApexMember(status) {
  try {
    if (status) {
      localStorage.setItem('motodc-apex-member', 'true');
    } else {
      localStorage.removeItem('motodc-apex-member');
    }
    window.dispatchEvent(new Event('apexchange'));
  } catch (_) {}
}

export default function ApexPassModal({ isOpen, onClose }) {
  const [active, setActive] = useState(isApexMember());
  const [billingPlan, setBillingPlan] = useState('annual'); // 'annual' | 'monthly'
  const nav = useNavigate();

  useEffect(() => {
    const sync = () => setActive(isApexMember());
    window.addEventListener('apexchange', sync);
    return () => window.removeEventListener('apexchange', sync);
  }, []);

  if (!isOpen) return null;

  const handleJoin = (plan) => {
    setApexMember(true);
    setActive(true);
    toast.success('🏆 Welcome to MotoDC Apex Pass! Unlimited Free Delivery & 10% Off Unlocked.', {
      duration: 6000,
      icon: '⚡',
    });
    if (onClose) onClose();
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to pause your MotoDC Apex Pass membership?')) {
      setApexMember(false);
      setActive(false);
      toast('Apex Pass membership paused.', { icon: '🛑' });
    }
  };

  return (
    <div className="apexModalOverlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="apexModalCard" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className="apexModalCloseBtn"
          onClick={onClose}
          aria-label="Close Apex Pass modal"
        >
          <X size={18} />
        </button>

        {/* Hero Banner */}
        <div className="apexModalHeader">
          <div className="apexBadgePill">
            <Flame size={14} color="#f59e0b" />
            <span>VIP MOTORSPORT MEMBERSHIP</span>
          </div>
          <h2 className="apexBrandTitle">
            Moto<span>DC</span> <span className="apexGold">APEX PASS</span>
          </h2>
          <p className="apexBrandSub">
            Fast-track your garage. Unlimited ₹0 express doorstep delivery on all car & bike spares with no minimum order threshold.
          </p>

          {active && (
            <div className="apexActiveStatusBadge">
              <CheckCircle2 size={16} />
              <span>You are an Active Apex Pass Member!</span>
            </div>
          )}
        </div>

        {/* Perks Grid */}
        <div className="apexPerksGrid">
          <div className="apexPerkCard">
            <div className="apexPerkIconWrap green">
              <Truck size={20} />
            </div>
            <div className="apexPerkContent">
              <h4>₹0 Free Express Delivery</h4>
              <p>No ₹799 minimum order. Every single bolt, filter, or brake pad ships 100% free.</p>
            </div>
          </div>

          <div className="apexPerkCard">
            <div className="apexPerkIconWrap cyan">
              <Zap size={20} />
            </div>
            <div className="apexPerkContent">
              <h4>Priority Hub Express Lane</h4>
              <p>Apex orders skip the standard queue and stage directly into Priority Bay 1 at Karaikal Hub.</p>
            </div>
          </div>

          <div className="apexPerkCard">
            <div className="apexPerkIconWrap gold">
              <Sparkles size={20} />
            </div>
            <div className="apexPerkContent">
              <h4>10% Extra Member Discount</h4>
              <p>Instant 10% auto-deduction on top genuine spares, Castrol & Motul lubricants at checkout.</p>
            </div>
          </div>

          <div className="apexPerkCard">
            <div className="apexPerkIconWrap red">
              <Wrench size={20} />
            </div>
            <div className="apexPerkContent">
              <h4>Karaikal Emergency Helpline</h4>
              <p>Direct priority access to certified master mechanics for breakdown advice & parts fitment.</p>
            </div>
          </div>
        </div>

        {/* Pricing Plan Selector (If not already active) */}
        {!active ? (
          <div className="apexPlanSection">
            <div className="apexPlanOptions">
              <div
                className={`apexPlanCard ${billingPlan === 'annual' ? 'selected' : ''}`}
                onClick={() => setBillingPlan('annual')}
              >
                <div className="apexPlanBestValue">MOST POPULAR • SAVE 45%</div>
                <div className="apexPlanName">Annual Apex Pass</div>
                <div className="apexPlanPrice">
                  <strong>₹199</strong> <span>/ year</span>
                </div>
                <small className="apexPlanSub">Just ₹16/month · Unlimited deliveries for 365 days</small>
              </div>

              <div
                className={`apexPlanCard ${billingPlan === 'monthly' ? 'selected' : ''}`}
                onClick={() => setBillingPlan('monthly')}
              >
                <div className="apexPlanName">Monthly Flex Pass</div>
                <div className="apexPlanPrice">
                  <strong>₹29</strong> <span>/ month</span>
                </div>
                <small className="apexPlanSub">Cancel anytime · Pays for itself on 1st order</small>
              </div>
            </div>

            <button
              type="button"
              className="apexJoinBtn"
              onClick={() => handleJoin(billingPlan)}
            >
              <Zap size={18} />
              <span>Activate Apex Pass ({billingPlan === 'annual' ? '₹199 / Year' : '₹29 / Month'})</span>
              <ArrowRight size={16} />
            </button>
            <p className="apexTrialNote">⚡ Instant activation · Instant Free Delivery on current cart!</p>
          </div>
        ) : (
          <div className="apexManageSection">
            <div className="apexManageInfo">
              <Award size={20} color="#f59e0b" />
              <div>
                <strong>Apex VIP Privileges Active</strong>
                <p>Your orders automatically receive ₹0 delivery fee & 10% member discount in cart & checkout.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="apexContinueShoppingBtn"
                onClick={() => {
                  if (onClose) onClose();
                  nav('/products');
                }}
              >
                Shop Genuine Spares <ArrowRight size={14} />
              </button>
              <button
                type="button"
                className="apexCancelBtn"
                onClick={handleCancel}
              >
                Pause Membership
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
