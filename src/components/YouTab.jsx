// src/components/YouTab.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import LoginModal from "./LoginModal";
import Profile from "./Profile";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function YouTab() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // get current user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setLoading(false);
    });

    // listen for login/logout changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  // Fetch user role if logged in
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        if (data && !error) {
          setUserRole(data.role);
        }
      } else {
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-amber-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    // not logged in → show login form/modal
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
          <div className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-8 max-w-md w-full border border-amber-100">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-600">Sign in to access your profile</p>
            </div>
            
            <LoginModal onClose={() => {}} />
            
            <p className="text-center text-gray-500 mt-6 text-sm">
              Please log in to see your profile
            </p>
          </div>
        </div>
      </div>
    );
  }

  // logged in → show profile with admin button if applicable
  return (
    <div>
      {/* Admin Dashboard Button - Only visible to admins and moderators */}
      {(userRole === "admin" || userRole === "moderator") && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          <a
            href="/admin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Shield size={20} />
            <span>Admin Dashboard</span>
          </a>
        </motion.div>
      )}
      
      {/* Original Profile Component */}
      <Profile userId={user.id} />
    </div>
  );
}
