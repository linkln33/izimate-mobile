/**
 * Code-to-Design Utilities
 * Tools to generate Figma designs from React Native components
 * 
 * This enables you to:
 * 1. Export component structure to Figma
 * 2. Generate design tokens from code
 * 3. Create Figma components matching your code components
 */

import { exportAllDesignTokens, generateFigmaTokensJSON } from './export-design-tokens'

export interface ComponentDesignSpec {
  name: string
  props: Record<string, any>
  styles: Record<string, any>
  layout: 'column' | 'row' | 'absolute'
  children?: ComponentDesignSpec[]
}

/**
 * Generate Figma design specification from component code
 */
export function generateFigmaSpecFromComponent(
  componentName: string,
  props: Record<string, any>,
  styles: Record<string, any>
): ComponentDesignSpec {
  return {
    name: componentName,
    props,
    styles,
    layout: 'column', // Default layout
  }
}

/**
 * Export design tokens to Figma Variables format
 * Use this in Figma: Variables → Import from JSON
 */
export function exportTokensForFigma(): string {
  return generateFigmaTokensJSON()
}

/**
 * Generate MCP command to create component in Figma
 */
export function generateFigmaCreateCommand(
  componentName: string,
  spec: ComponentDesignSpec
): string {
  // This would be used with the MCP server
  // Example: "Create a ${componentName} component in Figma with these props: ${JSON.stringify(spec.props)}"
  
  return `Create a ${componentName} component in Figma with:
- Props: ${Object.keys(spec.props).join(', ')}
- Layout: ${spec.layout}
- Styles: ${Object.keys(spec.styles).join(', ')}`
}

/**
 * Map React Native component to Figma component structure
 */
export function mapRNToFigma(
  rnComponent: string,
  props: Record<string, any>
): {
  figmaComponent: string
  frameProps: Record<string, any>
  children: any[]
} {
  // Map React Native View → Figma Frame
  // Map React Native Text → Figma Text
  // Map React Native Pressable → Figma Component with interactions
  
  const mapping: Record<string, string> = {
    'View': 'FRAME',
    'Text': 'TEXT',
    'Pressable': 'COMPONENT',
    'ScrollView': 'FRAME',
    'Image': 'RECTANGLE', // With image fill
  }
  
  return {
    figmaComponent: mapping[rnComponent] || 'FRAME',
    frameProps: {
      layoutMode: props.layoutMode || 'VERTICAL',
      paddingLeft: props.paddingLeft || 0,
      paddingRight: props.paddingRight || 0,
      paddingTop: props.paddingTop || 0,
      paddingBottom: props.paddingBottom || 0,
    },
    children: [],
  }
}

