import React from 'react';
import { Bot, Power, Activity, ShieldCheck, RefreshCw, ExternalLink, UploadCloud, Lock, Unlock } from 'lucide-react';
import { TelegramBotInfo } from '../types';

interface BotNavbarProps {
  isActive: boolean;
  isTokenValid: boolean;
  botInfo: TelegramBotInfo | null;
  uptimeSeconds: number;
  onRefresh: () => void;
  isLoading: boolean;
  onToggleActive: (active: boolean) => void;
  isToggling: boolean;
  onOpenNetlifyModal?: () => void;
  isOwnerUnlocked?: boolean;
  onOpenOwnerModal?: () => void;
}

export function BotNavbar({
  isActive,
  isTokenValid,
  botInfo,
  uptimeSeconds,
  onRefresh,
  isLoading,
  onToggleActive,
  isToggling,
  onOpenNetlifyModal,
  isOwnerUnlocked,
  onOpenOwnerModal
}: BotNavbarProps) {
  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}j ${m}m ${s}d`;
    if (m > 0) return `${m}m ${s}d`;
    return `${s}d`;
  };

  return (
    <header id="bot-navbar" className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand & Bot Identity */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-800 text-slate-400 ring-1 ring-slate-700'
            }`}>
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-100 text-base lg:text-lg tracking-tight flex items-center gap-2">
                  <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent font-extrabold tracking-wide">
                    axxosintbot
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-semibold">
                    by Ax.
                  </span>
                </h1>
                {isActive && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {botInfo?.username ? (
                  <a
                    href={`https://t.me/${botInfo.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono font-medium transition-colors"
                  >
                    @{botInfo.username}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-slate-400">@axxosintbot</span>
                )}
                <span>•</span>
                <span className="text-slate-300 font-medium">Created by Ax.</span>
                <span>•</span>
                <span className="text-slate-400 font-mono">Always-ON Polling</span>
              </div>
            </div>
          </div>

          {/* Mobile Refresh Button */}
          <button
            id="btn-refresh-mobile"
            onClick={onRefresh}
            disabled={isLoading}
            className="sm:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status Indicators & Master Quick Toggle */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Uptime Badge if active */}
          {isActive && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-slate-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Uptime: {formatUptime(uptimeSeconds)}</span>
            </div>
          )}

          {/* Owner Access Lock / Passkey Indicator */}
          {onOpenOwnerModal && (
            <button
              onClick={onOpenOwnerModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-sm active:scale-95 ${
                isOwnerUnlocked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={isOwnerUnlocked ? 'Mode Owner Aktif (Klik untuk kunci / atur kata kunci)' : 'Klik untuk membuka akses Owner dengan kata kunci'}
            >
              {isOwnerUnlocked ? <Unlock className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
              <span>{isOwnerUnlocked ? 'Owner: Unlocked' : 'Kunci Owner'}</span>
            </button>
          )}

          {/* Connection Status Pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            isActive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span>{isActive ? 'STATUS: AKTIF (ALWAYS ON)' : 'STATUS: NONAKTIF (OFF)'}</span>
          </div>

          {/* Quick Toggle Button */}
          <button
            id="btn-navbar-toggle"
            onClick={() => onToggleActive(!isActive)}
            disabled={isToggling || (!isActive && !isTokenValid)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${isToggling ? 'animate-spin' : ''}`} />
            <span>{isToggling ? 'MEMPROSES...' : isActive ? 'MATIKAN (OFF)' : 'AKTIFKAN (ON)'}</span>
          </button>

          {/* Deploy Netlify & Download ZIP Button */}
          {onOpenNetlifyModal && (
            <button
              id="btn-deploy-netlify"
              onClick={onOpenNetlifyModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-all shadow-sm shadow-cyan-500/10 font-medium"
              title="Unduh file .ZIP dan panduan deploy Netlify"
            >
              <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Deploy Netlify / .ZIP</span>
              <span className="sm:hidden">.ZIP</span>
            </button>
          )}

          {/* Desktop Refresh */}
          <button
            id="btn-refresh-desktop"
            onClick={onRefresh}
            disabled={isLoading}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="Muat ulang data status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>
    </header>
  );
}
