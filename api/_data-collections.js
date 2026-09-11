export const COLLECTIONS={
  orders:{cod:'codOrders',online:'onlineOrders'},
  paymentIntents:{cod:'codPaymentIntents',online:'onlinePaymentIntents'},
  returnRequests:{codReturn:'cod return',codReplacement:'cod replacement',onlineReturn:'online return',onlineReplacement:'online replacement'}
};
export function orderCollection(paymentMethod){return String(paymentMethod||'').toLowerCase()==='online'?COLLECTIONS.orders.online:COLLECTIONS.orders.cod}
export function paymentIntentCollection(paymentMethod){return String(paymentMethod||'').toLowerCase()==='online'?COLLECTIONS.paymentIntents.online:COLLECTIONS.paymentIntents.cod}
export function returnRequestCollection(paymentMethod,type){const online=String(paymentMethod||'').toLowerCase()==='online';return online?(type==='replacement'?COLLECTIONS.returnRequests.onlineReplacement:COLLECTIONS.returnRequests.onlineReturn):(type==='replacement'?COLLECTIONS.returnRequests.codReplacement:COLLECTIONS.returnRequests.codReturn)}
