import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

// Java-style .properties parser: `key = value`, `#`/`!` comments, `\n` escapes.
function parseProperties(src: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('!')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    out[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/\\n/g, '\n')
  }
  return out
}

const VIRTUAL = 'virtual:i18n'

// Serves both locales as `virtual:i18n` and enforces requirements §6.4:
// a key present in English but missing in Dutch is a build error, never a
// silent fallback (and vice versa, to catch dead Dutch keys).
export function i18nProperties(): Plugin {
  let dir = ''
  return {
    name: 'charlatan-i18n-properties',
    configResolved(config) {
      dir = path.resolve(config.root, 'src/i18n')
    },
    resolveId(id) {
      if (id === VIRTUAL) return '\0' + VIRTUAL
    },
    load(id) {
      if (id !== '\0' + VIRTUAL) return
      const enPath = path.join(dir, 'en-i18n.properties')
      const nlPath = path.join(dir, 'dutch-i18n.properties')
      this.addWatchFile(enPath)
      this.addWatchFile(nlPath)
      const en = parseProperties(fs.readFileSync(enPath, 'utf8'))
      const nl = parseProperties(fs.readFileSync(nlPath, 'utf8'))
      const missing = Object.keys(en).filter((k) => !(k in nl))
      if (missing.length > 0) {
        throw new Error(
          `dutch-i18n.properties is missing ${missing.length} key(s): ${missing.join(', ')}`,
        )
      }
      const extra = Object.keys(nl).filter((k) => !(k in en))
      if (extra.length > 0) {
        throw new Error(
          `dutch-i18n.properties has key(s) absent from en-i18n.properties: ${extra.join(', ')}`,
        )
      }
      return `export const messages = ${JSON.stringify({ en, nl })};`
    },
  }
}
