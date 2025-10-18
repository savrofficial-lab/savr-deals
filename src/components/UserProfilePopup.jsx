// src/components/UserProfilePopup.jsx
import React, { useState, useEffect } from 'react';
import { X, Award, MessageSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import BadgeDisplay from './BadgeDisplay';

export default function UserProfilePopup({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, coins, posts_count, equipped_badge, created_at')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      
      setProfile(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative bg-gradient-to-br from-white via-amber-50 to-orange-50 rounded-3xl shadow-2xl max-w-md w-full border-2 border-amber-200 overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        >
          <X className="w-5 h-5 text-amber-700" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
          </div>
        ) : profile ? (
          <>
            {/* Header Gradient */}
            <div className="h-24 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
            </div>

            {/* Profile Content */}
            <div className="px-6 pb-6">
              {/* Avatar */}
              <div className="flex justify-center -mt-12 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-lg opacity-60 animate-pulse"></div>
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="relative w-24 h-24 rounded-full object-cover border-4 border-white shadow-2xl"
                    />
                  ) : (
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-4xl font-black border-4 border-white shadow-2xl">
                      {(profile.username?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Username with Badge */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <h3 className="text-2xl font-black text-amber-900">
                    {profile.username || 'Anonymous'}
                  </h3>
                  {profile.equipped_badge && (
                    <div className="animate-bounce">
                      <BadgeDisplay badgeId={profile.equipped_badge} size="md" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-amber-600">
                  Member since {new Date(profile.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Coins Stat */}
                <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl p-4 border-2 border-yellow-200 shadow-lg transform hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-3xl">🪙</span>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-amber-700">
                      {profile.coins || 0}
                    </p>
                    <p className="text-xs font-semibold text-amber-600">Total Coins</p>
                  </div>
                </div>

                {/* Posts Stat */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-2xl p-4 border-2 border-orange-200 shadow-lg transform hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MessageSquare className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-orange-700">
                      {profile.posts_count || 0}
                    </p>
                    <p className="text-xs font-semibold text-orange-600">Total Posts</p>
                  </div>
                </div>
              </div>

              {/* Badge Section (if equipped) */}
              {profile.equipped_badge && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border-2 border-purple-200 shadow-lg">
                  <div className="flex items-center justify-center gap-3">
                    <Award className="w-5 h-5 text-purple-600" />
                    <p className="text-sm font-bold text-purple-700">
                      Current Badge
                    </p>
                  </div>
                  <div className="flex items-center justify-center mt-3">
                    <BadgeDisplay 
                      badgeId={profile.equipped_badge} 
                      size="lg" 
                      showName={true} 
                    />
                  </div>
                </div>
              )}

              {/* Fun Fact */}
              <div className="mt-4 text-center">
                <p className="text-xs text-amber-600 font-medium">
                  {profile.coins >= 100 ? '🔥 Legendary Hunter!' : 
                   profile.coins >= 50 ? '⭐ Epic Contributor!' :
                   profile.coins >= 25 ? '🌟 Rising Star!' :
                   '🌱 New Member'}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="text-amber-700 font-semibold">Profile not found</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
