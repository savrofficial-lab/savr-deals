// src/components/Notifications.jsx
import React, { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Notifications({ user }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Fetch notifications
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        setNotifications(data);
      }
      setLoading(false);
    };
    
    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel("notifications-page-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.new.user_id === user.id) {
            setNotifications((prev) => [payload.new, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.new.user_id === user.id) {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? payload.new : n))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const markAsRead = async (id) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user.id);
    
    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
    setMarkingAll(false);
  };

  const deleteNotification = async (id) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    
    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border-2 border-amber-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-amber-50 rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-amber-700" />
            </button>
            <div className="flex items-center gap-3">
              <Bell className="w-7 h-7 text-amber-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-yellow-600 bg-clip-text text-transparent">
                Notifications
              </h1>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={markAllAsRead}
              disabled={markingAll}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition-all shadow-md disabled:opacity-50"
            >
              {markingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Mark all read
            </motion.button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            Total: <span className="font-semibold text-gray-800">{notifications.length}</span>
          </span>
          <span className="text-amber-600">
            Unread: <span className="font-semibold">{unreadCount}</span>
          </span>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-12 border-2 border-amber-100 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-12 border-2 border-amber-100 text-center"
        >
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No notifications yet</h3>
          <p className="text-gray-500">When you get notifications, they'll show up here</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`bg-white/95 backdrop-blur-xl rounded-xl shadow-lg p-5 border-2 transition-all hover:shadow-xl ${
                notification.read
                  ? "border-gray-200"
                  : "border-amber-200 bg-gradient-to-r from-amber-50/50 to-yellow-50/50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className={`text-sm ${notification.read ? "text-gray-700" : "text-gray-900 font-medium"}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notification.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!notification.read && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 hover:bg-green-50 rounded-lg transition-colors group"
                      aria-label="Mark as read"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4 text-green-600 group-hover:text-green-700" />
                    </motion.button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                    aria-label="Delete notification"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-500 group-hover:text-red-600" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
