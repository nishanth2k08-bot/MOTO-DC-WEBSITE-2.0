import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Zap,
  Truck,
  Sparkles,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  X,
  Flame,
  Award,
  ArrowRight,
  Lock,
  ChevronRight,
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import './apex-pass.css';

// Razorpay SDK loader
const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK')));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.head.appendChild(s);
  });

// Feature toggle: Preserved for easy future re-activation
export const ENABLE_APEX_PASS = false;

export function isApexMember() {
  if (!ENABLE_APEX_PASS) return false;
  try {
    const isMember = localStorage.getItem('motodc-apex-member') === 'true';
    const expiresAt = localStorage.getItem('motodc-apex-expires');
    if (isMember && expiresAt) {
      if (new Date(expiresAt).getTime() < Date.now()) {
        localStorage.removeItem('motodc-apex-member');
        localStorage.removeItem('motodc-apex-expires');
        localStorage.removeItem('motodc-apex-plan');
        return false;
      }
    }
    return isMember;
  } catch (_) {
    return false;
  }
}

export function getApexMemberDetails() {
  try {
    return {
      isMember: isApexMember(),
      plan: localStorage.getItem('motodc-apex-plan') || 'annual',
      expiresAt: localStorage.getItem('motodc-apex-expires') || null
    };
  } catch (_) {
    return { isMember: false, plan: null, expiresAt: null };
  }
}

export function setApexMember(status, details = {}) {
  try {
    if (status) {
      localStorage.setItem('motodc-apex-member', 'true');
      if (details.plan) localStorage.setItem('motodc-apex-plan', details.plan);
      if (details.expiresAt) localStorage.setItem('motodc-apex-expires', details.expiresAt);
    } else {
      localStorage.removeItem('motodc-apex-member');
      localStorage.removeItem('motodc-apex-plan');
      localStorage.removeItem('motodc-apex-expires');
    }
    window.dispatchEvent(new Event('apexchange'));
  } catch (_) {}
}

