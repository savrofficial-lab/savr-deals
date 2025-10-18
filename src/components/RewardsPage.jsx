import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Gem, Zap, Award, Star, Lock, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { 
  MILESTONES, 
  getBadgeById, 
  getHighestUnlockedBadge, 
  getNextMilestone, 
  getProgressToNext,
  isBadgeUnlocked 
} from '../utils/badgeSystem';

const ICON_MAP = {
  Award: Award,
  Star: Star,
  Trophy: Trophy,
  Gem: Gem,
  Crown: Crown,
  Zap: Zap
};

export default function RewardsPage() {
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState(0);
  const [equippedBadge, setEquippedBadge] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showEquipModal, setShowEquipModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: coinsData, error: coinsError } = await supabase
        .from('coins')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (coinsError && coinsError.code !== 'PGRST116') {
        console.error('Error fetching coins:', coinsError);
      } else {
        setUserCoins(coinsData?.balance || 0);
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('equipped_badge')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      } else {
        setEquippedBadge(profileData?.equipped_badge || null);
      }

    } catch (err) {
      console.error('Error in fetchUserData:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipBadge = (milestone) => {
    if (!isBadgeUnlocked(milestone.id, userCoins)) return;
    setSelectedBadge(milestone);
    setShowEquipModal(true);
  };

  const confirmEquip = async () => {
    if (!userId || !selectedBadge) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ equipped_badge: selectedBadge.id })
        .eq('user_id', userId);

      if (error) {
        console.error('Error equipping badge:', error);
        alert('Failed to equip badge. Please try again.');
      } else {
        setEquippedBadge(selectedBadge.id);
        setShowEquipModal(false);
      }
    } catch (err) {
      console.error('Error in confirmEquip:', err);
      alert('An error occurred. Please try again.');
    }
  };

  const currentTier = getHighestUnlockedBadge(userCoins);
  const nextMilestone = getNextMilestone(userCoins);
  const progressToNext = getProgressToNext(userCoins);

  const BadgeCard = ({ milestone }) => {
    const unlocked = isBadgeUnlocked(milestone.id, userCoins);
    const equipped = equippedBadge === milestone.id;
    const Icon = ICON_MAP[milestone.icon];

    return (
      <div 
        className={`relative bg-white rounded-xl p-4 transition-all duration-300 border-2 ${
          unlocked 
            ? `${milestone.borderColor} hover:scale-105 hover:shadow-lg cursor-pointer` 
            : 'border-gray-200 opacity-60'
        } ${equipped ? 'ring-2 ring-green-400' : ''}`}
        onClick={() => unlocked && handleEquipBadge(milestone)}
      >
        {/* Equipped checkmark - smaller */}
        {equipped && (
          <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-md z-10">
            <Check size={12} />
          </div>
        )}

        {/* Lock overlay for locked badges */}
        {!unlocked && (
          <div className="absolute inset-0 bg-gray-100/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
            <Lock size={32} className="text-gray-400" />
          </div>
        )}

        {/* Badge Icon - smaller */}
        <div className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br ${milestone.color} flex items-center justify-center ${unlocked ? 'animate-pulse' : ''}`}>
          <Icon size={32} className="text-white" />
        </div>

        {/* Badge Info - compact */}
        <div className="text-center">
          <h3 className="text-base font-bold text-gray-800 mb-1 truncate">{milestone.name}</h3>
          <p className={`text-xs font-semibold mb-2 ${
            milestone.rarity === 'Common' ? 'text-orange-500' :
            milestone.rarity === 'Rare' ? 'text-gray-500' :
            milestone.rarity === 'Epic' ? 'text-yellow-500' :
            milestone.rarity === 'Legendary' ? 'text-cyan-500' :
            milestone.rarity === 'Mythic' ? 'text-purple-500' :
            'text-red-500'
          }`}>
            {milestone.rarity}
          </p>
          <p className="text-gray-600 text-xs mb-2 line-clamp-2">{milestone.description}</p>
          
          {/* Coins requirement - smaller */}
          <div className="flex items-center justify-center gap-1 bg-gray-100 rounded-full px-3 py-1.5 mb-2">
            <span className="text-base">🪙</span>
            <span className="font-bold text-gray-700 text-sm">{milestone.coins}</span>
          </div>

          {/* Equip button - smaller */}
          {unlocked && (
            <button 
              className={`w-full py-1.5 rounded-lg font-semibold text-sm transition-all ${
                equipped 
                  ? 'bg-green-500 text-white cursor-default' 
                  : 'bg-gradient-to-r ' + milestone.color + ' text-white hover:opacity-90'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!equipped) handleEquipBadge(milestone);
              }}
            >
              {equipped ? 'Equipped ✓' : 'Equip'}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Please Log In</h2>
          <p className="text-gray-600">You need to be logged in to view rewards.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 pb-20">
      {/* Header - compact */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">🏆 Rewards & Badges</h1>
          <p className="text-sm text-orange-100">Unlock exclusive badges and flex your status!</p>
        </div>
      </div>

      {/* Current Status Card - compact */}
      <div className="max-w-6xl mx-auto px-4 -mt-4">
        <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-white text-lg sm:text-xl font-bold mb-1">Your Coins</h2>
              <div className="flex items-center gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white">{userCoins}</span>
                <span className="text-2xl sm:text-3xl">🪙</span>
              </div>
            </div>
            
            {currentTier && (
              <div className="text-right">
                <p className="text-orange-100 text-xs mb-1">Current Tier</p>
                <div className={`inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border-2 ${currentTier.borderColor}`}>
                  {React.createElement(ICON_MAP[currentTier.icon], { size: 24, className: 'text-white' })}
                  <span className="text-white font-bold text-sm sm:text-base">{currentTier.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar - compact */}
          {nextMilestone && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold text-sm">Next: {nextMilestone.name}</span>
                <span className="text-white font-bold text-sm">{nextMilestone.coins - userCoins} left</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${progressToNext}%` }}
                >
                  <span className="text-white text-xs font-bold">{Math.round(progressToNext)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badges Grid - 3 columns on mobile, more on larger screens */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 text-center">
          All Badges
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {MILESTONES.map((milestone) => (
            <BadgeCard key={milestone.id} milestone={milestone} />
          ))}
        </div>
      </div>

      {/* Equip Modal - responsive */}
      {showEquipModal && selectedBadge && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className={`w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br ${selectedBadge.color} flex items-center justify-center`}>
                {React.createElement(ICON_MAP[selectedBadge.icon], { size: 48, className: 'text-white' })}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Equip {selectedBadge.name}?</h3>
              <p className="text-gray-600 text-sm mb-5">This badge will be displayed on your profile, leaderboard, and forum posts.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowEquipModal(false)}
                  className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmEquip}
                  className={`flex-1 py-2.5 bg-gradient-to-r ${selectedBadge.color} text-white rounded-xl font-semibold hover:opacity-90 transition-opacity text-sm`}
                >
                  Equip Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Section - compact */}
      <div className="max-w-6xl mx-auto px-4 pb-6">
        <div className="bg-white rounded-xl p-5 shadow-lg border-2 border-orange-200">
          <h3 className="text-lg font-bold text-gray-800 mb-3">💡 How It Works</h3>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-base">🎯</span>
              <span><strong>Earn coins</strong> by posting deals and being active</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-base">🏆</span>
              <span><strong>Unlock badges</strong> when you reach milestones</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-base">✨</span>
              <span><strong>Equip your favorite</strong> badge to show everywhere</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-base">👑</span>
              <span><strong>Flex your status</strong> - higher badges = more respect!</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
