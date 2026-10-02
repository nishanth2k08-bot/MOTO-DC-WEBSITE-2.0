import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAlgoliaClient } from './_algolia.js';

function send(res, status, body) { res.status(status).json(body); }

function getAdmin() {
  if (admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
    if (typeof serviceAccount === 'string') serviceAccount = JSON.parse(serviceAccount);
  } catch {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const auth = req.headers.authorization || '', token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return send(res, 401, { error: 'Authentication required' });

    const a = getAdmin();
    const decoded = await a.auth().verifyIdToken(token);
    const db = getFirestore(a.app(), 'asia-south1');

    const adminSnap = await db.collection('admins').doc(decoded.uid).get();
    if (!adminSnap.exists) return send(res, 403, { error: 'Admin access required' });

    const algolia = getAlgoliaClient();
    if (!algolia) return send(res, 500, { error: 'Algolia keys are not configured' });

    const [codSnap, onlineSnap] = await Promise.all([
      db.collection('orders').doc('cod orders').collection('records').get(),
      db.collection('orders').doc('online orders').collection('records').get()
    ]);

    const allDocs = [...codSnap.docs, ...onlineSnap.docs];
    const objects = allDocs.map(d => {
      const o = d.data() || {};
      return {
        objectID: d.id,
        orderId: String(o.orderId || d.id || ''),
        userId: String(o.userId || ''),
        customerName: String(o.customer?.name || ''),
        customerPhone: String(o.customer?.phone || ''),
        customerEmail: String(o.customer?.email || ''),
        city: String(o.shipping?.city || ''),
        state: String(o.shipping?.state || ''),
        pincode: String(o.shipping?.pincode || ''),
        address: String(o.shipping?.address || ''),
        paymentMethod: String(o.paymentMethod || ''),
        paymentStatus: String(o.paymentStatus || ''),
        orderStatus: String(o.orderStatus || 'placed'),
        total: Number(o.total || 0),
        items: (o.items || []).map(i => i.name || ''),
        createdAt: o.createdAt?.toMillis?.() || Date.now()
      };
    });

    if (objects.length > 0) {
      await algolia.saveObjects({
        indexName: 'motodc_orders',
        objects
      });
    }

    return send(res, 200, { ok: true, synced: objects.length, message: `Successfully synced ${objects.length} orders to Algolia` });
  } catch (e) {
    console.error('Algolia sync error:', e);
    return send(res, 500, { error: e.message || 'Could not sync orders to Algolia' });
  }
}
