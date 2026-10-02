import { algoliasearch } from 'algoliasearch';

let _client = null;

export function getAlgoliaClient() {
  if (_client) return _client;
  const appId = process.env.ALGOLIA_APP_ID || '04KTVI2AAM';
  const adminKey = process.env.ALGOLIA_ADMIN_KEY || '2bcd8d41ba802a02414ddfc79f0f2432';
  if (!appId || !adminKey) return null;
  _client = algoliasearch(appId, adminKey);
  return _client;
}

export async function indexOrderInAlgolia(order) {
  try {
    const client = getAlgoliaClient();
    if (!client || !order) return;
    
    await client.saveObject({
      indexName: 'motodc_orders',
      body: {
        objectID: String(order.id || order.orderId),
        orderId: String(order.orderId || order.id || ''),
        userId: String(order.userId || ''),
        customerName: String(order.customer?.name || ''),
        customerPhone: String(order.customer?.phone || ''),
        customerEmail: String(order.customer?.email || ''),
        city: String(order.shipping?.city || ''),
        state: String(order.shipping?.state || ''),
        pincode: String(order.shipping?.pincode || ''),
        address: String(order.shipping?.address || ''),
        paymentMethod: String(order.paymentMethod || ''),
        paymentStatus: String(order.paymentStatus || ''),
        orderStatus: String(order.orderStatus || 'placed'),
        total: Number(order.total || 0),
        items: (order.items || []).map(i => i.name || ''),
        createdAt: order.createdAt || Date.now()
      }
    });
    console.log(`[Algolia] Order ${order.orderId || order.id} successfully indexed`);
  } catch (err) {
    console.error('[Algolia] Failed to index order:', err?.message || err);
  }
}

export async function deleteOrderFromAlgolia(orderDocId) {
  try {
    const client = getAlgoliaClient();
    if (!client || !orderDocId) return;
    await client.deleteObject({
      indexName: 'motodc_orders',
      objectID: String(orderDocId)
    });
    console.log(`[Algolia] Order ${orderDocId} removed from search`);
  } catch (err) {
    console.error('[Algolia] Failed to delete order:', err?.message || err);
  }
}
