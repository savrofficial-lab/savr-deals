import React from 'react';
import { Trophy, Crown, Gem, Zap, Award, Star } from 'lucide-react';
import { getBadgeById } from '../utils/badgeSystem';

const ICON_MAP = {
  Award: Award,
  Star: Star,
  Trophy: Trophy,
  Gem: Gem,
  Crown: Crown,
  Zap: Zap
};

export default function BadgeDisplay({ badgeId, size = 'sm', showName = false, showEmoji = false }) {
  const badge = getBadgeById(badgeId);
  
  if (!badge) return null;
  
  const Icon = ICON_MAP[badge.icon];
  
  const sizes = {
    xs: { container: 'w-6 h-6', icon: 12, text: 'text-xs' },
    sm: { container: 'w-8 h-8', icon: 16, text: 'text-sm' },
    md: { container: 'w-12 h-12', icon: 24, text: 'text-base' },
    lg: { container: 'w-16 h-16', icon: 32, text: 'text-lg' }
  };
  
  const sizeConfig = sizes[size] || sizes.sm;
  
  return (
    <div className="inline-flex items-center gap-2">
      {showEmoji ? (
        <span className="text-2xl" title={badge.name}>{badge.emoji}</span>
      ) : (
        <div 
          className={`${sizeConfig.container} rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center shadow-lg ring-2 ring-white shrink-0`}
          title={badge.name}
        >
          <Icon size={sizeConfig.icon} className="text-white" />
        </div>
      )}
      {showName && (
        <span className={`font-semibold text-gray-700 ${sizeConfig.text}`}>
          {badge.name}
        </span>
      )}
    </div>
  );
}
