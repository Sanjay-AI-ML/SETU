/**
 * Personalized Home Strategy Generator
 * Analyzes Communication Matrix results and generates tailored home strategies
 * based on evidence-based Routines-Based Intervention (RBI) principles.
 *
 * Each strategy includes:
 *  - id: unique key
 *  - icon: emoji
 *  - title: short strategy name
 *  - description: what to do and why
 *  - example: concrete real-life example
 *  - routines: which home routines to embed this in
 *  - level: the Communication Matrix level this targets
 *  - priority: 1 (high) | 2 (medium) | 3 (reinforcement)
 */

const STRATEGY_BANK = [
  // ─── LEVEL 1-2: Pre-intentional ───────────────────────────────────────────
  {
    id: 'responsive-turn-taking',
    level: [1, 2],
    icon: '🔄',
    title: 'Responsive Turn-Taking',
    description:
      'Respond consistently to any behaviour as if it were communication. When your child makes a sound, movement, or expression — pause, mirror it, and wait 5 seconds before repeating.',
    example:
      'If your child kicks their legs during bath time, say "Kick kick kick!" and then stop — waiting to see if they repeat it.',
    routines: ['Bath & Sensory Play', 'Mealtime'],
    tags: ['pre-intentional', 'imitation', 'turn-taking'],
    priority: 1,
  },
  {
    id: 'predictable-routines',
    level: [1, 2],
    icon: '🗓️',
    title: 'Build Predictable Routines',
    description:
      "Use the same words, gestures, and sequence every time during daily routines. Predictability allows the child to begin to anticipate what comes next, which is the first step toward intentional communication.",
    example:
      'Every bath time: "Water on → bubbles → pour!" using the same words and actions each night until the child anticipates the next step.',
    routines: ['Bath & Sensory Play', 'Bedtime Storytime', 'Dressing'],
    tags: ['predictability', 'anticipation', 'routine'],
    priority: 1,
  },

  // ─── LEVEL 3: Unconventional intentional ─────────────────────────────────
  {
    id: 'wait-signal',
    level: [3],
    icon: '⏳',
    title: 'Time Delay (The Expectant Wait)',
    description:
      'During a routine, pause at the moment your child expects something to happen. Keep a "ready, waiting" face and give 8–10 seconds for them to signal. This is the most powerful tool for building intentionality.',
    example:
      'Pause with bubbles wand in the air (mid-blow), look at your child with an expectant smile and wait silently for 8 seconds.',
    routines: ['Mealtime', 'Bath & Sensory Play', 'Bedtime Storytime'],
    tags: ['intentionality', 'pause', 'time-delay'],
    priority: 1,
  },
  {
    id: 'sabotage',
    level: [3],
    icon: '🙈',
    title: 'Playful Sabotage',
    description:
      "Create a need to communicate by intentionally making something go 'wrong' — give the wrong item, give an incomplete set, or pretend to forget a step.",
    example:
      'At snack time, give a cup without the juice. Wait to see if child communicates the missing piece.',
    routines: ['Mealtime', 'Dressing'],
    tags: ['intentionality', 'problem-solving', 'sabotage'],
    priority: 1,
  },

  // ─── LEVEL 4: Conventional intentional ───────────────────────────────────
  {
    id: 'one-up-rule',
    level: [4],
    icon: '📈',
    title: 'One-Up Rule (Expand & Echo)',
    description:
      "Take whatever your child communicates and expand it by ONE step up. If they reach, model a point. If they point, model a word. If they say one word, model a two-word phrase. Always match their intent, don't correct.",
    example:
      "Child reaches for banana → you point to the banana and say \"banana?\" — the child's next step is to point themselves.",
    routines: ['Mealtime', 'Bedtime Storytime', 'Dressing'],
    tags: ['expansion', 'modeling', 'one-up'],
    priority: 1,
  },
  {
    id: 'visual-choice-boards',
    level: [4],
    icon: '🖼️',
    title: 'Visual Choice Boards',
    description:
      'Present 2 real objects or pictures before a routine activity. Hold them at eye-level and wait for the child to indicate a preference. This builds intentional requesting with a reduced language demand.',
    example:
      'Before bath time, hold up a rubber duck and a foam boat — wait for gaze, reach, or point before placing either in the tub.',
    routines: ['Bath & Sensory Play', 'Mealtime', 'Dressing'],
    tags: ['choice', 'visual-support', 'requesting'],
    priority: 2,
  },

  // ─── LEVEL 5-6: Symbolic communication ───────────────────────────────────
  {
    id: 'parallel-talk',
    level: [5, 6],
    icon: '💬',
    title: 'Parallel Talk (Running Commentary)',
    description:
      "Narrate what your child is doing in real-time using simple, concrete language. Don't ask questions — just describe actions, objects, and feelings as they happen.",
    example:
      '"You\'re pouring... water\'s falling... splash! You\'re smiling — that\'s fun!"',
    routines: ['Bath & Sensory Play', 'Mealtime', 'Dressing'],
    tags: ['language-input', 'vocabulary', 'parallel-talk'],
    priority: 2,
  },
  {
    id: 'self-talk',
    level: [5, 6],
    icon: '🗣️',
    title: 'Self-Talk Modeling',
    description:
      'Narrate your own actions out loud in simple sentences. This models sentence structure and vocabulary without any demand on the child.',
    example:
      '"I\'m opening the book... I see a dog! The dog is big. I like this dog!"',
    routines: ['Bedtime Storytime'],
    tags: ['modeling', 'language', 'sentence-structure'],
    priority: 2,
  },
  {
    id: 'open-questions',
    level: [6],
    icon: '❓',
    title: 'Open-Ended Questions',
    description:
      "Shift from yes/no questions to open 'what/where/who' questions that invite longer responses. Pause up to 10 seconds for a response.",
    example:
      '"What do you want?" instead of "Do you want the banana?" — and wait.',
    routines: ['Mealtime', 'Bedtime Storytime'],
    tags: ['language-expansion', 'questioning', 'open-ended'],
    priority: 2,
  },

  // ─── Universal reinforcement strategies ──────────────────────────────────
  {
    id: 'joint-attention',
    level: [1, 2, 3, 4, 5, 6, 7],
    icon: '👁️',
    title: 'Follow the Child\'s Lead',
    description:
      'Observe what captures your child\'s attention and join in with what they are already interested in — rather than redirecting to a new activity.',
    example:
      'If child keeps staring at the ceiling fan, talk about it: "Fan going round and round!" rather than pulling their gaze away.',
    routines: ['Mealtime', 'Bath & Sensory Play', 'Bedtime Storytime', 'Dressing'],
    tags: ['joint-attention', 'interest-following', 'engagement'],
    priority: 3,
  },
  {
    id: 'reduce-questions',
    level: [1, 2, 3, 4, 5, 6, 7],
    icon: '🤐',
    title: 'Reduce Questions & Commands',
    description:
      "For every question or command you give, try to give 4 comments or observations. Too many demands increase pressure and reduce spontaneous communication.",
    example:
      'Instead of "Say ball!", say "Oh, the ball is rolling… it\'s going far!"',
    routines: ['All routines'],
    tags: ['low-demand', 'naturalistic', 'pressure-reduction'],
    priority: 3,
  },
];

