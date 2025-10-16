import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Bell, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Notifications({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔹 Fetch all notifications for current user
  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
    } else {
      setNotifications(data || []);
    }

    setLoading(false);
  };

  // 🔹 Mark a single notification as read
  const markAsRead = async (id) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (error) {
      console.error("Error marking read:", error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // 🔹 Mark all as read
  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error marking all read:", error);
      return;
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // 🔹 Handle notification click — navigate based on its type or link
  const handleNotificationClick = async (n) => {
    await markAsRead(n.id);

    // Priority 1: if link is provided → open that link
    if (n.link) {
      if (n.link.startsWith("http")) {
        window.open(n.link, "_blank");
      } else {
        navigate(n.link);
      }
      return;
    }

    // Priority 2: otherwise, use type-based navigation
    switch (n.type) {
      case "deal_reported":
        navigate(`/deal/${n.deal_id || ""}`);
        break;
      case "comment_reply":
        navigate(`/deal/${n.deal_id || ""}#comments`);
        break;
      case "warning":
        navigate(`/profile/${n.user_id}`);
        break;
      default:
        console.log("No navigation rule for type:", n.type);
        break;
    }
  };

  // 🔹 Initial fetch + realtime listener
  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel("realtime_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 🔹 Not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-gray-600">
        <Bell className="w-10 h-10 mb-3 text-amber-600" />
        <p>Please log in to view notifications</p>
      </div>
    );
  }

  // 🔹 Loading spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="animate-spin text-amber-600 w-8 h-8" />
      </div>
    );
  }

  // 🔹 Render all notifications
  return (
    <div className="max-w-3xl mx-auto mt-10 mb-24 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-7 h-7 text-amber-600" />
          <h1 className="text-2xl font-semibold">Notifications</h1>
        </div>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllAsRead}
            className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1 rounded-lg transition"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Empty state */}
      {notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow text-center text-gray-500"
        >
          🎉 No notifications yet — you’re all caught up!
        </motion.div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-between p-4 rounded-xl shadow-sm border cursor-pointer transition ${
                n.read
                  ? "bg-gray-50 hover:bg-gray-100"
                  : "bg-amber-50 border-amber-200 hover:bg-amber-100"
              }`}
              onClick={() => handleNotificationClick(n)}
            >
              <div className="flex-1">
                <p className="text-gray-800 text-sm">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>

              {!n.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(n.id);
                  }}
                  className="ml-4 text-xs flex items-center gap-1 text-amber-600 hover:text-amber-700 transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Read
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
