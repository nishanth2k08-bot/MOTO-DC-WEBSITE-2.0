import crypto from 'node:crypto';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

function getAdmin() {
  if (admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
    if (typeof serviceAccount === 'string') serviceAccount = JSON.parse(serviceAccount);
  } catch (e) {
    try {
      serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
    }
  }
  if (!serviceAccount?.project_id || !serviceAccount?.client_email || !serviceAccount?.private_key) {
    throw new Error('Incomplete Firebase service account');
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin;
}

function send(res, status, body) {
  res.status(status).json(body);
}

export default async function handler(req, res) {
  const action = req.query.action || (req.method === 'GET' ? 'status' : 'create-order');

  // Verify auth header
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  try {
    const a = getAdmin();
    const db = getFirestore(a.app(), 'asia-south1');

    // 1. Check Membership Status
    if (action === 'status') {
      if (!idToken) {
        return send(res, 200, { isApexMember: false, authenticated: false });
      }
      try {
        const decoded = await a.auth().verifyIdToken(idToken);
        const userRef = db.collection('users').doc(decoded.uid);
        const snap = await userRef.get();
        if (!snap.exists) {
          return send(res, 200, { isApexMember: false, authenticated: true });
        }
        const data = snap.data() || {};
        const isApex = Boolean(data.isApexMember);
        const expiresAt = data.apexExpiresAt || null;
        const isActive = isApex && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
        return send(res, 200, {
          isApexMember: isActive,
          plan: data.apexPlan || null,
          expiresAt: expiresAt,
          startedAt: data.apexStartedAt || null,
          authenticated: true
        });
      } catch (err) {
        return send(res, 200, { isApexMember: false, authenticated: false, error: err.message });
      }
    }

    // 2. Create Razorpay Subscription Order
    if (action === 'create-order') {
      if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
      if (!idToken) return send(res, 401, { error: 'Please sign in or create an account to activate your Apex Pass membership.' });

      const decoded = await a.auth().verifyIdToken(idToken);
      const plan = (req.body?.plan === 'monthly') ? 'monthly' : 'annual';
      const planAmount = plan === 'monthly' ? 29 : 199; // INR
      const amountPaise = planAmount * 100;

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return send(res, 503, { error: 'Payment gateway credentials are not configured on the server.' });
      }

      const receipt = `APEX-${Date.now().toString().slice(-8)}-${decoded.uid.slice(0, 6)}`;
      const orderPayload = {
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          userId: decoded.uid,
          userEmail: decoded.email || '',
          membershipType: 'moto_apex_pass',
          plan
        }
      };

      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return send(res, 502, { error: data.error?.description || 'Razorpay order creation rejected' });
      }

      // Record pending intent in Firestore
      await db.collection('apex_orders').doc(data.id).set({
        orderId: data.id,
        userId: decoded.uid,
        userEmail: decoded.email || '',
        plan,
        amount: planAmount,
        currency: 'INR',
        status: 'created',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return send(res, 200, {
        keyId,
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
        plan,
        planAmount
      });
    }

    // 3. Verify Razorpay Payment & Activate Membership
    if (action === 'verify-payment') {
      if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
      if (!idToken) return send(res, 401, { error: 'Authentication required' });

      const decoded = await a.auth().verifyIdToken(idToken);
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body || {};

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return send(res, 400, { error: 'Incomplete Razorpay payment response' });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET;
      const keyId = process.env.RAZORPAY_KEY_ID;
      if (!secret) return send(res, 503, { error: 'Payment secret not configured' });

      // Verify HMAC-SHA256 signature
      const expected = crypto.createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (razorpay_signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature))) {
        return send(res, 400, { error: 'Invalid payment signature. Verification failed.' });
      }

      // Verify payment with Razorpay REST API
      const payRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}` }
      });
      const payment = await payRes.json().catch(() => ({}));

      if (!payRes.ok || payment.order_id !== razorpay_order_id || payment.status !== 'captured') {
        return send(res, 400, { error: 'Payment is not captured or could not be verified by Razorpay.' });
      }

      // Calculate expiration date
      const chosenPlan = plan === 'monthly' ? 'monthly' : 'annual';
      const durationDays = chosenPlan === 'monthly' ? 30 : 365;
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      const amountPaid = chosenPlan === 'monthly' ? 29 : 199;

      // Update User Document
      const userRef = db.collection('users').doc(decoded.uid);
      await userRef.set({
        isApexMember: true,
        apexPlan: chosenPlan,
        apexStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        apexExpiresAt: expiresAt,
        apexLastPaymentId: razorpay_payment_id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Record in apex_memberships ledger
      await db.collection('apex_memberships').doc(razorpay_payment_id).set({
        membershipId: `APEX-VIP-${decoded.uid.slice(0, 6).toUpperCase()}`,
        userId: decoded.uid,
        userEmail: decoded.email || '',
        userName: decoded.name || '',
        plan: chosenPlan,
        amount: amountPaid,
        currency: 'INR',
        razorpay_order_id,
        razorpay_payment_id,
        paymentMethod: payment.method || 'online',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
        status: 'active'
      });

      // Update order status
      await db.collection('apex_orders').doc(razorpay_order_id).set({
        status: 'paid',
        paymentId: razorpay_payment_id,
        paidAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return send(res, 200, {
        ok: true,
        isApexMember: true,
        plan: chosenPlan,
        expiresAt,
        paymentId: razorpay_payment_id,
        message: '🏆 Welcome to MotoDC Apex VIP! Unlimited Free Delivery & 10% Off Spares Activated.'
      });
    }

    return send(res, 400, { error: `Unsupported action: ${action}` });
  } catch (error) {
    console.error('api/apex-membership error:', error);
    return send(res, 500, { error: error.message || 'Internal server error while processing Apex membership' });
  }
}
