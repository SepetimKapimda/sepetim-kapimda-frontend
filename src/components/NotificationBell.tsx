"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Bell, CheckCheck, Inbox, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/api/notifications";

// Zil rozetindeki sayı için sık ama hafif bir polling (yalnızca `{unread_count}`
// döner) — dropdown açıkken tam liste ayrıca çekilir.
const UNREAD_POLL_INTERVAL_MS = 15_000;

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const role = useAuthStore((state) => state.user?.role);
  const isPanelUser = role === "ADMIN" || role === "MARKET_OWNER" || role === "COURIER_MANAGER" || role === "COURIER";

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAudioUnlockedRef = useRef(false);
  const previousUnreadCountRef = useRef<number | null>(null);

  // Tarayıcıların "kullanıcı etkileşimi olmadan sesli autoplay yok" kısıtı:
  // panele girmek zaten bir giriş formu göndermeyi gerektirdiği için ilk
  // tıklama/tuşta sesi sessizce bir kez çalıp durdurarak kilidi açıyoruz —
  // gerçek bildirim geldiğinde artık `play()` engellenmiyor.
  useEffect(() => {
    if (!isPanelUser) return;
    const unlockAudio = () => {
      if (isAudioUnlockedRef.current || !audioRef.current) return;
      const audio = audioRef.current;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          isAudioUnlockedRef.current = true;
        })
        .catch(() => {});
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [isPanelUser]);

  const { data: unreadData, mutate: mutateUnread } = useSWR(
    isPanelUser ? "notification-bell-unread-count" : null,
    fetchUnreadNotificationCount,
    { refreshInterval: UNREAD_POLL_INTERVAL_MS }
  );
  const unreadCount = unreadData?.unread_count ?? 0;

  // Polling yeni bir okunmamış bildirim yakaladığında (sayı arttığında) sesi çal.
  useEffect(() => {
    const previous = previousUnreadCountRef.current;
    if (previous !== null && unreadCount > previous) {
      audioRef.current?.play().catch(() => {});
    }
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const {
    data: notificationsPage,
    isLoading,
    mutate: mutateList,
  } = useSWR(isOpen ? "notification-bell-list" : null, () => fetchNotifications(10));
  const notifications = notificationsPage?.results ?? [];

  const handleMarkOneRead = async (notification: AppNotification) => {
    if (notification.is_read) return;
    try {
      await markNotificationRead(notification.id);
      mutateList();
      mutateUnread();
    } catch {
      // Sessizce yok say — zil menüsü küçük bir yardımcı bileşen, hata
      // burada kullanıcı akışını (link'e gitmeyi) bloklamamalı.
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      mutateList();
      mutateUnread();
    } catch {
      // bkz. handleMarkOneRead
    }
  };

  if (!isPanelUser) return null;

  return (
    <div className="relative">
      <audio ref={audioRef} src="/sounds/notification.wav" preload="auto" className="hidden" />

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Bildirimler"
        aria-expanded={isOpen}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-popover sm:w-96">
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
              <p className="font-heading text-sm font-bold text-charcoal">Bildirimler</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs font-bold text-orange-600 transition hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tümünü okundu işaretle
                </button>
              )}
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <Inbox className="h-8 w-8 text-muted" />
                  <p className="text-sm font-bold text-charcoal">Henüz bildirim yok</p>
                  <p className="text-xs text-muted">Yeni olaylar burada anında görünecek.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {notifications.map((notification) => {
                    const content = (
                      <div
                        className={`flex flex-col gap-0.5 px-4 py-3 transition hover:bg-gray-50 ${
                          notification.is_read ? "" : "bg-orange-50/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-bold text-charcoal">{notification.title}</span>
                          {!notification.is_read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted">{notification.message}</p>
                        <span className="mt-0.5 text-[11px] text-gray-400">
                          {formatRelativeTime(notification.created)}
                        </span>
                      </div>
                    );

                    return (
                      <li key={notification.id}>
                        {notification.link ? (
                          <Link
                            href={notification.link}
                            onClick={() => {
                              handleMarkOneRead(notification);
                              setIsOpen(false);
                            }}
                            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                          >
                            {content}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkOneRead(notification)}
                            className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                          >
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
