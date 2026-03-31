import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { computeAnswer } from '../lib/srs'

/**
 * Central data hook.
 * Loads all cards + progress for the current user and exposes
 * mutation functions. Components never touch Supabase directly.
 */
export function useCards(userId) {
  const [cards, setCards]     = useState([])   // merged card+progress objects
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // ── Load ──────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    // Fetch cards and progress in parallel
    const [{ data: cardRows, error: cardErr }, { data: progRows, error: progErr }] =
      await Promise.all([
        supabase.from('cards').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('progress').select('*').eq('user_id', userId),
      ])

    if (cardErr || progErr) {
      setError((cardErr || progErr).message)
      setLoading(false)
      return
    }

    // Merge progress into card objects
    const progMap = {}
    ;(progRows || []).forEach(p => { progMap[p.card_id] = p })

    const merged = (cardRows || []).map(c => ({
      ...c,
      correct:   progMap[c.id]?.correct   ?? 0,
      wrong:     progMap[c.id]?.wrong     ?? 0,
      interval:  progMap[c.id]?.interval  ?? 1,
      next_due:  progMap[c.id]?.next_due  ?? new Date(0).toISOString(),
      last_seen: progMap[c.id]?.last_seen ?? null,
    }))

    setCards(merged)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  // ── Answer a card ──────────────────────────────────────
  const answerCard = useCallback(async (cardId, correct) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const updates = computeAnswer(card, correct)

    // Optimistic update
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updates } : c))

    // Upsert to progress table
    const { error } = await supabase.from('progress').upsert({
      user_id: userId,
      card_id: cardId,
      ...updates,
    }, { onConflict: 'user_id,card_id' })

    if (error) {
      console.error('progress upsert failed:', error.message)
      // Roll back optimistic update on failure
      setCards(prev => prev.map(c => c.id === cardId ? card : c))
    }
  }, [cards, userId])

  // ── Save note (without resetting progress) ────────────
  const saveNote = useCallback(async (cardId, note) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, note } : c))
    const { error } = await supabase.from('cards').update({ note }).eq('id', cardId)
    if (error) console.error('note save failed:', error.message)
  }, [])

  // ── Edit a card ────────────────────────────────────────
  const editCard = useCallback(async (cardId, { sv, en, note }) => {
    const old = cards.find(c => c.id === cardId)
    if (!old) return { error: 'Card not found' }

    const wordsChanged = sv !== old.sv || en !== old.en
    const newData = { sv, en, note }

    // Check for duplicate (different card, same sv+en pair)
    const dup = cards.find(c => c.id !== cardId && c.sv === sv && c.en === en)
    if (dup) return { error: `"${sv} / ${en}" already exists in your list.` }

    const { error } = await supabase.from('cards').update(newData).eq('id', cardId)
    if (error) return { error: error.message }

    if (wordsChanged) {
      // Reset progress for this card
      await supabase.from('progress').upsert({
        user_id: userId, card_id: cardId,
        correct: 0, wrong: 0, interval: 1,
        next_due: new Date(0).toISOString(), last_seen: null,
      }, { onConflict: 'user_id,card_id' })
    }

    setCards(prev => prev.map(c => c.id === cardId ? {
      ...c, ...newData,
      ...(wordsChanged ? { correct:0, wrong:0, interval:1, next_due: new Date(0).toISOString(), last_seen:null } : {}),
    } : c))

    return { error: null }
  }, [cards, userId])

  // ── Delete a card ──────────────────────────────────────
  const deleteCard = useCallback(async (cardId) => {
    setCards(prev => prev.filter(c => c.id !== cardId))
    const { error } = await supabase.from('cards').delete().eq('id', cardId)
    if (error) {
      console.error('delete failed:', error.message)
      load() // re-sync on failure
    }
  }, [load])

  // ── Import word pairs ──────────────────────────────────
  const importPairs = useCallback(async (pairs) => {
    if (!pairs.length) return { added: 0, skipped: 0 }

    // Filter out pairs already in the user's list
    const existing = new Set(cards.map(c => `${c.sv}\t${c.en}`))
    const fresh = pairs.filter(p => !existing.has(`${p.sv}\t${p.en}`))
    const skipped = pairs.length - fresh.length

    if (!fresh.length) return { added: 0, skipped }

    const rows = fresh.map(p => ({ user_id: userId, sv: p.sv, en: p.en, note: '' }))

    const { data, error } = await supabase
      .from('cards')
      .insert(rows)
      .select()

    if (error) return { added: 0, skipped, error: error.message }

    // Append new cards (with default progress) to local state
    const newCards = (data || []).map(c => ({
      ...c, correct: 0, wrong: 0, interval: 1,
      next_due: new Date(0).toISOString(), last_seen: null,
    }))
    setCards(prev => [...prev, ...newCards])

    return { added: fresh.length, skipped }
  }, [cards, userId])

  return { cards, loading, error, answerCard, saveNote, editCard, deleteCard, importPairs, reload: load }
}
