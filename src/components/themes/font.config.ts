import {
  Be_Vietnam_Pro,
  Inter,
  JetBrains_Mono,
  Merriweather,
  Playfair_Display,
  Playpen_Sans,
  Plus_Jakarta_Sans,
  Source_Code_Pro
} from 'next/font/google';

import { cn } from '@/lib/utils';

// Inter: Primary UI Sans Font (Full Vietnamese diacritics support)
const fontInter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter'
});

// JetBrains Mono: Primary UI Mono Font (Code, manifests, data tables)
const fontJetBrainsMono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-jetbrains-mono'
});

// Be Vietnam Pro: Dedicated Vietnamese Typography Sans Foundation
const fontBeVietnamPro = Be_Vietnam_Pro({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-be-vietnam-pro'
});

// Plus Jakarta Sans: Modern Geometric Sans (Discord, Supabase, Astro Vista, WhatsApp)
const fontPlusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-plus-jakarta-sans'
});

// Source Code Pro: Alternate Monospace (Discord theme)
const fontSourceCodePro = Source_Code_Pro({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-source-code-pro'
});

// Playpen Sans: Casual handwriting font with 100% Vietnamese support (Notebook theme)
const fontPlaypenSans = Playpen_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playpen-sans'
});

// Merriweather: Editorial Serif (Astro Vista theme)
const fontMerriweather = Merriweather({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '700'],
  variable: '--font-merriweather',
  preload: false
});

// Playfair Display: Elegant Display Serif (Zen theme)
const fontPlayfairDisplay = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair-display'
});

export const fontVariables = cn(
  fontInter.variable,
  fontJetBrainsMono.variable,
  fontBeVietnamPro.variable,
  fontPlusJakartaSans.variable,
  fontSourceCodePro.variable,
  fontPlaypenSans.variable,
  fontMerriweather.variable,
  fontPlayfairDisplay.variable
);
