// api/suggest.js
// Vercel serverless function — keeps the Anthropic API key server-side.
// POST body: { words: [{ sv, en }, ...] }  (current user word list, up to 200 sent for context)
// Returns:   { suggestions: [{ sv, en }, ...] }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { words = [] } = req.body ?? {}

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  // Send up to 200 words as context — enough to judge topics and difficulty
  const sample = words.slice(0, 200).map(w => `${w.sv} / ${w.en}`).join('\n')

  const prompt = words.length === 0
    ? `Suggest 15 common Swedish vocabulary words for a beginner learner.
Return ONLY a JSON array, no other text, no markdown, no explanation.
Format: [{"sv":"word","en":"translation"}, ...]`
    : `Here is a Swedish vocabulary list a learner is studying:

${sample}

Based on the topics, difficulty level, and gaps in this list, suggest 15 new Swedish words or phrases that would complement it well. Prioritise words that are thematically related or at a similar difficulty level, and avoid any that are already in the list above.

Return ONLY a JSON array, no other text, no markdown, no explanation.
Format: [{"sv":"word","en":"translation"}, ...]`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: `Anthropic API error: ${err}` })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    // Strip any accidental markdown fences
    const clean = text.replace(/```json|```/g, '').trim()
    const suggestions = JSON.parse(clean)

    if (!Array.isArray(suggestions)) throw new Error('Response was not an array')

    // Normalise to lowercase and filter out anything already in the list
    const existingSet = new Set(words.map(w => `${w.sv.toLowerCase()}\t${w.en.toLowerCase()}`))
    const fresh = suggestions
      .map(s => ({ sv: String(s.sv).toLowerCase(), en: String(s.en).toLowerCase() }))
      .filter(s => s.sv && s.en && !existingSet.has(`${s.sv}\t${s.en}`))

    return res.status(200).json({ suggestions: fresh })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
