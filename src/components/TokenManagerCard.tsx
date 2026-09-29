import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  Check,
  HelpCircle,
  Sparkles,
  Bot,
  Save,
  Zap
} from 'lucide-react';
import { TelegramBotInfo, TokenValidationResult } from '../types';

interface TokenManagerCardProps {
  currentToken: string;
  maskedToken: string;
  isTokenValid: boolean;
  botInfo: TelegramBotInfo | null;
  onUpdateToken: (newToken: string) => Promise<{ success: boolean; message: string }>;
  onOpenGuide: () => void;
}

export function TokenManagerCard({
  currentToken,
  maskedToken,
  isTokenValid,
  botInfo,
  onUpdateToken,
  onOpenGuide
}: TokenManagerCardProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tokenInput, setTokenInput] = useState<string>(currentToken || '');
  const [showRawToken, setShowRawToken] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TokenValidationResult | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (currentToken && !tokenInput) {
      setTokenInput(currentToken);
    }
  }, [currentToken]);

  // Test token with real Telegram API
  const handleTestToken = async (tokenToTest: string) => {
    const target = tokenToTest.trim();
    if (!target) {
      setTestResult({
        valid: false,
        errorMessage: 'Token tidak boleh kosong.',
        checkedAt: new Date().toISOString()
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/bot/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: target })
      });
      const data: TokenValidationResult = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        valid: false,
        errorMessage: `Gagal memverifikasi ke Telegram: ${err.message}`,
        checkedAt: new Date().toISOString()
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save new token
  const handleSaveToken = async () => {
    const target = tokenInput.trim();
    if (!target) return;

    setIsSaving(true);
    setSaveFeedback(null);

    try {
      const res = await onUpdateToken(target);
      setSaveFeedback(res);
      if (res.success) {
        setIsEditing(false);
        // also test current
        handleTestToken(target);
      }
    } catch (err: any) {
      setSaveFeedback({
        success: false,
        message: err.message || 'Gagal menyimpan token.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToken = () => {
    if (!currentToken) return;
    navigator.clipboard.writeText(currentToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="token-manager-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Kelola Token API axxosintbot
              {isTokenValid && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Terverifikasi
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Ganti token bot axxosintbot (by Ax.) kapan saja dan cek validitasnya langsung ke server resmi Telegram API (getMe).
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-open-botfather-guide"
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cara Buat Bot & Token</span>
          </button>

          {!isEditing ? (
            <button
              id="btn-edit-token"
              onClick={() => {
                setIsEditing(true);
                setTokenInput(currentToken);
                setSaveFeedback(null);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm shadow-cyan-900/30 transition-all active:scale-95"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Ganti / Edit Token</span>
            </button>
          ) : (
            <button
              id="btn-cancel-edit-token"
              onClick={() => {
                setIsEditing(false);
                setTokenInput(currentToken);
                setSaveFeedback(null);
              }}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg transition-colors"
            >
              Batal
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-6 space-y-6">
        {/* Token Display or Editor Form */}
        {!isEditing ? (
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-mono">Token Bot Aktif Saat Ini:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-cyan-300 font-semibold tracking-wider">
                  {showRawToken ? (currentToken || 'Belum ada token tersimpan') : (maskedToken || 'Belum ada token tersimpan')}
                </code>
                {currentToken && (
                  <>
                    <button
                      onClick={() => setShowRawToken(!showRawToken)}
                      className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                      title={showRawToken ? 'Sembunyikan token' : 'Tampilkan token asli'}
                    >
                      {showRawToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleCopyToken}
                      className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Salin token"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-test-current-token"
                onClick={() => handleTestToken(currentToken)}
                disabled={isTesting || !currentToken}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-700/80 hover:bg-slate-700 border border-slate-600 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
                <span>{isTesting ? 'Mengecek ke Telegram...' : 'Cek Validitas Sekarang'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Editing Form */
          <div className="bg-slate-800/80 border border-cyan-500/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="input-telegram-token" className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Masukkan Token Bot Telegram Baru
              </label>
              <span className="text-xs text-slate-400">Format: 123456789:ABCdef-GHIjkl...</span>
            </div>

            <div className="relative">
              <input
                id="input-telegram-token"
                type="text"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setSaveFeedback(null);
                  setTestResult(null);
                }}
                placeholder="Contoh: 7891234567:AAFlKj9w8xyz_sampleTokenHere"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-3 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Form actions: Test & Save */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleTestToken(tokenInput)}
                disabled={isTesting || !tokenInput.trim()}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
                <span>{isTesting ? 'Mengecek ke API Telegram...' : 'Uji Validitas Token'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  id="btn-save-token"
                  onClick={handleSaveToken}
                  disabled={isSaving || !tokenInput.trim()}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>{isSaving ? 'Menyimpan & Menghubungkan...' : 'Simpan & Terapkan Token'}</span>
                </button>
              </div>
            </div>

            {/* Save Feedback message */}
            {saveFeedback && (
              <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                saveFeedback.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}>
                {saveFeedback.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{saveFeedback.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Validation Result Box */}
        {testResult && (
          <div className={`p-4 rounded-xl border transition-all ${
            testResult.valid
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {testResult.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {testResult.valid
                      ? 'Hasil Uji: TOKEN ASLI & VALID (Terhubung ke Telegram API)'
                      : 'Hasil Uji: TOKEN TIDAK VALID / DITOLAK OLEH TELEGRAM'}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {testResult.valid
                      ? `Bot berhasil diverifikasi sebagai @${testResult.botInfo?.username || 'bot'}. Token siap digunakan untuk menjalankan bot.`
                      : testResult.errorMessage}
                  </p>
                </div>
              </div>

              {testResult.latencyMs !== undefined && (
                <div className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
                  Latency: {testResult.latencyMs}ms
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verified Bot Details Card (Displayed when botInfo is present) */}
        {botInfo && (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-base">{botInfo.first_name}</span>
                    <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs rounded-full font-mono">
                      ID: {botInfo.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {botInfo.username && (
                      <a
                        href={`https://t.me/${botInfo.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 hover:underline"
                      >
                        @{botInfo.username}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Token Resmi Telegram
                    </span>
                  </div>
                </div>
              </div>

              {botInfo.username && (
                <a
                  href={`https://t.me/${botInfo.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold transition-colors"
                >
                  <span>Buka di Telegram</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Official Bot Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 text-xs">
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Gabung Grup</span>
                <span className="font-semibold text-slate-200">
                  {botInfo.can_join_groups ? '✅ Diizinkan' : '❌ Dilarang'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Baca Pesan Grup</span>
                <span className="font-semibold text-slate-200">
                  {botInfo.can_read_all_group_messages ? '✅ Semua Pesan' : '⚠️ Hanya Mention'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block mb-0.5">Inline Queries</span>
                <span className="font-semibold text-slate-200">
                  {botInfo.supports_inline_queries ? '✅ Didukung' : '➖ Nonaktif'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
