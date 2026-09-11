export const COLLECTIONS={orders:'orders',paymentIntents:'paymentIntents',request:'request'};
export const ORDER_CATEGORIES={cod:'cod orders',online:'online orders'};
export const PAYMENT_INTENT_CATEGORIES={cod:'cod payment intents',online:'online payment intents'};
export const REQUEST_CATEGORIES={codReturn:'cod return',codReplacement:'cod replacement',onlineReturn:'online return',onlineReplacement:'online replacement'};
export const orderCategory=method=>String(method||'').toLowerCase()==='online'?ORDER_CATEGORIES.online:ORDER_CATEGORIES.cod;
export const paymentIntentCategory=method=>String(method||'').toLowerCase()==='online'?PAYMENT_INTENT_CATEGORIES.online:PAYMENT_INTENT_CATEGORIES.cod;
export const requestCategory=(method,type)=>{const online=String(method||'').toLowerCase()==='online';return online?(type==='replacement'?REQUEST_CATEGORIES.onlineReplacement:REQUEST_CATEGORIES.onlineReturn):(type==='replacement'?REQUEST_CATEGORIES.codReplacement:REQUEST_CATEGORIES.codReturn)};
