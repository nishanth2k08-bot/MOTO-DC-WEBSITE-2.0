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

// ---------------------------------------------------------------------------
// SOLUTION A: 4 GEOGRAPHIC ROUTE CORRIDORS FOR KARAIKAL DISTRICT
// (Amazon Logistics / Delhivery Arterial Hub Clustering Model)
// ---------------------------------------------------------------------------
export const CORRIDOR_METADATA = {
  central_town: {
    id: 'central_town',
    name: 'Central Town Corridor',
    code: 'CTC-01',
    color: '#10b981', // Emerald
    bgLight: 'rgba(16, 185, 129, 0.12)',
    badgeColor: '#059669',
    areas: 'Bus Stand, Beach Road, Market, Bharathiar St, Nehru St',
    pincodes: '609602',
    description: 'High-density commercial core and coastal residential boulevard',
  },
  north_corridor: {
    id: 'north_corridor',
    name: 'North Corridor',
    code: 'NRC-02',
    color: '#3b82f6', // Sapphire Blue
    bgLight: 'rgba(59, 130, 246, 0.12)',
    badgeColor: '#2563eb',
    areas: 'Kottucherry, Varichikudy, Nedungadu, Thiruvettakudy',
    pincodes: '609603, 609605',
    description: 'Northern coastal bypass and agrarian residential belt',
  },
  south_corridor: {
    id: 'south_corridor',
    name: 'South Corridor',
    code: 'SRC-03',
    color: '#8b5cf6', // Violet
    bgLight: 'rgba(139, 92, 246, 0.12)',
    badgeColor: '#7c3aed',
    areas: 'T.R. Pattinam, Neravy, Polagam, Karaikal Port Road',
    pincodes: '609606, 609604',
    description: 'Harbor industrial lane, maritime port bypass & industrial hub',
  },
  west_corridor: {
    id: 'west_corridor',
    name: 'West Corridor',
    code: 'WTC-04',
    color: '#f59e0b', // Amber
    bgLight: 'rgba(245, 158, 11, 0.12)',
    badgeColor: '#d97706',
    areas: 'Thirunallar Temple Route, Ambagarathur, Surakudy',
    pincodes: '609607, 609601',
    description: 'Pilgrim corridor, Saneeswara temple artery & peri-urban link',
  },
};

/**
 * Classifies any Karaikal delivery address into one of 4 geographic corridors.
 * Uses exact PIN codes first, followed by fuzzy area/landmark regex patterns.
 */
export function detectDeliveryZone(shipping = {}) {
  const addressText = `${shipping.address || ''} ${shipping.city || ''} ${shipping.state || ''} ${shipping.pincode || ''}`.toLowerCase();
  const pincode = String(shipping.pincode || '').trim();

  // 1. Exact Postal PIN Code Matching
  if (pincode === '609603' || pincode === '609609' || pincode === '609605') return 'north_corridor';
  if (pincode === '609606' || pincode === '609604') return 'south_corridor';
  if (pincode === '609607' || pincode === '609601') return 'west_corridor';
  if (pincode === '609602') return 'central_town';

  // 2. High-precision Arterial Keyword Matching
  // West (Thirunallar temple route / Ambagarathur / Surakudy)
  if (
    /thirunallar|tirunallar|saneeswar|ambagarathur|pettai|surakud|sorakud|nallambal|thenur|kollumangudi|subbarayapuram/.test(
      addressText
    )
  ) {
    return 'west_corridor';
  }

  // South (T.R. Pattinam / Neravy / Port road)
  if (
    /t\.?r\.?\s*pattinam|thirumalairayanpattinam|neravy|neravi|polagam|keezhaiyur|keelaiyur|vanjore|port\s*road|karaikal\s*port|nagore/.test(
      addressText
    )
  ) {
    return 'south_corridor';
  }

  // North (Kottucherry / Varichikudy / Nedungadu)
  if (
    /kottucherry|kotchery|varichikud|nedungadu|thiruvettakud|kurumbagaram|poovam|mandapathur|tarangambadi/.test(
      addressText
    )
  ) {
    return 'north_corridor';
  }

  // Central Town / Default Core
  return 'central_town';
}

/**
 * Computes deterministic 4-digit handover PIN matching customer Orders screen
 */