export default function ApexPassModal({ isOpen, onClose }) {
  const [active, setActive] = useState(isApexMember());
  const [memberDetails, setMemberDetails] = useState(getApexMemberDetails());
  const [billingPlan, setBillingPlan] = useState('annual'); // 'annual' | 'monthly'
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const sync = () => {
      setActive(isApexMember());
      setMemberDetails(getApexMemberDetails());
    };
    window.addEventListener('apexchange', sync);
    return () => window.removeEventListener('apexchange', sync);
  }, []);

  // Sync with Firestore profile if user is logged in
  useEffect(() => {
    if (!isOpen) return;
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.isApexMember) {
            const exp = d.apexExpiresAt;
            const valid = !exp || new Date(exp).getTime() > Date.now();
            if (valid) {
              setApexMember(true, { plan: d.apexPlan || 'annual', expiresAt: exp });
              setActive(true);
              setMemberDetails({ isMember: true, plan: d.apexPlan || 'annual', expiresAt: exp });
            }
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleJoinWithRazorpay = async (plan) => {
    const user = auth.currentUser;
    if (!user) {
      toast('Please sign in or create an account to activate your Apex Pass membership.', {
        icon: '🔐',
        duration: 5000
      });
      if (onClose) onClose();
      nav('/account');
      return;
    }

    setLoading(true);
    try {
      // 1. Load Razorpay and get Firebase auth token
      const [_, idToken] = await Promise.all([loadRazorpay(), user.getIdToken()]);

      // 2. Create order on server
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ membership: 'apex_pass', plan })
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      // 3. Launch Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'MotoDC Apex VIP Pass',
        description: `${plan === 'annual' ? 'Annual (365 Days)' : 'Monthly Flex'} VIP Motorsport Membership`,
        order_id: orderData.orderId,
        theme: {
          color: '#d97706' // Luxurious 24K Gold
        },
        prefill: {
          name: user.displayName || '',
          email: user.email || '',
          contact: user.phoneNumber || ''
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast('Payment cancelled.', { icon: 'ℹ️' });
          }
        },
        handler: async function (response) {
          try {
            toast.loading('Verifying payment and activating VIP privileges...', { id: 'apex-verify' });

            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`
              },
              body: JSON.stringify({
                membership: 'apex_pass',
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            // Save membership state
            setApexMember(true, { plan, expiresAt: verifyData.expiresAt });
            setActive(true);
            setMemberDetails({ isMember: true, plan, expiresAt: verifyData.expiresAt });

            toast.success('👑 Welcome to MotoDC Apex VIP! Unlimited Free Delivery & 10% Off Unlocked.', {
              id: 'apex-verify',
              duration: 6000
            });
          } catch (verifyErr) {
            console.error('Apex verification error:', verifyErr);
            toast.error(verifyErr.message || 'Payment verification failed. Please contact support.', {
              id: 'apex-verify'
            });
          } finally {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setLoading(false);
        toast.error(`Payment failed: ${resp.error?.description || 'Transaction declined'}`);
      });
      rzp.open();
    } catch (err) {
      console.error('Apex payment initiation error:', err);
      toast.error(err.message || 'Could not initiate Razorpay payment');
      setLoading(false);
    }
  };

  const handlePause = () => {
    if (window.confirm('Are you sure you want to pause your Apex Pass benefits on this device?')) {
      setApexMember(false);
      setActive(false);
      toast('Apex Pass membership paused on this device.', { icon: '🛑' });
    }
  };

  return (
    <div className="apexModalOverlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="apexModalCard premiumCard" onClick={(e) => e.stopPropagation()}>
        {/* Shimmer Effect */}
        <div className="apexGoldShimmerBar" />

        {/* Close Button */}
        <button
          type="button"
          className="apexModalCloseBtn"
          onClick={onClose}
          aria-label="Close Apex Pass modal"
        >
          <X size={18} />
        </button>

        {/* Hero Header */}
        <div className="apexModalHeader">
          <div className="apexLuxuryInsignia">
            <Crown size={15} color="#ffd700" />
            <span>MOTO APEX CLUB • VIP PASS</span>
            <Sparkles size={13} color="#ffd700" />
          </div>
          <h2 className="apexBrandTitle">
            Moto<span className="redAccent">DC</span> <span className="apexGoldText">APEX PASS</span>
          </h2>
          <p className="apexBrandSub">
            The ultimate membership for auto & motorcycle enthusiasts. Unlimited ₹0 express doorstep delivery on every order with no minimum spend, plus exclusive VIP discounts.
          </p>

          {active && (
            <div className="apexActiveStatusBadge">
              <Crown size={16} color="#ffd700" />
              <span>
                Active VIP Member ({memberDetails.plan === 'monthly' ? 'Monthly Flex' : 'Annual VIP'})
              </span>
              {memberDetails.expiresAt && (
                <small>· Renews {new Date(memberDetails.expiresAt).toLocaleDateString()}</small>
              )}
            </div>
          )}
        </div>

        {/* Value Comparison / Perks Grid */}
        <div className="apexComparisonTable">
          <div className="apexComparisonRow headerRow">
            <div className="benefitCol">Membership Benefits</div>
            <div className="standardCol">Standard</div>
            <div className="apexCol">
              <Crown size={13} /> APEX VIP
            </div>
          </div>

          <div className="apexComparisonRow">
            <div className="benefitCol">
              <strong>Doorstep Delivery Fee</strong>
              <small>On genuine spares & lubricants</small>
            </div>
            <div className="standardCol muted">₹99 (Free only &gt;₹799)</div>
            <div className="apexCol highlight">
              <strong>₹0 FREE</strong>
              <small>No minimum order</small>
            </div>
          </div>

          <div className="apexComparisonRow">
            <div className="benefitCol">
              <strong>Spares & Lubricant Discount</strong>
              <small>Castrol, Motul, Bosch, NGK</small>
            </div>
            <div className="standardCol muted">0% standard</div>
            <div className="apexCol highlight">
              <strong>Extra 10% OFF</strong>
              <small>Auto-applied</small>
            </div>
          </div>

          <div className="apexComparisonRow">
            <div className="benefitCol">
              <strong>Karaikal Hub Processing</strong>
              <small>Order staging speed</small>
            </div>
            <div className="standardCol muted">Standard Queue</div>
            <div className="apexCol highlight">
              <strong>Priority Bay 1</strong>
              <small>Fast-tracked packing</small>
            </div>
          </div>

          <div className="apexComparisonRow">
            <div className="benefitCol">
              <strong>Delivery Partner Allocation</strong>
              <small>Corridor dispatch routing</small>
            </div>
            <div className="standardCol muted">Standard</div>
            <div className="apexCol highlight">
              <strong>Top Power Riders</strong>
              <small>Priority assignment</small>
            </div>
          </div>
        </div>

        {/* Plan Selector or Active Card */}
        {!active ? (
          <div className="apexPlanSection">
            <div className="apexPlanOptions">
              <div
                className={`apexPlanCard ${billingPlan === 'annual' ? 'selected' : ''}`}
                onClick={() => setBillingPlan('annual')}
              >
                <div className="apexPlanBestValue">
                  <Flame size={10} /> MOST POPULAR • SAVE 45%
                </div>
                <div className="apexPlanName">Annual VIP Pass</div>
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
                <small className="apexPlanSub">Cancel anytime · Pays for itself on your 1st order</small>
              </div>
            </div>

            <button
              type="button"
              className="apexJoinBtn"
              disabled={loading}
              onClick={() => handleJoinWithRazorpay(billingPlan)}
            >
              {loading ? (
                <>
                  <div className="apexSpinner" />
                  <span>Connecting to Razorpay Secure Gateway...</span>
                </>
              ) : (
                <>
                  <Crown size={18} />
                  <span>
                    Pay {billingPlan === 'annual' ? '₹199' : '₹29'} with Razorpay & Join Apex VIP
                  </span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            <div className="apexTrustBadges">
              <span>
                <Lock size={12} /> 256-Bit Encrypted Razorpay Checkout
              </span>
              <span>• UPI (GPay, PhonePe, Paytm), Cards & NetBanking</span>
            </div>
          </div>
        ) : (
          <div className="apexManageSection">
            <div className="apexMetalCardPreview">
              <div className="metalCardTop">
                <span className="metalChip">MOTO APEX</span>
                <span className="metalBadge">VIP CLUB</span>
              </div>
              <div className="metalCardNumber">APEX-VIP-••••-••••</div>
              <div className="metalCardFooter">
                <div>
                  <small>VIP MEMBER</small>
                  <b>{auth.currentUser?.displayName || 'Active Member'}</b>
                </div>
                <div>
                  <small>BENEFIT STATUS</small>
                  <b className="metalStatus">UNLIMITED ₹0 DELIVERY ACTIVE</b>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="apexContinueShoppingBtn"
                onClick={() => {
                  if (onClose) onClose();
                  nav('/products');
                }}
              >
                Shop with 10% Member Discount <ArrowRight size={14} />
              </button>
              <button type="button" className="apexCancelBtn" onClick={handlePause}>
                Pause Benefits
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
