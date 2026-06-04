/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Format Pokémon Go Trainer code with attractive spacing: e.g. 1234 5678 9012
export function formatTrainerCode(code: string): string {
  const digits = code.replace(/[^0-9]/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
}

// Visual avatar choice matrix preset links
export const AVATAR_PRESETS = [
  { name: 'Pikachu', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&q=80' },
  { name: 'Eevee', url: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=150&q=80' },
  { name: 'Snorlax', url: 'https://images.unsplash.com/photo-1608889174637-3c44f6326f60?w=150&q=80' },
  { name: 'Charizard', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&q=80' },
  { name: 'Gengar', url: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=150&q=80' },
  { name: 'Blastoise', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&q=80' },
  { name: 'Mewtwo', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&q=80' },
  { name: 'Venusaur', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&q=80' }
];

// Simple navigator clipboard utility
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed'; // Avoid scrolling to bottom
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}

// Team colors utility metadata
export const TEAM_DETAILS = {
  Valor: {
    color: 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900',
    hex: '#ef4444',
    bg: 'bg-red-500',
    text: 'text-red-600',
    border: 'border-red-500',
    accent: 'from-red-500 to-rose-600',
    logo: '🔥 Valor (Red)'
  },
  Mystic: {
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900',
    hex: '#3b82f6',
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-500',
    accent: 'from-blue-500 to-indigo-600',
    logo: '❄️ Mystic (Blue)'
  },
  Instinct: {
    color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900',
    hex: '#eab308',
    bg: 'bg-yellow-500',
    text: 'text-yellow-600',
    border: 'border-yellow-500',
    accent: 'from-yellow-400 to-amber-500',
    logo: '⚡ Instinct (Yellow)'
  }
};
