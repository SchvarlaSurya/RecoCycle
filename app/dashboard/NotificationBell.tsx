"use client";

import { useWasteStore } from "@/store/useWasteStore";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, markNotificationsAsRead } = useWasteStore();
  const { user } = useUser();
  const menuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = async () => {
    const wasClosed = !isOpen;
    setIsOpen(!isOpen);

    // Only mark as read when opening the dropdown and there are unread notifications
    if (wasClosed && unreadCount > 0 && user) {
      try {
        await fetch(`/api/notifications?userId=${user.id}`, { method: 'PUT' })
      } catch (e) {
        console.error('Failed to mark notifications as read:', e)
      }
      markNotificationsAsRead();
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={handleToggle}
        className="relative p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors focus:outline-none"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-xl border border-stone-200 z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in duration-200">
          <div className="bg-stone-50 border-b border-stone-200 px-4 py-3 flex justify-between items-center">
            <h3 className="font-semibold text-stone-800 text-sm">Notifikasi</h3>
            {notifications.length > 0 && (
              <span className="text-[10px] text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full font-medium">Terbaru</span>
            )}
          </div>
          
          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <svg className="w-12 h-12 text-stone-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm text-stone-500 font-medium">Belum ada notifikasi saat ini.</p>
                <p className="text-xs text-stone-400 mt-1">Setor sampah untuk mulai mengumpulkan Poin & Saldo!</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {notifications.map((notification) => (
                  <div key={notification.id} className={`p-4 transition-colors hover:bg-stone-50 ${!notification.read ? "bg-emerald-50/30" : "bg-white"}`}>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${notification.title.includes("Berhasil") ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}>
                          {notification.title.includes("Berhasil") ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className={`text-sm ${!notification.read ? "font-bold text-stone-900" : "font-semibold text-stone-800"}`}>
                            {notification.title}
                          </h4>
                          <span className="text-[10px] whitespace-nowrap text-stone-400 ml-2">
                            {new Date(notification.date).toLocaleDateString('id-ID', { hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-t border-stone-200 bg-stone-50 p-2 text-center">
            <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 p-2">Tandai Semua Sudah Dibaca</button>
          </div>
        </div>
      )}
    </div>
  );
}
