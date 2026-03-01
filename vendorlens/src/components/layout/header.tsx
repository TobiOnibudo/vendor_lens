"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Search, FileText, AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title: string;
  description?: string;
}

interface Notification {
  id: string;
  type: "warning" | "info" | "renewal";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const notificationIcons = {
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  info: <FileText className="h-4 w-4 text-blue-500" />,
  renewal: <RefreshCw className="h-4 w-4 text-violet-500" />,
};

const notificationColors = {
  warning: "bg-amber-50 border-amber-100",
  info: "bg-blue-50 border-blue-100",
  renewal: "bg-violet-50 border-violet-100",
};

export function Header({ title, description }: HeaderProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.notifications) {
          setNotifications(
            data.notifications.map((n: Omit<Notification, "read">) => ({
              ...n,
              read: false,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center justify-between h-16 px-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">

          {/* Notification bell */}
          <div className="relative" ref={panelRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setOpen((v) => !v)}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Button>

            {open && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    <div className="h-5 w-5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    You&apos;re all caught up
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`relative flex gap-3 px-4 py-3 transition-colors ${
                          n.read ? "opacity-60" : ""
                        }`}
                      >
                        <div className={`mt-0.5 h-8 w-8 flex-shrink-0 rounded-lg border flex items-center justify-center ${notificationColors[n.type]}`}>
                          {notificationIcons[n.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900 leading-snug">{n.title}</p>
                            <button
                              onClick={() => dismiss(n.id)}
                              className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
                              aria-label="Dismiss"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                        </div>
                        {!n.read && (
                          <span className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-blue-500" />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-semibold">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
