---
version: 1.0.0
name: Trading212-Portfolio-Design-System
description: |
  A high-precision, institutional-grade Fintech design system for dsh-trading212,
  synthesizing the dark-canvas authority of Revolut and Linear with the clean numeric
  elegance and atmospheric depth of Stripe and Apple. Built specifically for read-only
  portfolio dashboards, execution analysis, and asset tracking.

colors:
  primary: "#10b981"
  primary-bright: "#34d399"
  primary-deep: "#059669"
  primary-subtle: "rgba(16, 185, 129, 0.12)"
  
  canvas-dark: "#0b120f"
  canvas-app: "#f3f5f3"
  surface-card: "#ffffff"
  surface-card-subtle: "#f8faf8"
  surface-elevated: "#111d18"
  surface-sidebar: "#09100d"
  
  ink: "#0f1714"
  ink-secondary: "#334139"
  ink-mute: "#64746d"
  ink-faint: "#94a39b"
  
  on-dark: "#f8faf9"
  on-dark-mute: "#9ab3a6"
  on-dark-faint: "#5e776a"
  
  hairline: "#e1e7e3"
  hairline-subtle: "#edf2ee"
  hairline-dark: "rgba(255, 255, 255, 0.08)"
  hairline-dark-hover: "rgba(255, 255, 255, 0.16)"
  
  accent-blue: "#2563eb"
  accent-blue-subtle: "rgba(37, 99, 235, 0.08)"
  accent-amber: "#d97706"
  accent-amber-subtle: "rgba(217, 119, 6, 0.1)"
  accent-rose: "#e11d48"
  accent-rose-subtle: "rgba(225, 29, 72, 0.1)"
  
  gain: "#059669"
  gain-bg: "#ecfdf5"
  loss: "#dc2626"
  loss-bg: "#fef2f2"

typography:
  display-xxl:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', 'PingFang SC', sans-serif"
    fontSize: 42px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -1.8px
    fontFeature: tnum
  display-xl:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', 'PingFang SC', sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -1.2px
    fontFeature: tnum
  heading-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'PingFang SC', sans-serif"
    fontSize: 22px
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: -0.5px
  heading-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'PingFang SC', sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.2px
  body-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'PingFang SC', sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.1px
  body-tabular:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'PingFang SC', sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
    fontFeature: tnum
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'PingFang SC', sans-serif"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.02em
  micro:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'PingFang SC', sans-serif"
    fontSize: 10px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.06em
    textTransform: uppercase

rounded:
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
  full: 9999px

shadows:
  card: "0 1px 3px rgba(15, 23, 20, 0.04), 0 6px 16px -2px rgba(15, 23, 20, 0.03)"
  card-hover: "0 2px 6px rgba(15, 23, 20, 0.06), 0 12px 24px -4px rgba(15, 23, 20, 0.06)"
  hero: "0 20px 40px -10px rgba(9, 16, 13, 0.35), 0 1px 0 inset rgba(255, 255, 255, 0.1)"
  popover: "0 10px 30px -5px rgba(15, 23, 20, 0.15), 0 0 0 1px rgba(15, 23, 20, 0.05)"

---

# Trading 212 Dashboard Design Guidelines

## 1. Design Overview
The `dsh-trading212` interface delivers an elite, responsive portfolio intelligence workspace. It bridges clean analytical density with effortless readability, utilizing an authoritative dark-mode hero container, crystal-clear metric cards, rich ECharts price visualizers, and interactive trade timelines.

## 2. Core Pillars
- **Numeric Clarity & Tabular Figures**: Financial amounts and percentages strictly use `font-variant-numeric: tabular-nums` to prevent layout jitter and improve vertical scanning.
- **Atmospheric Contrast**: A deep obsidian-emerald hero card (`#0b120f` to `#111d18`) anchors total account value, contrasted against ultra-clean, subtle off-white canvas surfaces (`#f3f5f3`) and crisp card panels (`#ffffff`).
- **Semantic Precision**: Standardized gain (`#059669`) / loss (`#dc2626`) feedback and tone accents (`#2563eb` for buys, `#d97706` for sells/warnings) guarantee immediate comprehension.
- **Fluid & Tactile Micro-interactions**: Subtle hover state lifts, smooth border glow transitions, and responsive spring-like button active states.

## 3. Component System
- **Sidebar**: High-density vertical navigation with micro-pills, active indicators, and status assurances.
- **Hero Summary**: Gradient-lit executive overview with large tabular typography and cost basis breakdowns.
- **Metric Cards**: Balanced proportions with micro uppercase labels, prominent numbers, and contextual delta notes.
- **Data Tables**: Precise row heights (64px), sticky/crisp header alignment, subtle zebra/hover effects, and responsive mobile card transformation.
- **Charts & Timelines**:
  - ECharts price line with subtle gradient area fills and high-contrast execution markers.
  - Interactive SVG trade timeline with stems, markers, and chronological fill lists.
  - Dynamic allocation progress tracks and horizontal bar comparisons.
- **Setup & Forms**: Focused, distraction-free authentication cards with credential isolation notices and interactive environment pills.
