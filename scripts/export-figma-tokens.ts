/**
 * Export Design Tokens to Figma
 * Generates JSON file that can be imported into Figma Variables
 */

import { writeFileSync } from 'fs'
import { join } from 'path'
import { exportAllDesignTokens, generateFigmaTokensJSON } from '../lib/figma/export-design-tokens'

const tokens = exportAllDesignTokens()
const json = generateFigmaTokensJSON()

const outputPath = join(process.cwd(), 'figma-design-tokens.json')
writeFileSync(outputPath, json, 'utf-8')

console.log(`✅ Exported ${tokens.length} design tokens to: ${outputPath}`)
console.log(`\nTo import into Figma:`)
console.log(`1. Open Figma Desktop`)
console.log(`2. Go to Variables → Import from file`)
console.log(`3. Select: ${outputPath}`)
console.log(`\nTokens exported:`)
console.log(`  - Colors: ${tokens.filter(t => t.type === 'color').length}`)
console.log(`  - Spacing: ${tokens.filter(t => t.type === 'spacing').length}`)
console.log(`  - Typography: ${tokens.filter(t => t.type === 'typography').length}`)
console.log(`  - Border Radius: ${tokens.filter(t => t.type === 'radius').length}`)

