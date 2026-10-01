import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Lock,
  Unlock,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  Clock,
  Terminal,
  FileText,
  Copy,
  Check,
  Ban,
  Filter,
  Eye,
  Info
} from 'lucide-react';
import { ModerationConfig, ModerationIncident, DEFAULT_MODERATION_CONFIG, DEFAULT_STRICT_BANNED_KEYWORDS } from '../types';

interface ContentModerationPanelProps {
  moderationConfig?: ModerationConfig;
  isBotActive: boolean;
  onShowToast: (text: string, type: 'success' | 'error') => void;
  onRefreshStatus: () => void;
}

export function ContentModerationPanel({
  moderationConfig,
  isBotActive,
  onShowToast,
  onRefreshStatus
}: ContentModerationPanelProps) {
  const [config, setConfig] = useState<ModerationConfig>(moderationConfig || DEFAULT_MODERATION_CONFIG);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Custom Banned Keywords Input
  const [newBannedInput, setNewBannedInput] = useState<string>('');
  // Custom Whitelist Input
  const [newWhitelistInput, setNewWhitelistInput] = useState<string>('');
  // Cyber Whitelist Input
  const [newCyberInput, setNewCyberInput] = useState<string>('');

  // Simulator Test Box
  const [testText, setTestText] = useState<string>('info link slot gacor zeus depo 10k wd kilat');
  const [testResult, setTestResult] = useState<{
    isBanned: boolean;
    category?: string;
    matchedKeyword?: string;
    explanation?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  // Sync props to state if not dirty
  useEffect(() => {
    if (moderationConfig && !isDirty) {
      setConfig({
        ...DEFAULT_MODERATION_CONFIG,
        ...moderationConfig
      });
    }
  }, [moderationConfig, isDirty]);

  // Handle boolean toggle
  const handleToggle = (key: keyof ModerationConfig) => {
    setConfig((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      setIsDirty(true);
      return updated;
    });
  };

  // Handle number change
  const handleCooldownChange = (val: number) => {
    setConfig((prev) => {
      const updated = { ...prev, autoDeleteExplanationSeconds: Math.max(0, val) };
      setIsDirty(true);
      return updated;
    });
  };

  // Add Custom Banned Keyword
  const handleAddBannedKeyword = () => {
    const val = newBannedInput.trim().toLowerCase();
    if (!val) return;
    if (config.customBannedKeywords?.includes(val)) {
      onShowToast('Kata kunci sudah ada di daftar dilarang.', 'error');
      return;
    }
    setConfig((prev) => ({
      ...prev,
      customBannedKeywords: [...(prev.customBannedKeywords || []), val]
    }));
    setNewBannedInput('');
    setIsDirty(true);
  };

  // Remove Custom Banned Keyword
  const handleRemoveBannedKeyword = (kw: string) => {
    setConfig((prev) => ({
      ...prev,
      customBannedKeywords: (prev.customBannedKeywords || []).filter((k) => k !== kw)
    }));
    setIsDirty(true);
  };

  // Bulk Load 150+ Super Strict Predefined Banned Keywords
  const handleLoadStrictKeywords = () => {
    const existing = new Set(config.customBannedKeywords || []);
    let addedCount = 0;
    DEFAULT_STRICT_BANNED_KEYWORDS.forEach((kw) => {
      if (!existing.has(kw)) {
        existing.add(kw);
        addedCount++;
      }
    });
    setConfig((prev) => ({
      ...prev,
      customBannedKeywords: Array.from(existing)
    }));
    setIsDirty(true);
    onShowToast(`🔥 Berhasil memuat ${addedCount} kata kunci terlarang super ketat! Total kata: ${existing.size}. Jangan lupa klik "Simpan Pengaturan".`, 'success');
  };

  // Add Cyber Whitelist Keyword
  const handleAddCyberKeyword = () => {
    const val = newCyberInput.trim().toLowerCase();
    if (!val) return;
    if (config.cyberWhitelistKeywords?.includes(val)) {
      onShowToast('Kata kunci sudah ada di daftar cyber.', 'error');
      return;
    }
    setConfig((prev) => ({
      ...prev,
      cyberWhitelistKeywords: [...(prev.cyberWhitelistKeywords || []), val]
    }));
    setNewCyberInput('');
    setIsDirty(true);
  };

  // Remove Cyber Whitelist Keyword
  const handleRemoveCyberKeyword = (kw: string) => {
    setConfig((prev) => ({
      ...prev,
      cyberWhitelistKeywords: (prev.cyberWhitelistKeywords || []).filter((k) => k !== kw)
    }));
    setIsDirty(true);
  };

  // Add General Whitelist Keyword
  const handleAddWhitelistKeyword = () => {
    const val = newWhitelistInput.trim().toLowerCase();
    if (!val) return;
    if (config.whitelistKeywords?.includes(val)) {
      onShowToast('Kata kunci sudah ada di whitelist.', 'error');
      return;
    }
    setConfig((prev) => ({
      ...prev,
      whitelistKeywords: [...(prev.whitelistKeywords || []), val]
    }));
    setNewWhitelistInput('');
    setIsDirty(true);
  };

  // Remove General Whitelist Keyword
  const handleRemoveWhitelistKeyword = (kw: string) => {
    setConfig((prev) => ({
      ...prev,
      whitelistKeywords: (prev.whitelistKeywords || []).filter((k) => k !== kw)
    }));
    setIsDirty(true);
  };

  // Save Settings to Backend
  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/moderation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Pengaturan moderasi & auto-delete berhasil disimpan!', 'success');
        setIsDirty(false);
        onRefreshStatus();
      } else {
        onShowToast(data.message || 'Gagal menyimpan pengaturan.', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error: ${err.message || 'Gagal menyimpan'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Run Test / Simulator
  const handleRunSimulator = async () => {
    if (!testText.trim()) return;
    setIsTesting(true);
    try {
      const res = await fetch('/api/moderation/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text: testText })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(data.result);
      }
    } catch (err: any) {
      onShowToast(`Error simulator: ${err.message}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  // Clear Incidents Log
  const handleClearIncidents = async () => {
    if (!window.confirm('Bersihkan seluruh riwayat insiden pesan terlarang?')) return;
    try {
      const res = await fetch('/api/moderation/clear-incidents', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        onShowToast('Riwayat insiden moderasi telah dibersihkan.', 'success');
        setConfig((prev) => ({ ...prev, recentIncidents: [] }));
        onRefreshStatus();
      }
    } catch (err: any) {
      onShowToast(`Gagal: ${err.message}`, 'error');
    }
  };

  const incidents = config.recentIncidents || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Status Header */}
      <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-indigo-950/40 rounded-2xl p-5 sm:p-6 border border-rose-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/30 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Auto-Delete Konten Ilegal & Pengawasan Grup
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                    config.enabled
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${config.enabled ? 'bg-rose-400 animate-pulse' : 'bg-slate-500'}`}></span>
                  {config.enabled ? 'MODERASI AKTIF' : 'NONAKTIF'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Bot secara otomatis menghapus pesan berbau <span className="text-rose-300 font-semibold">Judi Online/Slot, Konten 18+, Narkoba, & Penipuan</span>,
                memberikan salinan pesan pengirim beserta penjelasan detail kesalahan, namun <span className="text-emerald-400 font-semibold underline decoration-emerald-500/50">seluruh topik seputar Cyber Security & OSINT tetap 100% diizinkan</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center">
            {isDirty && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Belum Disimpan
              </span>
            )}
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                isDirty
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Pengaturan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Control Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Category Toggles & Scope Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Master Scope & Actions */}
          <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Pengaturan Utama & Aksi Bot
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Master Switch */}
              <div
                onClick={() => handleToggle('enabled')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  config.enabled
                    ? 'bg-rose-950/30 border-rose-500/40 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Auto-Delete Konten Ilegal
                  </span>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                      config.enabled ? 'bg-rose-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        config.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    ></div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Aktifkan sistem penyaringan otomatis pesan terlarang di chat bot atau grup Telegram.
                </p>
              </div>

              {/* Send Explanation Message */}
              <div
                onClick={() => handleToggle('sendExplanationMessage')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  config.sendExplanationMessage
                    ? 'bg-sky-950/30 border-sky-500/40 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-sky-400" />
                    Kirim Penjelasan & Salinan
                  </span>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                      config.sendExplanationMessage ? 'bg-sky-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        config.sendExplanationMessage ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    ></div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Menampilkan kartu alasan pelanggaran, kata kunci, dan menyalin pesan pengirim sebagai transparansi.
                </p>
              </div>

              {/* Delete in Groups */}
              <div
                onClick={() => handleToggle('deleteInGroups')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  config.deleteInGroups
                    ? 'bg-blue-950/30 border-blue-500/40 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-400" />
                    Aktif di Grup & Supergroup
                  </span>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                      config.deleteInGroups ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        config.deleteInGroups ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    ></div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Hapus pesan terlarang di grup Telegram (Bot wajib menjadi Admin dengan izin Delete Messages).
                </p>
              </div>

              {/* Delete in Private Chat */}
              <div
                onClick={() => handleToggle('deleteInPrivate')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  config.deleteInPrivate
                    ? 'bg-indigo-950/30 border-indigo-500/40 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-400" />
                    Aktif di Chat Pribadi
                  </span>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                      config.deleteInPrivate ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        config.deleteInPrivate ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    ></div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Pesan terlarang yang dikirim ke DM bot langsung dihapus dan dibalas peringatan otomatis.
                </p>
              </div>
            </div>

            {/* Auto Delete Warning Timer */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Jeda Auto-Delete Pesan Penjelasan Bot (Detik):
                </span>
                <span className="text-[11px] text-slate-400">
                  {config.autoDeleteExplanationSeconds === 0
                    ? '0 = Pesan peringatan disimpan permanen (direkomendasikan untuk edukasi anggota grup)'
                    : `Pesan peringatan akan otomatis dihapus setelah ${config.autoDeleteExplanationSeconds} detik agar obrolan grup tetap bersih.`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min="0"
                  max="3600"
                  step="10"
                  value={config.autoDeleteExplanationSeconds}
                  onChange={(e) => handleCooldownChange(parseInt(e.target.value, 10) || 0)}
                  className="w-20 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-center text-white focus:outline-none focus:border-rose-500"
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleCooldownChange(0)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono"
                    title="Simpan Permanen"
                  >
                    Permanen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCooldownChange(30)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono"
                  >
                    30s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCooldownChange(60)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono"
                  >
                    60s
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Banned Categories (Slot, 18+, Drugs, Scam, Weapons) */}
          <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Kategori Konten Yang Dilarang & Otomatis Dihapus
                </h4>
              </div>
            </div>

            <div className="space-y-3">
              {/* 1. Judi Online / Slot */}
              <div
                onClick={() => handleToggle('blockGamblingSlot')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  config.blockGamblingSlot
                    ? 'bg-rose-950/20 border-rose-500/40 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎰</span>
                    <span className="text-xs font-bold text-white">Judi Online, Slot Gacor, Kasino & Togel</span>
                    <span className="px-2 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                      PRIORITAS TINGGI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Mendeteksi dan menghapus: <span className="font-mono text-slate-300">slot, judol, gacor, scatter, maxwin, pragmatic, zeus, togel, link gacor, depo 10k, rtp slot</span>, dsb.
                  </p>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 mt-1 ${
                    config.blockGamblingSlot ? 'bg-rose-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      config.blockGamblingSlot ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  ></div>
                </div>
              </div>

              {/* 2. Konten Dewasa / 18+ */}
              <div
                onClick={() => handleToggle('blockAdult18Plus')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  config.blockAdult18Plus
                    ? 'bg-rose-950/20 border-rose-500/40 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔞</span>
                    <span className="text-xs font-bold text-white">Konten Dewasa, 18+, Pornografi & VCS</span>
                    <span className="px-2 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                      SENDIRIAN/GRUP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Mendeteksi dan menghapus: <span className="font-mono text-slate-300">bokep, porn, porno, 18+, vcs, open bo, video viral bokep, sange, bugil, toket, croot, prostitusi</span>, dsb.
                  </p>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 mt-1 ${
                    config.blockAdult18Plus ? 'bg-rose-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      config.blockAdult18Plus ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  ></div>
                </div>
              </div>

              {/* 3. Narkoba & Obat Terlarang */}
              <div
                onClick={() => handleToggle('blockDrugs')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  config.blockDrugs
                    ? 'bg-rose-950/20 border-rose-500/40 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">💊</span>
                    <span className="text-xs font-bold text-white">Narkoba, Psikotropika & Zat/Obat Keras Ilegal</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Mendeteksi dan menghapus: <span className="font-mono text-slate-300">narkoba, sabu, ekstasi, ganja, pil koplo, tramadol, tembakau gorila, sinte, kokain, heroin, jual sabu</span>, dsb.
                  </p>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 mt-1 ${
                    config.blockDrugs ? 'bg-rose-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      config.blockDrugs ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  ></div>
                </div>
              </div>

              {/* 4. Penipuan & Phishing */}
              <div
                onClick={() => handleToggle('blockFraudScam')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  config.blockFraudScam
                    ? 'bg-rose-950/20 border-rose-500/40 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">💳</span>
                    <span className="text-xs font-bold text-white">Penipuan Finansial, Phishing & Pinjol Bodong</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Mendeteksi dan menghapus: <span className="font-mono text-slate-300">pinjol ilegal, pengganda uang, pesugihan cepat kaya, hack saldo dana, apk pembobol rekening</span>, dsb.
                  </p>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 mt-1 ${
                    config.blockFraudScam ? 'bg-rose-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      config.blockFraudScam ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  ></div>
                </div>
              </div>

              {/* 5. Senjata & Bahan Peledak */}
              <div
                onClick={() => handleToggle('blockWeaponsExplosives')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  config.blockWeaponsExplosives
                    ? 'bg-rose-950/20 border-rose-500/40 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">💣</span>
                    <span className="text-xs font-bold text-white">Senjata Api Rakitan & Bahan Peledak Ilegal</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Mendeteksi dan menghapus: <span className="font-mono text-slate-300">jual senpi, senjata api rakitan, celurit begal, bom ikan, pistol rakitan</span>, dsb.
                  </p>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 mt-1 ${
                    config.blockWeaponsExplosives ? 'bg-rose-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      config.blockWeaponsExplosives ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Cyber & OSINT Special Whitelist */}
          <div className="bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 rounded-xl p-5 border border-emerald-500/40 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">
                    Pengecualian Khusus: Topik Cyber & OSINT (Selalu Diizinkan)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    "Tetapi yang berbau Cyber mau legal ilegal itu baru gapapa" — Diskusi & riset cyber tidak akan disensor.
                  </p>
                </div>
              </div>
              <div
                onClick={() => handleToggle('allowCyberAndOsint')}
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                  config.allowCyberAndOsint ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    config.allowCyberAndOsint ? 'translate-x-4' : 'translate-x-0'
                  }`}
                ></div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Seluruh kata kunci dan konteks berikut <span className="text-emerald-400 font-semibold">dikecualikan dari filter pemblokiran</span> sehingga riset OSINT, penetration testing, dan analisis data tetap berjalan lancar:
              </p>

              {/* Tag Cloud of Cyber Whitelist Keywords */}
              <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-slate-950/60 border border-emerald-900/30 max-h-40 overflow-y-auto">
                {(config.cyberWhitelistKeywords || []).map((term) => (
                  <span
                    key={term}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-600/40"
                  >
                    <span>{term}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCyberKeyword(term)}
                      className="text-emerald-400/60 hover:text-rose-400 font-bold ml-0.5"
                      title="Hapus kata kunci"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Add New Cyber Keyword */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Tambah kata kunci cyber (contoh: wiretap, ransomware, reverse-shell)..."
                  value={newCyberInput}
                  onChange={(e) => setNewCyberInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCyberKeyword()}
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddCyberKeyword}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Custom Keywords, Live Tester Simulator & Incident Logs */}
        <div className="space-y-6">
          {/* Card: Custom Banned Keywords */}
          <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Kata Kunci Terlarang Tambahan
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {config.customBannedKeywords?.length || 0} Kata
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 p-2.5 bg-rose-950/30 border border-rose-900/40 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-rose-300 block">Kamus Kata Terlarang Ketat</span>
                  <span className="text-[10px] text-slate-400">Termasuk variasi leetspeak, 18+, slot, narkoba, penipuan</span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadStrictKeywords}
                  className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer active:scale-95 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🔥 Muat 200+ Kata Ketat</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ketik kata yang ingin diblokir..."
                  value={newBannedInput}
                  onChange={(e) => setNewBannedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBannedKeyword()}
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddBannedKeyword}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[50px] p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 max-h-36 overflow-y-auto">
                {(config.customBannedKeywords || []).length === 0 ? (
                  <span className="text-[11px] text-slate-500 italic p-1">Belum ada kata kunci kustom tambahan.</span>
                ) : (
                  config.customBannedKeywords?.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-rose-950/60 text-rose-300 border border-rose-600/40"
                    >
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBannedKeyword(kw)}
                        className="text-rose-400/60 hover:text-white font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Card: Live Simulator / Message Tester */}
          <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Simulator Uji Filter Pesan
                </h4>
              </div>
              <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                LIVE TEST
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Uji Coba Teks Pesan Telegram:
                </label>
                <textarea
                  rows={3}
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Ketik kalimat apapun untuk menguji apakah bot akan menghapusnya atau mengizinkannya..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRunSimulator}
                  disabled={isTesting}
                  className="flex-1 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold rounded-lg shadow transition-all flex items-center justify-center gap-1.5"
                >
                  {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>Uji Deteksi Pesan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTestText('riset cyber security exploit cve dan data leak osint')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-mono"
                  title="Isi contoh pesan cyber"
                >
                  Contoh Cyber
                </button>
                <button
                  type="button"
                  onClick={() => setTestText('info link slot gacor pragmatic zeus depo 10k')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-mono"
                  title="Isi contoh pesan slot"
                >
                  Contoh Slot
                </button>
              </div>

              {/* Test Result Display */}
              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    testResult.isBanned
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.isBanned ? (
                      <>
                        <Ban className="w-4 h-4 text-rose-400" />
                        <span className="text-rose-300 uppercase tracking-wide">
                          🚫 AKAN OTOMATIS DIHAPUS OLEH BOT!
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300 uppercase tracking-wide">
                          ✅ DIIZINKAN & TIDAK DIHAPUS (AMAN / CYBER)
                        </span>
                      </>
                    )}
                  </div>
                  {testResult.isBanned && (
                    <div className="text-[11px] space-y-1 font-mono text-slate-300 pt-1 border-t border-rose-900/40">
                      <div>
                        <span className="text-slate-400">Kategori:</span> {testResult.category}
                      </div>
                      <div>
                        <span className="text-slate-400">Kata Kunci:</span> <span className="text-rose-300 font-bold">"{testResult.matchedKeyword}"</span>
                      </div>
                      <div className="text-slate-400 text-[10px] leading-relaxed">
                        {testResult.explanation}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live Incidents History (Riwayat Pesan Dihapus) */}
      <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Riwayat Pesan Ilegal Yang Telah Dihapus ({incidents.length})
              </h4>
              <p className="text-[11px] text-slate-400">
                Log real-time pesan spam, slot, 18+, atau narkoba yang berhasil dimusnahkan oleh bot.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefreshStatus}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Log</span>
            </button>
            {incidents.length > 0 && (
              <button
                type="button"
                onClick={handleClearIncidents}
                className="px-3 py-1.5 bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 text-xs rounded-lg flex items-center gap-1.5 border border-rose-700/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Riwayat</span>
              </button>
            )}
          </div>
        </div>

        {incidents.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-emerald-500/40" />
            <p className="font-semibold text-slate-400">Belum ada insiden pelanggaran yang terdeteksi.</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Ruang obrolan Anda aman dan terkendali. Pesan yang dihapus akan muncul di sini secara otomatis.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.slice(0, 20).map((inc) => (
              <div
                key={inc.id}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all text-xs font-mono space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      {inc.category}
                    </span>
                    <span className="text-slate-300 font-bold">
                      {inc.userName} {inc.usernameTag && inc.usernameTag !== '-' ? `(${inc.usernameTag})` : ''}
                    </span>
                    <span className="text-[10px] text-slate-500">ID: {inc.userId}</span>
                    {inc.chatTitle && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-800/40">
                        {inc.chatTitle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{new Date(inc.timestamp).toLocaleTimeString('id-ID')} WIB</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        inc.actionTaken === 'deleted_and_warned'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/40'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-600/40'
                      }`}
                    >
                      {inc.actionTaken === 'deleted_and_warned' ? 'DIHAPUS & DIPERINGATKAN' : 'GAGAL HAPUS'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Kata Terdeteksi:</span>
                    <span className="text-rose-400 font-bold">"{inc.matchedKeyword}"</span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-slate-500 block text-[10px]">Salinan Pesan Asli:</span>
                    <p className="text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800 text-[11px] break-all">
                      {inc.originalMessage}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
