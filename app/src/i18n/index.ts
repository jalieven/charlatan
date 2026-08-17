import { createContext, useContext } from 'react'
// Served by the i18nProperties Vite plugin; the build fails if the Dutch
// catalog is incomplete (§6.4), so lookups here can never silently fall back.
import { messages } from 'virtual:i18n'
import type { Locale } from '../game/types'

type Params = Record<string, string | number>

export function translate(locale: Locale, key: string, params?: Params): string {
  const catalog = messages[locale] as Record<string, string>
  const template = catalog[key]
  if (template === undefined) return key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`,
  )
}

export const LocaleContext = createContext<Locale>('nl')

export function useT() {
  const locale = useContext(LocaleContext)
  return (key: string, params?: Params) => translate(locale, key, params)
}
