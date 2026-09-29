import React, { useState } from 'react';
import { Flame, Eye, EyeOff, Radio, ShieldAlert, ChevronRight, User, TrendingUp, RefreshCw, Search } from 'lucide-react';
import { LiveTrendingItem } from '../types';

interface TopTrendingPanelProps {
  trendingItems: LiveTrendingItem[];
  onSelectTarget: (name: string) => void;
  isUnlocked: boolean;
  onResetTrending?: () => void;
}

export const TopTrendingPanel: React.FC<TopTrendingPanelProps> = ({
  trendingItems,
  onSelectTarget,
  isUnlocked,
  onResetTrending
}) => {
  // Option to hide/sensor the top 10 names for intelligence operational security (OPSEC)
  const [hideTopSearched, setHideTopSearched] = useState<boolean>(false);

  // Helper to mask a person's name for privacy (e.g. "Budi Santoso" -> "B*** S******")
  const maskName = (name: string): string => {
    return name
      .split(' ')
      .map((part) => {
        if (part.length <= 2) return part[0] + '*';
        return part[0] + '*'.repeat(Math.min(part.length - 1, 6));
      })
      .join(' ');
  };

  // Limit strictly to top 10 as requested
  const top10 = trendingItems.slice(0, 10);

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 sm:p-5 shadow-xl shadow-black/40 space-y-4">
      {/* Panel Header with Live indicator and Hide Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-tight flex items-center gap-2">
              RATING PENCARIAN REAL-TIME
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE SYNC
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Hanya menampilkan target yang PERNAH dicari secara nyata
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {top10.length > 0 && onResetTrending && (
            <button
              type="button"
              onClick={onResetTrending}
              title="Reset rating pencarian ke 0"
              className="p-1.5 rounded text-xs font-mono border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Hide / Mask 10 Top Searched Button */}
          <button
            type="button"
            onClick={() => setHideTopSearched(!hideTopSearched)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono border transition-all ${
              hideTopSearched
                ? 'bg-amber-950/70 border-amber-600/70 text-amber-300'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Sembunyikan nama target untuk kerahasiaan operasional (OPSEC)"
          >
            {hideTopSearched ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">SENSOR OPSEC</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">SENSOR</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notice if sensor is active */}
      {hideTopSearched && (
        <div className="p-2 rounded bg-amber-950/40 border border-amber-800/50 flex items-center gap-2 text-xs font-mono text-amber-300">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Mode Penyamaran OPSEC Aktif: Nama target disensor. Nonaktifkan sensor untuk membaca nama lengkap.
          </span>
        </div>
      )}

      {/* Top 10 Listing: Only names and real-time rating count */}
      {top10.length === 0 ? (
        <div className="py-8 px-4 text-center space-y-2.5 rounded-lg bg-slate-950/60 border border-dashed border-slate-800/80">
          <div className="w-9 h-9 mx-auto rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-sky-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-mono font-bold text-slate-200">
              BELUM ADA TARGET YANG DICARI
            </p>
            <p className="text-[11px] font-mono text-slate-400 max-w-xs mx-auto leading-relaxed">
              Kolom rating ini mencatat secara <strong className="text-sky-300">murni real-time</strong>. Ketika seseorang melakukan pencarian target di kolom search, profil yang cocok akan otomatis masuk ke peringkat rating ini.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2.5 py-1 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>RADAR SIAP: MENUNGGU QUERY</span>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80">
          {top10.map((item, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const displayName = hideTopSearched && !isUnlocked ? maskName(item.fullName) : item.fullName;

            return (
              <div
                key={item.id}
                onClick={() => onSelectTarget(item.fullName)}
                className="py-2.5 px-2 flex items-center justify-between group hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
              >
                {/* Left: Rank badge & Target Name only */}
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                      rank === 1
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        : rank === 2
                        ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40'
                        : rank === 3
                        ? 'bg-amber-800/20 text-amber-400 border border-amber-700/40'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    #{rank}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-sm font-semibold text-slate-200 group-hover:text-sky-300 transition-colors truncate">
                        {displayName}
                      </span>
                      {isTop3 && (
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-red-950 text-red-400 border border-red-800/50 hidden sm:inline">
                          HOT
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Radio className="w-2.5 h-2.5 text-emerald-400" />
                      <span>Terpantau: {item.lastSearchedTime || 'Baru saja'}</span>
                    </span>
                  </div>
                </div>

                {/* Right: Live Rating / Search Hits & Action button */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>{item.searchCount}x</span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Rating Search</span>
                  </div>

                  <div className="w-6 h-6 rounded bg-slate-950 group-hover:bg-sky-950 text-slate-400 group-hover:text-sky-300 border border-slate-800 group-hover:border-sky-700 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span>Sistem Rating Real-Time Berdasarkan Log Query</span>
        <span className="text-emerald-400">Total Pernah Dicari: {top10.length} Target</span>
      </div>
    </div>
  );
};