/**
 * Determines the overall Communication Matrix level from cell states.
 * Uses a weighted approach: mastered > emerging > notused.
 */
function detectMatrixLevel(cells) {
  if (!cells || cells.length === 0) return 3; // Default to emerging intentional

  const levelScores = {};
  cells.forEach((cell) => {
    if (!cell.level || cell.state === 'notused') return;
    if (!levelScores[cell.level]) levelScores[cell.level] = 0;
    if (cell.state === 'mastered') levelScores[cell.level] += 3;
    else if (cell.state === 'emerging') levelScores[cell.level] += 1;
    else if (cell.state === 'surpassed') levelScores[cell.level] += 2;
  });

  if (Object.keys(levelScores).length === 0) return 3;

  // Find the highest emerging/in-progress level
  const levels = Object.keys(levelScores)
    .map(Number)
    .filter((l) => levelScores[l] > 0)
    .sort((a, b) => a - b);

  // Return the highest level with any activity — this is the child's frontier
  return levels[levels.length - 1] ?? 3;
}

/**
 * Main export — generate personalized home strategies from matrix cells.
 *
 * @param {Array} cells - Array of matrix cell objects with { level, state, category }
 * @param {number} [count=4] - Number of strategies to return
 * @returns {Array} Sorted, deduplicated strategy objects
 */
export function generateStrategies(cells, count = 4) {
  const detectedLevel = detectMatrixLevel(cells);

  // Collect strategies that target this level or are universal (all levels)
  const relevant = STRATEGY_BANK.filter(
    (s) => s.level.includes(detectedLevel) || s.level.length === 7
  );

  // Sort by priority (1 first)
  const sorted = relevant.sort((a, b) => a.priority - b.priority);

  // Return up to `count` strategies, deduplicated by id
  const seen = new Set();
  const result = [];
  for (const strategy of sorted) {
    if (!seen.has(strategy.id)) {
      seen.add(strategy.id);
      result.push({ ...strategy, targetLevel: detectedLevel });
    }
    if (result.length >= count) break;
  }

  // If not enough strategies at this level, supplement with universal ones
  if (result.length < count) {
    for (const strategy of STRATEGY_BANK) {
      if (!seen.has(strategy.id) && strategy.priority === 3) {
        seen.add(strategy.id);
        result.push({ ...strategy, targetLevel: detectedLevel });
      }
      if (result.length >= count) break;
    }
  }

  return result;
}

export { detectMatrixLevel };