export function computeOrderDeliveryPin(order) {
  if (order?.deliveryPin) return String(order.deliveryPin).padStart(4, '0');
  const seed = String(order?.orderId || order?.id || order?.createdAt?.seconds || '7482');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return String(1000 + (hash % 9000));
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
    const codCol = db.collection('orders').doc('cod orders').collection('records');
    const onlineCol = db.collection('orders').doc('online orders').collection('records');
    const corridorsCol = db.collection('deliveryCorridors');
    const partnersCol = db.collection('deliveryPartners');

    // =========================================================================
    // 1. GET HANDLERS
    // =========================================================================
    if (req.method === 'GET') {
      const action = String(req.query.action || '').trim().toLowerCase();
      const riderId = String(req.query.riderId || '').trim();

      // Instant Redirect to High-Speed GitHub Releases CDN for mobile APK downloads
      if (action === 'download-apk' || action === 'latest-apk') {
        const version = req.query.v || '1.0.17';
        const targetUrl = `https://github.com/nishanth2k08-bot/MOTODC-APP/releases/download/v${version}/MotoDC-Partner.apk`;
        res.writeHead(302, {
          Location: targetUrl,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
        return res.end();
      }

      // -----------------------------------------------------------------------
      // 1A. CLUSTER MANIFESTS (Admin Dispatch Console - Solution A)
      // Returns 4 corridor manifests with parcels, total payout, and rider assignments
      // -----------------------------------------------------------------------
      if (action === 'cluster-manifests') {
        const [recentCod, recentOnline, corridorDocsSnap] = await Promise.all([
          codCol.limit(50).get(),
          onlineCol.limit(50).get(),
          corridorsCol.get(),
        ]);

        const corridorAssignments = {};
        corridorDocsSnap.docs.forEach((d) => {
          corridorAssignments[d.id] = d.data();
        });

        const pool = [
          ...recentCod.docs.map((d) => ({ ...d.data(), id: d.id, collectionType: 'cod orders' })),
          ...recentOnline.docs.map((d) => ({ ...d.data(), id: d.id, collectionType: 'online orders' })),
        ];

        // Filter for active orders (not yet delivered or cancelled)
        const activeOrders = pool.filter((o) => {
          const st = String(o.orderStatus || 'placed').toLowerCase();
          return !['delivered', 'cancelled', 'returned'].includes(st);
        });

        // Group active orders by corridor
        const corridorBuckets = {
          central_town: [],
          north_corridor: [],
          south_corridor: [],
          west_corridor: [],
        };

        activeOrders.forEach((o) => {
          const zone = o.assignedCorridor || detectDeliveryZone(o.shipping);
          const bucket = corridorBuckets[zone] || corridorBuckets.central_town;
          const assignedData = corridorAssignments[zone] || {};

          bucket.push({
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
            items: (o.items || []).map((it) => ({
              name: it.name || 'Automotive Part',
              qty: it.qty || 1,
              price: Number(it.price || 0),
            })),
            deliveryPin: computeOrderDeliveryPin(o),
            assignedCorridor: zone,
            assignedRiderId: o.assignedRiderId || assignedData.assignedRiderId || null,
            assignedRiderName: o.assignedRiderName || assignedData.assignedRiderName || null,
            createdAt: o.createdAt || null,
          });
        });

        // Build 4 rich corridor manifest objects
        const corridors = Object.keys(CORRIDOR_METADATA).map((cid) => {
          const meta = CORRIDOR_METADATA[cid];
          const stops = corridorBuckets[cid] || [];
          const assignment = corridorAssignments[cid] || {};
          const isAssigned = Boolean(assignment.assignedRiderId);

          return {
            ...meta,
            stops,
            totalStops: stops.length,
            estimatedPayout: stops.length * 45, // Flat ₹45 base pay per drop
            assignedRiderId: assignment.assignedRiderId || null,
            assignedRiderName: assignment.assignedRiderName || null,
            assignedRiderPhone: assignment.assignedRiderPhone || null,
            assignedAt: assignment.assignedAt || null,
            status: stops.length === 0 ? 'empty' : isAssigned ? 'dispatched' : 'staged',
          };
        });

        const totalActiveOrders = activeOrders.length;
        const totalDispatchedOrders = corridors.reduce((sum, c) => (c.assignedRiderId ? sum + c.totalStops : sum), 0);
        const totalPayout = totalActiveOrders * 45;

        return send(res, 200, {
          ok: true,
          corridors,
          summary: {
            totalActiveOrders,
            totalDispatchedOrders,
            totalPayout,
            stagedCorridorsCount: corridors.filter((c) => c.status === 'staged').length,
            dispatchedCorridorsCount: corridors.filter((c) => c.status === 'dispatched').length,
          },
        });
      }

      // -----------------------------------------------------------------------
      // 1B. ACTIVE RUN SHEET DELIVERIES (Mobile Partner App)
      // Scoped by riderId: Returns ONLY the assigned corridor manifest stops
      // Eliminates cherry-picking by keeping driver focused on their assigned route
      // -----------------------------------------------------------------------
      if (action === 'active-deliveries') {
        const [recentCod, recentOnline, corridorDocsSnap] = await Promise.all([
          codCol.limit(50).get(),
          onlineCol.limit(50).get(),
          corridorsCol.get(),
        ]);

        const corridorAssignments = {};
        corridorDocsSnap.docs.forEach((d) => {
          corridorAssignments[d.id] = d.data();
        });

        const pool = [
          ...recentCod.docs.map((d) => ({ ...d.data(), id: d.id, collectionType: 'cod orders' })),
          ...recentOnline.docs.map((d) => ({ ...d.data(), id: d.id, collectionType: 'online orders' })),
        ];

        const activePool = pool.filter((o) => {
          const st = String(o.orderStatus || 'placed').toLowerCase();
          return !['delivered', 'cancelled', 'returned'].includes(st);
        });

        // If riderId is supplied (e.g. MDC-9377 logged into Partner App)
        if (riderId) {
          const cleanRiderId = riderId.trim().toUpperCase();

          // Check which corridor(s) are assigned to this rider in deliveryCorridors
          const assignedCorridorEntry = Object.entries(corridorAssignments).find(
            ([, data]) => String(data.assignedRiderId || '').toUpperCase() === cleanRiderId
          );

          const assignedCorridorId = assignedCorridorEntry ? assignedCorridorEntry[0] : null;

          // Filter stops that belong to this rider:
          // Either order.assignedRiderId matches rider OR order falls in rider's assigned corridor
          const riderStops = activePool
            .filter((o) => {
              if (String(o.assignedRiderId || '').toUpperCase() === cleanRiderId) return true;
              if (assignedCorridorId) {
                const zone = o.assignedCorridor || detectDeliveryZone(o.shipping);
                return zone === assignedCorridorId;
              }
              return false;
            })
            .map((o) => {
              const zone = o.assignedCorridor || detectDeliveryZone(o.shipping);
              return {
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
                items: (o.items || []).map((it) => ({
                  name: it.name || 'Automotive Part',
                  qty: it.qty || 1,
                  price: Number(it.price || 0),
                })),
                deliveryPin:
                  o.deliveryPin ||
                  (o.customer?.phone ? String(o.customer.phone).replace(/\D/g, '').slice(-4) : '8492'),
                assignedCorridor: zone,
                assignedRiderId: cleanRiderId,
                createdAt: o.createdAt || null,
              };
            });

          const corridorMeta = assignedCorridorId ? CORRIDOR_METADATA[assignedCorridorId] : null;

          return send(res, 200, {
            ok: true,
            riderId: cleanRiderId,
            corridor: corridorMeta,
            stops: riderStops,
            totalStops: riderStops.length,
            estimatedPayout: riderStops.length * 45,
            isStagedAtHub: !assignedCorridorId && riderStops.length === 0,
            message: assignedCorridorId
              ? `Manifest loaded for ${corridorMeta?.name}`
              : 'Hub Staging: Waiting for Route Dispatch by hub supervisor',
          });
        }

        // Fallback: If no riderId provided (preview / admin inspection)
        const allStops = activePool.map((o) => {
          const zone = o.assignedCorridor || detectDeliveryZone(o.shipping);
          return {
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
            items: (o.items || []).map((it) => ({
              name: it.name || 'Automotive Part',
              qty: it.qty || 1,
              price: Number(it.price || 0),
            })),
            deliveryPin: computeOrderDeliveryPin(o),
            assignedCorridor: zone,
            createdAt: o.createdAt || null,
          };
        });

        return send(res, 200, { ok: true, stops: allStops });
      }

      // -----------------------------------------------------------------------
      // 1C. SCAN / BARCODE LOOKUP (q=...) WITH ROUTE-LOCK VALIDATION
      // Prevents out-of-route cherry-picking by verifying rider assignment
      // -----------------------------------------------------------------------
      const rawQ = String(req.query.q || '').trim();
      if (!rawQ) {
        return send(res, 400, { error: 'Missing search query (q)' });
      }

      const cleanQ = rawQ.replace(/^#/, '').trim();
      const upperQ = cleanQ.toUpperCase();
      const lowerQ = cleanQ.toLowerCase();
      const mdcPrefixed = /^mdc-/i.test(cleanQ) ? cleanQ : `MDC-${cleanQ}`;
      const searchKeys = Array.from(new Set([cleanQ, upperQ, lowerQ, mdcPrefixed, rawQ]));

      let foundDoc = null;
      let collectionType = 'cod orders';

      // Step 1: Direct Document ID Lookups (~15-30ms)
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

      // Step 3: Fast Substring Match over latest recent orders
      if (!foundDoc) {
        const [recentCod, recentOnline] = await Promise.all([
          codCol.limit(30).get(),
          onlineCol.limit(30).get(),
        ]);
        const recentPool = [
          ...recentCod.docs.map((d) => ({ ...d.data(), id: d.id, collectionType: 'cod orders' })),
          ...recentOnline.docs.map((d) => ({ ...d.data(), id: d.id, collectionType: 'online orders' })),
        ];
        const match = recentPool.find((o) => {
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

      // Route Corridor Detection
      const orderCorridor = foundDoc.assignedCorridor || detectDeliveryZone(foundDoc.shipping);
      const corridorMeta = CORRIDOR_METADATA[orderCorridor] || CORRIDOR_METADATA.central_town;

      // Solution A Route-Lock Check: If rider scans a parcel outside their assigned route
      if (riderId) {
        const cleanRider = riderId.trim().toUpperCase();
        // Check if parcel or its corridor is assigned to someone else
        const corridorDocSnap = await corridorsCol.doc(orderCorridor).get();
        const corridorData = corridorDocSnap.exists ? corridorDocSnap.data() : null;
        const assignedRider = foundDoc.assignedRiderId || corridorData?.assignedRiderId;
        const assignedName = foundDoc.assignedRiderName || corridorData?.assignedRiderName;

        if (assignedRider && assignedRider.toUpperCase() !== cleanRider) {
          return send(res, 403, {
            ok: false,
            error: `Route Lock: This parcel is assigned to ${corridorMeta.name} (Driver ${assignedName || assignedRider}). You cannot scan parcels assigned to another driver's route.`,
            code: 'ROUTE_LOCKED',
            assignedTo: assignedName || assignedRider,
            corridorName: corridorMeta.name,
          });
        }
      }

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
          assignedCorridor: orderCorridor,
          corridorName: corridorMeta.name,
          deliveryPin: computeOrderDeliveryPin(foundDoc),
          createdAt: foundDoc.createdAt || null,
        },
      });
    }

    // =========================================================================
    // 2. POST HANDLERS
    // =========================================================================
    if (req.method === 'POST') {
      const action = String(req.query.action || '').trim().toLowerCase();
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      // -----------------------------------------------------------------------
      // 2A. ASSIGN CORRIDOR ROUTE TO RIDER (Solution A)
      // Dispatches an entire geographic corridor manifest to a specific driver
      // -----------------------------------------------------------------------
      if (action === 'assign-corridor') {
        const { corridorId, riderId, riderName, riderPhone } = body;
        if (!corridorId || !CORRIDOR_METADATA[corridorId]) {
          return send(res, 400, { error: `Invalid or missing corridorId: "${corridorId}"` });
        }
        if (!riderId) {
          return send(res, 400, { error: 'Missing riderId to assign corridor to' });
        }

        const cleanRiderId = String(riderId).trim().toUpperCase();
        const cleanRiderName = String(riderName || 'MotoDC Partner').trim();
        const cleanRiderPhone = String(riderPhone || '').trim();

        // 1. Update Corridor Record
        await corridorsCol.doc(corridorId).set(
          {
            corridorId,
            corridorName: CORRIDOR_METADATA[corridorId].name,
            assignedRiderId: cleanRiderId,
            assignedRiderName: cleanRiderName,
            assignedRiderPhone: cleanRiderPhone,
            assignedAt: new Date().toISOString(),
            status: 'dispatched',
            updatedAt: Date.now(),
          },
          { merge: true }
        );

        // 2. Find all active orders belonging to this corridor and mark out_for_delivery
        const [recentCod, recentOnline] = await Promise.all([
          codCol.limit(50).get(),
          onlineCol.limit(50).get(),
        ]);

        const allDocs = [
          ...recentCod.docs.map((d) => ({ ref: d.ref, data: d.data(), coll: 'cod orders' })),
          ...recentOnline.docs.map((d) => ({ ref: d.ref, data: d.data(), coll: 'online orders' })),
        ];

        let assignedCount = 0;
        const updates = allDocs
          .filter((item) => {
            const st = String(item.data.orderStatus || 'placed').toLowerCase();
            if (['delivered', 'cancelled', 'returned'].includes(st)) return false;
            const zone = item.data.assignedCorridor || detectDeliveryZone(item.data.shipping);
            return zone === corridorId;
          })
          .map((item) => {
            assignedCount++;
            return item.ref.update({
              assignedCorridor: corridorId,
              assignedRiderId: cleanRiderId,
              assignedRiderName: cleanRiderName,
              assignedAt: new Date().toISOString(),
              orderStatus: 'out_for_delivery',
              history: FieldValue.arrayUnion({
                status: 'out_for_delivery',
                timestamp: new Date().toISOString(),
                note: `Dispatched in ${CORRIDOR_METADATA[corridorId].name} manifest to ${cleanRiderName} (${cleanRiderId})`,
              }),
            });
          });

        await Promise.all(updates);

        return send(res, 200, {
          ok: true,
          corridorId,
          corridorName: CORRIDOR_METADATA[corridorId].name,
          riderId: cleanRiderId,
          riderName: cleanRiderName,
          assignedStops: assignedCount,
          estimatedPayout: assignedCount * 45,
        });
      }

      // -----------------------------------------------------------------------
      // 2B. UNASSIGN / RECALL CORRIDOR ROUTE (Solution A)
      // Clears assignment back to Staged at Hub
      // -----------------------------------------------------------------------
      if (action === 'unassign-corridor') {
        const { corridorId } = body;
        if (!corridorId || !CORRIDOR_METADATA[corridorId]) {
          return send(res, 400, { error: `Invalid or missing corridorId: "${corridorId}"` });
        }

        // 1. Reset corridor record
        await corridorsCol.doc(corridorId).set(
          {
            corridorId,
            assignedRiderId: null,
            assignedRiderName: null,
            assignedRiderPhone: null,
            status: 'staged',
            updatedAt: Date.now(),
          },
          { merge: true }
        );

        // 2. Unassign active uncompleted orders in this corridor
        const [recentCod, recentOnline] = await Promise.all([
          codCol.limit(50).get(),
          onlineCol.limit(50).get(),
        ]);

        const allDocs = [
          ...recentCod.docs.map((d) => ({ ref: d.ref, data: d.data() })),
          ...recentOnline.docs.map((d) => ({ ref: d.ref, data: d.data() })),
        ];

        const updates = allDocs
          .filter((item) => {
            const st = String(item.data.orderStatus || 'placed').toLowerCase();
            if (['delivered', 'cancelled', 'returned'].includes(st)) return false;
            const zone = item.data.assignedCorridor || detectDeliveryZone(item.data.shipping);
            return zone === corridorId;
          })
          .map((item) =>
            item.ref.update({
              assignedRiderId: null,
              assignedRiderName: null,
              orderStatus: 'placed',
              history: FieldValue.arrayUnion({
                status: 'placed',
                timestamp: new Date().toISOString(),
                note: `Route unassigned by Karaikal Hub Dispatcher. Parcel returned to staging pool.`,
              }),
            })
          );

        await Promise.all(updates);

        return send(res, 200, {
          ok: true,
          corridorId,
          corridorName: CORRIDOR_METADATA[corridorId].name,
          unassigned: true,
        });
      }

      // -----------------------------------------------------------------------
      // 2C. 1-CLICK SMART AUTO-DISPATCH ALL CORRIDORS (Solution A)
      // Automatically pairs active registered delivery partners with unassigned
      // corridors based on rider service mode (Power Rider > Standard > Part-Time)
      // -----------------------------------------------------------------------
      if (action === 'auto-dispatch-all') {
        const [recentCod, recentOnline, corridorDocsSnap, partnersSnap] = await Promise.all([
          codCol.limit(50).get(),
          onlineCol.limit(50).get(),
          corridorsCol.get(),
          partnersCol.get(),
        ]);

        const corridorAssignments = {};
        corridorDocsSnap.docs.forEach((d) => {
          corridorAssignments[d.id] = d.data();
        });

        const activePartners = partnersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.active !== false);

        if (activePartners.length === 0) {
          return send(res, 400, { error: 'No active delivery partners registered in roster.' });
        }

        const pool = [
          ...recentCod.docs.map((d) => ({ ref: d.ref, data: d.data() })),
          ...recentOnline.docs.map((d) => ({ ref: d.ref, data: d.data() })),
        ];

        const activeOrders = pool.filter((o) => {
          const st = String(o.data.orderStatus || 'placed').toLowerCase();
          return !['delivered', 'cancelled', 'returned'].includes(st);
        });

        // Group into corridors
        const corridorOrdersMap = {
          central_town: [],
          north_corridor: [],
          south_corridor: [],
          west_corridor: [],
        };

        activeOrders.forEach((o) => {
          const zone = o.data.assignedCorridor || detectDeliveryZone(o.data.shipping);
          if (corridorOrdersMap[zone]) {
            corridorOrdersMap[zone].push(o);
          } else {
            corridorOrdersMap.central_town.push(o);
          }
        });

        // Find corridors that need dispatch
        const unassignedCorridors = Object.keys(CORRIDOR_METADATA)
          .map((cid) => ({
            id: cid,
            name: CORRIDOR_METADATA[cid].name,
            stopCount: corridorOrdersMap[cid]?.length || 0,
            currentlyAssigned: corridorAssignments[cid]?.assignedRiderId || null,
          }))
          .filter((c) => !c.currentlyAssigned && c.stopCount > 0)
          .sort((a, b) => b.stopCount - a.stopCount); // Largest volume corridors first

        if (unassignedCorridors.length === 0) {
          return send(res, 200, {
            ok: true,
            dispatchedCount: 0,
            message: 'All corridors with active orders are already dispatched or empty.',
          });
        }

        // Find available riders not already assigned to another corridor
        const currentlyAssignedRiderIds = new Set(
          Object.values(corridorAssignments)
            .map((a) => String(a?.assignedRiderId || '').toUpperCase())
            .filter(Boolean)
        );

        const availableRiders = activePartners.filter(
          (p) => !currentlyAssignedRiderIds.has(String(p.username || p.id).toUpperCase())
        );

        // Sort riders by serviceMode capacity
        const modeRank = { 'power rider': 3, standard: 2, 'part-time': 1 };
        availableRiders.sort((a, b) => {
          const rankA = modeRank[String(a.serviceMode || 'standard').toLowerCase()] || 2;
          const rankB = modeRank[String(b.serviceMode || 'standard').toLowerCase()] || 2;
          return rankB - rankA;
        });

        const assignments = [];
        for (let i = 0; i < unassignedCorridors.length; i++) {
          const corr = unassignedCorridors[i];
          const rider = availableRiders[i] || activePartners[i % activePartners.length]; // Fallback round-robin if fewer riders
          if (!rider) break;

          const rId = String(rider.username || rider.id).toUpperCase();
          const rName = rider.name || 'MotoDC Partner';
          const rPhone = rider.phone || '';

          // Update corridor doc
          await corridorsCol.doc(corr.id).set(
            {
              corridorId: corr.id,
              corridorName: CORRIDOR_METADATA[corr.id].name,
              assignedRiderId: rId,
              assignedRiderName: rName,
              assignedRiderPhone: rPhone,
              assignedAt: new Date().toISOString(),
              status: 'dispatched',
              updatedAt: Date.now(),
            },
            { merge: true }
          );

          // Update orders in that corridor
          const orderUpdates = (corridorOrdersMap[corr.id] || []).map((item) =>
            item.ref.update({
              assignedCorridor: corr.id,
              assignedRiderId: rId,
              assignedRiderName: rName,
              assignedAt: new Date().toISOString(),
              orderStatus: 'out_for_delivery',
              history: FieldValue.arrayUnion({
                status: 'out_for_delivery',
                timestamp: new Date().toISOString(),
                note: `Auto-dispatched in ${CORRIDOR_METADATA[corr.id].name} manifest to ${rName} (${rId}) via Smart Dispatcher`,
              }),
            })
          );
          await Promise.all(orderUpdates);

          assignments.push({
            corridorId: corr.id,
            corridorName: corr.name,
            riderId: rId,
            riderName: rName,
            serviceMode: rider.serviceMode || 'Standard',
            stopsAssigned: corr.stopCount,
            estimatedPayout: corr.stopCount * 45,
          });
        }

        return send(res, 200, {
          ok: true,
          dispatchedCount: assignments.length,
          assignments,
        });
      }

      // -----------------------------------------------------------------------
      // 2D. UPDATE RIDER LIVE GPS LOCATION (Active Delivery Run Only)
      // -----------------------------------------------------------------------
      if (action === 'update-rider-location') {
        const { riderId, riderName, lat, lng, speed, heading, accuracy, isGpsActive } = body;
        if (!riderId) {
          return send(res, 400, { error: 'riderId is required' });
        }

        const cleanRiderId = String(riderId).trim().toUpperCase();

        if (isGpsActive === false) {
          await partnersCol.doc(cleanRiderId).set(
            {
              isGpsActive: false,
              lastSeenAt: new Date().toISOString(),
            },
            { merge: true }
          );
          return send(res, 200, { ok: true, isGpsActive: false });
        }

        if (lat == null || lng == null) {
          return send(res, 400, { error: 'lat and lng are required' });
        }

        const locationPayload = {
          lat: Number(lat),
          lng: Number(lng),
          speed: Number(speed || 0),
          heading: Number(heading || 0),
          accuracy: Number(accuracy || 0),
          riderId: cleanRiderId,
          riderName: String(riderName || 'MotoDC Partner').trim(),
          updatedAt: new Date().toISOString(),
        };

        const [codSnap, onlineSnap] = await Promise.all([
          codCol.where('assignedRiderId', '==', cleanRiderId).where('orderStatus', '==', 'out_for_delivery').get(),
          onlineCol.where('assignedRiderId', '==', cleanRiderId).where('orderStatus', '==', 'out_for_delivery').get(),
        ]);

        const orderUpdates = [...codSnap.docs, ...onlineSnap.docs].map((d) =>
          d.ref.update({
            liveLocation: locationPayload,
          })
        );

        const partnerUpdate = partnersCol.doc(cleanRiderId).set(
          {
            lastLocation: locationPayload,
            lastSeenAt: locationPayload.updatedAt,
            isGpsActive: true,
          },
          { merge: true }
        );

        await Promise.all([...orderUpdates, partnerUpdate]);

        return send(res, 200, {
          ok: true,
          updatedOrdersCount: orderUpdates.length,
          location: locationPayload,
        });
      }

      // -----------------------------------------------------------------------
      // 2E. COMPLETE DOORSTEP HANDOVER & MARK DELIVERED
      // -----------------------------------------------------------------------
      const { docId, collectionType, paymentMethod, paymentSettledVia, riderName, riderId } = body;

      if (!docId) {
        return send(res, 400, { error: 'Missing docId in request body' });
      }

      const collName =
        collectionType || (String(paymentMethod).toLowerCase() === 'cod' ? 'cod orders' : 'online orders');
      const orderRef = db.collection('orders').doc(collName).collection('records').doc(String(docId));
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return send(res, 404, { error: 'Order not found in database' });
      }

      const isCod = String(paymentMethod || '').toLowerCase() === 'cod';
      const isUpiDoorstep = paymentSettledVia === 'upi_doorstep';

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
          note: isUpiDoorstep
            ? `Doorstep verified via UPI QR Code by ${riderName || 'Rider'} (${riderId || 'MDC-R01'}) via MotoDC Partner App`
            : `Doorstep verified by ${riderName || 'Rider'} (${riderId || 'MDC-R01'}) via MotoDC Partner App`,
        }),
      };

      if (isUpiDoorstep) {
        updates.paymentStatus = 'paid';
        updates.paymentMethod = 'upi_doorstep';
        updates.paidVia = 'Doorstep UPI QR Code';
      } else if (isCod) {
        updates.paymentStatus = 'paid';
      }

      await orderRef.update(updates);
      return send(res, 200, {
        ok: true,
        delivered: true,
        docId,
        paymentSettledVia: isUpiDoorstep ? 'upi_doorstep' : isCod ? 'cod' : 'online',
      });
    }

    return send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('Delivery partner API error:', err);
    return send(res, 500, { error: err.message || 'Internal server error' });
  }
}
