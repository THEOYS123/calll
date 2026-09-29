import React, { useEffect, useState } from 'react';
import { Shield, Terminal, Send, KeyRound, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { SearchUsageQuota } from '../types';

interface NavbarProps {
  quota: SearchUsageQuota;
  isUnlocked: boolean;
  clearanceLevel?: string;
  onOpenTelegramModal: () => void;
  onFocusSecretCode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  quota,
  isUnlocked,
  clearanceLevel,
  onOpenTelegramModal,
  onFocusSecretCode
}) => {
  const [wibTime, setWibTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format to WIB (UTC+7)
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      const timeStr = now.toLocaleTimeString('id-ID', options);
      const dateStr = now.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      setWibTime(`${dateStr} - ${timeStr} WIB`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-950">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                  axxosintbot • by Ax.
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  NODE AKTIF
                </span>
              </div>
              <h1 className="text-sm font-semibold text-slate-100 tracking-tight flex items-center gap-1.5">
                axxosintbot — Portal Intelijen &amp; Profiling Terintegrasi by Ax.
              </h1>
            </div>
          </div>

          {/* Center Info: WIB Clock & Node Status */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-md border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{wibTime || 'Memuat Waktu Server...'}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1 text-slate-400">
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              <span>SECURITY GATEWAY KANTOR</span>
            </div>
          </div>

          {/* Right Action Controls: Secret Code Status, Quota Indicator, Telegram Owner */}
          <div className="flex items-center gap-2.5">
            {/* Secret Code Clearance Pill (Click to focus code input) */}
            <button
              onClick={onFocusSecretCode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono border transition-all ${
                isUnlocked
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/50 hover:bg-emerald-900/50'
                  : 'bg-amber-950/40 text-amber-300 border-amber-600/40 hover:bg-amber-900/40'
              }`}
              title="Status Otorisasi Akses (Klik untuk memasukkan kode)"
            >
              {isUnlocked ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline font-medium">TERBUKA ({clearanceLevel || 'VIP'})</span>
                  <span className="sm:hidden font-medium">TERBUKA</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline font-medium">MASUKKAN KODE OTORISASI</span>
                  <span className="sm:hidden font-medium">KODE</span>
                </>
              )}
            </button>

            {/* Quota Counter Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono border ${
                isUnlocked
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
                  : quota.isVipUnlocked
                  ? 'bg-purple-950/50 text-purple-300 border-purple-600/40'
                  : quota.hasReachedLimit
                  ? 'bg-rose-950/60 text-rose-300 border-rose-600/50'
                  : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
            >
              {isUnlocked ? (
                <span className="font-semibold text-emerald-300">AKSES: AKTIF</span>
              ) : quota.isVipUnlocked ? (
                <span className="font-semibold text-purple-300">KUOTA: UNLIMITED VIP</span>
              ) : (
                <>
                  {quota.hasReachedLimit && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                  <span>
                    KUOTA: <strong className={quota.hasReachedLimit ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {quota.freeQuotaRemaining}/{quota.freeQuotaTotal}
                    </strong>
                  </span>
                </>
              )}
            </div>

            {/* Telegram Owner Button */}
            <button
              onClick={onOpenTelegramModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-950 border border-sky-400/30 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="font-mono hidden md:inline">LANGGANAN TELE OWNER</span>
              <span className="md:hidden">TELEGRAM</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
