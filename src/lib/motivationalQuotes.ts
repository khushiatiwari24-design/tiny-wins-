export interface MotivationalQuote {
  id: number;
  quote: string;
  text?: string;
  author: string;
  category: "Tiny Habits" | "Mindset" | "Focus" | "Resilience" | "Consistency" | "Self-Compassion" | "Action";
}

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    id: 1,
    quote: "You do not rise to the level of your goals. You fall to the level of your systems.",
    author: "James Clear",
    category: "Tiny Habits",
  },
  {
    id: 2,
    quote: "A 5-minute bad session is infinitely more valuable than a 0-minute perfect intention.",
    author: "Tiny Wins Wisdom",
    category: "Consistency",
  },
  {
    id: 3,
    quote: "Action isn't just the effect of motivation; it is also the cause of it.",
    author: "Mark Manson",
    category: "Mindset",
  },
  {
    id: 4,
    quote: "Never miss twice. If you miss one day, try to get back on track as quickly as possible.",
    author: "James Clear",
    category: "Resilience",
  },
  {
    id: 5,
    quote: "Small disciplines repeated with consistency every day lead to great achievements gained slowly over time.",
    author: "John C. Maxwell",
    category: "Consistency",
  },
  {
    id: 6,
    quote: "The secret of getting ahead is getting started. The secret of getting started is breaking your complex tasks into small manageable tasks.",
    author: "Mark Twain",
    category: "Focus",
  },
  {
    id: 7,
    quote: "Make it so easy you can't say no. Two minutes of reading is better than zero minutes of reading.",
    author: "Leo Babauta",
    category: "Tiny Habits",
  },
  {
    id: 8,
    quote: "Energy flows where attention goes. Single-tasking is your greatest superpower in a noisy world.",
    author: "Deep Work Principle",
    category: "Focus",
  },
  {
    id: 9,
    quote: "Be patient with yourself. Self-growth is tender; it's holy ground. There's no greater investment.",
    author: "Stephen Covey",
    category: "Self-Compassion",
  },
  {
    id: 10,
    quote: "Start where you are. Use what you have. Do what you can.",
    author: "Arthur Ashe",
    category: "Mindset",
  },
  {
    id: 11,
    quote: "A river cuts through rock, not because of its power, but because of its persistence.",
    author: "Jim Watkins",
    category: "Consistency",
  },
  {
    id: 12,
    quote: "You don't have to be extreme, just consistent. 1% better every day compounds into 37x in a year.",
    author: "Atomic Principle",
    category: "Tiny Habits",
  },
  {
    id: 13,
    quote: "Rest is not quitting. Recovery is part of the work that makes sustainable momentum possible.",
    author: "Alex Soojung-Kim Pang",
    category: "Self-Compassion",
  },
  {
    id: 14,
    quote: "The man who moves a mountain begins by carrying away small stones.",
    author: "Confucius",
    category: "Tiny Habits",
  },
  {
    id: 15,
    quote: "Do not wait to strike till the iron is hot; but make it hot by striking.",
    author: "William Butler Yeats",
    category: "Action",
  } as MotivationalQuote,
  {
    id: 16,
    quote: "Clarity comes from engagement, not thought. You cannot steer a parked car.",
    author: "Marie Forleo",
    category: "Mindset",
  },
  {
    id: 17,
    quote: "Focus is a muscle. The more you protect 15 minutes of uninterrupted calm, the deeper your mind goes.",
    author: "Cal Newport",
    category: "Focus",
  },
  {
    id: 18,
    quote: "Celebrate the small wins. They are the breadcrumbs that lead to massive breakthroughs.",
    author: "BJ Fogg",
    category: "Tiny Habits",
  },
  {
    id: 19,
    quote: "If you get tired, learn to rest, not to quit.",
    author: "Banksy",
    category: "Self-Compassion",
  },
  {
    id: 20,
    quote: "Great things are not done by impulse, but by a series of small things brought together.",
    author: "Vincent Van Gogh",
    category: "Consistency",
  },
  {
    id: 21,
    quote: "Habits are the compound interest of self-improvement.",
    author: "James Clear",
    category: "Tiny Habits",
  },
  {
    id: 22,
    quote: "The only bad workout or study session is the one that didn't happen. Showing up is 80% of life.",
    author: "Woody Allen",
    category: "Consistency",
  },
  {
    id: 23,
    quote: "Perfectionism is just procrastination in high-heeled shoes. Dare to do a messy first draft.",
    author: "Elizabeth Gilbert",
    category: "Mindset",
  },
  {
    id: 24,
    quote: "Peace comes from knowing you did your tiny bit today, regardless of how chaotic the world felt.",
    author: "Tiny Wins Wisdom",
    category: "Self-Compassion",
  },
  {
    id: 25,
    quote: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
    category: "Consistency",
  },
  {
    id: 26,
    quote: "Your identity is shaped by your habits. Every action you take is a vote for the person you wish to become.",
    author: "James Clear",
    category: "Tiny Habits",
  },
  {
    id: 27,
    quote: "Deep focus is the rare currency of the modern economy. Guard your mornings like gold.",
    author: "Cal Newport",
    category: "Focus",
  },
  {
    id: 28,
    quote: "Success is the sum of small efforts, repeated day in and day out.",
    author: "Robert Collier",
    category: "Consistency",
  },
  {
    id: 29,
    quote: "When inspiration doesn't come, routine takes over. Trust your daily cadence.",
    author: "Twyla Tharp",
    category: "Mindset",
  },
  {
    id: 30,
    quote: "Don't judge each day by the harvest you reap, but by the seeds that you plant.",
    author: "Robert Louis Stevenson",
    category: "Tiny Habits",
  },
  {
    id: 31,
    quote: "Discipline is choosing between what you want now and what you want most.",
    author: "Abraham Lincoln",
    category: "Focus",
  },
  {
    id: 32,
    quote: "Compassion toward yourself isn't weakness. It is the fuel that allows you to try again tomorrow.",
    author: "Kristin Neff",
    category: "Self-Compassion",
  },
  {
    id: 33,
    quote: "Little by little, a little becomes a lot.",
    author: "Tanzanian Proverb",
    category: "Consistency",
  },
  {
    id: 34,
    quote: "Eliminate the clutter. Your peace of mind and clarity of thought depend on what you choose to ignore.",
    author: "Marcus Aurelius",
    category: "Focus",
  },
  {
    id: 35,
    quote: "A streak is not a chain of iron; it is a rhythm of breath. Inhale effort, exhale recovery, keep walking.",
    author: "Tiny Wins Wisdom",
    category: "Resilience",
  },
  {
    id: 36,
    quote: "The courage to be imperfect is where true learning and authentic progress begin.",
    author: "Brené Brown",
    category: "Mindset",
  },
  {
    id: 37,
    quote: "Step by step. One page, one rep, one line of code, one tiny win at a time.",
    author: "Daily Creed",
    category: "Tiny Habits",
  },
];

/**
 * Returns today's quote based on day-of-year seed so all users get a fresh daily thought
 */
export function getTodayMotivationalQuote(): MotivationalQuote & { text: string } {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const index = Math.abs(dayOfYear) % MOTIVATIONAL_QUOTES.length;
  const item = MOTIVATIONAL_QUOTES[index];
  return { ...item, text: item.quote };
}

/**
 * Returns a random quote when the user clicks 'New Thought'
 */
export function getRandomMotivationalQuote(excludeId?: number): MotivationalQuote & { text: string } {
  const candidates = excludeId
    ? MOTIVATIONAL_QUOTES.filter((q) => q.id !== excludeId)
    : MOTIVATIONAL_QUOTES;
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const item = candidates[randomIndex];
  return { ...item, text: item.quote };
}
