import {
  Be_Vietnam_Pro,
  Inter,
  JetBrains_Mono,
  Merriweather,
  Mulish,
  Noto_Sans_Mono,
  Playfair_Display,
  Playpen_Sans,
  Plus_Jakarta_Sans,
  Source_Code_Pro,
  Space_Mono
} from 'next/font/google';

import { cn } from '@/lib/utils';

// Primary UI Sans Font (Inter with full Vietnamese diacritics support)
const fontSans = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-sans'
});

// Primary UI Mono Font (JetBrains Mono with full Vietnamese support)
const fontMono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-mono'
});

// Dedicated Vietnamese Typography Sans Font
const fontBeVietnamPro = Be_Vietnam_Pro({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-be-vietnam-pro'
});

// Plus Jakarta Sans (Used in Discord, Supabase, Astro Vista themes)
const fontGoogleSansFlex = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-google-sans-flex'
});

// Source Code Pro (Used in Discord theme)
const fontSourceCodePro = Source_Code_Pro({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-source-code-pro'
});

const fontInstrument = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-instrument'
});

const fontNotoMono = Noto_Sans_Mono({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-noto-mono'
});

const fontMullish = Mulish({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-mullish'
});

const fontInter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter'
});

// Playpen Sans: Casual handwriting font with full Vietnamese support (replaces Architects Daughter)
const fontArchitectsDaughter = Playpen_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-architects-daughter'
});

const fontPlaypenSans = Playpen_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playpen-sans'
});

const fontDMSans = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-dm-sans'
});

const fontFiraCode = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-fira-code'
});

const fontOutfit = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-outfit'
});

const fontSpaceMono = Space_Mono({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '700'],
  variable: '--font-space-mono'
});

const fontJetBrainsMono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-jetbrains-mono'
});

const fontMerriweather = Merriweather({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '700'],
  variable: '--font-merriweather',
  preload: false
});

const fontPlayfairDisplay = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair-display'
});

export const fontVariables = cn(
  fontSans.variable,
  fontMono.variable,
  fontBeVietnamPro.variable,
  fontGoogleSansFlex.variable,
  fontSourceCodePro.variable,
  fontInstrument.variable,
  fontNotoMono.variable,
  fontMullish.variable,
  fontInter.variable,
  fontArchitectsDaughter.variable,
  fontPlaypenSans.variable,
  fontDMSans.variable,
  fontFiraCode.variable,
  fontOutfit.variable,
  fontSpaceMono.variable,
  fontJetBrainsMono.variable,
  fontMerriweather.variable,
  fontPlayfairDisplay.variable
);
