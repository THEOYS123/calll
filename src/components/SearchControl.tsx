import React from 'react';
import { Search, Sparkles, KeyRound, Unlock, Lock, AlertCircle, CheckCircle, RefreshCw, Send, HelpCircle, ShieldCheck } from 'lucide-react';
import { SearchUsageQuota } from '../types';

interface SearchControlProps {
  query: string;
  onQueryChange: (val: string) => void;
  onSearchSubmit: (customQuery?: string) => void;
  isLoading: boolean;
  quota: SearchUsageQuota;
  isUnlocked: boolean;
  secretCodeInput: string;
  onSecretCodeChange: (val: string) => void;
  onVerifySecretCode: (codeToTest?: string) => void;
  onLockResults: () => void;
  onOpenTelegramModal: () => void;
  verifiedCodeName?: string;
  verifiedClearance?: string;
  secretCodeError?: string | null;
  codeUsageInfo?: { limit: number; used: number; remaining: number } | null;
}

export const SearchControl: React.FC<SearchControlProps> = ({
  query,
  onQueryChange,
  onSearchSubmit,
  isLoading,
  quota,
  isUnlocked,
  secretCodeInput,
  onSecretCodeChange,
  onVerifySecretCode,
  onLockResults,
  onOpenTelegramModal,
  verifiedCodeName,
  verifiedClearance,
  secretCodeError,
  codeUsageInfo
}) => {
  const sampleQueries = [
    'asep, 18, male, jakarta, 2008',
    'asep, 2001 karawang',
    'asep, 18',
    'siti, female, jakarta',
    'budi, surabaya, 1990',
    '3215011405010003'
  ];

  // Check if search is permitted:
  // Allowed if user has unlocked with secret code OR has VIP OR has remaining free quota!
  const canSearch = isUnlocked || quota.isVipUnlocked || !quota.hasReachedLimit;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchSubmit();
    }
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onVerifySecretCode();
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 sm:p-6 shadow-xl shadow-black/40 space-y-4">
      {/* Top Section: Search Input Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
          <h2 className="text-base font-semibold text-slate-100 font-mono tracking-tight">
            PENCARIAN MULTI-PARAMETER INTELIJEN
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-400">
            Status Izin Akses:{' '}
            {isUnlocked ? (
              <strong className="text-emerald-400 font-bold">
                {codeUsageInfo
                  ? `Otorisasi Aktif (Sisa ${codeUsageInfo.remaining}x Pencarian)`
                  : 'Otorisasi Penuh Aktif'}
              </strong>
            ) : quota.isVipUnlocked ? (
              <strong className="text-purple-400 font-bold">VIP Tanpa Batas</strong>
            ) : (
              <strong className={quota.hasReachedLimit ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {quota.freeQuotaRemaining} dari {quota.freeQuotaTotal} Pencarian Bebas
              </strong>
            )}
          </span>

          {quota.hasReachedLimit && !quota.isVipUnlocked && !isUnlocked && (
            <button
              onClick={onOpenTelegramModal}
              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline font-medium"
            >
              <Send className="w-3 h-3" />
              Langganan ke Tele Owner
            </button>
          )}
        </div>
      </div>

      {/* Main Search Input Form */}
      <div className="relative flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            id="intel-search-input"
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!canSearch}
            placeholder="Ketik parameter: asep, 18, male, jakarta, 2008 atau asep, 2001 karawang, NIK, No. HP..."
            className={`w-full pl-11 pr-4 py-3 bg-slate-950/90 rounded-lg border text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all ${
              !canSearch
                ? 'border-rose-900/60 bg-rose-950/20 cursor-not-allowed opacity-75'
                : 'border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50'
            }`}
          />
        </div>

        <button
          id="intel-search-button"
          onClick={() => onSearchSubmit()}
          disabled={isLoading || !canSearch || !query.trim()}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-mono text-sm font-semibold transition-all ${
            !canSearch
              ? 'bg-rose-900/60 text-rose-200 cursor-not-allowed border border-rose-700/50'
              : !query.trim()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-950/60 border border-sky-400/40 active:scale-[0.98]'
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>MEMPROSES...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>SEARCH DATA</span>
            </>
          )}
        </button>
      </div>

      {/* Quota Limit Warning Banner (Only shown if NOT unlocked and NOT VIP and free limit reached) */}
      {!canSearch && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-mono gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Batas 2x pencarian bebas telah habis.</strong> Masukkan kode otorisasi rahasia pada kolom di bawah atau berlangganan ke Telegram Owner untuk membuka akses pencarian.
            </span>
          </div>
          <button
            onClick={onOpenTelegramModal}
            className="shrink-0 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors"
          >
            Hubungi Tele Owner
          </button>
        </div>
      )}

      {/* Quick Example Query Pills */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            Contoh Format Pencarian:
          </span>
          <span className="text-slate-500 text-[11px]">Nama, Usia, Gender, Kota, Tahun, NIK</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sampleQueries.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onQueryChange(sample);
                onSearchSubmit(sample);
              }}
              disabled={!canSearch}
              className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-sky-300 border border-slate-800 hover:border-slate-700 text-xs font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* SECRET CLEARANCE CODE INPUT (CONFIDENTIAL - NEVER LEAKS CODES PUBLICLY) */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <label htmlFor="secret-clearance-input" className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
              KODE OTORISASI RAHASIA:
            </label>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Membuka sensor data sensitif & mengaktifkan akses fitur pencarian
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {isUnlocked ? (
                <Unlock className="w-4 h-4 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <input
              id="secret-clearance-input"
              type="text"
              value={secretCodeInput}
              onChange={(e) => onSecretCodeChange(e.target.value)}
              onKeyDown={handleCodeKeyDown}
              placeholder="Masukkan kode otorisasi rahasia Anda..."
              className={`w-full pl-9 pr-4 py-2 bg-slate-950 rounded-md border text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all ${
                isUnlocked
                  ? 'border-emerald-700/70 bg-emerald-950/20 text-emerald-300 focus:border-emerald-500'
                  : 'border-slate-700 focus:border-amber-500'
              }`}
            />
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              id="verify-secret-code-button"
              type="button"
              onClick={() => onVerifySecretCode()}
              className={`px-4 py-2 rounded-md font-mono text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isUnlocked
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-400/40'
                  : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/40'
              }`}
            >
              {isUnlocked ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>AKSES TERBUKA</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>VERIFIKASI KODE</span>
                </>
              )}
            </button>

            {isUnlocked && (
              <button
                type="button"
                onClick={onLockResults}
                className="px-3 py-2 rounded-md font-mono text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 border border-slate-700 hover:border-rose-800 transition-colors"
                title="Kunci Kembali Akses"
              >
                Kunci Ulang
              </button>
            )}
          </div>
        </div>

        {/* Code Usage Counter Badge when unlocked */}
        {isUnlocked && (
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-emerald-950/60 border border-emerald-700/60 text-xs font-mono text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Otorisasi Diterima:{' '}
              <strong className="text-white font-bold">{verifiedCodeName || 'Clearance Intelijen'}</strong>
              {codeUsageInfo ? (
                <span>
                  {' '}• Sisa Kuota Pencarian:{' '}
                  <strong className="text-emerald-200 font-bold">{codeUsageInfo.remaining}x</strong> dari batas {codeUsageInfo.limit}x
                  (Terpakai: {codeUsageInfo.used}x)
                </span>
              ) : (
                <span> • Akses Pencarian Tanpa Batas</span>
              )}
            </span>
          </div>
        )}

        {/* Error message for wrong secret code */}
        {secretCodeError && (
          <div className="p-2 rounded bg-rose-950/40 border border-rose-800/60 text-xs font-mono text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{secretCodeError}</span>
          </div>
        )}
      </div>
    </div>
  );
};
