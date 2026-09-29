import React, { useState } from 'react';
import {
  X,
  Bot,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Info
} from 'lucide-react';

interface BotFatherGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BotFatherGuideModal({ isOpen, onClose }: BotFatherGuideModalProps) {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Panduan Mendapatkan Token Bot Telegram
              </h3>
              <p className="text-xs text-slate-400">
                Langkah resmi membuat bot baru dan menyalin API Token dari @BotFather.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="mt-6 space-y-4 text-xs">
          {/* Step 1 */}
          <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
                Langkah 1: Buka @BotFather di Telegram
              </span>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold underline text-[11px]"
              >
                <span>Buka @BotFather</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Buka aplikasi Telegram Anda, cari akun centang biru resmi <strong className="text-white">@BotFather</strong> atau klik tautan di atas, lalu tekan tombol <strong>Start</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
                Langkah 2: Buat Bot Baru (/newbot)
              </span>
              <button
                onClick={() => copyText('/newbot', 'step2')}
                className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-700 px-2 py-0.5 rounded text-[10px]"
              >
                {copiedStep === 'step2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Salin Perintah</span>
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Ketik perintah <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300 font-mono">/newbot</code> lalu kirimkan.
            </p>
            <div className="p-2.5 bg-slate-950/70 rounded-lg space-y-1 text-slate-300 font-mono text-[11px]">
              <div>1. Masukkan nama tampilan bot Anda (contoh: <em>axxosintbot by Ax.</em>).</div>
              <div>2. Masukkan username bot berakhiran kata <strong className="text-amber-300">bot</strong> (contoh: <em>axxosintbot</em>).</div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
            <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px] block">
              Langkah 3: Salin Token Akses HTTP API
            </span>
            <p className="text-slate-300 leading-relaxed">
              BotFather akan memberikan pesan ucapan selamat beserta token API seperti contoh berikut:
            </p>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-300 select-all">
              7891234567:AAF8xyZ-abc1234sampleSecretKey_BotToken
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
            <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px] block">
              Langkah 4: Masukkan & Verifikasi di Web Ini
            </span>
            <p className="text-slate-300 leading-relaxed">
              Kembali ke dashboard web ini, klik tombol <strong>Ganti / Edit Token</strong>, tempel token Anda, lalu klik <strong>Cek Validitas & Simpan</strong>. Sistem kami akan memverifikasi token langsung ke API resmi Telegram!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow transition-colors"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
}
