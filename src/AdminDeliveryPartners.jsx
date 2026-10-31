import React, { useState, useEffect } from 'react';
import {
  Truck,
  KeyRound,
  ShieldAlert,
  Send,
  MessageSquare,
  Copy,
  CheckCircle2,
  Clock,
  UserCheck,
  Plus,
  RefreshCw,
  Phone,
  User,
  X,
  ExternalLink,
  Trash2,
  Shuffle,
  Smartphone,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminDeliveryPartners() {
  const [requests, setRequests] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModalRequest, setActiveModalRequest] = useState(null);
  const [generatingOtp, setGeneratingOtp] = useState(false);
  const [generatedOtpData, setGeneratedOtpData] = useState(null);

  // Helper to generate MDC- followed by random 4 digits (e.g. MDC-4829)
  const generateRiderCode = () => `MDC-${Math.floor(1000 + Math.random() * 9000)}`;

  // New Partner Form
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartner, setNewPartner] = useState({
    username: generateRiderCode(),
    name: '',
    phone: '',
    pin: '',
  });
  const [savingPartner, setSavingPartner] = useState(false);

  const fetchResets = async () => {
    try {
      const res = await fetch('/api/delivery-auth?action=admin-list-resets');
      const data = await res.json();
      if (res.ok && data.requests) {
        setRequests(data.requests);
      }
    } catch (e) {
      console.warn('Error fetching reset requests:', e);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/delivery-auth?action=admin-list-partners');
      const data = await res.json();
      if (res.ok && data.partners) {
        setPartners(data.partners);
      }
    } catch (e) {
      console.warn('Error fetching partners:', e);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    await Promise.all([fetchResets(), fetchPartners()]);
    setLoading(false);
  };

  useEffect(() => {
    reloadAll();
    const interval = setInterval(() => {
      fetchResets();
    }, 10000); // Poll reset requests every 10s
    return () => clearInterval(interval);
  }, []);

  // Handle Admin OTP Generation
  const handleGenerateOtp = async (requestId) => {
    setGeneratingOtp(true);
    try {
      const res = await fetch('/api/delivery-auth?action=admin-generate-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate OTP');
      }

      setGeneratedOtpData(data);
      toast.success(`Generated 6-Digit OTP: ${data.otp}`);
      fetchResets();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error generating OTP');
    } finally {
      setGeneratingOtp(false);
    }
  };

  // Add New Partner (Admin only provides Name, Phone, and 6-digit PIN)
  const handleCreatePartner = async (e) => {
    e.preventDefault();
    const cleanUser = (newPartner.username || generateRiderCode()).trim().toUpperCase();
    const cleanName = newPartner.name.trim();
    const cleanPhone = newPartner.phone.trim();
    const cleanPin = newPartner.pin.trim();

    if (!cleanName) {
      toast.error('Please enter the delivery partner name');
      return;
    }

    if (!cleanPhone) {
      toast.error('Please enter the contact / mobile number');
      return;
    }

    if (!cleanPin || !/^\d{6}$/.test(cleanPin)) {
      toast.error('PIN must be exactly 6 numerical digits');
      return;
    }

    setSavingPartner(true);
    try {
      const res = await fetch('/api/delivery-auth?action=admin-save-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          name: cleanName,
          phone: cleanPhone,
          pin: cleanPin,
          active: true,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create delivery partner');
      }

      toast.success(`Registered driver ${cleanName} with code ${cleanUser}!`);
      setShowAddPartner(false);
      setNewPartner({ username: generateRiderCode(), name: '', phone: '', pin: '' });
      fetchPartners();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPartner(false);
    }
  };

  // Delete Delivery Partner
  const handleDeletePartner = async (partner) => {
    const confirmMsg = `Are you sure you want to permanently delete delivery partner "${partner.name}" (${partner.username})?\n\nThey will no longer be able to log in to the delivery partner app.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/delivery-auth?action=admin-delete-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: partner.username }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete partner');
      }

      toast.success(`Deleted partner ${partner.name} (${partner.username})`);
      fetchPartners();
      fetchResets();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error deleting delivery partner');
    }
  };

  // 1-Click WhatsApp Link (Method A)
  const getWhatsAppLink = (phone, otp) => {
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello! Your MotoDC Delivery Partner 6-digit security code is: ${otp}\n\nUse this one-time OTP to change your password / PIN. Valid for 15 minutes.`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  // 1-Click SMS Link (Method A)
  const getSmsLink = (phone, otp) => {
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `MotoDC Delivery Partner OTP: ${otp}. Valid for 15 minutes. Use this one-time code to change your 6-digit PIN.`
    );
    return `sms:${cleanPhone}?body=${text}`;
  };

  // Copy text to clipboard
  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending' || r.status === 'otp_generated');

  return (
    <div className="adminDeliveryPartners">
      {/* Header Controls */}
      <div className="partnersHeaderRow">
        <div>
          <h2>Delivery Partners & Rider Access Control</h2>
          <p>Manage unique alphanumeric rider codes (MDC-XXXX), 6-digit PINs, and approve OTP password reset requests.</p>
        </div>
        <div className="headerButtons">
          <button type="button" className="refreshBtn" onClick={reloadAll} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spinning' : ''} /> Refresh
          </button>
          <button
            type="button"
            className="addPartnerBtn"
            onClick={() => {
              setNewPartner({ username: generateRiderCode(), name: '', phone: '', pin: '' });
              setShowAddPartner(true);
            }}
          >
            <Plus size={15} /> Add Delivery Partner
          </button>
        </div>
      </div>

      {/* SECTION 1: PASSWORD & PIN RESET REQUESTS */}
      <div className="adminCardSection">
        <div className="sectionHeaderWithBadge">
          <div className="titleWithIcon">
            <KeyRound size={20} color="#ff3157" />
            <h3>Rider Password & Credentials Reset Requests</h3>
          </div>
          <span className={`statusPill ${pendingRequests.length > 0 ? 'badgeAlert' : 'badgeSuccess'}`}>
            {pendingRequests.length} Active Request{pendingRequests.length !== 1 ? 's' : ''}
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="emptyStateBox">
            <UserCheck size={36} color="#22c55e" />
            <p>No password reset requests pending. All rider credentials are in sync.</p>
          </div>
        ) : (
          <div className="requestsGrid">
            {requests.map((req) => {
              const isPending = req.status === 'pending';
              const isOtpSent = req.status === 'otp_generated';

              return (
                <div key={req.id} className={`requestCard ${isPending ? 'cardHighlight' : ''}`}>
                  <div className="requestCardTop">
                    <div className="riderBadge">
                      <Truck size={14} />
                      <strong>{req.username}</strong>
                    </div>
                    <span className={`tag ${isPending ? 'tagPending' : isOtpSent ? 'tagActive' : 'tagDone'}`}>
                      {isPending ? 'Pending OTP' : isOtpSent ? 'OTP Active' : 'Verified & Changed'}
                    </span>
                  </div>

                  <div className="riderDetailsRow">
                    <div>
                      <small>Driver Name</small>
                      <h4>{req.riderName || 'Rider'}</h4>
                    </div>
                    <div>
                      <small>Registered Mobile</small>
                      <p>{req.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <small>Requested At</small>
                      <p>{req.requestedAt ? new Date(req.requestedAt).toLocaleTimeString('en-IN') : 'Recent'}</p>
                    </div>
                  </div>

                  {req.otp && !req.used && (
                    <div className="activeOtpBanner">
                      <span>Generated 6-Digit OTP:</span>
                      <strong>{req.otp}</strong>
                      <small>(Valid for 15 min)</small>
                    </div>
                  )}

                  <div className="cardActions">
                    {/* BUTTON 1: REVIEW & GENERATE OTP */}
                    <button
                      type="button"
                      className="reviewBtn"
                      onClick={() => {
                        setActiveModalRequest(req);
                        setGeneratedOtpData(
                          req.otp
                            ? {
                                requestId: req.id,
                                otp: req.otp,
                                phone: req.phone,
                                riderName: req.riderName,
                                username: req.username,
                                smsMessage: `Your MotoDC Partner security code is: ${req.otp}. Valid for 15 minutes. Use this one-time OTP to change your 6-digit PIN.`,
                              }
                            : null
                        );
                      }}
                    >
                      <ShieldAlert size={14} />
                      {req.otp ? 'View / Resend 6-Digit OTP (Method A)' : 'Review & Generate OTP'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: DELIVERY PARTNERS ROSTER */}
      <div className="adminCardSection" style={{ marginTop: '24px' }}>
        <div className="sectionHeaderWithBadge">
          <div className="titleWithIcon">
            <Truck size={20} color="#3b82f6" />
            <h3>Authorized Delivery Partners Roster</h3>
          </div>
          <span className="countPill">{partners.length} Registered Drivers</span>
        </div>

        <div className="partnersTableWrap">
          <table className="partnersTable">
            <thead>
              <tr>
                <th>Partner Code (Username)</th>
                <th>Driver Name</th>
                <th>Phone Number</th>
                <th>6-Digit PIN</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.username || p.id}>
                  <td>
                    <span className="codePill">{p.username}</span>
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>{p.phone || '—'}</td>
                  <td>
                    <span className="maskedPin">••••••</span>
                    <button
                      type="button"
                      className="peekPinBtn"
                      onClick={() => toast(`Current PIN for ${p.username}: ${p.pin || '123456'}`, { icon: '🔑' })}
                    >
                      Peek
                    </button>
                  </td>
                  <td>
                    <span className={`statusTag ${p.active !== false ? 'active' : 'inactive'}`}>
                      {p.active !== false ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    <div className="tableActionGroup">
                      <button
                        type="button"
                        className="quickActionLink"
                        onClick={() => {
                          const newPin = prompt(`Enter new 6-digit PIN for ${p.username}:`);
                          if (newPin) {
                            if (!/^\d{6}$/.test(newPin.trim())) {
                              toast.error('PIN must be exactly 6 digits');
                              return;
                            }
                            fetch('/api/delivery-auth?action=admin-save-partner', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ username: p.username, pin: newPin.trim() }),
                            }).then(() => {
                              toast.success(`PIN updated for ${p.username}!`);
                              fetchPartners();
                            });
                          }
                        }}
                      >
                        Change PIN
                      </button>

                      {/* OPTION TO DELETE RIDER */}
                      <button
                        type="button"
                        className="deletePartnerBtn"
                        title={`Delete ${p.name} from roster`}
                        onClick={() => handleDeletePartner(p)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: REVIEW & GENERATE OTP (METHOD A) */}
      {activeModalRequest && (
        <div className="adminModalOverlay" onClick={() => setActiveModalRequest(null)}>
          <div className="adminModalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h3>Review & Generate One-Time OTP</h3>
                <small>Verification for Driver #{activeModalRequest.username}</small>
              </div>
              <button type="button" className="closeBtn" onClick={() => setActiveModalRequest(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modalBody">
              <div className="verifyRiderCard">
                <div className="infoLine">
                  <span>Rider Alphanumeric Code:</span>
                  <strong>{activeModalRequest.username}</strong>
                </div>
                <div className="infoLine">
                  <span>Driver Full Name:</span>
                  <strong>{activeModalRequest.riderName}</strong>
                </div>
                <div className="infoLine">
                  <span>Registered Mobile Number:</span>
                  <strong>{activeModalRequest.phone || 'N/A'}</strong>
                </div>
              </div>

              {/* BUTTON 2: AUTOMATED 6-DIGIT OTP GENERATOR */}
              {!generatedOtpData ? (
                <div className="generatePrompt">
                  <p>
                    Clicking the button below will generate an automated, unique 6-digit OTP code valid for 15 minutes.
                    You can then dispatch it immediately via <strong>Method A (1-Click WhatsApp or Mobile SMS)</strong>.
                  </p>
                  <button
                    type="button"
                    className="generateOtpMainBtn"
                    onClick={() => handleGenerateOtp(activeModalRequest.id)}
                    disabled={generatingOtp}
                  >
                    <KeyRound size={16} />
                    {generatingOtp ? 'Generating Secure OTP...' : 'Generate 6-Digit OTP for Rider'}
                  </button>
                </div>
              ) : (
                <div className="otpSuccessDisplay">
                  <div className="otpNumberBox">
                    <small>ONE-TIME 6-DIGIT SECURITY OTP</small>
                    <div className="bigDigits">{generatedOtpData.otp}</div>
                    <small className="expiryNotice">Expires in 15 minutes • One-time use only</small>
                  </div>

                  <div className="methodABanner">
                    <Smartphone size={16} color="#22c55e" />
                    <strong>METHOD A: 1-CLICK DISPATCH TO DRIVER'S MOBILE</strong>
                  </div>

                  <div className="dispatchOptions">
                    {/* Method A: 1-Click WhatsApp */}
                    <a
                      href={getWhatsAppLink(generatedOtpData.phone, generatedOtpData.otp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dispatchOptionBtn whatsappBtn"
                    >
                      <MessageSquare size={16} /> Send via WhatsApp to {generatedOtpData.phone} (1-Click)
                    </a>

                    {/* Method A: 1-Click Native SMS */}
                    <a
                      href={getSmsLink(generatedOtpData.phone, generatedOtpData.otp)}
                      className="dispatchOptionBtn smsBtn"
                    >
                      <Phone size={16} /> Send via Mobile SMS to {generatedOtpData.phone} (1-Click)
                    </a>

                    {/* Copy text fallback */}
                    <button
                      type="button"
                      className="dispatchOptionBtn copyBtn"
                      onClick={() => handleCopy(generatedOtpData.smsMessage, 'SMS Message')}
                    >
                      <Copy size={16} /> Copy Message & OTP to Clipboard
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modalFooter">
              <button type="button" className="cancelModalBtn" onClick={() => setActiveModalRequest(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW DELIVERY PARTNER (ADMIN GIVES NAME, CONTACT NUMBER & PIN ALONE) */}
      {showAddPartner && (
        <div className="adminModalOverlay" onClick={() => setShowAddPartner(false)}>
          <div className="adminModalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h3>Register New Delivery Partner</h3>
                <small>Auto-generated code: first 3 letters "MDC-" + random 4 digits</small>
              </div>
              <button type="button" className="closeBtn" onClick={() => setShowAddPartner(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePartner}>
              <div className="modalBody">
                {/* AUTO-GENERATED MDC-XXXX CODE BADGE */}
                <div className="autoCodeBox">
                  <div className="autoCodeLabel">
                    <Truck size={14} color="#38bdf8" />
                    <span>Auto-Generated Alphanumeric Code:</span>
                  </div>
                  <div className="autoCodeValueRow">
                    <span className="bigCodeBadge">{newPartner.username}</span>
                    <button
                      type="button"
                      className="rerollBtn"
                      title="Roll another random 4-digit number"
                      onClick={() => setNewPartner({ ...newPartner, username: generateRiderCode() })}
                    >
                      <Shuffle size={13} /> Re-roll
                    </button>
                  </div>
                  <small>The delivery person will use this unique code as their username.</small>
                </div>

                <div className="modalField">
                  <label>1. Full Driver Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                    autoFocus
                    required
                  />
                </div>

                <div className="modalField">
                  <label>2. Contact / Mobile Number *</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                    required
                  />
                  <small>Used for OTP verification and WhatsApp/SMS delivery communication.</small>
                </div>

                <div className="modalField">
                  <label>3. 6-Digit Password PIN *</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="6 digits (e.g. 583921)"
                    value={newPartner.pin}
                    onChange={(e) => setNewPartner({ ...newPartner, pin: e.target.value.replace(/\D/g, '') })}
                    required
                  />
                  <small>Must be exactly 6 numerical digits.</small>
                </div>
              </div>

              <div className="modalFooter">
                <button type="button" className="cancelModalBtn" onClick={() => setShowAddPartner(false)}>
                  Cancel
                </button>
                <button type="submit" className="savePartnerSubmitBtn" disabled={savingPartner}>
                  {savingPartner ? 'Registering...' : 'Register Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
