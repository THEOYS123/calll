import React, { useState } from 'react';
import {
  Shield,
  Activity,
  Power,
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  ExternalLink,
  Wifi,
  DollarSign,
  Copy,
  Check,
  RefreshCw,
  Gift,
  Search,
  MessageCircle,
  Lock,
  Unlock
} from 'lucide-react';
import { OsintConfig, OsintApiKey } from '../types';

interface OsintControlPanelProps {
  osintConfig: OsintConfig;
  onToggleStatus: (enabled: boolean, broadcast: boolean) => Promise<void>;
  onUpdateConfig: (config: { ngrokUrl: string; ownerUsername: string; notifyOnStatusChange: boolean }) => Promise<void>;
  onUpdateApiKeys: (keys: OsintApiKey[]) => Promise<void>;
  onTestNgrok: (url: string) => Promise<{ success: boolean; message: string; latencyMs?: number }>;
}

export function OsintControlPanel({
  osintConfig,
  onToggleStatus,
  onUpdateConfig,
  onUpdateApiKeys,
  onTestNgrok
}: OsintControlPanelProps) {
  // Local state for editing server config
  const [ngrokUrl, setNgrokUrl] = useState(osintConfig.ngrokUrl);
  const [ownerUsername, setOwnerUsername] = useState(osintConfig.ownerUsername);
  const [notifyBroadcast, setNotifyBroadcast] = useState(osintConfig.notifyOnStatusChange);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);

  // Status toggle state
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Ping test state
  const [isTestingNgrok, setIsTestingNgrok] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  // Add API Key Form modal/state
  const [isAddKeyOpen, setIsAddKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyTier, setNewKeyTier] = useState<'limited' | 'unlimited'>('limited');
  const [newKeyQuota, setNewKeyQuota] = useState('10');
  const [newKeyBonus, setNewKeyBonus] = useState('0');
  const [newKeyNotes, setNewKeyNotes] = useState('');

  // Currency preview selector
  const [currencyTab, setCurrencyTab] = useState<'idr' | 'myr' | 'sgd' | 'usd'>('idr');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleToggle = async (targetState: boolean) => {
    setIsTogglingStatus(true);
    try {
      await onToggleStatus(targetState, notifyBroadcast);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      await onUpdateConfig({
        ngrokUrl: ngrokUrl.trim(),
        ownerUsername: ownerUsername.trim(),
        notifyOnStatusChange: notifyBroadcast
      });
      setConfigSaveSuccess(true);
      setTimeout(() => setConfigSaveSuccess(false), 2500);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handlePingTest = async () => {
    setIsTestingNgrok(true);
    setTestResult(null);
    try {
      const res = await onTestNgrok(ngrokUrl);
      setTestResult(res);
    } finally {
      setIsTestingNgrok(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const quotaNum = newKeyTier === 'unlimited' ? 999999 : (parseInt(newKeyQuota, 10) || 10);
    const bonusNum = parseInt(newKeyBonus, 10) || 0;

    const newApiKey: OsintApiKey = {
      id: `key-${Date.now()}`,
      key: newKeyName.trim(),
      tier: newKeyTier,
      initialQuota: quotaNum,
      remainingQuota: quotaNum,
      bonusQuota: bonusNum,
      totalUsed: 0,
      ownerNotes: newKeyNotes.trim() || 'Dibuat via Web Dashboard',
      createdAt: new Date().toISOString(),
      enabled: true
    };

    // Filter out duplicate keys with case-insensitive check
    const updated = [
      newApiKey,
      ...osintConfig.apiKeys.filter((k) => k.key.toLowerCase() !== newKeyName.trim().toLowerCase())
    ];

    await onUpdateApiKeys(updated);
    setNewKeyName('');
    setNewKeyQuota('10');
    setNewKeyBonus('0');
    setNewKeyNotes('');
    setIsAddKeyOpen(false);
  };

  const handleDeleteApiKey = async (keyId: string) => {
    const updated = osintConfig.apiKeys.filter((k) => k.id !== keyId);
    await onUpdateApiKeys(updated);
  };

  const handleToggleKeyEnabled = async (keyId: string) => {
    const updated = osintConfig.apiKeys.map((k) => {
      if (k.id === keyId) {
        return { ...k, enabled: !k.enabled };
      }
      return k;
    });
    await onUpdateApiKeys(updated);
  };

  return (
    <div id="osint-control-panel" className="space-y-6">
      {/* Top Banner: Master State & Status */}
      <div className={`p-6 rounded-2xl border transition-all shadow-xl ${
        osintConfig.enabled
          ? 'bg-emerald-950/30 border-emerald-500/40 ring-1 ring-emerald-500/20'
          : 'bg-rose-950/20 border-rose-500/30 ring-1 ring-rose-500/10'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`flex h-3 w-3 relative ${osintConfig.enabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                {osintConfig.enabled && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${osintConfig.enabled ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-300">
                STATUS SERVER INTELIJEN OSINT
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                osintConfig.enabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {osintConfig.enabled ? '🟢 AKTIF (ON)' : '🔴 NONAKTIF (OFF)'}
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-100">
              {osintConfig.enabled
                ? 'Server OSINT Terbuka & Siap Digunakan Pengguna'
                : 'Server OSINT Sedang Terkunci / Ditutup oleh Owner'}
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {osintConfig.enabled
                ? 'Pengguna yang memiliki API Key yang valid dapat melakukan pencarian data intelijen via format: search: <target> <apiKey>. Notifikasi status aktif telah disiarkan ke pengguna.'
                : 'Pengguna yang mencoba mengakses fitur OSINT akan melihat status OFF dan diarahkan menghubungi Owner (@flood1233) untuk meminta aktivasi server serta pembelian API Key.'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {osintConfig.enabled ? (
              <button
                onClick={() => handleToggle(false)}
                disabled={isTogglingStatus}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-950/50 transition-all disabled:opacity-50"
              >
                <Power className="w-4 h-4" />
                <span>{isTogglingStatus ? 'Mematikan...' : 'Matikan Server (OFF)'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggle(true)}
                disabled={isTogglingStatus}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
              >
                <Power className="w-4 h-4" />
                <span>{isTogglingStatus ? 'Mengaktifkan...' : 'Aktifkan Server (ON)'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Server Config & Ngrok Ping Test */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Server Tunnel Configuration */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold">
              <Wifi className="w-4 h-4" />
              <span>Konfigurasi Endpoint Server Ngrok & Owner</span>
            </div>
            {configSaveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                <Check className="w-3.5 h-3.5" /> Tersimpan!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                URL Tunnel Ngrok (Server Data OSINT)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={ngrokUrl}
                  onChange={(e) => setNgrokUrl(e.target.value)}
                  placeholder="https://xxxx-xxxx.ngrok-free.app"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
                <button
                  type="button"
                  onClick={handlePingTest}
                  disabled={isTestingNgrok}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingNgrok ? 'animate-spin' : ''}`} />
                  <span>{isTestingNgrok ? 'Mengetes...' : 'Tes Ping'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Owner juga dapat mengganti URL ini langsung dari Telegram via perintah rahasia: <code className="text-amber-300 font-mono">ax0895 ngrok &lt;url&gt;</code>.
              </p>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-700/50 text-rose-300'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <div>
                  <div className="font-semibold">{testResult.message}</div>
                  {testResult.latencyMs !== undefined && (
                    <div className="text-[11px] opacity-80 mt-0.5 font-mono">Latency: {testResult.latencyMs}ms</div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Username Owner Telegram
                </label>
                <input
                  type="text"
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  placeholder="@flood1233"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={notifyBroadcast}
                    onChange={(e) => setNotifyBroadcast(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-950 border-slate-700"
                  />
                  <span className="text-slate-300 text-xs">
                    Siarkan notifikasi broadcast saat status diubah
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingConfig}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-md shadow-cyan-950/50 disabled:opacity-50"
              >
                {isSavingConfig ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>
          </form>
        </div>

        {/* Pricing Matrix & Currency Guide */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
              <DollarSign className="w-4 h-4" />
              <span>Daftar Harga & Multi-Mata Uang</span>
            </div>
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
              {(['idr', 'myr', 'sgd', 'usd'] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrencyTab(curr)}
                  className={`px-2 py-0.5 rounded uppercase transition-all ${
                    currencyTab === curr
                      ? 'bg-amber-500/20 text-amber-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
            {currencyTab === 'idr' && (
              <>
                <div className="font-semibold text-emerald-400 flex items-center justify-between">
                  <span>🇮🇩 Indonesia (IDR - Rupiah)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Deteksi: id</span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-300 divide-y divide-slate-800/60">
                  <div className="flex justify-between py-1"><span>5x Pakai</span><span className="font-bold text-slate-100">Rp 3.000</span></div>
                  <div className="flex justify-between py-1"><span>10x Pakai</span><span className="font-bold text-slate-100">Rp 5.000</span></div>
                  <div className="flex justify-between py-1"><span>15x Pakai (+1 Bonus)</span><span className="font-bold text-amber-300">Rp 10.000</span></div>
                  <div className="flex justify-between py-1"><span>40x Pakai (+1 Bonus)</span><span className="font-bold text-amber-300">Rp 25.000</span></div>
                  <div className="flex justify-between py-1"><span>100x Pakai (+2 Bonus)</span><span className="font-bold text-amber-300">Rp 50.000</span></div>
                  <div className="flex justify-between py-1"><span>Unlimited Tanpa Batas</span><span className="font-bold text-cyan-300">Rp 100.000</span></div>
                </div>
              </>
            )}

            {currencyTab === 'myr' && (
              <>
                <div className="font-semibold text-amber-400 flex items-center justify-between">
                  <span>🇲🇾 Malaysia (MYR - Ringgit)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Deteksi: ms, my</span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-300 divide-y divide-slate-800/60">
                  <div className="flex justify-between py-1"><span>5x Pakai</span><span className="font-bold text-slate-100">RM 1.00</span></div>
                  <div className="flex justify-between py-1"><span>10x Pakai</span><span className="font-bold text-slate-100">RM 1.80</span></div>
                  <div className="flex justify-between py-1"><span>15x Pakai (+1 Bonus)</span><span className="font-bold text-amber-300">RM 3.50</span></div>
                  <div className="flex justify-between py-1"><span>40x Pakai (+1 Bonus)</span><span className="font-bold text-amber-300">RM 8.00</span></div>
                  <div className="flex justify-between py-1"><span>100x Pakai (+2 Bonus)</span><span className="font-bold text-amber-300">RM 16.00</span></div>
                  <div className="flex justify-between py-1"><span>Unlimited Tanpa Batas</span><span className="font-bold text-cyan-300">RM 32.00</span></div>
                </div>
              </>
            )}

            {currencyTab === 'sgd' && (
              <>
                <div className="font-semibold text-rose-400 flex items-center justify-between">
                  <span>🇸🇬 Singapore (SGD - Dollar)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Deteksi: sg</span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-300 divide-y divide-slate-800/60">
                  <div className="flex justify-between py-1"><span>5x Pakai</span><span className="font-bold text-slate-100">S$ 0.35</span></div>
                  <div className="flex justify-between py-1"><span>10x Pakai</span><span className="font-bold text-slate-100">S$ 0.60</span></div>
                  <div className="flex justify-between py-1"><span>15x Pakai (+1 Bonus)</span><span className="font-bold text-amber-300">S$ 1.20</span></div>
                  <div className="flex justify-between py-1"><span>40x Pakai (+1 Bonus)</span><span className="font-bold text-amber-300">S$ 2.80</span></div>
                  <div className="flex justify-between py-1"><span>100x Pakai (+2 Bonus)</span><span className="font-bold text-amber-300">S$ 5.50</span></div>
                  <div className="flex justify-between py-1"><span>Unlimited Tanpa Batas</span><span className="font-bold text-cyan-300">S$ 11.00</span></div>
                </div>
              </>
            )}

            {currencyTab === 'usd' && (
              <>
                <div className="font-semibold text-blue-400 flex items-center justify-between">
                  <span>🌐 Global / US (USD - Dollar)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Deteksi: en / default</span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-300 divide-y divide-slate-800/60">
                  <div className="flex justify-between py-1"><span>5 Searches</span><span className="font-bold text-slate-100">$0.25</span></div>
                  <div className="flex justify-between py-1"><span>10 Searches</span><span className="font-bold text-slate-100">$0.45</span></div>
                  <div className="flex justify-between py-1"><span>15 Searches (+1 Bonus)</span><span className="font-bold text-amber-300">$0.90</span></div>
                  <div className="flex justify-between py-1"><span>40 Searches (+1 Bonus)</span><span className="font-bold text-amber-300">$2.10</span></div>
                  <div className="flex justify-between py-1"><span>100 Searches (+2 Bonus)</span><span className="font-bold text-amber-300">$4.20</span></div>
                  <div className="flex justify-between py-1"><span>Unlimited Forever</span><span className="font-bold text-cyan-300">$8.50</span></div>
                </div>
              </>
            )}
          </div>

          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs flex items-start gap-2">
            <Gift className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-200/90 text-[11px]">
              <strong>Rumus Bonus:</strong> Pembelian nominal Rp 10.000 ke atas otomatis mendapat +1x kuota ekstra gratis. Kuota tidak terpotong jika koneksi ngrok gagal.
            </p>
          </div>
        </div>
      </div>

      {/* API Key Management Table & Modal */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" />
                <span>Manajemen API Key Resmi OSINT</span>
              </h3>
              <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs rounded-full font-mono font-semibold">
                {osintConfig.apiKeys.length} Key
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Pengguna hanya dapat menjalankan pencarian OSINT jika memasukkan salah satu API Key aktif di bawah ini.
            </p>
          </div>

          <button
            onClick={() => setIsAddKeyOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah API Key Baru</span>
          </button>
        </div>

        {/* API Key Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="pb-3 pr-4">KEY KODE</th>
                <th className="pb-3 pr-4">TIER / KUOTA SISA</th>
                <th className="pb-3 pr-4">BONUS</th>
                <th className="pb-3 pr-4">TOTAL TERPAKAI</th>
                <th className="pb-3 pr-4">CATATAN OWNER</th>
                <th className="pb-3 pr-4">STATUS</th>
                <th className="pb-3 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {osintConfig.apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-300">
                      <span>{apiKey.key}</span>
                      <button
                        onClick={() => handleCopy(apiKey.key)}
                        className="text-slate-400 hover:text-slate-200 p-1"
                        title="Salin Key"
                      >
                        {copiedText === apiKey.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>

                  <td className="py-3 pr-4 font-mono">
                    {apiKey.tier === 'unlimited' ? (
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold text-[11px]">
                        Unlimited ∞
                      </span>
                    ) : (
                      <span className={`font-semibold ${apiKey.remainingQuota > 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                        {apiKey.remainingQuota} / {apiKey.initialQuota}x
                      </span>
                    )}
                  </td>

                  <td className="py-3 pr-4 font-mono text-amber-300">
                    +{apiKey.bonusQuota}x
                  </td>

                  <td className="py-3 pr-4 font-mono text-slate-400">
                    {apiKey.totalUsed}x
                  </td>

                  <td className="py-3 pr-4 text-slate-300 max-w-xs truncate">
                    {apiKey.ownerNotes || '-'}
                  </td>

                  <td className="py-3 pr-4">
                    <button
                      onClick={() => handleToggleKeyEnabled(apiKey.id)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        apiKey.enabled
                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {apiKey.enabled ? <Lock className="w-3 h-3 text-emerald-400" /> : <Unlock className="w-3 h-3 text-slate-500" />}
                      <span>{apiKey.enabled ? 'Aktif' : 'Off'}</span>
                    </button>
                  </td>

                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleDeleteApiKey(apiKey.id)}
                      className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800 transition-colors"
                      title="Hapus Key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Search Helper Card */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Format Perintah Pengguna di Telegram:</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800 text-cyan-300">
              <span>search: 08123456789 ppp</span>
              <button
                onClick={() => handleCopy('search: 08123456789 ppp')}
                className="text-slate-400 hover:text-slate-200"
              >
                {copiedText === 'search: 08123456789 ppp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800 text-amber-300">
              <span>api ppp</span>
              <button
                onClick={() => handleCopy('api ppp')}
                className="text-slate-400 hover:text-slate-200"
              >
                {copiedText === 'api ppp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Tambah API Key Baru */}
      {isAddKeyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Key className="w-4 h-4" />
                <span>Buat API Key OSINT Baru</span>
              </div>
              <button
                onClick={() => setIsAddKeyOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateApiKey} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nama / Kode API Key
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Contoh: ppp, member-vip, key-andi"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Tipe Akses
                  </label>
                  <select
                    value={newKeyTier}
                    onChange={(e) => setNewKeyTier(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="limited">Terbatas (Kuota)</option>
                    <option value="unlimited">Unlimited (Bebas)</option>
                  </select>
                </div>

                {newKeyTier === 'limited' && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Jumlah Kuota
                    </label>
                    <input
                      type="number"
                      value={newKeyQuota}
                      onChange={(e) => setNewKeyQuota(e.target.value)}
                      min="1"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Bonus Kuota Tambahan (Gratis)
                </label>
                <input
                  type="number"
                  value={newKeyBonus}
                  onChange={(e) => setNewKeyBonus(e.target.value)}
                  min="0"
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Catatan Owner (Opsional)
                </label>
                <input
                  type="text"
                  value={newKeyNotes}
                  onChange={(e) => setNewKeyNotes(e.target.value)}
                  placeholder="Contoh: Pembeli paket 10k via @flood1233"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddKeyOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-md"
                >
                  Simpan API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
