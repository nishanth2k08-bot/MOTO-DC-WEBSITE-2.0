import { majorSpareProducts } from './_catalog.js';

function send(res, status, body) {
  res.status(status).json(body);
}

// Find up to 3 relevant products from the local catalog based on user query or AI response
function findRelevantCatalogParts(queryText, aiResponseText) {
  const combined = `${queryText || ''} ${aiResponseText || ''}`.toLowerCase();
  const matched = [];

  // Special thematic matching for popular modifications and brands
  if (combined.includes('modification') || combined.includes('modify') || combined.includes('custom') || combined.includes('exhaust') || combined.includes('tuning')) {
    const perfParts = majorSpareProducts.filter(p => 
      p.name.includes('Akrapovic') || p.name.includes('K&N Performance') || p.name.includes('Brembo RCS 19') || p.name.includes('Rolon Brass')
    );
    for (const p of perfParts.slice(0, 3)) {
      matched.push({ id: p.id, name: p.name, price: p.price, query: p.name });
    }
    if (matched.length > 0) return matched;
  }

  if (combined.includes('ktm') || combined.includes('duke') || combined.includes('rc 200') || combined.includes('rc 390')) {
    const ktmParts = majorSpareProducts.filter(p => 
      p.brand === 'KTM' || (p.fitment && p.fitment.toLowerCase().includes('ktm')) || p.name.includes('Motul 7100')
    );
    for (const p of ktmParts.slice(0, 3)) {
      matched.push({ id: p.id, name: p.name, price: p.price, query: p.name });
    }
    if (matched.length > 0) return matched;
  }

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

// Ensure Gemini contents are strictly valid: first turn is 'user', alternating roles
function buildGeminiContents(history, currentMessage) {
  const turns = [];

  if (Array.isArray(history)) {
    for (const item of history.slice(-8)) {
      if (!item || !item.text) continue;
      // Skip the initial welcome greeting
      if (item.id === 'welcome' || item.sender === 'system') continue;
      const role = item.sender === 'user' ? 'user' : 'model';
      turns.push({ role, text: String(item.text).slice(0, 600) });
    }
  }

  // Ensure current user message is appended if not already the last turn
  const lastTurn = turns[turns.length - 1];
  if (!lastTurn || lastTurn.role !== 'user' || lastTurn.text !== String(currentMessage).slice(0, 600)) {
    turns.push({ role: 'user', text: String(currentMessage).slice(0, 800) });
  }

  // Drop any leading 'model' turns so it always begins with 'user'
  while (turns.length > 0 && turns[0].role !== 'user') {
    turns.shift();
  }

  if (turns.length === 0) {
    return [{ role: 'user', parts: [{ text: String(currentMessage).slice(0, 800) }] }];
  }

  // Merge consecutive turns with identical roles to satisfy Gemini alternating requirement
  const alternating = [];
  for (const turn of turns) {
    if (alternating.length > 0 && alternating[alternating.length - 1].role === turn.role) {
      alternating[alternating.length - 1].parts[0].text += `\n${turn.text}`;
    } else {
      alternating.push({
        role: turn.role,
        parts: [{ text: turn.text }]
      });
    }
  }

  return alternating;
}

export default async function handler(req, res) {
  // Support CORS
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

  const rawKey = clientApiKey || 
                 process.env.GEMINI_API_KEY || 
                 process.env.VITE_GEMINI_API_KEY || 
                 process.env.GOOGLE_API_KEY || 
                 process.env.GEMINI_KEY || 
                 process.env.VITE_GOOGLE_API_KEY;

  const apiKey = rawKey ? String(rawKey).trim().replace(/^["']|["']$/g, '') : '';

  if (!apiKey) {
    return send(res, 200, {
      fallback: true,
      reason: 'no_key',
      message: 'Gemini API key not configured on server'
    });
  }

  const systemPrompt = `You are MotoDC AI, the expert master workshop mechanic and friendly assistant for MotoDC — India's premier auto & motorcycle spare parts store (motodc-official.vercel.app).

CORE CAPABILITIES & BEHAVIORS:
1. MASTER AUTOMOTIVE & MOTORCYCLE MECHANIC:
   - You are a certified automobile and motorcycle mechanic with deep workshop experience.
   - For vehicle symptoms (brake squeal, sputtering/misfire, clutch slip, chain slack/rattle, overheating, battery clicking, weird sounds, vibrations, oil viscosity):
     - State root causes directly.
     - Provide 2-3 actionable diagnostic or repair tips.
     - Recommend matching genuine OEM replacement parts available on MotoDC.
   - For BIKE MODIFICATIONS & CUSTOM BUILDS (full modifications, performance exhaust, intake, ECU remap/piggyback, Brembo brakes, re-gearing):
     - Give an expert workshop blueprint: intake breathing, tuned exhaust, fuel mapping/ECU, suspension/brake upgrades, and Indian RTO street legality guidelines.
   - For SPECIFIC VEHICLES & BRANDS (KTM Duke/RC/Adventure, Royal Enfield, Yamaha, Bajaj, TVS, Honda, passenger cars):
     - Provide exact OEM fluids (e.g. Motul 7100 10W50 for KTM), capacities, spark plug grades, and maintenance specs.

2. MOTODC STORE POLICIES (ALWAYS ACCURATE):
   - Cash on Delivery (COD): 100% Cash on Delivery available across all pin codes in India with zero advance payment.
   - Delivery: Dispatched within 24 hours, delivered in 3-5 business days across India. Free shipping on orders over ₹2,000 (flat ₹99 otherwise).
   - Returns: 7-Day Hassle-Free Return & Replacement Guarantee with free door pickup via "My Orders".
   - Authenticity: 100% Genuine OEM/OES components backed by manufacturer warranty (Brembo, Bosch, Motul, Castrol, NGK, Philips, Rolon).

3. OFFSIDE & GENERAL KNOWLEDGE QUESTIONS:
   - You are also a fully capable, friendly, general-purpose AI.
   - If the user asks ANY offside or non-automotive question (general knowledge, science, math, coding, life advice, trivia, jokes, sports, casual chat):
     - ALWAYS answer helpfully, accurately, and naturally!
     - NEVER refuse to answer. Never say "I can only answer automotive questions".
     - Answer directly and concisely.

4. TONE & STYLE:
   - Friendly, expert, warm, and concise (under 140 words unless answering a complex multi-step technical inquiry).
   - Never output boilerplate disclaimers, walls of text, or generic essay dumps.`;

  try {
    const contents = buildGeminiContents(history, message);

    const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    let textOutput = '';
    let lastError = null;

    for (const modelName of models) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

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
              temperature: 0.6,
              maxOutputTokens: 420,
              topP: 0.95
            }
          })
        });

        clearTimeout(timeout);

        if (apiRes.ok) {
          const data = await apiRes.json();
          textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (textOutput) break;
        } else {
          const errDetail = await apiRes.text();
          console.warn(`Gemini model ${modelName} returned status ${apiRes.status}:`, errDetail);
          lastError = `${apiRes.status}: ${errDetail}`;
        }
      } catch (e) {
        console.warn(`Gemini model ${modelName} request error:`, e.message);
        lastError = e.message;
      }
    }

    if (!textOutput) {
      console.warn('All Gemini models failed or returned empty. Last error:', lastError);
      return send(res, 200, { fallback: true, reason: 'api_error', error: lastError });
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
