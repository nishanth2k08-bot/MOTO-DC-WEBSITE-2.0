import { majorSpareProducts } from './major-spares';

export function isStaleUnsplash(url) {
  if (!url) return false;
  return typeof url === 'string' && url.includes('images.unsplash.com');
}

export function mergeProductsWithMajorSpares(firestoreDocs) {
  const byName = new Map();
  const byId = new Map();
  const result = [];

  (firestoreDocs || []).forEach(d => {
    if (d.deleted) return;
    const norm = String(d.name || '').trim().toLowerCase();

    if (norm && byName.has(norm)) {
      const prev = byName.get(norm);
      const isDUpdated = Boolean(d.adminUpdated || (d.image && !isStaleUnsplash(d.image)));
      const isPrevUpdated = Boolean(prev.adminUpdated || (prev.image && !isStaleUnsplash(prev.image)));
      if (isDUpdated && !isPrevUpdated) {
        const idx = result.indexOf(prev);
        if (idx !== -1) result.splice(idx, 1);
        result.push(d);
        byName.set(norm, d);
        if (d.id) byId.set(d.id, d);
      }
      return;
    }
    result.push(d);
    if (d.id) byId.set(d.id, d);
    if (norm) byName.set(norm, d);
  });

  majorSpareProducts.forEach(sp => {
    const norm = String(sp.name || '').trim().toLowerCase();
    const existing = byId.get(sp.id) || byName.get(norm);
    if (!existing) {
      result.push(sp);
    } else {
      if (!existing.aliasId) existing.aliasId = sp.id;
      // If the firestore doc has an unedited placeholder Unsplash image and sp has a curated/studio photo, use sp's photo
      if (isStaleUnsplash(existing.image) && !existing.adminUpdated && sp.image) {
        existing.image = sp.image;
      }
    }
  });

  return result;
}
