import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import ShippingLabelModal from './ShippingLabelModal';
import { detectDeliveryZone, CORRIDOR_METADATA } from './corridorUtil';
import {
  Package,
  Printer,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Truck,
  Search,
  RefreshCw,
  Barcode,
  CheckSquare,
  Square,
  Lock,
  Key,
  Clock,
  ArrowRight,
  LogOut,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import './hub-station.css';

const DEFAULT_STATION_PIN = '1234';

// Hub Shift Schedule: 7:00 AM to 8:30 PM IST (Daily)
// Auto-lock / logout after shift completion (>= 8:30 PM / 20:30)
const isShiftCompleted = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const shiftEndMinutes = 20 * 60 + 30; // 8:30 PM = 1230 minutes
  const morningShiftStartMinutes = 7 * 60; // 7:00 AM = 420 minutes

  // Shift is completed if current time is 8:30 PM or later, or before 7:00 AM
  return currentMinutes >= shiftEndMinutes || currentMinutes < morningShiftStartMinutes;
};

export default function HubStation() {
  const [afterHoursOverride, setAfterHoursOverride] = useState(false);
  const [stationAuth, setStationAuth] = useState(() => {
    try {
      // If shift has completed for today, automatically logout and clear session
      if (isShiftCompleted()) {
        localStorage.removeItem('motodc_hub_auth');
        return false;
      }
      return localStorage.getItem('motodc_hub_auth') === 'granted';
    } catch {
      return false;
    }
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Auto-logout when shift completes at 8:30 PM
  useEffect(() => {
    const checkShiftTimer = () => {
      if (isShiftCompleted() && stationAuth && !afterHoursOverride) {
        setStationAuth(false);
        try {
          localStorage.removeItem('motodc_hub_auth');
        } catch (_) {}
        toast('Operational shift completed (8:30 PM). Station terminal automatically locked.', {
          icon: '🌙',
          duration: 6000,
        });
      }
    };

    checkShiftTimer();
    const interval = setInterval(checkShiftTimer, 5000);
    return () => clearInterval(interval);
  }, [stationAuth, afterHoursOverride]);

  // Orders State
  const [codOrders, setCodOrders] = useState([]);
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'packed' | 'all'
  const [selectedCorridor, setSelectedCorridor] = useState('all');

  // Modal & Checklist State
  const [labelOrder, setLabelOrder] = useState(null);
  const [checkedItems, setCheckedItems] = useState({}); // { [orderId_itemIdx]: boolean }
  const [updatingId, setUpdatingId] = useState(null);

  // Sound chime for new incoming packing order
  const audioContextRef = useRef(null);

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (_) {}
  };

  // Station PIN Authentication
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput.trim() === DEFAULT_STATION_PIN) {
      const shiftEnded = isShiftCompleted();
      if (shiftEnded) {
        setAfterHoursOverride(true);
        toast('Overtime / After-Hours Access Unlocked (Shift ended at 8:30 PM)', { icon: '⚠️', duration: 5000 });
      } else {
        toast.success('Station Unlocked • Karaikal Hub Packing Portal Active');
      }
      setStationAuth(true);
      setPinError('');
      try {
        localStorage.setItem('motodc_hub_auth', 'granted');
      } catch (_) {}
    } else {
      setPinError('Incorrect Station PIN');
      toast.error('Invalid Station PIN');
    }
  };

  const handleStationLock = () => {
    setStationAuth(false);
    setAfterHoursOverride(false);
    try {
      localStorage.removeItem('motodc_hub_auth');
    } catch (_) {}
    toast('Station locked', { icon: '🔒' });
  };

  // Real-Time Sync with Firestore Orders
  useEffect(() => {
    if (!stationAuth) return;
    setLoading(true);

    const codCol = collection(db, 'orders', 'cod orders', 'records');
    const onlineCol = collection(db, 'orders', 'online orders', 'records');

    let initialLoad = true;

    const unsubCod = onSnapshot(codCol, (snap) => {
      const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id, collectionType: 'cod orders', paymentMethod: 'cod' }));
      if (!initialLoad && docs.length > codOrders.length) {
        playChime();
        toast('New order received for packing!', { icon: '📦' });
      }
      setCodOrders(docs);
      setLoading(false);
    }, (err) => {
      console.warn('Cod sync error in Hub:', err);
      setLoading(false);
    });

    const unsubOnline = onSnapshot(onlineCol, (snap) => {
      const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id, collectionType: 'online orders', paymentMethod: 'online' }));
      if (!initialLoad && docs.length > onlineOrders.length) {
        playChime();
        toast('New order received for packing!', { icon: '📦' });
      }
      setOnlineOrders(docs);
      setLoading(false);
    }, (err) => {
      console.warn('Online sync error in Hub:', err);
      setLoading(false);
    });

    initialLoad = false;

    return () => {
      unsubCod();
      unsubOnline();
    };
  }, [stationAuth]);

  // Combine and format active orders
  const allOrders = useMemo(() => {
    return [...codOrders, ...onlineOrders].map((o) => {
      const corridorId = o.assignedCorridor || detectDeliveryZone(o.shipping);
      const meta = CORRIDOR_METADATA[corridorId] || CORRIDOR_METADATA.central_town;
      return {
        ...o,
        corridorId,
        corridorMeta: meta,
      };
    });
  }, [codOrders, onlineOrders]);

  // Filtered orders for queue
  const filteredOrders = useMemo(() => {
    return allOrders.filter((o) => {
      const st = String(o.orderStatus || 'placed').toLowerCase();

      // Tab Filtering
      if (activeTab === 'pending') {
        if (!['placed', 'confirmed', ''].includes(st)) return false;
      } else if (activeTab === 'packed') {
        if (st !== 'packed') return false;
      } else if (activeTab === 'in_transit') {
        if (!['shipped', 'out_for_delivery'].includes(st)) return false;
      }

      // Corridor Filtering
      if (selectedCorridor !== 'all' && o.corridorId !== selectedCorridor) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const idMatch = String(o.orderId || o.id || '').toLowerCase().includes(q);
        const nameMatch = String(o.customer?.name || '').toLowerCase().includes(q);
        const phoneMatch = String(o.customer?.phone || '').includes(q);
        const itemMatch = (o.items || []).some((it) => String(it.name || '').toLowerCase().includes(q));
        if (!idMatch && !nameMatch && !phoneMatch && !itemMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const tA = a.createdAt?.seconds || 0;
      const tB = b.createdAt?.seconds || 0;
      return tB - tA;
    });
  }, [allOrders, activeTab, selectedCorridor, searchQuery]);

  // Item Checkbox Toggle
  const toggleItemCheck = (orderKey, idx) => {
    const key = `${orderKey}_${idx}`;
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Stage 2 Completion: Mark Packed & Quality Verified
  const handleMarkPackedAndVerified = async (order) => {
    setUpdatingId(order.id);
    try {
      const docRef = doc(db, 'orders', order.collectionType, 'records', order.id);
      await updateDoc(docRef, {
        orderStatus: 'packed',
        packedAt: new Date().toISOString(),
        history: arrayUnion({
          status: 'packed',
          timestamp: new Date().toISOString(),
          note: 'Packed & Quality Verified at MotoDC Central Warehouse (Karaikal Hub). Staged in ' + order.corridorMeta.name + ' rack.',
        }),
      });

      playChime();
      toast.success(`✅ Order #${order.orderId || order.id} Packed & Staged into ${order.corridorMeta.name}!`, {
        duration: 5000,
        icon: '📦',
      });
    } catch (err) {
      console.error('Mark packed error:', err);
      toast.error('Could not update status: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Station Lock Screen
  if (!stationAuth) {
    const shiftEnded = isShiftCompleted();
    return (
      <div className="hubStationLockScreen">
        <div className="hubStationLockCard">
          <div className="hubStationLogoRow">
            <Package size={34} color="#ff3157" />
            <div>
              <h2>Moto<span>DC</span> Hub Station</h2>
              <p>Warehouse Fulfillment & Quality Inspection Portal</p>
            </div>
          </div>

          {shiftEnded && (
            <div
              className="hubShiftEndedNotice"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '16px',
                color: '#fbbf24',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <Clock size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', color: '#fef08a' }}>
                  Operational Shift Completed (8:30 PM)
                </strong>
                <span style={{ fontSize: '11.5px', color: '#cbd5e1', fontWeight: 500 }}>
                  Daily warehouse packing shift has ended. Terminal automatically locked.
                </span>
              </div>
            </div>
          )}

          <div className="hubStationLockNotice">
            <ShieldCheck size={18} color="#22c55e" />
            <div>
              <strong>Dedicated Warehouse Staff Terminal</strong>
              <p>Zero admin financial access. Used exclusively for packing, box labeling, and parcel staging.</p>
            </div>
          </div>

          <form onSubmit={handlePinSubmit} className="hubStationPinForm">
            <label>
              <span>Enter 4-Digit Station PIN</span>
              <div className="hubPinInputWrap">
                <Key size={18} color="#94a3b8" />
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="• • • •"
                  autoFocus
                />
              </div>
            </label>

            {pinError && <div className="hubPinError">{pinError}</div>}

            <button type="submit" className="hubStationUnlockBtn">
              Unlock Packing Terminal <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active Terminal View
  return (
    <div className="hubStationContainer">
      {/* Top Header */}
      <header className="hubStationHeader">
        <div className="hubHeaderBrand">
          <Package size={26} color="#ff3157" />
          <div>
            <h1>Karaikal Hub <span>Fulfillment Station</span></h1>
            <p>Warehouse Packing • Quality Inspection • Parcel Staging Racks</p>
          </div>
        </div>

        <div className="hubHeaderActions">
          <div className="hubStationBadge">
            <span className="liveBlinker" />
            <span>Karaikal Central Warehouse (Active)</span>
          </div>
          {afterHoursOverride && (
            <span
              style={{
                fontSize: '11px',
                background: 'rgba(245, 158, 11, 0.18)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontWeight: 700,
              }}
            >
              After-Hours (8:30 PM+)
            </span>
          )}
          <button type="button" onClick={handleStationLock} className="hubLockBtn" title="Lock Station Terminal">
            <Lock size={15} /> Lock Station
          </button>
        </div>
      </header>

      {/* Pipeline 4-Stage Operational Banner */}
      <div className="hubPipelineBanner">
        <div className="hubPipelineStep step1 completed">
          <div className="stepNum">1</div>
          <div>
            <strong>Order Placed & Confirmed</strong>
            <small>Customer completed payment</small>
          </div>
        </div>
        <div className="pipelineDivider" />
        <div className="hubPipelineStep step2 current">
          <div className="stepNum">2</div>
          <div>
            <strong>Packed & Quality Verified</strong>
            <small>Staff pack, label & stage in bin (HERE)</small>
          </div>
        </div>
        <div className="pipelineDivider" />
        <div className="hubPipelineStep step3">
          <div className="stepNum">3</div>
          <div>
            <strong>In Transit (Corridor Dispatch)</strong>
            <small>Rider scans into bag & departs hub</small>
          </div>
        </div>
        <div className="pipelineDivider" />
        <div className="hubPipelineStep step4">
          <div className="stepNum">4</div>
          <div>
            <strong>Out for Delivery (Handover)</strong>
            <small>Doorstep 4-digit PIN verified</small>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="hubToolbar">
        {/* Status Tabs */}
        <div className="hubTabs">
          <button
            type="button"
            className={activeTab === 'pending' ? 'active' : ''}
            onClick={() => setActiveTab('pending')}
          >
            <Clock size={15} /> Awaiting Packing & Label ({allOrders.filter((o) => ['placed', 'confirmed', ''].includes(String(o.orderStatus || 'placed').toLowerCase())).length})
          </button>
          <button
            type="button"
            className={activeTab === 'packed' ? 'active' : ''}
            onClick={() => setActiveTab('packed')}
          >
            <CheckCircle2 size={15} /> Packed & Staged at Hub ({allOrders.filter((o) => String(o.orderStatus).toLowerCase() === 'packed').length})
          </button>
          <button
            type="button"
            className={activeTab === 'in_transit' ? 'active' : ''}
            onClick={() => setActiveTab('in_transit')}
          >
            <Truck size={15} /> In Transit / On Road ({allOrders.filter((o) => ['shipped', 'out_for_delivery'].includes(String(o.orderStatus).toLowerCase())).length})
          </button>
        </div>

        {/* Corridor Filter */}
        <div className="hubCorridorFilter">
          <label>Filter by Corridor:</label>
          <select value={selectedCorridor} onChange={(e) => setSelectedCorridor(e.target.value)}>
            <option value="all">All Corridors</option>
            {Object.values(CORRIDOR_METADATA).map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="hubSearchBox">
          <Search size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Scan / Search Order ID, Customer, Part..."
          />
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="hubEmptyState">
          <RefreshCw size={32} className="spin" />
          <p>Connecting to warehouse orders stream...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="hubEmptyState">
          <Package size={44} color="#64748b" />
          <h3>No Orders in this Queue</h3>
          <p>All matching parcels are packed or staged in corridor bins.</p>
        </div>
      ) : (
        <div className="hubOrdersGrid">
          {filteredOrders.map((o) => {
            const isPacked = ['packed', 'shipped', 'out_for_delivery', 'delivered'].includes(String(o.orderStatus).toLowerCase());
            const items = o.items || [];
            const allItemsTicked = items.length > 0 && items.every((_, idx) => Boolean(checkedItems[`${o.id}_${idx}`]));

            return (
              <div key={`${o.paymentMethod}-${o.id}`} className={`hubOrderCard ${isPacked ? 'orderPacked' : ''}`}>
                {/* Card Top */}
                <div className="hubCardHeader">
                  <div>
                    <span className="hubOrderId">#{o.orderId || o.id}</span>
                    <span className="hubOrderMethodBadge">{o.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online Paid'}</span>
                  </div>
                  <span
                    className="hubCorridorPill"
                    style={{
                      background: o.corridorMeta.bgLight,
                      color: o.corridorMeta.color,
                      border: `1px solid ${o.corridorMeta.color}40`,
                    }}
                  >
                    <MapPin size={12} /> {o.corridorMeta.code} • {o.corridorMeta.name}
                  </span>
                </div>

                {/* Customer & Address Details */}
                <div className="hubCustomerSection">
                  <div className="hubCustomerName">
                    <b>{o.customer?.name || 'Customer'}</b>
                    <span>📞 {o.customer?.phone || 'No phone'}</span>
                  </div>
                  <p className="hubAddressText">
                    📍 {o.shipping?.address || 'Doorstep Address'}, {o.shipping?.city || 'Karaikal'} - {o.shipping?.pincode || ''}
                  </p>
                </div>

                {/* Packaging Item Checklist */}
                <div className="hubItemsChecklist">
                  <div className="checklistTitle">
                    <span>📦 Parts to Box & Verify ({items.length} item{items.length > 1 ? 's' : ''}):</span>
                    {!isPacked && <small>Tick each item after physical verification</small>}
                  </div>
                  <div className="checklistList">
                    {items.map((it, idx) => {
                      const isChecked = Boolean(checkedItems[`${o.id}_${idx}`]) || isPacked;
                      return (
                        <div
                          key={idx}
                          className={`checklistItem ${isChecked ? 'itemChecked' : ''}`}
                          onClick={() => !isPacked && toggleItemCheck(o.id, idx)}
                        >
                          {isChecked ? (
                            <CheckSquare size={16} color="#22c55e" />
                          ) : (
                            <Square size={16} color="#94a3b8" />
                          )}
                          <span className="itemQty">x{it.qty || 1}</span>
                          <span className="itemName">{it.name || 'Automotive Spare Part'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Corridor Bin Instruction */}
                <div className="hubStagingRackHint">
                  <Truck size={14} color={o.corridorMeta.color} />
                  <span>
                    Stage in <b>{o.corridorMeta.name} Rack ({o.corridorMeta.code})</b> for driver collection.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="hubCardActions">
                  <button
                    type="button"
                    className="hubPrintLabelBtn"
                    onClick={() => setLabelOrder(o)}
                    title="Print 4x6 / A6 Thermal or A4 Shipping Label"
                  >
                    <Printer size={15} /> Print Shipping Label
                  </button>

                  {!isPacked ? (
                    <button
                      type="button"
                      className={`hubMarkPackedBtn ${allItemsTicked ? 'readyToVerify' : ''}`}
                      disabled={updatingId === o.id}
                      onClick={() => handleMarkPackedAndVerified(o)}
                    >
                      <CheckCircle2 size={16} />
                      {updatingId === o.id ? 'Verifying...' : 'Mark Packed & Quality Verified'}
                    </button>
                  ) : (
                    <div className="hubPackedStatusTag">
                      <CheckCircle2 size={14} /> Packed & Quality Verified
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shipping Label Modal */}
      {labelOrder && (
        <ShippingLabelModal
          order={labelOrder}
          onClose={() => setLabelOrder(null)}
          onMarkPacked={(o) => handleMarkPackedAndVerified(o)}
        />
      )}
    </div>
  );
}
