// api/suggest.js
// POST body: { words: [{sv, en}], difficulty: -2 | -1 | 0 | 1 | 2 }
// Returns:   { suggestions: [{sv, en}] }

const DIFFICULTY_INSTRUCTIONS = {
  '-2': `The suggested words should be significantly easier and more common than the words in the list above — think very basic everyday vocabulary, short words, simple concepts. Suitable for an absolute beginner.`,
  '-1': `The suggested words should be somewhat easier than the words in the list above — slightly more common or simpler vocabulary.`,
   '0': `The suggested words should match the difficulty and style of the words in the list above as closely as possible.`,
   '1': `The suggested words should be somewhat harder than the words in the list above — slightly less common, more nuanced, or more complex phrasing.`,
   '2': `The suggested words should be significantly harder than the words in the list above — advanced vocabulary, idiomatic expressions, or complex grammatical structures.`,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { words = [], difficulty = 0 } = req.body ?? {}

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const diffKey = String(Math.max(-2, Math.min(2, Math.round(difficulty))))
  const diffInstruction = DIFFICULTY_INSTRUCTIONS[diffKey]

  const sample = words.slice(0, 200).map(w => `${w.sv} / ${w.en}`).join('\n')

  const prompt = words.length === 0
    ? `Suggest 15 Swedish vocabulary words for a learner. ${diffKey === '0' || diffKey === '-1' || diffKey === '-2' ? 'Focus on common everyday words.' : diffKey === '1' ? 'Include some intermediate vocabulary.' : 'Include advanced vocabulary and idiomatic expressions.'}
Return ONLY a JSON array, no other text, no markdown, no explanation.
Format: [{"sv":"word","en":"translation"}, ...]`
    : `Here is a Swedish vocabulary list a learner is studying:

${sample}

Based on the topics in this list, suggest 15 new Swedish words or phrases that would complement it well. Avoid any words already in the list above.

Difficulty instruction: ${diffInstruction}

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
    const clean = text.replace(/```json|```/g, '').trim()
    const suggestions = JSON.parse(clean)

    if (!Array.isArray(suggestions)) throw new Error('Response was not an array')

    const existingSet = new Set(words.map(w => `${w.sv.toLowerCase()}\t${w.en.toLowerCase()}`))
    const fresh = suggestions
      .map(s => ({ sv: String(s.sv).toLowerCase(), en: String(s.en).toLowerCase() }))
      .filter(s => s.sv && s.en && !existingSet.has(`${s.sv}\t${s.en}`))

    return res.status(200).json({ suggestions: fresh })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
