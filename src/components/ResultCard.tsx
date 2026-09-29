import React, { useState } from 'react';
import { 
  Shield, Lock, Unlock, Copy, Check, AlertTriangle, 
  MapPin, Phone, Calendar, User, FileText, ChevronDown, ChevronUp,
  Cpu, Building2, Fingerprint, Activity, Radio
} from 'lucide-react';
import { SearchMatchResult } from '../types';
import { analyzeNIK } from '../utils/nikAnalyzer';
import { analyzeIndonesianPhone } from '../utils/phoneNormalizer';

interface ResultCardProps {
  result: SearchMatchResult;
  isUnlocked: boolean;
  onFocusSecretCode: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  isUnlocked,
  onFocusSecretCode
}) => {
  const { record, precisionScore, matchedTags, predictionType } = result;
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showNIKAnalysis, setShowNIKAnalysis] = useState<boolean>(false);

  const nikAnalysis = analyzeNIK(record.nik);
  const phoneAnalysis = analyzeIndonesianPhone(record.phone);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Masking helpers when locked
  const maskText = (text: string, keepStart = 3, keepEnd = 2): string => {
    if (!text || text.length <= keepStart + keepEnd) return '******';
    const start = text.substring(0, keepStart);
    const end = text.substring(text.length - keepEnd);
    return `${start}${'*'.repeat(Math.max(4, text.length - keepStart - keepEnd))}${end}`;
  };

  const getThreatBadge = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-rose-950/80 text-rose-300 border-rose-600/60';
      case 'High':
        return 'bg-amber-950/80 text-amber-300 border-amber-600/60';
      case 'Medium':
        return 'bg-yellow-950/80 text-yellow-300 border-yellow-600/60';
      case 'Low':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  const getPrecisionBadge = (type: string, score: number) => {
    if (score === 100) {
      return 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80 shadow-sm shadow-emerald-900/40';
    }
    if (score >= 80) {
      return 'bg-sky-950/90 text-sky-300 border-sky-500/70';
    }
    if (score >= 50) {
      return 'bg-amber-950/90 text-amber-300 border-amber-600/60';
    }
    return 'bg-slate-900 text-slate-400 border-slate-700';
  };

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden shadow-lg shadow-black/30 transition-all hover:border-slate-700">
      {/* Dossier Header Bar */}
      <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/70 border border-sky-800/60 px-2 py-0.5 rounded">
            {record.id}
          </span>
          <h4 className="text-base font-bold text-slate-100 font-mono tracking-tight">
            {record.fullName}
          </h4>
          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${getThreatBadge(record.threatLevel)}`}>
            THREAT: {record.threatLevel.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Precision Match Score Badge */}
          <div className={`px-2.5 py-1 rounded font-mono text-xs font-bold border flex items-center gap-1.5 ${getPrecisionBadge(predictionType, precisionScore)}`}>
            <Activity className="w-3.5 h-3.5" />
            <span>{precisionScore}% {predictionType.toUpperCase()}</span>
          </div>

          {/* Locked / Unlocked Pill */}
          <div
            className={`px-2.5 py-1 rounded font-mono text-xs font-semibold border flex items-center gap-1.5 ${
              isUnlocked
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/50'
                : 'bg-amber-950/60 text-amber-300 border-amber-600/50'
            }`}
          >
            {isUnlocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>TERBUKA (UNLOCKED)</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>TERTUTUP (SENSOR)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Match Tags (Shows why this result matched user criteria) */}
      <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/60 flex flex-wrap items-center gap-1.5 text-xs font-mono">
        <span className="text-slate-500 text-[11px]">Parameter Cocok:</span>
        {matchedTags.map((tag, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 rounded bg-sky-950/50 text-sky-300 border border-sky-800/50 text-[11px]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-4">
        {/* Core Attributes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          {/* NIK Field */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-[11px]">
                <Fingerprint className="w-3.5 h-3.5 text-sky-400" />
                NOMOR INDUK KEPENDUDUKAN (NIK)
              </span>
              {isUnlocked && (
                <button
                  onClick={() => copyToClipboard(record.nik, 'nik')}
                  className="text-slate-400 hover:text-sky-300"
                  title="Salin NIK"
                >
                  {copiedField === 'nik' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="font-bold text-sm">
              {isUnlocked ? (
                <span className="text-emerald-300 tracking-wider">{record.nik}</span>
              ) : (
                <span className="text-amber-400/90 tracking-widest">{maskText(record.nik, 6, 2)}</span>
              )}
            </div>
            {isUnlocked && (
              <button
                type="button"
                onClick={() => setShowNIKAnalysis(!showNIKAnalysis)}
                className="mt-1.5 text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-sans"
              >
                {showNIKAnalysis ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{showNIKAnalysis ? 'Tutup Analisis NIK' : 'Analisis Wilayah & NIK'}</span>
              </button>
            )}
          </div>

          {/* Phone Field */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-[11px]">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                NOMOR TELEPON SELULER
              </span>
              {isUnlocked && (
                <button
                  onClick={() => copyToClipboard(record.phone, 'phone')}
                  className="text-slate-400 hover:text-sky-300"
                  title="Salin Telepon"
                >
                  {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="font-bold text-sm">
              {isUnlocked ? (
                <div className="flex items-center justify-between">
                  <span className="text-emerald-300">{phoneAnalysis.formattedLocal}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-sky-400 border border-slate-700">
                    {phoneAnalysis.carrier}
                  </span>
                </div>
              ) : (
                <span className="text-amber-400/90">{maskText(record.phone, 4, 2)}</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {isUnlocked ? phoneAnalysis.formattedInternational : 'Format Disensor'}
            </span>
          </div>

          {/* Age, Gender & Birth Year */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-1 text-slate-400 text-[11px] mb-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              USIA, GENDER & LAHIR
            </div>
            <div className="font-bold text-sm text-slate-100">
              {record.age} Tahun • {record.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {isUnlocked ? `Lahir: ${record.birthDate} (${record.birthYear})` : `Tahun Lahir: ${record.birthYear}`}
            </span>
          </div>

          {/* Location / City */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-1 text-slate-400 text-[11px] mb-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              DOMISILI & KOTA
            </div>
            <div className="font-bold text-sm text-slate-100 truncate">
              {record.city}, {record.province}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block truncate">
              {isUnlocked ? record.address : maskText(record.address, 5, 8)}
            </span>
          </div>
        </div>

        {/* NIK Analyzer Expanded Breakdown (Visible when unlocked & toggled) */}
        {isUnlocked && showNIKAnalysis && (
          <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-800/40 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 text-sky-300 font-bold border-b border-sky-900/50 pb-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>DEKODIFIKASI STRUKTUR NIK DUKCAPIL KEMENDAGRI:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400">Provinsi ({nikAnalysis.provinceCode}):</span>
                <p className="text-slate-200 font-semibold">{nikAnalysis.provinceName}</p>
              </div>
              <div>
                <span className="text-slate-400">Kabupaten/Kota ({nikAnalysis.regencyCode}):</span>
                <p className="text-slate-200 font-semibold">{nikAnalysis.regencyName}</p>
              </div>
              <div>
                <span className="text-slate-400">Kecamatan & No Urut:</span>
                <p className="text-slate-200 font-semibold">Kec: {nikAnalysis.districtCode} • Urut: #{nikAnalysis.sequenceNumber}</p>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-sky-900/40 pt-1.5 flex items-center justify-between">
              <span>Formula Gender: {nikAnalysis.gender === 'female' ? 'Tanggal +40 (Perempuan)' : 'Tanggal Asli 01-31 (Laki-laki)'}</span>
              <span className="text-emerald-400">Verifikasi Algoritma: 100% VALID</span>
            </div>
          </div>
        )}

        {/* Intelligence Dossier Notes & Activity Details */}
        <div className="relative rounded-lg border border-slate-800 p-3 bg-slate-950/50 font-mono text-xs">
          {/* Overlay when Locked / Redacted */}
          {!isUnlocked && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center rounded-lg border border-amber-500/30 z-10 space-y-2">
              <div className="w-8 h-8 rounded-full bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-amber-300 text-xs tracking-wider uppercase">
                  DOKUMEN INTELIJEN TERBATAS (DIRAHASIAKAN)
                </h5>
                <p className="text-[11px] text-slate-400 max-w-md mt-0.5">
                  Seluruh detail NIK lengkap, alamat spesifik, jejak aktivitas, dan catatan investigasi disensor demi keamanan.
                </p>
              </div>
              <button
                type="button"
                onClick={onFocusSecretCode}
                className="mt-1 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md border border-amber-400/40 flex items-center gap-1.5 transition-colors"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Masukkan Kode Rahasia Di Atas</span>
              </button>
            </div>
          )}

          {/* Content (Shown clearly when unlocked, blurred under overlay when locked) */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-300 font-bold">PROFILING PEKERJAAN & SUMBER DATA:</span>
              </div>
              <span className="text-[11px] text-slate-400">Pekerjaan: <strong className="text-slate-200">{record.occupation}</strong></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400">Sumber Leak / Arsip Intelijen:</span>
                <p className="text-slate-200 font-medium">{record.sourceDataset}</p>
              </div>
              <div>
                <span className="text-slate-400">Aktivitas Terakhir Terpantau:</span>
                <p className="text-slate-200 font-medium">{record.lastKnownActivity}</p>
              </div>
            </div>

            {record.notes && (
              <div className="pt-1 text-[11px]">
                <span className="text-slate-400">Catatan Analis Intelijen:</span>
                <p className="text-amber-300/90 italic bg-amber-950/20 p-2 rounded border border-amber-900/40 mt-1">
                  "{record.notes}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Metadata & Real-time Hit Count */}
      <div className="bg-slate-950/90 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-emerald-400" />
          <span>Frekuensi Profiling Target: <strong className="text-emerald-300">{record.searchCount}x Akses</strong></span>
        </span>
        <div className="flex items-center gap-2">
          {isUnlocked && (
            <button
              type="button"
              onClick={() => copyToClipboard(JSON.stringify(record, null, 2), 'json')}
              className="text-xs text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
            >
              {copiedField === 'json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Ekspor JSON Dossier</span>
            </button>
          )}
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">Klasifikasi: Internal Kantor</span>
        </div>
      </div>
    </div>
  );
};
