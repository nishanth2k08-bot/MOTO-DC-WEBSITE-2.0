import { majorSpareProducts } from './_catalog.js';

function send(res, status, body) {
  res.status(status).json(body);
}

// Find up to 3 relevant products from the local catalog based on user query or AI response
function findRelevantCatalogParts(queryText, aiResponseText) {
  const combined = `${queryText || ''} ${aiResponseText || ''}`.toLowerCase();
  const matched = [];

  for (const p of majorSpareProducts) {
    const nameLow = (p.name || '').toLowerCase();
    const fitLow = (p.fitment || '').toLowerCase();
    const brandLow = (p.brand || '').toLowerCase();

    // Check if key words match
    const keywords = combined.split(/\s+/).filter(w => w.length >= 4);
    let matchScore = 0;
    for (const kw of keywords) {
      if (nameLow.includes(kw)) matchScore += 2;
      if (fitLow.includes(kw)) matchScore += 2;
      if (brandLow.includes(kw)) matchScore += 1;
    }

    if (matchScore >= 2) {
      matched.push({
        id: p.id,
        name: p.name,
        price: p.price,
        query: p.name
      });
      if (matched.length >= 3) break;
    }
  }

  return matched;
}

export default async function handler(req, res) {
  // Support CORS for local dev / cross-origin if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed' });
  }

  const { message, history, apiKey: clientApiKey } = req.body || {};
  if (!message || typeof message !== 'string') {
    return send(res, 400, { error: 'Message is required' });
  }

  const apiKey = clientApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  // If no Gemini API key is configured anywhere, signal the client to use the built-in intelligent engine
  if (!apiKey) {
    return send(res, 200, {
      fallback: true,
      reason: 'no_key',
      message: 'Gemini API key not configured on server'
    });
  }

  const systemPrompt = `You are MotoDC AI, the expert automotive and customer support assistant for MotoDC — a premier automotive and motorcycle spare parts platform in India (motodc-official.vercel.app).

RULES & PERSONALITY:
1. PRECISE & NATURAL: Answer concisely and directly. Never output long essays, boilerplate disclaimers, or generic diagnostic dumps.
2. GREETINGS & CASUAL TALK: If the user says "hi", "hello", "hey", or casual phrases, respond warmly in 1 or 2 friendly sentences. Do not dump a technical diagnostic lecture on a simple greeting.
3. STORE POLICIES (MOTODC):
   - Cash on Delivery (COD): 100% Cash on Delivery available across India with zero advance payment.
   - Delivery: Dispatched within 24 hours, delivered in 3-5 business days. Free shipping on orders over ₹2,000 (flat ₹99 otherwise).
   - Returns: 7-Day Hassle-Free Return & Replacement Guarantee with free door pickup via "My Orders".
   - Authenticity: 100% Genuine OEM/OES components backed by manufacturer warranty (Brembo, Bosch, Motul, Castrol, NGK, Philips, Rolon).
4. VEHICLE DIAGNOSTICS:
   - Identify the probable root cause in 1-2 sentences.
   - Provide 2-3 actionable, bulleted maintenance steps.
   - Recommend genuine replacement parts.
5. Formatting: Use clean bullet points when listing steps or policies. Keep answers under 120 words unless answering a complex multi-part automotive question.`;

  try {
    const contents = [];

    // Append recent conversational context (last 6 messages)
    if (Array.isArray(history)) {
      for (const turn of history.slice(-6)) {
        if (turn.sender === 'user' && turn.text) {
          contents.push({
            role: 'user',
            parts: [{ text: turn.text.slice(0, 500) }]
          });
        } else if (turn.sender === 'ai' && turn.text) {
          contents.push({
            role: 'model',
            parts: [{ text: turn.text.slice(0, 500) }]
          });
        }
      }
    }

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: message.slice(0, 600) }]
    });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);

    const apiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 380,
          topP: 0.95
        }
      })
    });

    clearTimeout(timeout);

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.warn('Gemini API call failed with status:', apiRes.status, errText);
      return send(res, 200, { fallback: true, reason: 'api_error', status: apiRes.status });
    }

    const data = await apiRes.json();
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textOutput) {
      return send(res, 200, { fallback: true, reason: 'empty_response' });
    }

    // Find matching catalog parts if relevant
    const matchingParts = findRelevantCatalogParts(message, textOutput);

    return send(res, 200, {
      text: textOutput.trim(),
      parts: matchingParts.length > 0 ? matchingParts : undefined,
      source: 'gemini'
    });
  } catch (err) {
    console.error('Gemini copilot exception:', err.message);
    return send(res, 200, { fallback: true, reason: 'timeout_or_network' });
  }
}
