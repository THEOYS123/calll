import React, { useState } from 'react';
import {
  Send,
  Radio,
  Users,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Hash
} from 'lucide-react';
import { BotUserEntry } from '../types';

interface DirectMessagePanelProps {
  activeUsers: BotUserEntry[];
  isBotActive: boolean;
  isTokenValid: boolean;
  prefilledChatId?: string | number;
  onSendMessage: (chatId: string | number, text: string) => Promise<{ success: boolean; message: string }>;
  onBroadcast: (text: string) => Promise<{ success: boolean; message: string; successCount?: number; totalUsers?: number }>;
}

export function DirectMessagePanel({
  activeUsers,
  isBotActive,
  isTokenValid,
  prefilledChatId,
  onSendMessage,
  onBroadcast
}: DirectMessagePanelProps) {
  const [mode, setMode] = useState<'direct' | 'broadcast'>('direct');
  const [chatIdInput, setChatIdInput] = useState<string>(prefilledChatId ? String(prefilledChatId) : '');
  const [messageInput, setMessageInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  React.useEffect(() => {
    if (prefilledChatId) {
      setChatIdInput(String(prefilledChatId));
      setMode('direct');
    }
  }, [prefilledChatId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    setIsSending(true);
    setFeedback(null);

    try {
      if (mode === 'direct') {
        if (!chatIdInput.trim()) {
          setFeedback({ success: false, message: 'Chat ID tujuan wajib diisi.' });
          setIsSending(false);
          return;
        }
        const res = await onSendMessage(chatIdInput.trim(), messageInput.trim());
        setFeedback(res);
        if (res.success) {
          setMessageInput('');
        }
      } else {
        const res = await onBroadcast(messageInput.trim());
        setFeedback(res);
        if (res.success) {
          setMessageInput('');
        }
      }
    } catch (err: any) {
      setFeedback({
        success: false,
        message: err.message || 'Terjadi kesalahan saat mengirim pesan.'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleApplyTemplate = (type: string) => {
    if (type === 'test') {
      setMessageInput('🔔 *Tes Pesan dari Web Controller*\n\nBot Telegram Anda berfungsi normal dan terhubung ke server AI Studio.');
    } else if (type === 'id_verified') {
      setMessageInput('✅ *Verifikasi Chat ID Berhasil*\n\nAkun Anda telah terkonfirmasi terdaftar di sistem Web Controller.');
    } else if (type === 'announcement') {
      setMessageInput('📢 *Pemberitahuan Penting*\n\nLayanan bot telah diperbarui dengan performa lebih cepat dan stabil.');
    }
  };

  return (
    <div id="direct-message-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30 flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Kirim Pesan & Broadcast Langsung dari Web
            </h3>
            <p className="text-xs text-slate-400">
              Kirim pesan langsung ke Chat ID tertentu atau broadcast ke semua pengguna bot.
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center p-1 bg-slate-800 rounded-xl border border-slate-700/80">
          <button
            type="button"
            onClick={() => { setMode('direct'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'direct'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Pesan Langsung (Chat ID)</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('broadcast'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'broadcast'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Broadcast ({activeUsers.length} Kontak)</span>
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSend} className="mt-6 space-y-4">
        {mode === 'direct' ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="input-target-chat-id" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chat ID Tujuan</span>
              </label>
              {activeUsers.length > 0 && (
                <div className="text-[11px] text-slate-400">
                  Pilih dari kontak aktif di bawah atau masukkan angka manual
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                id="input-target-chat-id"
                type="text"
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                placeholder="Contoh: 123456789 (dapat dari perintah /id di Telegram)"
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none"
              />

              {activeUsers.length > 0 && (
                <select
                  title="Pilih Chat ID dari Pengguna Aktif"
                  aria-label="Pilih Chat ID dari Pengguna Aktif"
                  onChange={(e) => {
                    if (e.target.value) setChatIdInput(e.target.value);
                  }}
                  className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none max-w-[160px]"
                >
                  <option value="">Pilih Kontak...</option>
                  {activeUsers.map((u) => (
                    <option key={u.chatId} value={u.chatId}>
                      {u.firstName} {u.username ? `(@${u.username})` : `(${u.chatId})`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>
                Pesan akan dikirimkan ke <strong>{activeUsers.length} pengguna</strong> yang pernah berinteraksi dengan bot Telegram ini.
              </span>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="input-message-text" className="text-xs font-semibold text-slate-300">
              Isi Pesan Telegram (Mendukung Markdown)
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Template Cepat:</span>
              <button
                type="button"
                onClick={() => handleApplyTemplate('test')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded transition-colors"
              >
                Tes Web
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('id_verified')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded transition-colors"
              >
                ID Sukses
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('announcement')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded transition-colors"
              >
                Pengumuman
              </button>
            </div>
          </div>

          <textarea
            id="input-message-text"
            rows={3}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Ketik pesan yang akan dikirim ke Telegram di sini..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.success
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}>
            {feedback.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            id="btn-send-telegram-msg"
            disabled={isSending || !messageInput.trim() || !isTokenValid}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Mengirim ke Telegram...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{mode === 'direct' ? 'Kirim Pesan Langsung' : 'Kirim Broadcast'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
