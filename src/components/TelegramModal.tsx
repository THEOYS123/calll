import React, { useState } from 'react';
import { Send, X, ShieldCheck, Zap, KeyRound, CheckCircle, AlertCircle, ExternalLink, RotateCcw } from 'lucide-react';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateVip: (token: string) => boolean;
  onResetFreeQuota: () => void;
  isVipActive: boolean;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({
  isOpen,
  onClose,
  onActivateVip,
  onResetFreeQuota,
  isVipActive
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleActivate = () => {
    if (!tokenInput.trim()) {
      setStatusMsg({ type: 'error', text: 'Silakan masukkan token aktivasi dari Telegram Owner.' });
      return;
    }

    const success = onActivateVip(tokenInput.trim());
    if (success) {
      setStatusMsg({ type: 'success', text: 'Aktivasi VIP Berhasil! Kuota pencarian kini UNLIMITED (Tanpa Batas).' });
    } else {
      setStatusMsg({
        type: 'error',
        text: 'Token tidak valid. Coba gunakan: VIP-UNLIMITED-2026 atau hubungi @IntelHQ_Owner.'
      });
    }
  };

  const handleQuickToken = (token: string) => {
    setTokenInput(token);
    onActivateVip(token);
    setStatusMsg({ type: 'success', text: `Token "${token}" aktif! Kuota pencarian terbuka tanpa batas.` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono tracking-tight">
                LANGGANAN VIP TELEGRAM OWNER
              </h3>
              <p className="text-xs text-sky-400 font-mono">
                Akses Kuota Pencarian Tanpa Batas & Arsip Intelijen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 font-mono text-xs">
          {/* VIP Status Announcement */}
          {isVipActive ? (
            <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-600/70 text-emerald-300 flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <strong className="font-bold">STATUS ANDA: VIP ACTIVE (UNLIMITED)</strong>
                <p className="text-[11px] text-emerald-400/90 mt-0.5">
                  Batas pencarian 2x telah dihapus. Anda dapat melakukan pencarian data tanpa batasan frekuensi.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-sky-950/50 border border-sky-800/60 text-sky-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Ketentuan Batas 2x Pencarian Bebas:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                Setiap pengguna lokal diberikan hak akses uji coba sebanyak <strong>2 kali pencarian</strong> secara gratis. Untuk membuka kuota pencarian tanpa batas, silakan menghubungi Owner resmi di Telegram.
              </p>
            </div>
          )}

          {/* Official Telegram Owner Link */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider block font-bold">
              Kontak Resmi Telegram Owner:
            </span>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-700">
              <div className="flex items-center gap-2 text-sm text-sky-400 font-bold">
                <Send className="w-4 h-4 text-sky-400" />
                <span>@IntelHQ_Owner</span>
              </div>
              <a
                href="https://t.me/IntelHQ_Owner"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center gap-1 transition-colors"
              >
                <span>Buka Telegram</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[10px] text-slate-500">
              * Hubungi owner untuk verifikasi lisensi, request dataset tambahan, atau mendapatkan VIP Activation Token.
            </p>
          </div>

          {/* Activate VIP Token Box */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-slate-300 font-bold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Masukkan Token Aktivasi VIP (Dari Owner):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Contoh: VIP-UNLIMITED-2026..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleActivate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors shrink-0"
              >
                Aktifkan VIP
              </button>
            </div>

            {/* Quick Test Token for Office Demo */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>Token Cepat Demo:</span>
              <button
                type="button"
                onClick={() => handleQuickToken('VIP-UNLIMITED-2026')}
                className="text-amber-400 hover:underline font-bold"
              >
                [VIP-UNLIMITED-2026]
              </button>
              <span>atau</span>
              <button
                type="button"
                onClick={() => handleQuickToken('TELE-VIP-PASS')}
                className="text-amber-400 hover:underline font-bold"
              >
                [TELE-VIP-PASS]
              </button>
            </div>

            {statusMsg && (
              <div
                className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs font-mono mt-2 ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-600/70 text-rose-300'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Close & Reset Quota for Testing */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onResetFreeQuota();
              setStatusMsg({ type: 'success', text: 'Kuota 2x pencarian bebas telah di-reset untuk pengujian kantor.' });
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-mono hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Kuota Percobaan (Demo Kantor)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
