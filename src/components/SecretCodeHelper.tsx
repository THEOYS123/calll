import React from 'react';
import { X, KeyRound, Check, ShieldCheck, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { INITIAL_SECRET_CODES } from '../data/mockIntelDatabase';

interface SecretCodeHelperProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCode: (code: string) => void;
  activeCode?: string;
  isUnlocked: boolean;
}

export const SecretCodeHelper: React.FC<SecretCodeHelperProps> = ({
  isOpen,
  onClose,
  onSelectCode,
  activeCode,
  isUnlocked
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono tracking-tight">
                DAFTAR KODE RAHASIA DEKLASIFIKASI
              </h3>
              <p className="text-xs text-amber-400 font-mono">
                Kunci Sandi Pembuka Sensor Dokumen Intelijen Kantor
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

        {/* Body */}
        <div className="p-5 space-y-4 font-mono text-xs">
          {/* Status info */}
          <div
            className={`p-3 rounded-lg border flex items-center gap-2.5 ${
              isUnlocked
                ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300'
                : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
            }`}
          >
            {isUnlocked ? (
              <>
                <Unlock className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <strong className="font-bold">STATUS OTORISASI: TERBUKA (UNLOCKED)</strong>
                  <p className="text-[11px] text-emerald-400/90 mt-0.5">
                    Data sensitif (NIK lengkap, No. HP, alamat) telah dideklasifikasi dan dapat dibaca.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <strong className="font-bold">STATUS ENKRIPSI: TERTUTUP (CLASSIFIED)</strong>
                  <p className="text-[11px] text-amber-300/90 mt-0.5">
                    Hasil pencarian tetap disensor hingga kode rahasia yang valid diverifikasi di bawah kolom pencarian.
                  </p>
                </div>
              </>
            )}
          </div>

          <p className="text-slate-300 font-sans text-xs leading-relaxed">
            Sesuai regulasi kantor intelijen, data hasil penelusuran wajib disensor secara default. Gunakan salah satu kode rahasia berikut untuk membuka sensor secara instan:
          </p>

          {/* List of valid codes */}
          <div className="space-y-2">
            {INITIAL_SECRET_CODES.map((item) => {
              const isSelected = activeCode === item.code && isUnlocked;
              return (
                <div
                  key={item.code}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/80'
                      : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-300 text-sm tracking-wider">
                        {item.code}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 font-semibold">
                        {item.clearanceLevel}
                      </span>
                    </div>
                    <p className="text-slate-300 font-medium mt-0.5 text-[11px]">{item.name}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-1">{item.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectCode(item.code);
                      onClose();
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-semibold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-emerald-700 text-white cursor-default'
                        : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                  >
                    {isSelected ? 'Aktif' : 'Gunakan Kode'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end">
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
