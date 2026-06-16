export const happyWords = ['awesome', 'cool', 'happy', 'great', 'fantastic', 'good'];
export const sadWords   = ['dumb', 'sucks', 'bad', 'trash', 'awful', 'horrible', 'terrible', 'sad', 'unhappy'];

export function getMood(text) {
  if (!text?.trim()) return 'neutral';
  const lower = text.toLowerCase();

  let lastIndex = -1;
  let result = 'neutral';

  // Secret phrase — whichever occurrence is furthest right wins
  const secretIdx = lower.lastIndexOf('life before death');
  if (secretIdx > lastIndex) { lastIndex = secretIdx; result = 'secret'; }

  // Happy words
  for (const word of happyWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    let match;
    while ((match = regex.exec(lower)) !== null) {
      if (match.index > lastIndex) { lastIndex = match.index; result = 'happy'; }
    }
  }

  // Sad words
  for (const word of sadWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    let match;
    while ((match = regex.exec(lower)) !== null) {
      if (match.index > lastIndex) { lastIndex = match.index; result = 'sad'; }
    }
  }

  return result;
}
