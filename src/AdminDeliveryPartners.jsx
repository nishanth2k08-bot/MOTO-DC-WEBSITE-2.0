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
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminDeliveryPartners() {
  const [requests, setRequests] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModalRequest, setActiveModalRequest] = useState(null);
  const [generatingOtp, setGeneratingOtp] = useState(false);
  const [generatedOtpData, setGeneratedOtpData] = useState(null);

  // New Partner Form
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartner, setNewPartner] = useState({
    username: '',
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

  // Add New Partner
  const handleCreatePartner = async (e) => {
    e.preventDefault();
    const cleanUser = newPartner.username.trim().toUpperCase();
    const cleanPin = newPartner.pin.trim();

    if (!cleanUser || !/^[A-Z0-9_-]{3,16}$/.test(cleanUser)) {
      toast.error('Username must be an alphanumeric code (e.g. MDC-R04)');
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
          name: newPartner.name.trim(),
          phone: newPartner.phone.trim(),
          pin: cleanPin,
          active: true,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create delivery partner');
      }

      toast.success(`Delivery partner ${cleanUser} registered!`);
      setShowAddPartner(false);
      setNewPartner({ username: '', name: '', phone: '', pin: '' });
      fetchPartners();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPartner(false);
    }
  };

  // 1-Click WhatsApp Link
  const getWhatsAppLink = (phone, otp) => {
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello! Your MotoDC Delivery Partner 6-digit security code is: ${otp}\n\nUse this one-time OTP to change your password / PIN. Valid for 15 minutes.`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  // 1-Click SMS Link
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
          <p>Manage unique alphanumeric rider codes, 6-digit PINs, and approve OTP password reset requests.</p>
        </div>
        <div className="headerButtons">
          <button type="button" className="refreshBtn" onClick={reloadAll} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spinning' : ''} /> Refresh
          </button>
          <button
            type="button"
            className="addPartnerBtn"
            onClick={() => setShowAddPartner(true)}
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
              const isVerified = req.status === 'verified' || req.status === 'completed';

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
                      {req.otp ? 'View / Resend 6-Digit OTP' : 'Review & Generate OTP'}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: REVIEW & GENERATE OTP */}
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
                    The rider will enter this OTP in the app to proceed to the "Change Password" page.
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

                  <h4>Ways to Dispatch OTP to Driver's Mobile:</h4>

                  <div className="dispatchOptions">
                    {/* Option A: 1-Click WhatsApp */}
                    <a
                      href={getWhatsAppLink(generatedOtpData.phone, generatedOtpData.otp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dispatchOptionBtn whatsappBtn"
                    >
                      <MessageSquare size={16} /> Send via WhatsApp (1-Click)
                    </a>

                    {/* Option B: 1-Click Native SMS */}
                    <a
                      href={getSmsLink(generatedOtpData.phone, generatedOtpData.otp)}
                      className="dispatchOptionBtn smsBtn"
                    >
                      <Phone size={16} /> Send via Mobile SMS (1-Click)
                    </a>

                    {/* Option C: Copy text */}
                    <button
                      type="button"
                      className="dispatchOptionBtn copyBtn"
                      onClick={() => handleCopy(generatedOtpData.smsMessage, 'SMS Message')}
                    >
                      <Copy size={16} /> Copy Message to Clipboard
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

      {/* MODAL: ADD NEW DELIVERY PARTNER */}
      {showAddPartner && (
        <div className="adminModalOverlay" onClick={() => setShowAddPartner(false)}>
          <div className="adminModalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h3>Register New Delivery Partner</h3>
                <small>Issue unique alphanumeric username and 6-digit security PIN</small>
              </div>
              <button type="button" className="closeBtn" onClick={() => setShowAddPartner(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePartner}>
              <div className="modalBody">
                <div className="modalField">
                  <label>Unique Alphanumeric Code (Username) *</label>
                  <input
                    type="text"
                    placeholder="e.g. MDC-R04 or MDC-EAST-1"
                    value={newPartner.username}
                    onChange={(e) => setNewPartner({ ...newPartner, username: e.target.value.toUpperCase() })}
                    required
                  />
                  <small>The delivery person will use this exact code to log in.</small>
                </div>

                <div className="modalField">
                  <label>Full Driver Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Amit Verma"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                    required
                  />
                </div>

                <div className="modalField">
                  <label>Mobile Number (For OTP dispatch) *</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="modalField">
                  <label>Initial 6-Digit Password PIN *</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="6 digits (e.g. 583921)"
                    value={newPartner.pin}
                    onChange={(e) => setNewPartner({ ...newPartner, pin: e.target.value })}
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
