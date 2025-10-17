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

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Fetch coins
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

      // Fetch equipped badge
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
        className={`relative bg-white rounded-2xl p-6 transition-all duration-300 border-2 ${
          unlocked 
            ? `${milestone.borderColor} hover:scale-105 hover:${milestone.glowColor} hover:shadow-xl cursor-pointer` 
            : 'border-gray-200 opacity-60'
        }`}
        onClick={() => unlocked && handleEquipBadge(milestone)}
      >
        {equipped && (
          <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-2 shadow-lg z-10">
            <Check size={16} />
          </div>
        )}

        {!unlocked && (
          <div className="absolute inset-0 bg-gray-100/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
            <Lock size={48} className="text-gray-400" />
          </div>
        )}

        <div className={`w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br ${milestone.color} flex items-center justify-center ${unlocked ? 'animate-pulse' : ''}`}>
          <Icon size={48} className="text-white" />
        </div>

        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800 mb-1">{milestone.name}</h3>
          <p className={`text-sm font-semibold mb-2 ${
            milestone.rarity === 'Common' ? 'text-orange-500' :
            milestone.rarity === 'Rare' ? 'text-gray-500' :
            milestone.rarity === 'Epic' ? 'text-yellow-500' :
            milestone.rarity === 'Legendary' ? 'text-cyan-500' :
            milestone.rarity === 'Mythic' ? 'text-purple-500' :
            'text-red-500'
          }`}>
            {milestone.rarity}
          </p>
          <p className="text-gray-600 text-sm mb-3">{milestone.description}</p>
          
          <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <span className="text-2xl">🪙</span>
            <span className="font-bold text-gray-700">{milestone.coins} Coins</span>
          </div>

          {unlocked && (
            <button 
              className={`mt-4 w-full py-2 rounded-lg font-semibold transition-all ${
                equipped 
                  ? 'bg-green-500 text-white cursor-default' 
                  : 'bg-gradient-to-r ' + milestone.color + ' text-white hover:opacity-90'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!equipped) handleEquipBadge(milestone);
              }}
            >
              {equipped ? 'Equipped ✓' : 'Equip Badge'}
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">🏆 Rewards & Badges</h1>
          <p className="text-orange-100">Unlock exclusive badges and flex your status!</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6">
        <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Your Coins</h2>
              <div className="flex items-center gap-3">
                <span className="text-6xl font-black text-white">{userCoins}</span>
                <span className="text-4xl">🪙</span>
              </div>
            </div>
            
            {currentTier && (
              <div className="text-right">
                <p className="text-orange-100 text-sm mb-2">Current Tier</p>
                <div className={`inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 border-2 ${currentTier.borderColor}`}>
                  {React.createElement(ICON_MAP[currentTier.icon], { size: 32, className: 'text-white' })}
                  <span className="text-white font-bold text-xl">{currentTier.name}</span>
                </div>
              </div>
            )}
          </div>

          {nextMilestone && (
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold">Next: {nextMilestone.name}</span>
                <span className="text-white font-bold">{nextMilestone.coins - userCoins} coins needed</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-4 overflow-hidden">
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

      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">All Badges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MILESTONES.map((milestone) => (
            <BadgeCard key={milestone.id} milestone={milestone} />
          ))}
        </div>
      </div>

      {showEquipModal && selectedBadge && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className={`w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br ${selectedBadge.color} flex items-center justify-center`}>
                {React.createElement(ICON_MAP[selectedBadge.icon], { size: 64, className: 'text-white' })}
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Equip {selectedBadge.name}?</h3>
              <p className="text-gray-600 mb-6">This badge will be displayed on your profile, leaderboard, and forum posts.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowEquipModal(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmEquip}
                  className={`flex-1 py-3 bg-gradient-to-r ${selectedBadge.color} text-white rounded-xl font-semibold hover:opacity-90 transition-opacity`}
                >
                  Equip Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-orange-200">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">💡 How It Works</h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-xl">🎯</span>
              <span><strong>Earn coins</strong> by posting deals, voting, and being active</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">🏆</span>
              <span><strong>Unlock badges</strong> when you reach coin milestones</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">✨</span>
              <span><strong>Equip your favorite</strong> badge to show everywhere</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">👑</span>
              <span><strong>Flex your status</strong> - higher badges = more respect!</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
        }
