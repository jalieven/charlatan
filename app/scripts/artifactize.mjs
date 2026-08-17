// Converts the single-file Vite build (a complete HTML document) into a
// body-fragment the artifact host can wrap in its own skeleton: keeps the
// <title>, inlined <style> and <script>, and the root div; drops the document
// shell and any external references (the artifact CSP blocks them anyway).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist')
const input = path.join(dist, 'index.html')
const output = path.join(dist, 'charlatan-artifact.html')

let html = fs.readFileSync(input, 'utf8')

const title = /<title>[\s\S]*?<\/title>/.exec(html)?.[0] ?? '<title>Charlatan</title>'
const styles = html.match(/<style[\s\S]*?<\/style>/g) ?? []
const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/g) ?? []
const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)
// Body content minus any scripts (they're re-appended once, after the root div).
const bodyContent = (bodyMatch?.[1] ?? '<div id="root"></div>')
  .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
  .trim()

const fragment = [title, ...styles, bodyContent, ...scripts].join('\n')
fs.writeFileSync(output, fragment)
console.log(
  `wrote ${output} (${(fragment.length / 1024).toFixed(0)} kB, fragment for artifact publish)`,
)
