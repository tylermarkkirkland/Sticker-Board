// Words and phrases that flip the face sticker. Matching ignores case and only
// counts whole words, so "good" won't fire inside "goodbye". Phrases like
// "not good" beat the single word inside them, so they read the right way.
export const happyWords = [
  // Classic praise
  'good', 'great', 'awesome', 'cool', 'fantastic', 'amazing', 'wonderful',
  'excellent', 'incredible', 'outstanding', 'superb', 'terrific', 'fabulous',
  'brilliant', 'marvelous', 'marvellous', 'magnificent', 'spectacular',
  'stellar', 'phenomenal', 'remarkable', 'impressive', 'splendid',
  'perfect', 'flawless', 'top notch', 'first rate', 'best', 'the best',
  // Warm feelings
  'happy', 'glad', 'joy', 'joyful', 'delighted', 'cheerful', 'pleased',
  'thrilled', 'excited', 'grateful', 'thankful', 'blessed', 'lucky',
  'proud', 'inspired', 'inspiring', 'uplifting', 'heartwarming', 'touching',
  'love', 'loved', 'loves', 'loving', 'lovely', 'adore', 'adorable',
  'like', 'liked', 'likes', 'enjoy', 'enjoyed', 'enjoying', 'enjoyable',
  // Looks & feel
  'nice', 'pretty', 'beautiful', 'gorgeous', 'stunning', 'cute', 'sweet',
  'charming', 'delightful', 'fun', 'neat', 'fine', 'pleasant', 'fresh',
  'smooth', 'beautifully', 'nicely',
  // Thanks & kudos
  'thanks', 'thank you', 'thank u', 'thx', 'ty', 'kudos', 'bravo',
  'congrats', 'congratulations', 'well done', 'good job', 'great job',
  'nice job', 'nice work', 'great work', 'way to go', 'hooray', 'yay',
  'woohoo', 'wow', 'yippee',
  // Casual / slang
  'rad', 'dope', 'epic', 'legit', 'fire', 'goated',
  'slaps', 'rocks', 'rules', 'killer', 'sick', 'nifty', 'groovy',
  'swell', 'super', 'wicked', 'gnarly',
  'well made',
  // Negated bad things
  'not bad', 'not too bad', 'not terrible', 'not awful', "can't complain",
  'no complaints',
  // Symbols
  ':-)', ':d', '<3', '❤️', '❤', '😊', '😀', '😃', '😄', '😁',
  '😍', '🥰', '👍', '🎉', '🙌', '👏', '💯', '⭐', '🌟', '🔥',
];

export const sadWords = [
  // Classic criticism
  'bad', 'awful', 'horrible', 'terrible', 'dreadful', 'atrocious',
  'abysmal', 'appalling', 'poor', 'worst', 'the worst', 'worse',
  'mediocre', 'subpar', 'inferior', 'lousy', 'crummy', 'shoddy',
  'pathetic', 'useless', 'pointless', 'worthless', 'hopeless',
  'disappointing', 'disappointed', 'disappointment', 'letdown', 'let down',
  // Insults
  'dumb', 'stupid', 'idiotic', 'ridiculous', 'silly', 'lame', 'boring',
  'bored', 'dull', 'ugly', 'hideous', 'gross', 'disgusting', 'nasty',
  'yuck', 'yucky', 'ew', 'eww', 'ewww', 'meh', 'blah', 'cringe', 'cringy',
  'cringey', 'trash', 'garbage', 'rubbish', 'junk', 'crap', 'crappy',
  'sucks', 'suck', 'sucky', 'stinks', 'stinky', 'stink',
  'weak', 'broken', 'buggy', 'confusing', 'annoying', 'annoyed',
  'frustrating', 'frustrated', 'irritating', 'waste', 'waste of time',
  // Sad feelings
  'sad', 'unhappy', 'upset', 'angry', 'mad', 'miserable', 'depressed',
  'depressing', 'gloomy', 'heartbroken', 'lonely', 'hurt', 'cry',
  'crying', 'tears', 'unfortunately', 'ugh', 'boo', 'nope',
  // Dislike
  'hate', 'hated', 'hates', 'hating', 'dislike', 'disliked', 'detest',
  'loathe', 'despise',
  // Negated good things
  'not good', 'not great', 'not nice', 'not cool', 'not fun',
  'not happy', 'not impressed', 'not a fan', 'not my thing',
  "don't like", 'dont like', "didn't like", 'didnt like',
  "don't love", 'dont love', 'do not like', 'no good', 'no fun',
  // Symbols
  ':(', ':-(', ":'(", '😢', '😭', '😞', '😔', '☹️', '☹', '🙁', '😠',
  '😡', '🤬', '👎', '💩', '🤮', '🤢', '😒', '🙄', '💔',
];

// Escape regex characters (for things like ":)" and "<3").
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Only add a word boundary on sides that are letters/numbers, so emoji and
// ":)" still match.
const toRegex = (word) => {
  const start = /^\w/.test(word) ? '\\b' : '';
  const end   = /\w$/.test(word) ? '\\b' : '';
  return new RegExp(`${start}${escapeRegex(word)}${end}`, 'gu');
};

const happyRegexes = happyWords.map(toRegex);
const sadRegexes   = sadWords.map(toRegex);

// Lowercase and treat curly apostrophes (phones and Macs auto-insert them)
// as straight.
const normalize = (s) => s.toLowerCase().replace(/[‘’]/g, "'");

// `ignore` is text that should never change the mood (the note's starting
// text). It's blanked out with spaces, so only what the visitor typed counts.
export function getMood(text, ignore = '') {
  if (!text?.trim()) return 'neutral';
  let lower = normalize(text);
  const skip = normalize(ignore).trim();
  if (skip) lower = lower.split(skip).join(' '.repeat(skip.length));

  // The match that ends furthest right wins (the most recent thing typed).
  // On a tie, the longer match wins, so "not good" beats "good".
  let bestEnd = -1;
  let bestLength = 0;
  let result = 'neutral';

  const consider = (regexes, mood) => {
    for (const regex of regexes) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(lower)) !== null) {
        const end = match.index + match[0].length;
        if (end > bestEnd || (end === bestEnd && match[0].length > bestLength)) {
          bestEnd = end;
          bestLength = match[0].length;
          result = mood;
        }
      }
    }
  };

  // Secret phrase
  const secretIdx = lower.lastIndexOf('life before death');
  if (secretIdx !== -1) {
    bestEnd = secretIdx + 'life before death'.length;
    bestLength = 'life before death'.length;
    result = 'secret';
  }

  consider(happyRegexes, 'happy');
  consider(sadRegexes, 'sad');

  return result;
}
