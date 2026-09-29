import React, { useState } from 'react';
import { Users, Eye, EyeOff, ChevronRight, RefreshCw, UserCheck, Search } from 'lucide-react';
import { TopSearchedTarget } from '../types';

interface TopSearchedPanelProps {
  targets: TopSearchedTarget[];
  onSelectTarget: (name: string) => void;
  isUnlocked: boolean;
  onResetTrending?: () => void;
}

export const TopSearchedPanel: React.FC<TopSearchedPanelProps> = ({
  targets,
  onSelectTarget,
  isUnlocked,
  onResetTrending
}) => {
  // Option to sensor/mask target names for privacy
  const [hideNames, setHideNames] = useState<boolean>(false);

  // Mask name helper
  const maskName = (name: string): string => {
    return name
      .split(' ')
      .map((part) => {
        if (part.length <= 2) return part[0] + '*';
        return part[0] + '*'.repeat(Math.min(part.length - 1, 6));
      })
      .join(' ');
  };

  // Strictly maximum 5 people as requested: "hanya 5 orang saja"
  const top5Targets = targets.slice(0, 5);

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 sm:p-5 shadow-xl shadow-black/40 space-y-4">
      {/* Panel Header: Clean title without 'Live' gimmicks */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-tight flex items-center gap-2">
              TOP 5 PALING BANYAK DICARI
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                5 TARGET TERATAS
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Target dengan frekuensi pencarian tertinggi di sistem
            </p>
          </div>
        </div>

        {/* Action Controls: Reset & OPSEC Sensor */}
        <div className="flex items-center gap-2">
          {top5Targets.length > 0 && onResetTrending && (
            <button
              type="button"
              onClick={onResetTrending}
              title="Reset hitungan pencarian target ke 0"
              className="p-1.5 rounded text-xs font-mono border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setHideNames(!hideNames)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border transition-all ${
              hideNames
                ? 'bg-amber-950/70 border-amber-600/70 text-amber-300'
                : 'bg-slate-950 hover:bg-slate-850 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Sembunyikan/Sensor nama target"
          >
            {hideNames ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px]">Sensor Aktif</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="text-[11px]">Sensor Nama</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Target Listing (strictly up to 5 people) */}
      {top5Targets.length === 0 ? (
        <div className="py-7 px-4 text-center space-y-2 rounded-lg bg-slate-950/50 border border-dashed border-slate-800">
          <div className="w-9 h-9 mx-auto rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-mono font-bold text-slate-200">
              BELUM ADA TARGET YANG DICARI
            </p>
            <p className="text-[11px] font-mono text-slate-400 max-w-xs mx-auto leading-relaxed">
              Daftar ini akan otomatis menampilkan <strong className="text-sky-300">maksimal 5 orang</strong> yang paling sering dicari setelah Anda melakukan pencarian.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {top5Targets.map((item, index) => {
            const rank = index + 1;
            const displayName = hideNames ? maskName(item.fullName) : item.fullName;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTarget(item.fullName)}
                className="w-full group p-3 rounded-lg bg-slate-950/80 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 transition-all text-left flex items-center justify-between gap-3 font-mono"
              >
                {/* Left: Rank Badge + Name & Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0 border ${
                      rank === 1
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                        : rank === 2
                        ? 'bg-slate-700/40 border-slate-500/50 text-slate-200'
                        : rank === 3
                        ? 'bg-amber-800/20 border-amber-700/40 text-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    #{rank}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition-colors truncate">
                        {displayName}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {item.city}, {item.province} • {item.occupation}
                    </p>
                  </div>
                </div>

                {/* Right: Search Count Badge + Arrow */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800/60 text-sky-300 flex items-center gap-1 font-semibold">
                    <UserCheck className="w-3 h-3 text-sky-400" />
                    {item.searchCount}x Dicari
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer info */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>Kapasitas: Maksimal 5 Orang Teratas</span>
        <span>Klik nama untuk telusuri target</span>
      </div>
    </div>
  );
};
