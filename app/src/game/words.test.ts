import { describe, expect, it } from 'vitest'
import type { WordPair } from './types'
import wordsNl from './words.nl.json'
import wordsEn from './words.en.json'

const catalogs: [string, WordPair[]][] = [
  ['nl', wordsNl as WordPair[]],
  ['en', wordsEn as WordPair[]],
]

const norm = (s: string) => s.toLowerCase().trim()

describe.each(catalogs)('word catalog %s', (_locale, list) => {
  it('has well-formed entries with at least 5 distractors each', () => {
    for (const entry of list) {
      const label = `${entry.a} / ${entry.b}`
      expect(entry.a.trim(), label).not.toBe('')
      expect(entry.b.trim(), label).not.toBe('')
      expect(entry.domain.trim(), label).not.toBe('')
      expect(entry.distractors.length, label).toBeGreaterThanOrEqual(5)
    }
  })

  it('never repeats a word within an entry (pair and distractors stay distinct)', () => {
    for (const entry of list) {
      const words = [entry.a, entry.b, ...entry.distractors].map(norm)
      expect(new Set(words).size, `${entry.a} / ${entry.b}`).toBe(words.length)
    }
  })

  it('never repeats a pair across the catalog', () => {
    const seen = new Set<string>()
    for (const entry of list) {
      const key = [norm(entry.a), norm(entry.b)].sort().join('|')
      expect(seen.has(key), `${entry.a} / ${entry.b}`).toBe(false)
      seen.add(key)
    }
  })

  it('defines every word, aligned with its distractor list', () => {
    for (const entry of list) {
      const label = `${entry.a} / ${entry.b}`
      expect(entry.defA.trim(), label).not.toBe('')
      expect(entry.defB.trim(), label).not.toBe('')
      expect(entry.distractorDefs.length, label).toBe(entry.distractors.length)
      for (const def of entry.distractorDefs) expect(def.trim(), label).not.toBe('')
    }
  })

  // A definition naming another word of its own entry would unmask the decoy
  // or a whispered fake word on the reveal screen.
  it('never names any of the entry words inside a definition', () => {
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    for (const entry of list) {
      const words = [entry.a, entry.b, ...entry.distractors]
      const defs = [entry.defA, entry.defB, ...entry.distractorDefs]
      for (const def of defs) {
        for (const w of words) {
          expect(def.toLowerCase(), `${entry.a} / ${entry.b}: "${def}"`).not.toMatch(
            new RegExp(`\\b${escape(norm(w))}\\b`),
          )
        }
      }
    }
  })
})

it('the Dutch catalog carries the full 540-pair deck', () => {
  expect((wordsNl as WordPair[]).length).toBeGreaterThanOrEqual(540)
})
