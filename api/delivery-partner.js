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

    // 1. GET: Lookup order or list active run sheet deliveries
    if (req.method === 'GET') {
      const action = String(req.query.action || '').trim().toLowerCase();
      const codCol = db.collection('orders').doc('cod orders').collection('records');
      const onlineCol = db.collection('orders').doc('online orders').collection('records');

      // 1A. List Active Run Sheet Deliveries (Pending stops for today's shift)
      if (action === 'active-deliveries') {
        const [recentCod, recentOnline] = await Promise.all([
          codCol.limit(30).get(),
          onlineCol.limit(30).get(),
        ]);
        const pool = [
          ...recentCod.docs.map(d => ({ ...d.data(), id: d.id, collectionType: 'cod orders' })),
          ...recentOnline.docs.map(d => ({ ...d.data(), id: d.id, collectionType: 'online orders' })),
        ];

        // Filter for active orders (not yet delivered or cancelled)
        const activeStops = pool
          .filter(o => {
            const st = String(o.orderStatus || 'placed').toLowerCase();
            return !['delivered', 'cancelled', 'returned'].includes(st);
          })
          .map(o => ({
            id: o.id,
            orderId: o.orderId || o.id,
            collectionType: o.collectionType,
            paymentMethod: o.paymentMethod || (o.collectionType.includes('cod') ? 'cod' : 'online'),
            orderStatus: o.orderStatus || 'placed',
            total: Number(o.total || 0),
            customer: {
              name: o.customer?.name || 'Customer',
              phone: o.customer?.phone || '',
              email: o.customer?.email || '',
            },
            shipping: {
              address: o.shipping?.address || 'Doorstep Address',
              city: o.shipping?.city || 'Karaikal',
              state: o.shipping?.state || '',
              pincode: o.shipping?.pincode || '',
            },
            items: (o.items || []).map(it => ({
              name: it.name || 'Automotive Part',
              qty: it.qty || 1,
              price: Number(it.price || 0),
            })),
            deliveryPin: o.deliveryPin || (o.customer?.phone ? String(o.customer.phone).replace(/\D/g, '').slice(-4) : '8492'),
            createdAt: o.createdAt || null,
          }));

        return send(res, 200, { ok: true, stops: activeStops });
      }

      const rawQ = String(req.query.q || '').trim();
      if (!rawQ) {
        return send(res, 400, { error: 'Missing search query (q)' });
      }

      // Generate query variants for instant matching
      const cleanQ = rawQ.replace(/^#/, '').trim();
      const upperQ = cleanQ.toUpperCase();
      const lowerQ = cleanQ.toLowerCase();
      const mdcPrefixed = /^mdc-/i.test(cleanQ) ? cleanQ : `MDC-${cleanQ}`;
      const searchKeys = Array.from(new Set([cleanQ, upperQ, lowerQ, mdcPrefixed, rawQ]));
      const onlineCol = db.collection('orders').doc('online orders').collection('records');

      let foundDoc = null;
      let collectionType = 'cod orders';

      // Step 1: Direct Document ID Lookups (Fastest: ~15-30ms)
      for (const key of searchKeys) {
        const [codDoc, onlineDoc] = await Promise.all([
          codCol.doc(key).get(),
          onlineCol.doc(key).get(),
        ]);
        if (codDoc.exists) {
          foundDoc = { ...codDoc.data(), id: codDoc.id };
          collectionType = 'cod orders';
          break;
        }
        if (onlineDoc.exists) {
          foundDoc = { ...onlineDoc.data(), id: onlineDoc.id };
          collectionType = 'online orders';
          break;
        }
      }

      // Step 2: Indexed where('orderId', '==', key) Queries (~30-50ms)
      if (!foundDoc) {
        for (const key of searchKeys) {
          const [codSnap, onlineSnap] = await Promise.all([
            codCol.where('orderId', '==', key).limit(1).get(),
            onlineCol.where('orderId', '==', key).limit(1).get(),
          ]);
          if (!codSnap.empty) {
            const d = codSnap.docs[0];
            foundDoc = { ...d.data(), id: d.id };
            collectionType = 'cod orders';
            break;
          }
          if (!onlineSnap.empty) {
            const d = onlineSnap.docs[0];
            foundDoc = { ...d.data(), id: d.id };
            collectionType = 'online orders';
            break;
          }
        }
      }

      // Step 3: Fast Substring Match over only the latest 40 recent orders
      if (!foundDoc) {
        const [recentCod, recentOnline] = await Promise.all([
          codCol.limit(25).get(),
          onlineCol.limit(25).get(),
        ]);
        const recentPool = [
          ...recentCod.docs.map(d => ({ ...d.data(), id: d.id, collectionType: 'cod orders' })),
          ...recentOnline.docs.map(d => ({ ...d.data(), id: d.id, collectionType: 'online orders' })),
        ];
        const match = recentPool.find(o => {
          const id1 = String(o.orderId || '').toLowerCase().trim();
          const id2 = String(o.id || '').toLowerCase().trim();
          return id1 === lowerQ || id2 === lowerQ || id1.includes(lowerQ) || lowerQ.includes(id1);
        });
        if (match) {
          foundDoc = match;
          collectionType = match.collectionType;
        }
      }

      if (!foundDoc) {
        return send(res, 404, { error: `No order found matching "${rawQ}"` });
      }

      // Return clean, scannable order details instantly
      return send(res, 200, {
        ok: true,
        order: {
          id: foundDoc.id,
          orderId: foundDoc.orderId || foundDoc.id,
          collectionType: collectionType,
          paymentMethod: foundDoc.paymentMethod || (collectionType.includes('cod') ? 'cod' : 'online'),
          paymentStatus: foundDoc.paymentStatus || 'pending',
          orderStatus: foundDoc.orderStatus || 'placed',
          total: Number(foundDoc.total || 0),
          customer: {
            name: foundDoc.customer?.name || 'Customer',
            phone: foundDoc.customer?.phone || '',
            email: foundDoc.customer?.email || '',
          },
          shipping: {
            address: foundDoc.shipping?.address || 'Doorstep Address',
            city: foundDoc.shipping?.city || '',
            state: foundDoc.shipping?.state || '',
            pincode: foundDoc.shipping?.pincode || '',
          },
          items: (foundDoc.items || []).map((it) => ({
            name: it.name || 'Automotive Part',
            qty: it.qty || 1,
            price: Number(it.price || 0),
            image: it.image || '',
          })),
          createdAt: foundDoc.createdAt || null,
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
