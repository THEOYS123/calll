import React from 'react';
import {
  Power,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio,
  Sparkles,
  Zap,
  MessageSquare,
  Send,
  Users
} from 'lucide-react';
import { BotStats, TelegramBotInfo } from '../types';

interface MasterSwitchCardProps {
  isActive: boolean;
  isTokenValid: boolean;
  botInfo: TelegramBotInfo | null;
  uptimeSeconds: number;
  startedAt: string | null;
  stats: BotStats;
  lastPollingAt?: string;
  isToggling: boolean;
  onToggleActive: (active: boolean) => void;
  onOpenTokenEditor: () => void;
}

export function MasterSwitchCard({
  isActive,
  isTokenValid,
  botInfo,
  uptimeSeconds,
  startedAt,
  stats,
  lastPollingAt,
  isToggling,
  onToggleActive,
  onOpenTokenEditor
}: MasterSwitchCardProps) {
  const formatUptimeDetail = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} Hari`);
    if (hours > 0) parts.push(`${hours} Jam`);
    if (minutes > 0) parts.push(`${minutes} Menit`);
    parts.push(`${secs} Detik`);
    return parts.join(' ');
  };

  return (
    <div id="master-switch-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
      {/* Subtle Background Glow when Active */}
      <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
        isActive
          ? 'bg-emerald-500/10'
          : 'bg-rose-500/5'
      }`} />

      <div className="relative z-10">
        {/* Header Tag */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isActive ? 'bg-emerald-400' : 'bg-slate-600'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isActive ? 'bg-emerald-500' : 'bg-slate-500'
              }`}></span>
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 font-mono">
              axxosintbot Service Engine • Created by Ax. • Always-ON
            </span>
          </div>

          {isActive && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-800/60 rounded-full text-emerald-300 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>Polling Real-Time axxosintbot Aktif</span>
            </div>
          )}
        </div>

        {/* Primary Action Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-100 tracking-tight">
                {isActive ? 'axxosintbot Sedang Berjalan' : 'axxosintbot Dinonaktifkan'}
              </h2>
              <span className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider border ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {isActive ? 'ONLINE (ALWAYS ON)' : 'OFFLINE'}
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {isActive ? (
                <>
                  <strong className="text-cyan-300">axxosintbot</strong> buatan <strong className="text-slate-100">Ax.</strong> akan <strong className="text-emerald-400 font-semibold">selalu aktif 24/7</strong> di server backend untuk merespon perintah pengguna Telegram (<code className="text-cyan-300 font-mono">/id</code>, <code className="text-cyan-300 font-mono">/bot</code>, menu interaktif) dan tidak akan mati meskipun Anda menutup browser, sampai Anda menekan tombol <strong className="text-rose-400">MATIKAN BOT (OFF)</strong>.
                </>
              ) : (
                <>
                  Bot saat ini dalam mode stand-by (nonaktif). Tekan tombol saklar di samping untuk menyalakan engine polling Telegram. Pastikan token bot sudah valid.
                </>
              )}
            </p>

            {/* Error or Notice if token invalid */}
            {!isTokenValid && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs mt-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Token bot belum dikonfigurasi atau belum valid. Silakan masukkan token bot Anda pada bagian <strong>Kelola & Verifikasi Token</strong> terlebih dahulu.
                </span>
                <button
                  id="btn-switch-to-token"
                  onClick={onOpenTokenEditor}
                  className="ml-auto underline font-semibold hover:text-amber-200 whitespace-nowrap"
                >
                  Edit Token
                </button>
              </div>
            )}
          </div>

          {/* Master Tactile Toggle Button */}
          <div className="flex flex-col items-center sm:items-end justify-center">
            <button
              id="btn-master-toggle"
              onClick={() => onToggleActive(!isActive)}
              disabled={isToggling || (!isActive && !isTokenValid)}
              className={`group relative flex items-center justify-center gap-4 px-8 py-5 rounded-2xl font-bold text-base tracking-wide transition-all duration-300 shadow-2xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-900/40 ring-2 ring-rose-500/50'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40 ring-2 ring-emerald-500/50'
              }`}
            >
              <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${
                isActive ? 'bg-rose-800/60' : 'bg-emerald-800/60'
              }`}>
                <Power className={`w-7 h-7 ${isToggling ? 'animate-spin' : ''}`} />
              </div>
              <div className="text-left">
                <div className="text-xs uppercase tracking-wider font-semibold opacity-80">
                  {isToggling ? 'Sedang Memproses...' : isActive ? 'Klik Untuk Mematikan' : 'Klik Untuk Menyalakan'}
                </div>
                <div className="text-lg lg:text-xl font-extrabold">
                  {isToggling ? 'Mohon Tunggu...' : isActive ? 'MATIKAN BOT (OFF)' : 'AKTIFKAN BOT (ON)'}
                </div>
              </div>
            </button>

            {isActive && (
              <span className="text-xs text-slate-400 mt-2 flex items-center gap-1 font-mono">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Persistent: Tetap aktif walau tab ditutup
              </span>
            )}
          </div>
        </div>

        {/* Live Counters & Diagnostics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          {/* Messages Received */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 transition-colors hover:bg-slate-800/90">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Pesan Masuk</span>
              <MessageSquare className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {stats.messagesReceived.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Diterima dari pengguna
            </div>
          </div>

          {/* Messages Sent */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 transition-colors hover:bg-slate-800/90">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Pesan Terkirim</span>
              <Send className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {stats.messagesSent.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Respon & menu otomatis
            </div>
          </div>

          {/* Commands Executed */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 transition-colors hover:bg-slate-800/90">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Perintah Dijalankan</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {stats.commandsExecuted.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              /id, /bot, /ping, dll
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 transition-colors hover:bg-slate-800/90">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Pengguna Terdaftar</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {stats.activeUsersCount || 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Total Chat ID unik
            </div>
          </div>
        </div>

        {/* Detailed Uptime & Polling Footnote */}
        {isActive && (
          <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Durasi Aktif: <strong className="text-slate-200">{formatUptimeDetail(uptimeSeconds)}</strong></span>
            </div>
            {lastPollingAt && (
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Polling Terakhir: {new Date(lastPollingAt).toLocaleTimeString('id-ID')} WIB</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
