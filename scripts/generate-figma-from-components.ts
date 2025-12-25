/**
 * Code-to-Design Generator
 * Converts React Native components to Figma designs
 * 
 * Usage: bun run scripts/generate-figma-from-components.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

interface ComponentInfo {
  name: string
  path: string
  props: string[]
  hasStyleSheet: boolean
  usesTheme: boolean
}

function extractComponentInfo(filePath: string): ComponentInfo | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    
    // Extract component name
    const componentMatch = content.match(/export\s+(?:const|function)\s+(\w+)/)
    if (!componentMatch) return null
    
    // Extract props interface
    const propsInterfaceMatch = content.match(/interface\s+(\w+Props)\s*\{([^}]+)\}/)
    const props: string[] = []
    if (propsInterfaceMatch) {
      const propsContent = propsInterfaceMatch[2]
      const propMatches = propsContent.matchAll(/(\w+)(\?)?:\s*([^;]+)/g)
      for (const match of propMatches) {
        props.push(match[1])
      }
    }
    
    // Check for StyleSheet usage
    const hasStyleSheet = content.includes('StyleSheet.create')
    
    // Check for theme usage
    const usesTheme = content.includes('@/lib/theme') || content.includes('lib/theme')
    
    return {
      name: componentMatch[1],
      path: filePath,
      props,
      hasStyleSheet,
      usesTheme,
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    return null
  }
}

function scanComponents(dir: string, components: ComponentInfo[] = []): ComponentInfo[] {
  const files = readdirSync(dir)
  
  for (const file of files) {
    const filePath = join(dir, file)
    const stat = statSync(filePath)
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      scanComponents(filePath, components)
    } else if (file.endsWith('.tsx') && !file.endsWith('.test.tsx')) {
      const info = extractComponentInfo(filePath)
      if (info) {
        components.push(info)
      }
    }
  }
  
  return components
}

function generateFigmaMapping(components: ComponentInfo[]): string {
  let mapping = `// Figma Component Mappings
// Generated from React Native components
// Use this to map your code components to Figma designs

export const componentMappings = {
`

  for (const component of components) {
    mapping += `  ${component.name}: {
    path: '${component.path}',
    props: [${component.props.map(p => `'${p}'`).join(', ')}],
    hasStyles: ${component.hasStyleSheet},
    usesTheme: ${component.usesTheme},
  },
`
  }

  mapping += `}

// Usage in Figma:
// 1. Create design components in Figma matching these names
// 2. Use Code Connect to link Figma components to code paths
// 3. Use MCP server to generate designs from code
`

  return mapping
}

// Main execution
const componentsDir = join(process.cwd(), 'components')
const components = scanComponents(componentsDir)

console.log(`Found ${components.length} components:`)
components.forEach(c => {
  console.log(`  - ${c.name} (${c.props.length} props)`)
})

const mapping = generateFigmaMapping(components)
const outputPath = join(process.cwd(), 'lib/figma-component-mappings.ts')
require('fs').writeFileSync(outputPath, mapping)

console.log(`\n✅ Generated Figma mappings: ${outputPath}`)
console.log(`\nNext steps:`)
console.log(`1. Review lib/figma-component-mappings.ts`)
console.log(`2. Create matching components in Figma`)
console.log(`3. Use Code Connect to link them`)
console.log(`4. Use MCP server to generate designs from code`)

