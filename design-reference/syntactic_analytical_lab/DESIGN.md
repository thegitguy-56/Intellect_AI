---
name: Syntactic Analytical Lab
colors:
  surface: '#fcf8ff'
  surface-dim: '#dad6ff'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f2ff'
  surface-container: '#efebff'
  surface-container-high: '#e9e5ff'
  surface-container-highest: '#e3dfff'
  on-surface: '#181445'
  on-surface-variant: '#464554'
  inverse-surface: '#2d2a5b'
  inverse-on-surface: '#f3eeff'
  outline: '#777586'
  outline-variant: '#c7c4d7'
  surface-tint: '#5148d7'
  primary: '#2a14b4'
  on-primary: '#ffffff'
  primary-container: '#4338ca'
  on-primary-container: '#c1beff'
  inverse-primary: '#c3c0ff'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fe932c'
  on-secondary-container: '#663500'
  tertiary: '#393b3a'
  on-tertiary: '#ffffff'
  tertiary-container: '#505251'
  on-tertiary-container: '#c4c5c3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#100069'
  on-primary-fixed-variant: '#372abf'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#e2e3e1'
  tertiary-fixed-dim: '#c6c7c5'
  on-tertiary-fixed: '#1a1c1b'
  on-tertiary-fixed-variant: '#454746'
  background: '#fcf8ff'
  on-background: '#181445'
  surface-variant: '#e3dfff'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-md-mobile:
    fontFamily: Sora
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.3'
  body-main:
    fontFamily: Sora
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  data-label:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  data-value:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  caption:
    fontFamily: Sora
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  hairline: 1px
---

## Brand & Style

The design system is built on a **Precision-Lab Technical-Editorial** aesthetic. It bridges the gap between high-density intellectual property data and clean, modern editorial layouts. The UI should evoke an emotional response of clarity, authority, and meticulous organization.

The style is characterized by a "Glass-Brutalist" hybrid: it utilizes the rigid structural integrity of 1px hairline grids and monospaced data points, softened by the inclusion of frosted-glass overlays and generous, breathable whitespace. Visual metaphors are centered around connectivity—representing the complex relationships between patents, citations, and prior-art—using faint hairline connections and soft nodal glows.

## Colors

This design system uses a sophisticated, low-contrast base palette to minimize eye strain during long-form research sessions.

- **Base Surface**: Use `#FAFAF8` for the main canvas.
- **Secondary Surface**: Use `#F0EFEA` for sidebars, headers, and container backgrounds to provide subtle structural separation.
- **Primary Action**: Deep Indigo (`#4338CA`) is reserved for primary buttons, active states, and focus indicators.
- **Highlight/Score**: Amber (`#D97706`) is used exclusively for relevance scores, high-priority notifications, and critical data highlights.
- **Semantic Badges**: Terracotta and Sage should be applied with low-opacity backgrounds and high-contrast text for status indicators (e.g., "Invalidated" vs "Active").

## Typography

The typography strategy employs a dual-purpose system. **Sora** handles the editorial layer, providing a modern, approachable geometric feel for headings and descriptive text. **JetBrains Mono** is used for the technical layer—patent IDs, dates, legal citations, and similarity scores—conveying a sense of "raw data" precision.

- Use **Sora** for all interface labels and narrative text.
- Use **JetBrains Mono** for any numerical or alphanumeric string that represents a unique identifier or a quantitative value.
- Maintain a minimum 1.6 line-height for body copy to support high readability in dense patent abstracts.

## Layout & Spacing

The layout follows a strict **Fixed-Grid Technical Layout** on desktop and a **Fluid-Stack** on mobile.

- **Desktop**: A 12-column grid with 24px gutters. Content should be centered within a 1440px max-width container. 
- **Sidebars**: Analysis tools and filters should reside in fixed-width sidebars (320px) that use 1px vertical borders instead of shadows.
- **Rhythm**: Use an 8px base unit. All internal component padding should be multiples of 8.
- **Connectors**: For visual relationships between data nodes, use 1px `#E5E5E1` lines with 0.5px stroke width where possible to maintain the "lab" aesthetic.

## Elevation & Depth

This design system eschews traditional shadows in favor of **Tonal Layering** and **Frosted Glass**.

- **Level 0 (Canvas)**: `#FAFAF8`.
- **Level 1 (Containers)**: 1px border (`#E5E5E1`) with no shadow.
- **Level 2 (Floating Elements/Modals)**: Backdrop blur (20px) with 80% opacity of `#FAFAF8` and a 1px white inner border to create a "glass" edge. 
- **Active State Glow**: For selected patent nodes, use a soft, 12px outer glow using the Primary Indigo color at 15% opacity to indicate focus without adding physical weight.

## Shapes

Shapes are disciplined and functional. We use a **Soft-Square** approach.

- **Components**: Buttons and input fields use a 0.25rem (4px) radius. This provides a professional, "architectural" feel compared to fully rounded corners.
- **Tags/Chips**: Use 2px radius or sharp corners to distinguish them as technical metadata rather than interactive buttons.
- **Nodes**: Visual representations of patents in a graph view should be circles (50% radius) to contrast against the rectangular layout of the rest of the UI.

## Components

- **Buttons**:
    - *Primary*: Solid Indigo (`#4338CA`) with white text, 4px radius.
    - *Secondary*: 1px border Indigo with transparent background.
    - *Ghost*: JetBrains Mono text, no border, Indigo on hover.
- **Patent Cards**: Use 1px borders. The header of the card should be separated by a 1px horizontal line. The patent ID should be set in JetBrains Mono in the top-right corner.
- **Input Fields**: Minimalist style. 1px bottom-border only in default state; 1px all-around Indigo border on focus. No background fill.
- **Score Badges**: Always use Amber (`#D97706`). Use JetBrains Mono for the score value. The badge should have a faint 10% amber background fill.
- **Connection Lines**: Use SVG-based 1px lines to connect related patent cards in "Prior Art Map" views. Lines should be `#E5E5E1` and switch to Indigo when one of the connected cards is hovered.
- **Data Tables**: Remove all vertical lines. Use 1px horizontal lines only. The first column (Patent ID) should be pinned and set in JetBrains Mono.