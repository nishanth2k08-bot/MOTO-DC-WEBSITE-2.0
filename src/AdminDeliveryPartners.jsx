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
  FileText,
  Check,
  Eye,
  AlertTriangle,
  FileCheck,
  AlertCircle,
  Car,
  Sparkles,
  Bot,
  Zap,
  MapPin,
  Layers,
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminDeliveryPartners() {
  const [requests, setRequests] = useState([]);
  const [partners, setPartners] = useState([]);
  const [kycList, setKycList] = useState([]);
  const [kycFilter, setKycFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [viewingProofModal, setViewingProofModal] = useState(null); // { title, url, extracted }
  const [processingKycId, setProcessingKycId] = useState(null);
  const [runningAiCheckId, setRunningAiCheckId] = useState(null);
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
    serviceMode: 'Standard',
    pin: '',
  });
  const [savingPartner, setSavingPartner] = useState(false);

  // Solution A: Cluster Manifests & Route Corridor Dispatch State
  const [corridors, setCorridors] = useState([]);
  const [corridorSummary, setCorridorSummary] = useState({
    totalActiveOrders: 0,
    totalDispatchedOrders: 0,
    totalPayout: 0,
    stagedCorridorsCount: 0,
    dispatchedCorridorsCount: 0,
  });
  const [corridorsLoading, setCorridorsLoading] = useState(false);
  const [selectedRidersForCorridor, setSelectedRidersForCorridor] = useState({});
  const [expandedCorridors, setExpandedCorridors] = useState({});
  const [dispatchingCorridorId, setDispatchingCorridorId] = useState(null);
  const [autoDispatching, setAutoDispatching] = useState(false);

  const fetchCorridors = async () => {
    setCorridorsLoading(true);
    try {
      const res = await fetch('/api/delivery-partner?action=cluster-manifests');
      const data = await res.json();
      if (res.ok && Array.isArray(data.corridors)) {
        setCorridors(data.corridors);
        if (data.summary) setCorridorSummary(data.summary);
      }
    } catch (e) {
      console.warn('Error fetching corridor manifests:', e);
    } finally {
      setCorridorsLoading(false);
    }
  };

  const handleAssignCorridor = async (corridorId) => {
    const selectedRiderId = selectedRidersForCorridor[corridorId];
    if (!selectedRiderId) {
      toast.error('Please select an active delivery partner from the dropdown.');
      return;
    }
    const matchedPartner = partners.find(
      (p) => String(p.username || p.id).toUpperCase() === String(selectedRiderId).toUpperCase()
    );
    const riderName = matchedPartner?.name || 'MotoDC Partner';
    const riderPhone = matchedPartner?.phone || '';

    setDispatchingCorridorId(corridorId);
    try {
      const res = await fetch('/api/delivery-partner?action=assign-corridor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corridorId,
          riderId: selectedRiderId,
          riderName,
          riderPhone,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(
          `Dispatched ${data.corridorName} to ${data.riderName} (${data.riderId})! ${data.assignedStops} stops assigned.`
        );
        fetchCorridors();
      } else {
        toast.error(data.error || 'Failed to dispatch corridor.');
      }
    } catch (e) {
      toast.error(e.message || 'Error dispatching corridor.');
    } finally {
      setDispatchingCorridorId(null);
    }
  };

  const handleUnassignCorridor = async (corridorId, corridorName) => {
    if (!window.confirm(`Recall ${corridorName} back to Staging Pool? Orders will be unassigned from driver.`)) {
      return;
    }
    setDispatchingCorridorId(corridorId);
    try {
      const res = await fetch('/api/delivery-partner?action=unassign-corridor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corridorId }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(`Recalled ${data.corridorName} back to staging pool.`);
        fetchCorridors();
      } else {
        toast.error(data.error || 'Failed to recall corridor.');
      }
    } catch (e) {
      toast.error(e.message || 'Error recalling corridor.');
    } finally {
      setDispatchingCorridorId(null);
    }
  };

  const handleAutoDispatchAll = async () => {
    setAutoDispatching(true);
    try {
      const res = await fetch('/api/delivery-partner?action=auto-dispatch-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.dispatchedCount > 0) {
          toast.success(
            `⚡ Smart Auto-Dispatch Complete! Assigned ${data.dispatchedCount} corridor(s) to active riders.`
          );
        } else {
          toast(data.message || 'All corridors are already dispatched.');
        }
        fetchCorridors();
      } else {
        toast.error(data.error || 'Auto-dispatch failed.');
      }
    } catch (e) {
      toast.error(e.message || 'Error running auto-dispatch.');
    } finally {
      setAutoDispatching(false);
    }
  };

  const toggleExpandCorridor = (corridorId) => {
    setExpandedCorridors((prev) => ({
      ...prev,
      [corridorId]: !prev[corridorId],
    }));
  };

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

  const fetchKycList = async () => {
    try {
      const res = await fetch('/api/delivery-auth?action=admin-list-kyc');
      const data = await res.json();
      if (res.ok && data.applications) {
        setKycList(data.applications);
      }
    } catch (e) {
      console.warn('Error fetching KYC applications:', e);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    await Promise.all([fetchResets(), fetchPartners(), fetchKycList(), fetchCorridors()]);
    setLoading(false);
  };

  useEffect(() => {
    reloadAll();
    const interval = setInterval(() => {
      fetchResets();
      fetchKycList();
      fetchCorridors();
      fetchPartners();
    }, 10000); // Poll reset requests, KYC, & corridor manifests every 10s
    return () => clearInterval(interval);
  }, []);

  // Handle Admin Approve KYC
  const handleApproveKyc = async (app) => {
    const suggestedCode = generateRiderCode();
    const userCode = prompt(
      `Approve delivery partner "${app.name}"?\n\nEnter Partner Code to assign:`,
      suggestedCode
    );
    if (userCode === null) return;
    const cleanCode = (userCode.trim() || suggestedCode).toUpperCase();

    const pinPrompt = prompt(
      `Set initial 6-digit PIN for ${cleanCode} (${app.name}):`,
      '123456'
    );
    if (pinPrompt === null) return;
    if (!/^\d{6}$/.test(pinPrompt.trim())) {
      toast.error('PIN must be exactly 6 digits');
      return;
    }

    setProcessingKycId(app.id);
    try {
      const res = await fetch('/api/delivery-auth?action=admin-approve-kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: app.id,
          customUsername: cleanCode,
          customPin: pinPrompt.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      toast.success(`Rider ${app.name} approved! Assigned Code: ${cleanCode}`);
      await Promise.all([fetchKycList(), fetchPartners()]);
    } catch (err) {
      toast.error(err.message || 'Error approving KYC');
    } finally {
      setProcessingKycId(null);
    }
  };

  // Handle Admin Decline / Reject KYC
  const handleRejectKyc = async (app) => {
    const reason = prompt(
      `Reason for declining "${app.name}" KYC:\n(e.g., Blurry driving license photo, Expired vehicle insurance)`,
      'Driving license proof is unclear. Please re-upload a clear photo.'
    );
    if (reason === null) return;

    setProcessingKycId(app.id);
    try {
      const res = await fetch('/api/delivery-auth?action=admin-reject-kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: app.id,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');

      toast.success(`KYC application for ${app.name} declined`);
      fetchKycList();
    } catch (err) {
      toast.error(err.message || 'Error declining KYC');
    } finally {
      setProcessingKycId(null);
    }
  };

  // Handle Admin Delete KYC
  const handleDeleteKyc = async (appId) => {
    if (!window.confirm('Are you sure you want to permanently delete this KYC application?')) return;
    try {
      await fetch('/api/delivery-auth?action=admin-delete-kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId }),
      });
      toast.success('KYC application deleted');
      fetchKycList();
    } catch (e) {
      toast.error('Error deleting application');
    }
  };

  // Handle Admin Run Gemini AI Pre-Check (Phase 2)
  const handleRunAiCheck = async (appId) => {
    setRunningAiCheckId(appId);
    try {
      const res = await fetch('/api/delivery-auth?action=admin-run-ai-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run AI check');

      const verdict = data.aiCheck?.verdict;
      const score = data.aiCheck?.score;
      if (verdict === 'RECOMMENDED_APPROVE') {
        toast.success(`Gemini AI: Recommended to Approve (${score}/100)`);
      } else if (verdict === 'SUSPICIOUS_OR_BLURRY') {
        toast.error(`Gemini AI Warning: Blurry or Mismatched (${score}/100)`);
      } else {
        toast(`Gemini AI: Needs Manual Review (${score}/100)`, { icon: '🔍' });
      }
      fetchKycList();
    } catch (err) {
      toast.error(err.message || 'Error running AI check');
    } finally {
      setRunningAiCheckId(null);
    }
  };

  // 1-Click WhatsApp Onboarding Welcome Link
  const getApprovalWhatsAppLink = (phone, name, code, pin) => {
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello ${name}! 🎉\n\nCongratulations, your MotoDC Delivery Partner KYC has been APPROVED!\n\nYour Partner Code: ${code}\nInitial 6-digit PIN: ${pin || '123456'}\n\nYou can now download the partner app at:\nhttps://motodc-official.vercel.app/partner\n\nWelcome to MotoDC Fleet!`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  // 1-Click WhatsApp Rejection Feedback Link
  const getRejectionWhatsAppLink = (phone, name, reason) => {
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello ${name},\n\nYour MotoDC Delivery Partner KYC application requires attention:\nReason: ${reason}\n\nPlease visit https://motodc-official.vercel.app/partner to re-upload clear proofs.`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

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
          serviceMode: newPartner.serviceMode || 'Standard',
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
      setNewPartner({ username: generateRiderCode(), name: '', phone: '', serviceMode: 'Standard', pin: '' });
      fetchPartners();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPartner(false);
    }
  };

  // Reset Strikes & Unlock Shift Check-in
  const handleResetStrikes = async (username) => {
    try {
      const res = await fetch('/api/delivery-auth?action=admin-reset-strikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset strikes');
      toast.success(data.message || `Strikes reset for ${username}`);
      fetchPartners();
    } catch (e) {
      toast.error(e.message || 'Error resetting strikes');
    }
  };

  // Process Rider Emergency Login Request (Approve / Reject)
  const handleProcessEmergencyLogin = async (partner, decision) => {
    try {
      const res = await fetch('/api/delivery-auth?action=admin-process-emergency-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId: partner.username || partner.id, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process request');
      toast.success(data.message || `Request ${decision}d!`);
      fetchPartners();
    } catch (e) {
      toast.error(e.message || 'Error processing request');
    }
  };

  // Grant or Revoke 1-Time Emergency Pass manually
  const handleToggleOneTimePass = async (partner) => {
    const isGranted = Boolean(partner.oneTimePassGranted && !partner.oneTimePassConsumed);
    const grant = !isGranted;
    try {
      const res = await fetch('/api/delivery-auth?action=admin-toggle-onetime-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId: partner.username || partner.id, grant }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update 1-time pass');
      toast.success(data.message || (grant ? '1-Time Pass Granted' : '1-Time Pass Revoked'));
      fetchPartners();
    } catch (e) {
      toast.error(e.message || 'Error updating pass');
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

  // Copy text to clipboard
  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Delete or Dismiss Reset Request
  const handleDeleteReset = async (requestId) => {
    try {
      await fetch('/api/delivery-auth?action=admin-delete-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      toast.success('Reset request cleared');
      fetchResets();
    } catch (e) {
      console.warn('Error deleting reset request:', e);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending' || r.status === 'otp_generated');
  const pendingKyc = kycList.filter((k) => k.status === 'pending');
  const approvedKyc = kycList.filter((k) => k.status === 'approved');
  const rejectedKyc = kycList.filter((k) => k.status === 'rejected');

  const filteredKycList = kycList.filter((k) => {
    if (kycFilter === 'pending') return k.status === 'pending';
    if (kycFilter === 'approved') return k.status === 'approved';
    if (kycFilter === 'rejected') return k.status === 'rejected';
    return true; // 'all'
  });

  return (
    <div className="adminDeliveryPartners">
      {/* Header Controls */}
      <div className="partnersHeaderRow">
        <div>
          <h2>Delivery Partners & Rider Access Control</h2>
          <p>Verify rider KYC proofs, approve onboarding applications, and manage MDC-XXXX login PINs.</p>
        </div>
        <div className="headerButtons">
          <button type="button" className="refreshBtn" onClick={reloadAll} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spinning' : ''} /> Refresh
          </button>
          <button
            type="button"
            className="addPartnerBtn"
            onClick={() => {
              setNewPartner({ username: generateRiderCode(), name: '', phone: '', serviceMode: 'Standard', pin: '' });
              setShowAddPartner(true);
            }}
          >
            <Plus size={15} /> Add Delivery Partner
          </button>
        </div>
      </div>

      {/* =======================================================================
          SECTION 1: NEW RIDER KYC ONBOARDING & PROOF VERIFICATION
          ======================================================================= */}
      <div className="adminCardSection kycSectionWrap">
        <div className="sectionHeaderWithBadge">
          <div className="titleWithIcon">
            <FileText size={20} color="#38bdf8" />
            <div>
              <h3>New Rider KYC Verification Requests</h3>
              <p className="sectionSubDesc">Inspect Driving License and RC proofs to accept or decline delivery partner applicants.</p>
            </div>
          </div>
          <span className={`statusPill ${pendingKyc.length > 0 ? 'badgeAlert' : 'badgeSuccess'}`}>
            {pendingKyc.length} Pending Review
          </span>
        </div>

        {/* KYC Filter Tabs */}
        <div className="kycFilterBar">
          <button 
            type="button" 
            className={`kycFilterBtn ${kycFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setKycFilter('pending')}
          >
            Pending Review ({pendingKyc.length})
          </button>
          <button 
            type="button" 
            className={`kycFilterBtn ${kycFilter === 'approved' ? 'active' : ''}`}
            onClick={() => setKycFilter('approved')}
          >
            Approved ({approvedKyc.length})
          </button>
          <button 
            type="button" 
            className={`kycFilterBtn ${kycFilter === 'rejected' ? 'active' : ''}`}
            onClick={() => setKycFilter('rejected')}
          >
            Declined ({rejectedKyc.length})
          </button>
          <button 
            type="button" 
            className={`kycFilterBtn ${kycFilter === 'all' ? 'active' : ''}`}
            onClick={() => setKycFilter('all')}
          >
            All Submissions ({kycList.length})
          </button>
        </div>

        {filteredKycList.length === 0 ? (
          <div className="emptyStateBox">
            <CheckCircle2 size={36} color="#22c55e" />
            <p>
              {kycFilter === 'pending'
                ? 'No pending KYC applications. All rider proofs are verified.'
                : `No applications found in "${kycFilter}" status.`}
            </p>
          </div>
        ) : (
          <div className="kycCardsGrid">
            {filteredKycList.map((app) => {
              const isPending = app.status === 'pending';
              const isApproved = app.status === 'approved';
              const isRejected = app.status === 'rejected';

              return (
                <div key={app.id} className={`kycCard ${isPending ? 'cardHighlight' : ''}`}>
                  <div className="kycCardTop">
                    <div className="kycRefTag">
                      <strong>{app.id}</strong>
                      <small>{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}</small>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`tag ${isPending ? 'tagPending' : isApproved ? 'tagDone' : 'tagAlert'}`}>
                        {isPending ? 'Pending Review' : isApproved ? `Approved (${app.partnerCode || 'Active'})` : 'Declined'}
                      </span>
                      <button
                        type="button"
                        className="dismissResetBtn"
                        title="Delete application"
                        onClick={() => handleDeleteKyc(app.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="kycApplicantInfo">
                    <div className="kycNameRow">
                      <User size={16} className="highlightIcon" />
                      <h4>{app.name}</h4>
                    </div>

                    <div className="kycDetailsGrid">
                      <div>
                        <small>Mobile Phone</small>
                        <p>{app.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <small>Email Address</small>
                        <p className="emailText">{app.email || 'N/A'}</p>
                      </div>
                      <div>
                        <small>Vehicle Type & No.</small>
                        <p>{app.vehicleType || 'Bike'} • <strong>{app.vehicleNumber || 'N/A'}</strong></p>
                      </div>
                      <div>
                        <small>Driving License No.</small>
                        <p><strong>{app.licenseNumber || 'Provided in Photo'}</strong></p>
                      </div>
                      <div>
                        <small>Mode of Service</small>
                        <p>
                          <span className={`serviceModeBadge ${String(app.serviceMode || 'Standard').toLowerCase().replace(/\s+/g, '-')}`}>
                            {app.serviceMode || 'Standard'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Document Proof Previews */}
                  <div className="kycProofsContainer">
                    <div className="proofBox">
                      <small>Driving License Proof</small>
                      {app.dlPhoto ? (
                        <div 
                          className="proofImgWrap"
                          onClick={() => setViewingProofModal({ 
                            title: `${app.name} - Driving License`, 
                            url: app.dlPhoto,
                            extracted: app.aiCheck?.dl ? `DL Extracted Name: ${app.aiCheck.dl.extractedName || 'N/A'} • DL Number: ${app.aiCheck.dl.extractedNumber || 'N/A'}` : null
                          })}
                        >
                          <img src={app.dlPhoto} alt="Driving License" />
                          <span className="viewProofOverlay"><Eye size={14} /> View Large</span>
                        </div>
                      ) : (
                        <div className="noProofUploaded">No DL Image</div>
                      )}
                    </div>

                    <div className="proofBox">
                      <small>Vehicle RC Proof</small>
                      {app.rcPhoto ? (
                        <div 
                          className="proofImgWrap"
                          onClick={() => setViewingProofModal({ 
                            title: `${app.name} - Vehicle RC`, 
                            url: app.rcPhoto,
                            extracted: app.aiCheck?.rc ? `RC Extracted Number: ${app.aiCheck.rc.extractedNumber || 'N/A'} • Owner: ${app.aiCheck.rc.extractedOwner || 'N/A'}` : null
                          })}
                        >
                          <img src={app.rcPhoto} alt="Vehicle RC" />
                          <span className="viewProofOverlay"><Eye size={14} /> View Large</span>
                        </div>
                      ) : (
                        <div className="noProofUploaded">No RC Image</div>
                      )}
                    </div>
                  </div>

                  {/* Phase 2: Gemini 1.5 Flash Vision AI Pre-Check */}
                  {app.aiCheck && app.aiCheck.status === 'completed' ? (
                    <div className={`kycAiBanner ${
                      app.aiCheck.verdict === 'RECOMMENDED_APPROVE'
                        ? 'aiRecommended'
                        : app.aiCheck.verdict === 'SUSPICIOUS_OR_BLURRY'
                        ? 'aiSuspicious'
                        : 'aiReview'
                    }`}>
                      <div className="kycAiHeader">
                        <div className="kycAiScoreBadge">
                          <Bot size={15} />
                          <span>Gemini AI: <strong>{app.aiCheck.score}/100</strong></span>
                        </div>
                        <span className="kycAiVerdictTag">
                          {app.aiCheck.verdict === 'RECOMMENDED_APPROVE' && '✓ Recommended to Approve'}
                          {app.aiCheck.verdict === 'NEEDS_MANUAL_REVIEW' && '⚠️ Needs Manual Review'}
                          {app.aiCheck.verdict === 'SUSPICIOUS_OR_BLURRY' && '🚨 Blurry / Mismatch'}
                        </span>
                      </div>

                      <p className="kycAiSummaryText">{app.aiCheck.summary}</p>

                      <div className="kycAiTagsRow">
                        {app.aiCheck.dl && (
                          <span className={`kycAiMiniTag ${app.aiCheck.dl.nameMatch ? 'tagPass' : 'tagWarn'}`}>
                            DL: {app.aiCheck.dl.extractedName || 'Detected'}
                            {app.aiCheck.dl.nameMatch ? ' ✓' : ''}
                          </span>
                        )}
                        {app.aiCheck.rc && (
                          <span className={`kycAiMiniTag ${app.aiCheck.rc.numberMatch ? 'tagPass' : 'tagNeutral'}`}>
                            RC: {app.aiCheck.rc.extractedNumber || 'Detected'}
                            {app.aiCheck.rc.numberMatch ? ' ✓' : ''}
                          </span>
                        )}
                        <span className="kycAiMiniTag tagNeutral">Photo: {app.aiCheck.quality || 'checked'}</span>

                        {!isApproved && (
                          <button
                            type="button"
                            className="kycReCheckAiBtn"
                            title="Re-run Gemini AI Analysis"
                            disabled={runningAiCheckId === app.id}
                            onClick={() => handleRunAiCheck(app.id)}
                          >
                            <RefreshCw size={11} className={runningAiCheckId === app.id ? 'spin' : ''} />
                            {runningAiCheckId === app.id ? 'Scanning...' : 'Re-scan AI'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : !isApproved ? (
                    <div className="kycAiNotRunBanner">
                      <div className="kycAiPromptText">
                        <Sparkles size={14} color="#60a5fa" />
                        <span>AI Pre-Check: {app.aiCheck?.summary || 'Not yet analyzed'}</span>
                      </div>
                      <button
                        type="button"
                        className="runAiBtn"
                        disabled={runningAiCheckId === app.id}
                        onClick={() => handleRunAiCheck(app.id)}
                      >
                        <Zap size={13} /> {runningAiCheckId === app.id ? 'Scanning with Gemini AI...' : 'Scan Proofs with Gemini AI'}
                      </button>
                    </div>
                  ) : null}

                  {isRejected && app.rejectionReason && (
                    <div className="kycRejectionNotice">
                      <AlertTriangle size={14} />
                      <span>Reason: {app.rejectionReason}</span>
                    </div>
                  )}

                  {/* Card Action Buttons */}
                  <div className="kycCardActions">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          className="kycApproveBtn"
                          disabled={processingKycId === app.id}
                          onClick={() => handleApproveKyc(app)}
                        >
                          <Check size={14} /> {processingKycId === app.id ? 'Approving...' : 'Approve & Onboard'}
                        </button>
                        <button
                          type="button"
                          className="kycDeclineBtn"
                          disabled={processingKycId === app.id}
                          onClick={() => handleRejectKyc(app)}
                        >
                          <X size={14} /> Decline
                        </button>
                        <a
                          href={`https://wa.me/${String(app.phone).replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="kycWhatsappBtn"
                          title="Chat on WhatsApp"
                        >
                          <MessageSquare size={14} />
                        </a>
                      </>
                    ) : isApproved ? (
                      <div className="approvedCardActions">
                        <span className="assignedCodeBadge">
                          <CheckCircle2 size={14} /> Partner Code: <strong>{app.partnerCode}</strong>
                        </span>
                        <a
                          href={getApprovalWhatsAppLink(app.phone, app.name, app.partnerCode, '123456')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sendWelcomeWhatsappBtn"
                        >
                          <MessageSquare size={13} /> Send Welcome WhatsApp
                        </a>
                      </div>
                    ) : (
                      <div className="rejectedCardActions">
                        <button
                          type="button"
                          className="reApproveBtn"
                          onClick={() => handleApproveKyc(app)}
                        >
                          Re-Review & Approve
                        </button>
                        <a
                          href={getRejectionWhatsAppLink(app.phone, app.name, app.rejectionReason || 'Proofs invalid')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="kycWhatsappBtn"
                        >
                          <MessageSquare size={13} /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =======================================================================
          SECTION 2: PASSWORD & PIN RESET REQUESTS
          ======================================================================= */}
      <div className="adminCardSection" style={{ marginTop: '24px' }}>
        <div className="sectionHeaderWithBadge">
          <div className="titleWithIcon">
            <KeyRound size={20} color="#ff3157" />
            <h3>Rider Password & Credentials Reset Requests</h3>
          </div>
          <span className={`statusPill ${pendingRequests.length > 0 ? 'badgeAlert' : 'badgeSuccess'}`}>
            {pendingRequests.length} Active Request{pendingRequests.length !== 1 ? 's' : ''}
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="emptyStateBox">
            <UserCheck size={36} color="#22c55e" />
            <p>No password reset requests pending. All rider credentials are in sync.</p>
          </div>
        ) : (
          <div className="requestsGrid">
            {pendingRequests.map((req) => {
              const isPending = req.status === 'pending';
              const isOtpSent = req.status === 'otp_generated';

              return (
                <div key={req.id} className={`requestCard ${isPending ? 'cardHighlight' : ''}`}>
                  <div className="requestCardTop">
                    <div className="riderBadge">
                      <Truck size={14} />
                      <strong>{req.username}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`tag ${isPending ? 'tagPending' : isOtpSent ? 'tagActive' : 'tagDone'}`}>
                        {isPending ? 'Pending OTP' : isOtpSent ? 'OTP Active' : 'Verified & Changed'}
                      </span>
                      <button
                        type="button"
                        className="dismissResetBtn"
                        title="Dismiss and delete request"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReset(req.id);
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
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

      {/* =======================================================================
          SECTION 2.5: HUB ROUTE DISPATCH & CLUSTER MANIFESTS (AMAZON LOGISTICS MODEL)
          ======================================================================= */}
      <div className="adminCardSection dispatchSection" style={{ marginTop: '24px' }}>
        <div className="dispatchSectionHeader">
          <div className="dispatchTitleWrap">
            <div className="dispatchIconBadge">
              <Layers size={22} color="#38bdf8" />
            </div>
            <div>
              <div className="titleWithTag">
                <h3>Hub Route Dispatch & Cluster Manifests</h3>
              </div>
              <p className="dispatchSubtitle">
                Prevents rider cherry-picking by batching Karaikal deliveries into 4 distinct geographic corridors.
              </p>
            </div>
          </div>

          <div className="dispatchHeaderActions">
            <div className="dispatchSummaryStats">
              <div className="statPill">
                <Package size={13} />
                <span><strong>{corridorSummary.totalActiveOrders}</strong> Active Parcels</span>
              </div>
              <div className="statPill">
                <Truck size={13} />
                <span><strong>{corridorSummary.dispatchedCorridorsCount} / 4</strong> Corridors Dispatched</span>
              </div>
              <div className="statPill payoutStatPill">
                <span>Fleet Base Pay: <strong>₹{corridorSummary.totalPayout}</strong></span>
              </div>
            </div>

            <button
              type="button"
              className="autoDispatchBtn"
              onClick={handleAutoDispatchAll}
              disabled={autoDispatching || corridorsLoading || corridorSummary.totalActiveOrders === 0}
              title="Auto-pair active corridors with available drivers based on service mode"
            >
              <Zap size={15} className={autoDispatching ? 'pulsingIcon' : ''} />
              {autoDispatching ? 'Auto-Dispatching Fleet...' : 'Auto-Dispatch'}
            </button>
          </div>
        </div>

        {/* 4 Corridor Cards Grid */}
        <div className="corridorCardsGrid">
          {corridors.map((corr) => {
            const isAssigned = Boolean(corr.assignedRiderId);
            const isDispatched = corr.status === 'dispatched';
            const isExpanded = Boolean(expandedCorridors[corr.id]);
            const isBusy = dispatchingCorridorId === corr.id;

            return (
              <div
                key={corr.id}
                className={`corridorCard ${isDispatched ? 'corridorDispatched' : 'corridorStaged'}`}
                style={{ '--corridor-accent': corr.color }}
              >
                {/* Top Badge & Status */}
                <div className="corridorCardTop">
                  <div className="corridorCodeBadge" style={{ background: corr.color }}>
                    {corr.code}
                  </div>
                  <span
                    className={`corridorStatusTag ${
                      corr.totalStops === 0
                        ? 'statusEmpty'
                        : isDispatched
                        ? 'statusDispatched'
                        : 'statusStaged'
                    }`}
                  >
                    <span className="statusDot"></span>
                    {corr.totalStops === 0
                      ? '0 Parcels (Idle)'
                      : isDispatched
                      ? 'Dispatched (Out for Delivery)'
                      : 'Staged at Hub'}
                  </span>
                </div>

                {/* Corridor Name & Coverage Areas */}
                <h4 className="corridorCardName">{corr.name}</h4>
                <div className="corridorAreasBox">
                  <MapPin size={12} style={{ flexShrink: 0, marginTop: '2px', color: corr.color }} />
                  <span>
                    {corr.areas} (PIN: {corr.pincodes})
                  </span>
                </div>

                {/* Metrics Row */}
                <div className="corridorMetricsRow">
                  <div className="metricCol">
                    <small>Active Stops</small>
                    <strong>{corr.totalStops} Parcels</strong>
                  </div>
                  <div className="metricCol payoutCol">
                    <small>Guaranteed Pay</small>
                    <strong style={{ color: corr.color }}>₹{corr.estimatedPayout}</strong>
                  </div>
                </div>

                {/* Driver Assignment Section */}
                <div className="corridorAssignmentBox">
                  {isAssigned ? (
                    <div className="assignedDriverInfo">
                      <div className="assignedDriverRow">
                        <div className="assignedDriverAvatar">
                          <User size={14} />
                        </div>
                        <div className="assignedDriverDetails">
                          <div className="driverNameWithCode">
                            <strong>{corr.assignedRiderName}</strong>
                            <span className="riderCodePill">{corr.assignedRiderId}</span>
                          </div>
                          {corr.assignedRiderPhone && (
                            <small className="driverPhoneText">
                              <Phone size={10} /> {corr.assignedRiderPhone}
                            </small>
                          )}
                          {(() => {
                            const matchedRider = partners.find(
                              (p) => String(p.username || p.id).toUpperCase() === String(corr.assignedRiderId).toUpperCase()
                            );
                            if (matchedRider?.lastLocation?.lat) {
                              return (
                                <a
                                  href={`https://www.google.com/maps?q=${matchedRider.lastLocation.lat},${matchedRider.lastLocation.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#22c55e',
                                    textDecoration: 'none',
                                    background: 'rgba(34, 197, 94, 0.12)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    padding: '2px 6px',
                                    borderRadius: '5px',
                                    marginTop: '4px'
                                  }}
                                  title="Live road coordinates from driver phone"
                                >
                                  <MapPin size={11} color="#22c55e" /> Live GPS Pin
                                </a>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="unassignCorridorBtn"
                        disabled={isBusy}
                        onClick={() => handleUnassignCorridor(corr.id, corr.name)}
                      >
                        <X size={12} /> {isBusy ? 'Recalling...' : 'Recall to Hub'}
                      </button>
                    </div>
                  ) : (
                    <div className="unassignedActionWrap">
                      <label htmlFor={`select-driver-${corr.id}`} className="assignSelectLabel">
                        Assign Route to Driver:
                      </label>
                      <div className="assignControlsRow">
                        <select
                          id={`select-driver-${corr.id}`}
                          className="driverSelectDropdown"
                          value={selectedRidersForCorridor[corr.id] || ''}
                          onChange={(e) =>
                            setSelectedRidersForCorridor((prev) => ({
                              ...prev,
                              [corr.id]: e.target.value,
                            }))
                          }
                          disabled={corr.totalStops === 0 || isBusy}
                        >
                          <option value="">-- Select Active Driver --</option>
                          {partners
                            .filter((p) => p.active !== false)
                            .map((p) => (
                              <option key={p.id || p.username} value={p.username || p.id}>
                                {p.username || p.id} • {p.name} ({p.serviceMode || 'Standard'})
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          className="dispatchRouteBtn"
                          disabled={corr.totalStops === 0 || !selectedRidersForCorridor[corr.id] || isBusy}
                          onClick={() => handleAssignCorridor(corr.id)}
                          style={{ background: corr.color }}
                        >
                          <Send size={13} /> {isBusy ? 'Dispatching...' : 'Dispatch'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Manifest Orders Drawer Toggle */}
                {corr.totalStops > 0 && (
                  <div className="corridorManifestToggleWrap">
                    <button
                      type="button"
                      className="manifestToggleBtn"
                      onClick={() => toggleExpandCorridor(corr.id)}
                    >
                      <span>View Manifest Stops ({corr.totalStops})</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isExpanded && (
                      <div className="manifestStopsList">
                        {corr.stops.map((stop, idx) => (
                          <div key={stop.id || idx} className="manifestStopItem">
                            <div className="stopIndex">{idx + 1}</div>
                            <div className="stopDetails">
                              <div className="stopCustomerRow">
                                <strong>{stop.customer?.name || 'Customer'}</strong>
                                <span
                                  className={`stopPaymentBadge ${
                                    stop.paymentMethod === 'cod' ? 'badgeCod' : 'badgeOnline'
                                  }`}
                                >
                                  {stop.paymentMethod?.toUpperCase() || 'COD'}
                                </span>
                              </div>
                              <p className="stopAddress">
                                {stop.shipping?.address}, {stop.shipping?.city}
                              </p>
                              <small className="stopMeta">
                                Order: #{stop.orderId} • {stop.items?.length || 1} item(s) • ₹{stop.total}
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =======================================================================
          SECTION 3: DELIVERY PARTNERS ROSTER
          ======================================================================= */}
      <div className="adminCardSection" style={{ marginTop: '24px' }}>
        <div className="sectionHeaderWithBadge">
          <div className="titleWithIcon">
            <Truck size={20} color="#3b82f6" />
            <h3>Authorized Delivery Partners Roster</h3>
          </div>
          <span className="countPill">{partners.length} Registered Drivers</span>
        </div>

        {/* 🚨 Emergency Login Requests Banner */}
        {partners.filter(p => p.emergencyLoginPending || p.emergencyLoginRequest?.status === 'pending').length > 0 && (
          <div className="emergencyRequestsBanner" style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(15, 23, 42, 0.9))',
            border: '1.5px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🚨</span>
                <strong style={{ fontSize: '14px', color: '#f87171' }}>
                  Pending Emergency Login Requests ({partners.filter(p => p.emergencyLoginPending || p.emergencyLoginRequest?.status === 'pending').length})
                </strong>
              </div>
              <small style={{ color: '#94a3b8' }}>Riders attempting late check-in requesting 1-time clearance</small>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {partners.filter(p => p.emergencyLoginPending || p.emergencyLoginRequest?.status === 'pending').map(p => (
                <div key={p.username || p.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 14px'
                }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '13px' }}>{p.name}</strong>{' '}
                    <span className="codePill" style={{ marginLeft: '6px' }}>{p.username}</span>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      Requested at: <span style={{ color: '#f59e0b' }}>{p.emergencyLoginRequest?.requestTimeIST || 'Just now'}</span> • Reason: {p.emergencyLoginRequest?.reason || 'Late shift access'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      style={{
                        padding: '6px 14px',
                        background: '#22c55e',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      onClick={() => handleProcessEmergencyLogin(p, 'approve')}
                    >
                      ✓ Approve (1-Time Pass)
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '6px 14px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid #ef4444',
                        borderRadius: '6px',
                        color: '#f87171',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      onClick={() => handleProcessEmergencyLogin(p, 'reject')}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="partnersTableWrap">
          <table className="partnersTable">
            <thead>
              <tr>
                <th>Partner Code (Username)</th>
                <th>Driver Name</th>
                <th>Phone Number</th>
                <th>Mode of Service</th>
                <th>Punctuality & Bonus</th>
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
                    {p.lastLocation?.lat ? (
                      <div style={{ marginTop: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <a
                          href={`https://www.google.com/maps?q=${p.lastLocation.lat},${p.lastLocation.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            color: '#22c55e',
                            textDecoration: 'none',
                            fontWeight: 600,
                            background: 'rgba(34, 197, 94, 0.12)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid rgba(34, 197, 94, 0.25)'
                          }}
                          title={`Accuracy: ${Math.round(p.lastLocation.accuracy || 0)}m • Speed: ${Math.round(p.lastLocation.speed || 0)} km/h`}
                        >
                          <MapPin size={11} color="#22c55e" /> Live GPS
                        </a>
                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                          {new Date(p.lastLocation.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <div style={{ marginTop: '3px', fontSize: '10px', color: '#64748b' }}>
                        ⚪ GPS Inactive (Off-route)
                      </div>
                    )}
                  </td>
                  <td>{p.phone || '—'}</td>
                  <td>
                    <span className={`serviceModeBadge ${String(p.serviceMode || 'Standard').toLowerCase().replace(/\s+/g, '-')}`}>
                      {p.serviceMode || 'Standard'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '5px',
                        background: (p.lateStrikes || 0) >= 3 ? 'rgba(239, 68, 68, 0.15)' : (p.lateStrikes || 0) > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                        color: (p.lateStrikes || 0) >= 3 ? '#ef4444' : (p.lateStrikes || 0) > 0 ? '#f59e0b' : '#22c55e',
                        border: (p.lateStrikes || 0) >= 3 ? '1px solid #ef4444' : 'none',
                        width: 'fit-content'
                      }}>
                        {(p.lateStrikes || 0) >= 3 ? '3/3 Strikes (Bonus Cut Off ⚠️)' : `${p.lateStrikes || 0}/3 Strikes (Bonus Active)`}
                      </span>
                      {p.adminShiftOverride && (
                        <span style={{ fontSize: '10px', color: '#38bdf8' }}>🔓 Override Active</span>
                      )}
                    </div>
                  </td>
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
                              toast.success(`PIN updated for ${p.username}`);
                              fetchPartners();
                            });
                          }
                        }}
                      >
                        Reset PIN
                      </button>
                      {(p.lateStrikes > 0 || p.bonusCutoff || p.adminShiftOverride) && (
                        <button
                          type="button"
                          className="quickActionLink"
                          style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                          title="Clear late strikes and unlock shift check-in"
                          onClick={() => handleResetStrikes(p.username)}
                        >
                          Clear Strikes
                        </button>
                      )}
                      {(p.lateStrikes >= 3 || p.bonusCutoff) && p.phone && (
                        <a
                          href={`https://wa.me/${String(p.phone).replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hello ${p.name || 'Partner'} (${p.username}),\n\n⚠️ ATTENDANCE PENALTY: Your account has accumulated 3 Attendance Strikes due to late shift check-ins. In accordance with MotoDC fleet policy, your monthly punctuality bonus (₹2,500) has been cancelled for this month.\n\nYour ₹45/drop earnings remain unaffected. Contact Karaikal Hub Manager for clearance.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="quickActionLink"
                          style={{ color: '#f59e0b', textDecoration: 'none' }}
                          title="Send WhatsApp notice about bonus cancellation"
                        >
                          WhatsApp Notice
                        </a>
                      )}
                      <button
                        type="button"
                        className="quickDeleteBtn"
                        title="Delete partner"
                        onClick={() => handleDeletePartner(p)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {partners.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No delivery partners registered yet. Approve a KYC application or click "+ Add Delivery Partner" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL-SIZE PROOF INSPECTION MODAL */}
      {viewingProofModal && (
        <div className="modalOverlay" onClick={() => setViewingProofModal(null)}>
          <div className="proofViewerModal" onClick={(e) => e.stopPropagation()}>
            <div className="proofViewerHeader">
              <div>
                <h4>{viewingProofModal.title}</h4>
                {viewingProofModal.extracted && (
                  <p className="modalExtractedInfo">🤖 {viewingProofModal.extracted}</p>
                )}
              </div>
              <button type="button" className="modalCloseBtn" onClick={() => setViewingProofModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="proofViewerBody">
              <img src={viewingProofModal.url} alt="KYC Proof Document" className="fullProofImg" />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OTP GENERATION & DISPATCH */}
      {activeModalRequest && (
        <div className="modalOverlay" onClick={() => setActiveModalRequest(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">
                <KeyRound size={22} color="#ff3157" />
                <div>
                  <h3>Review & Generate 6-Digit Security OTP</h3>
                  <p>Issue one-time PIN reset credentials to verified driver</p>
                </div>
              </div>
              <button
                type="button"
                className="modalCloseBtn"
                onClick={() => setActiveModalRequest(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modalBody">
              <div className="reviewDriverBox">
                <div>
                  <small>Partner Code (Username)</small>
                  <strong>{activeModalRequest.username}</strong>
                </div>
                <div>
                  <small>Driver Name</small>
                  <strong>{activeModalRequest.riderName || 'Rider'}</strong>
                </div>
                <div>
                  <small>Registered Mobile</small>
                  <strong>{activeModalRequest.phone || 'N/A'}</strong>
                </div>
              </div>

              {!generatedOtpData ? (
                <div className="generatePrompt">
                  <p>
                    Click below to generate a cryptographically random 6-digit OTP. The OTP is valid for 15 minutes and
                    can only be used once.
                  </p>
                  <button
                    type="button"
                    className="generateOtpSubmitBtn"
                    disabled={generatingOtp}
                    onClick={() => handleGenerateOtp(activeModalRequest.id)}
                  >
                    <KeyRound size={16} /> {generatingOtp ? 'Generating 6-Digit OTP...' : 'Generate 6-Digit OTP'}
                  </button>
                </div>
              ) : (
                <div className="otpResultStage">
                  <div className="bigOtpDisplay">
                    <span>Generated Security OTP</span>
                    <h1>{generatedOtpData.otp}</h1>
                    <small>Valid for 15 minutes • One-time use only</small>
                  </div>

                  <div className="methodABanner">
                    <CheckCircle2 size={16} />
                    <span>Method A Active: Transmit directly to driver via 1-click WhatsApp</span>
                  </div>

                  <div className="dispatchActionGroup">
                    <a
                      href={getWhatsAppLink(generatedOtpData.phone, generatedOtpData.otp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dispatchBtn whatsappActionBtn"
                    >
                      <MessageSquare size={16} />
                      <span>Send via WhatsApp</span>
                      <ExternalLink size={13} />
                    </a>

                    <button
                      type="button"
                      className="dispatchBtn copyActionBtn"
                      onClick={() => handleCopy(generatedOtpData.otp, 'OTP code')}
                    >
                      <Copy size={16} />
                      <span>Copy OTP Code</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD DELIVERY PARTNER MANUALLY */}
      {showAddPartner && (
        <div className="modalOverlay" onClick={() => setShowAddPartner(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">
                <Truck size={22} color="#ff3157" />
                <div>
                  <h3>Add Authorized Delivery Partner</h3>
                  <p>Register a new driver with an alphanumeric code and 6-digit PIN</p>
                </div>
              </div>
              <button
                type="button"
                className="modalCloseBtn"
                onClick={() => setShowAddPartner(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePartner}>
              <div className="modalBody">
                <div className="modalField">
                  <label>Partner Code (Alphanumeric Username) *</label>
                  <div className="inputWithShuffle" style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                    <input
                      type="text"
                      value={newPartner.username}
                      onChange={(e) => setNewPartner({ ...newPartner, username: e.target.value.toUpperCase() })}
                      required
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="shuffleBtn"
                      title="Generate new random code"
                      onClick={() => setNewPartner({ ...newPartner, username: generateRiderCode() })}
                      style={{
                        background: 'linear-gradient(135deg, #e11d48, #be123c)',
                        color: '#ffffff',
                        border: '1px solid #e11d48',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 10px rgba(225, 29, 72, 0.35)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Shuffle size={14} color="#ffffff" /> Random
                    </button>
                  </div>
                  <small>Example: MDC-4829. The driver will use this code to log into the delivery app.</small>
                </div>

                <div className="modalField">
                  <label>1. Delivery Partner Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. R. Anbarasan"
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
                  <small>Used for OTP verification and WhatsApp delivery communication.</small>
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

                <div className="modalField">
                  <label>4. Mode of Service *</label>
                  <select
                    value={newPartner.serviceMode || 'Standard'}
                    onChange={(e) => setNewPartner({ ...newPartner, serviceMode: e.target.value })}
                    style={{
                      background: '#141e33',
                      border: '1px solid #e11d48',
                      color: '#ffffff',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <option value="Part-Time" style={{ background: '#0f172a', color: '#ffffff' }}>Part-Time (~8 drops/day · 2–4 hrs)</option>
                    <option value="Standard" style={{ background: '#0f172a', color: '#ffffff' }}>Standard (~18 drops/day · Full-Day)</option>
                    <option value="Power Rider" style={{ background: '#0f172a', color: '#ffffff' }}>Power Rider (~30 drops/day · High-Volume)</option>
                  </select>
                </div>
              </div>

              <div className="modalFooter">
                <button
                  type="button"
                  className="cancelModalBtn"
                  onClick={() => setShowAddPartner(false)}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="savePartnerSubmitBtn"
                  disabled={savingPartner}
                  style={{
                    background: 'linear-gradient(135deg, #e11d48, #be123c)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
                  }}
                >
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
