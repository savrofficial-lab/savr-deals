// Badge configuration
export const MILESTONES = [
  {
    id: 'bronze-hunter',
    coins: 10,
    name: 'Bronze Hunter',
    rarity: 'Common',
    icon: 'Award',
    color: 'from-orange-400 to-orange-600',
    borderColor: 'border-orange-500',
    glowColor: 'shadow-orange-500/50',
    description: 'Your journey begins',
    emoji: '🥉'
  },
  {
    id: 'silver-spotter',
    coins: 25,
    name: 'Silver Spotter',
    rarity: 'Rare',
    icon: 'Star',
    color: 'from-gray-300 to-gray-500',
    borderColor: 'border-gray-400',
    glowColor: 'shadow-gray-400/50',
    description: 'Sharp eyes for deals',
    emoji: '🥈'
  },
  {
    id: 'gold-master',
    coins: 50,
    name: 'Gold Master',
    rarity: 'Epic',
    icon: 'Trophy',
    color: 'from-yellow-400 to-yellow-600',
    borderColor: 'border-yellow-500',
    glowColor: 'shadow-yellow-500/50',
    description: 'Elite deal hunter',
    emoji: '🥇'
  },
  {
    id: 'diamond-elite',
    coins: 100,
    name: 'Diamond Elite',
    rarity: 'Legendary',
    icon: 'Gem',
    color: 'from-cyan-400 to-blue-600',
    borderColor: 'border-cyan-400',
    glowColor: 'shadow-cyan-400/50',
    description: 'Legendary status achieved',
    emoji: '💎'
  },
  {
    id: 'mythic-champion',
    coins: 200,
    name: 'Mythic Champion',
    rarity: 'Mythic',
    icon: 'Crown',
    color: 'from-purple-500 to-pink-600',
    borderColor: 'border-purple-500',
    glowColor: 'shadow-purple-500/50',
    description: 'Among the greatest',
    emoji: '👑'
  },
  {
    id: 'apex-predator',
    coins: 500,
    name: 'Apex Predator',
    rarity: 'Exclusive',
    icon: 'Zap',
    color: 'from-red-500 via-orange-500 to-yellow-500',
    borderColor: 'border-red-500',
    glowColor: 'shadow-red-500/50',
    description: 'Top 10 only 🔥',
    emoji: '⚡'
  }
];

// Get badge by ID
export const getBadgeById = (badgeId) => {
  return MILESTONES.find(m => m.id === badgeId);
};

// Get highest unlocked badge for a coin amount
export const getHighestUnlockedBadge = (coins) => {
  const unlocked = MILESTONES.filter(m => coins >= m.coins);
  return unlocked[unlocked.length - 1] || null;
};

// Check if badge is unlocked
export const isBadgeUnlocked = (badgeId, coins) => {
  const badge = getBadgeById(badgeId);
  return badge ? coins >= badge.coins : false;
};

// Get next milestone
export const getNextMilestone = (coins) => {
  return MILESTONES.find(m => m.coins > coins);
};

// Get progress to next badge (0-100)
export const getProgressToNext = (coins) => {
  const current = getHighestUnlockedBadge(coins);
  const next = getNextMilestone(coins);
  
  if (!next) return 100;
  
  const currentCoins = current?.coins || 0;
  const nextCoins = next.coins;
  const progress = ((coins - currentCoins) / (nextCoins - currentCoins)) * 100;
  
  return Math.min(100, Math.max(0, progress));
};
