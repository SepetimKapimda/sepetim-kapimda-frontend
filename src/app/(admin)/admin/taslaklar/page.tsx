"use client";

import { useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import {
  CheckCircle2,
  Inbox,
  Loader2,
  MessageSquareText,
  Pencil,
  RefreshCw,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import {
  fetchNotificationTemplates,
  updateNotificationTemplate,
  type NotificationTemplate,
} from "@/lib/api/adminNotificationTemplates";

type ToastState = { type: "success" | "error"; message: string } | null;

export default function AdminTaslaklarPage() {
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [draftText, setDraftText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  // SWR cache'i sayesinde bu sekmeye geri dönüldüğünde önceki şablon listesi
  // anında gösterilir, arka planda tazelenir.
  const { data: templates = [], isLoading, error, mutate } = useSWR(
    "admin-notification-templates",
    // E-posta kanalı operasyonel olarak iptal edildi — arayüzde sadece
    // Telegram şablonları gösterilir (savunmacı: backend'de artakalan bir
    // E-posta kaydı olsa bile listede görünmesin).
    async () => (await fetchNotificationTemplates()).filter((t) => t.channel !== "EMAIL"),
    {
      onError: (error) =>
        showToast("error", error instanceof ApiError ? error.message : "Şablonlar alınamadı."),
    }
  );

  const openEditModal = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setDraftText(template.template_text);
  };

  const closeEditModal = () => setEditingTemplate(null);

  const handleSaveTemplate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    setIsSaving(true);
    try {
      const updated = await updateNotificationTemplate(editingTemplate.id, {
        template_text: draftText,
      });
      mutate(
        (current) => current && current.map((t) => (t.id === updated.id ? updated : t)),
        { revalidate: false }
      );
      showToast("success", `"${updated.event_type_display}" taslağı güncellendi.`);
      setEditingTemplate(null);
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : "Taslak kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {toast && (
        <div
          role="status"
          className={`fixed left-1/2 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-bold shadow-popover ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {toast.message}
          </div>
        </div>
      )}

      <h1 className="mb-1 font-heading text-2xl font-black text-gray-900">İletişim Taslakları</h1>
      <p className="mb-6 text-sm text-muted">
        Sistemin otomatik gönderdiği bildirim metinlerini buradan düzenleyebilirsiniz. Şablonlar
        sistem olaylarına (sipariş, hakediş, düşük stok vb.) göre backend tarafından sabit
        tanımlanır — yeni bir olay türü eklenemez, yalnızca metinleri güncellenebilir.
      </p>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-16 text-center">
          <Inbox className="h-10 w-10 text-muted" />
          <div>
            <p className="font-heading text-base font-bold text-charcoal">
              {error ? "Taslaklar alınamadı" : "Henüz bir bildirim şablonu bulunamadı"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              {error
                ? "Sunucuya ulaşırken bir sorun oluştu. Bağlantınızı kontrol edip tekrar deneyin."
                : "Şablonlar sistem olayları (sipariş, hakediş, düşük stok vb.) için backend tarafından otomatik oluşturulur; henüz hiçbiri seed edilmemiş olabilir."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => mutate()}
            className="mt-1 flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Yeniden Dene
          </button>
        </div>
      ) : (
        <>
          {/* Masaüstü: Veri Tablosu */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Bildirim</th>
                  <th className="px-4 py-3">Kanal</th>
                  <th className="px-4 py-3">Alıcı</th>
                  <th className="px-4 py-3">Taslak Metni</th>
                  <th className="px-4 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-bold text-charcoal">{template.event_type_display}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        <Send className="h-3 w-3" />
                        {template.channel_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{template.recipients}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-muted">{template.template_text}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(template)}
                        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-95"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobil: Kompakt Kartlar */}
          <div className="space-y-3 md:hidden">
            {templates.map((template) => (
              <div key={template.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-heading text-sm font-bold text-charcoal">{template.event_type_display}</p>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    <Send className="h-3 w-3" />
                    {template.channel_display}
                  </span>
                </div>
                <p className="mb-3 text-xs text-muted">{template.recipients}</p>
                <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-muted">{template.template_text}</p>
                <button
                  type="button"
                  onClick={() => openEditModal(template)}
                  className="flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-orange-500 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-orange-600 active:scale-95"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Düzenle
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {editingTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-charcoal">
                <MessageSquareText className="h-5 w-5 text-orange-500" />
                {editingTemplate.event_type_display}
              </h2>
              <button
                type="button"
                onClick={closeEditModal}
                aria-label="Kapat"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4 px-5 py-5">
              <div>
                <label htmlFor="template-text" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Taslak Metni
                </label>
                <textarea
                  id="template-text"
                  rows={5}
                  required
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                {editingTemplate.available_placeholders.length > 0 && (
                  <p className="mt-1.5 text-xs text-muted">
                    Kullanılabilir değişkenler:{" "}
                    {editingTemplate.available_placeholders.map((p, i) => (
                      <span key={p.name}>
                        <span className="font-mono font-bold text-charcoal">{`{{${p.name}}}`}</span>
                        {p.description ? ` (${p.description})` : ""}
                        {i < editingTemplate.available_placeholders.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
