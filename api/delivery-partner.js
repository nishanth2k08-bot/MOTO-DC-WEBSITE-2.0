import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

function send(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const a = getAdmin();
    const db = getFirestore(a.app(), 'asia-south1');

    // 1. GET: Lookup order by barcode text / Order ID
    if (req.method === 'GET') {
      const q = String(req.query.q || '').trim();
      if (!q) {
        return send(res, 400, { error: 'Missing search query (q)' });
      }

      const qLower = q.toLowerCase();

      // Query both COD and Online orders
      const [codSnap, onlineSnap] = await Promise.all([
        db.collection('orders').doc('cod orders').collection('records').get(),
        db.collection('orders').doc('online orders').collection('records').get(),
      ]);

      const all = [
        ...codSnap.docs.map((d) => ({ ...d.data(), id: d.id, collectionType: 'cod orders' })),
        ...onlineSnap.docs.map((d) => ({ ...d.data(), id: d.id, collectionType: 'online orders' })),
      ];

      const match = all.find((o) => {
        const id1 = String(o.orderId || '').toLowerCase().trim();
        const id2 = String(o.id || '').toLowerCase().trim();
        return id1 === qLower || id2 === qLower || id1.includes(qLower) || qLower.includes(id1);
      });

      if (!match) {
        return send(res, 404, { error: `No order found matching "${q}"` });
      }

      // Return clean, scannable order details
      return send(res, 200, {
        ok: true,
        order: {
          id: match.id,
          orderId: match.orderId || match.id,
          collectionType: match.collectionType,
          paymentMethod: match.paymentMethod || (match.collectionType.includes('cod') ? 'cod' : 'online'),
          paymentStatus: match.paymentStatus || 'pending',
          orderStatus: match.orderStatus || 'placed',
          total: Number(match.total || 0),
          customer: {
            name: match.customer?.name || 'Customer',
            phone: match.customer?.phone || '',
            email: match.customer?.email || '',
          },
          shipping: {
            address: match.shipping?.address || 'Doorstep Address',
            city: match.shipping?.city || '',
            state: match.shipping?.state || '',
            pincode: match.shipping?.pincode || '',
          },
          items: (match.items || []).map((it) => ({
            name: it.name || 'Automotive Part',
            qty: it.qty || 1,
            price: Number(it.price || 0),
            image: it.image || '',
          })),
          createdAt: match.createdAt || null,
        },
      });
    }

    // 2. POST: Complete Doorstep Handover & Mark Delivered
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { docId, collectionType, paymentMethod, riderName, riderId } = body;

      if (!docId) {
        return send(res, 400, { error: 'Missing docId in request body' });
      }

      const collName = collectionType || (String(paymentMethod).toLowerCase() === 'cod' ? 'cod orders' : 'online orders');
      const orderRef = db.collection('orders').doc(collName).collection('records').doc(String(docId));
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return send(res, 404, { error: 'Order not found in database' });
      }

      const isCod = String(paymentMethod || '').toLowerCase() === 'cod';
      const updates = {
        orderStatus: 'delivered',
        deliveredAt: FieldValue.serverTimestamp(),
        deliveredBy: {
          riderName: String(riderName || 'MotoDC Partner'),
          riderId: String(riderId || 'MDC-R01'),
          timestamp: new Date().toISOString(),
        },
        history: FieldValue.arrayUnion({
          status: 'delivered',
          timestamp: new Date().toISOString(),
          note: `Doorstep verified by ${riderName || 'Rider'} (${riderId || 'MDC-R01'}) via MotoDC Partner App`,
        }),
      };

      if (isCod) {
        updates.paymentStatus = 'paid';
      }

      await orderRef.update(updates);
      return send(res, 200, { ok: true, delivered: true, docId });
    }

    return send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('Delivery partner API error:', err);
    return send(res, 500, { error: err.message || 'Internal server error' });
  }
}
