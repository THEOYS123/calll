import React, { useState } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  VolumeX,
  Clock,
  UserCheck,
  AlertTriangle,
  Plus,
  Trash2,
  Ban,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Hash,
  Sliders,
  Sparkles,
  Send,
  Radio,
  Bot,
  Zap
} from 'lucide-react';
import { GroupConfig, KnownTelegramGroup, MultiBotInstance } from '../types';

interface GroupManagerPanelProps {
  groupConfig?: GroupConfig;
  multiBots?: MultiBotInstance[];
  isBotActive: boolean;
  onShowToast: (text: string, type: 'success' | 'error') => void;
  onRefreshStatus: () => void;
}

export function GroupManagerPanel({
  groupConfig,
  multiBots = [],
  isBotActive,
  onShowToast,
  onRefreshStatus
}: GroupManagerPanelProps) {
  const [config, setConfig] = useState<GroupConfig>(
    groupConfig || {
      allowGroups: true,
      groupAdminOnly: false,
      silentFallbackInGroup: true,
      allowAllCommandsInGroup: true,
      enableAntiFlood: true,
      antiFloodCooldownSeconds: 3,
      allowedGroupIds: [],
      blockedGroupIds: [],
      knownGroups: []
    }
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [newGroupIdInput, setNewGroupIdInput] = useState<string>('');
  const [newGroupTargetType, setNewGroupTargetType] = useState<'whitelist' | 'blacklist'>('blacklist');

  // Group Broadcast Studio State
  const [broadcastTarget, setBroadcastTarget] = useState<'groups' | 'all' | 'custom'>('groups');
  const [broadcastBotId, setBroadcastBotId] = useState<string>('all_cluster');
  const [broadcastText, setBroadcastText] = useState<string>('');
  const [customTargetIds, setCustomTargetIds] = useState<string>('');
  const [pinMessageInGroup, setPinMessageInGroup] = useState<boolean>(false);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastResult, setBroadcastResult] = useState<{ total: number; success: number; failed: number } | null>(null);

  // Sync props to state if props update
  React.useEffect(() => {
    if (groupConfig) {
      setConfig(groupConfig);
    }
  }, [groupConfig]);

  // Toggle boolean setting
  const handleToggleSetting = async (key: keyof GroupConfig) => {
    const updated = {
      ...config,
      [key]: !config[key]
    };
    setConfig(updated);
    await saveConfigToServer(updated);
  };

  // Update cooldown number
  const handleCooldownChange = async (seconds: number) => {
    const updated = {
      ...config,
      antiFloodCooldownSeconds: seconds
    };
    setConfig(updated);
  };

  const handleCooldownBlur = async () => {
    await saveConfigToServer(config);
  };

  // Save config to server
  const saveConfigToServer = async (cfgToSave: GroupConfig) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/groups/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(cfgToSave)
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message || 'Pengaturan grup berhasil disimpan!', 'success');
        onRefreshStatus();
      } else {
        onShowToast(data.message || 'Gagal menyimpan pengaturan grup.', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Group to Whitelist or Blacklist
  const handleAddGroupId = async () => {
    const raw = newGroupIdInput.trim();
    if (!raw) {
      onShowToast('Masukkan ID Grup Telegram (contoh: -1001234567890)', 'error');
      return;
    }
    const num = Number(raw);
    if (isNaN(num)) {
      onShowToast('ID Grup harus berupa angka (biasanya diawali tanda minus -)', 'error');
      return;
    }

    if (newGroupTargetType === 'blacklist') {
      if (config.blockedGroupIds?.includes(num)) {
        onShowToast('ID Grup sudah ada dalam daftar blokir.', 'error');
        return;
      }
      const updated = {
        ...config,
        blockedGroupIds: [...(config.blockedGroupIds || []), num]
      };
      setConfig(updated);
      await saveConfigToServer(updated);
    } else {
      if (config.allowedGroupIds?.includes(num)) {
        onShowToast('ID Grup sudah ada dalam daftar whitelist.', 'error');
        return;
      }
      const updated = {
        ...config,
        allowedGroupIds: [...(config.allowedGroupIds || []), num]
      };
      setConfig(updated);
      await saveConfigToServer(updated);
    }

    setNewGroupIdInput('');
  };

  // Remove from Whitelist
  const handleRemoveWhitelist = async (groupId: number) => {
    const updated = {
      ...config,
      allowedGroupIds: (config.allowedGroupIds || []).filter((id) => id !== groupId)
    };
    setConfig(updated);
    await saveConfigToServer(updated);
  };

  // Remove from Blacklist / Unblock
  const handleUnblockGroup = async (groupId: number) => {
    const updated = {
      ...config,
      blockedGroupIds: (config.blockedGroupIds || []).filter((id) => id !== groupId)
    };
    setConfig(updated);
    await saveConfigToServer(updated);
  };

  // Quick Block Known Group
  const handleToggleBlockKnownGroup = async (group: KnownTelegramGroup) => {
    const isCurrentlyBlocked = config.blockedGroupIds?.includes(group.id);
    const updatedBlocked = isCurrentlyBlocked
      ? (config.blockedGroupIds || []).filter((id) => id !== group.id)
      : [...(config.blockedGroupIds || []), group.id];

    const updated = {
      ...config,
      blockedGroupIds: updatedBlocked
    };
    setConfig(updated);
    await saveConfigToServer(updated);
  };

  // Delete known group from list
  const handleDeleteKnownGroup = async (groupId: number) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onShowToast('Grup berhasil dihapus dari daftar.', 'success');
        setConfig((prev) => ({
          ...prev,
          knownGroups: (prev.knownGroups || []).filter((g) => g.id !== groupId)
        }));
      }
    } catch (err: any) {
      onShowToast(`Error: ${err.message}`, 'error');
    }
  };

  // Execute Broadcast to Groups and Supergroups
  const handleExecuteBroadcast = async () => {
    if (!broadcastText.trim()) {
      onShowToast('Tulis pesan pengumuman / broadcast terlebih dahulu!', 'error');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastResult(null);

    try {
      const res = await fetch('/api/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          target: broadcastTarget,
          botId: broadcastBotId,
          text: broadcastText.trim(),
          customTargetIds: broadcastTarget === 'custom' ? customTargetIds : undefined,
          pinMessage: pinMessageInGroup
        })
      });

      const data = await res.json();
      if (data.success) {
        setBroadcastResult({
          total: data.total || 0,
          success: data.successCount || 0,
          failed: data.failedCount || 0
        });
        onShowToast(`📢 Broadcast Selesai! Terkirim ke ${data.successCount} chat (${data.failedCount} gagal).`, 'success');
        onRefreshStatus();
      } else {
        onShowToast(`Gagal broadcast: ${data.message}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Error broadcast: ${err.message}`, 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/20 border border-blue-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40">
                Grup Telegram & Anti-Spam Shield
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Anti-Flood Dilindungi
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" />
              Kontrol Bot dalam Grup & Pencegahan Spam
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Atur izin operasi bot di grup Telegram, cegah bot dari spamming perintah atau membalas percakapan santai anggota, batasi hak eksekusi hanya untuk admin, serta lindungi server dengan jeda waktu anti-flood.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefreshStatus}
              className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-200 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang Status</span>
            </button>
          </div>
        </div>

        {/* Status Indicators Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-blue-500/20">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Izin Grup</div>
            <div className="text-xs font-bold mt-1 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${config.allowGroups ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}
              />
              <span className={config.allowGroups ? 'text-emerald-300' : 'text-rose-400'}>
                {config.allowGroups ? 'Diizinkan (Aktif)' : 'Dinonaktifkan (OFF)'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Mode Hening Grup</div>
            <div className="text-xs font-bold mt-1 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${config.silentFallbackInGroup ? 'bg-emerald-400' : 'bg-amber-400'}`}
              />
              <span className={config.silentFallbackInGroup ? 'text-emerald-300' : 'text-amber-300'}>
                {config.silentFallbackInGroup ? 'Hening (Anti-Spam)' : 'Semua Dibalas'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Anti-Flood Protection</div>
            <div className="text-xs font-bold mt-1 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${config.enableAntiFlood ? 'bg-emerald-400' : 'bg-slate-500'}`}
              />
              <span className={config.enableAntiFlood ? 'text-emerald-300' : 'text-slate-400'}>
                {config.enableAntiFlood ? `Aktif (${config.antiFloodCooldownSeconds}s Jeda)` : 'Nonaktif'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Grup Terdeteksi</div>
            <div className="text-xs font-bold mt-1 text-white">
              {config.knownGroups?.length || 0} Grup
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Studio ke Grup & Supergrup */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-md">
              <Radio className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Studio Broadcast ke Grup & Supergrup</h3>
              <p className="text-xs text-slate-400">
                Kirim pesan pengumuman, promosi, atau rilis update ke seluruh grup atau seluruh bot cluster sekaligus.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Audience */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Target Penerima Broadcast:
            </label>
            <select
              value={broadcastTarget}
              onChange={(e) => setBroadcastTarget(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="groups">👥 Semua Grup & Supergrup ({config.knownGroups?.length || 0} Grup Terdaftar)</option>
              <option value="all">🌐 Seluruh Target (Semua Grup + Seluruh Pengguna DM)</option>
              <option value="custom">🎯 Target Khusus (Ketik Daftar Chat ID)</option>
            </select>
          </div>

          {/* Sending Bot Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Kirim Menggunakan Bot:
            </label>
            <select
              value={broadcastBotId}
              onChange={(e) => setBroadcastBotId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all_cluster">⚡ Seluruh Bot Aktif Sekaligus (Cluster Broadcast)</option>
              <option value="primary">👑 Bot Utama Saja</option>
              {multiBots.map((b, i) => (
                <option key={b.id} value={b.id}>
                  🌐 {b.botInfo?.username ? `@${b.botInfo.username}` : `Cluster Bot #${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {broadcastTarget === 'custom' && (
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Daftar Chat ID Target (Pisahkan dengan koma atau baris baru):
            </label>
            <textarea
              rows={2}
              value={customTargetIds}
              onChange={(e) => setCustomTargetIds(e.target.value)}
              placeholder="-1001234567890, -1009876543210, 12345678"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Message Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-300">
              Isi Pesan Broadcast (Format Markdown Telegram Didukung):
            </label>
            <div className="flex items-center gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => setBroadcastText((prev) => prev + '*Teks Tebal* ')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
              >
                *Tebal*
              </button>
              <button
                type="button"
                onClick={() => setBroadcastText((prev) => prev + '_Teks Miring_ ')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
              >
                _Miring_
              </button>
              <button
                type="button"
                onClick={() => setBroadcastText((prev) => prev + '`Kode Monospace` ')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
              >
                `Kode`
              </button>
            </div>
          </div>
          <textarea
            rows={4}
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            placeholder="📢 *PENGUMUMAN PENTING BOT*\n━━━━━━━━━━━━━━━━━━━━━\nHalo semuanya! Kami baru saja memperbarui database..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500 placeholder-slate-600"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
            <input
              type="checkbox"
              checked={pinMessageInGroup}
              onChange={(e) => setPinMessageInGroup(e.target.checked)}
              className="rounded border-slate-700 text-blue-500 focus:ring-0"
            />
            <span>Sematkan / Pin Pesan ini di Grup (Jika Bot memiliki hak admin)</span>
          </label>

          <button
            type="button"
            onClick={handleExecuteBroadcast}
            disabled={isBroadcasting || !broadcastText.trim()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
          >
            {isBroadcasting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sedang Menyiarkan Broadcast...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Siarkan Broadcast Sekarang</span>
              </>
            )}
          </button>
        </div>

        {broadcastResult && (
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-200">
                Laporan Terakhir: <strong>{broadcastResult.success}</strong> berhasil dari <strong>{broadcastResult.total}</strong> target.
              </span>
            </div>
            {broadcastResult.failed > 0 && (
              <span className="text-rose-400 font-semibold">{broadcastResult.failed} gagal</span>
            )}
          </div>
        )}
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Pengaturan Izin Grup & Mode Hening (Anti-Spam) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>Izin Beroperasi & Kebijakan Balasan Grup</span>
            </h3>
            {isSaving && <span className="text-[11px] text-blue-400 animate-pulse">Menyimpan...</span>}
          </div>

          {/* Toggle 1: Izinkan Bot di Grup */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">Izinkan Bot Merespon dalam Grup</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Bila dinonaktifkan, bot tidak akan membalas pesan apapun di grup Telegram manapun, menjaga privasi bot hanya untuk obrolan pribadi (direct message).
              </p>
            </div>
            <button
              onClick={() => handleToggleSetting('allowGroups')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                config.allowGroups ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.allowGroups ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Mode Hening di Grup (PENCEGAH SPAM UTAMA) */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <VolumeX className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">Mode Hening Obrolan Biasa di Grup (Anti-Spam)</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300">
                  Sangat Disarankan
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>Mengatasi keluhan bot nyepam:</strong> Ketika fitur ini aktif, bot <strong>TIDAK AKAN</strong> membalas obrolan santai anggota grup (seperti "halo", "ok", "pagi", "test"). Bot hanya akan merespon perintah resmi (<code className="text-amber-300 font-mono">/menu</code>, <code className="text-amber-300 font-mono">/id</code>, <code className="text-amber-300 font-mono">search:</code>, <code className="text-amber-300 font-mono">/ping</code>) atau jika pengguna me-mention <code className="text-cyan-300 font-mono">@username_bot</code>.
              </p>
            </div>
            <button
              onClick={() => handleToggleSetting('silentFallbackInGroup')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                config.silentFallbackInGroup ? 'bg-emerald-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.silentFallbackInGroup ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: Admin Grup Saja */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">Hanya Admin Grup yang Boleh Menjalankan Perintah</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Jika diaktifkan, bot secara otomatis memeriksa hak istimewa pengirim pesan melalui Telegram API. Anggota biasa yang bukan Admin/Pemilik grup akan ditolak dan diperingatkan.
              </p>
            </div>
            <button
              onClick={() => handleToggleSetting('groupAdminOnly')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                config.groupAdminOnly ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.groupAdminOnly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Card 2: Perlindungan Anti-Flood & Rate Limiter */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Perlindungan Anti-Flood & Rate Limiting</span>
            </h3>
            <span className="text-[10px] text-slate-400">Proteksi Keamanan Bot</span>
          </div>

          {/* Toggle Anti-Flood */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Aktifkan Anti-Flood Cooldown</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Mencegah anggota mengirim perintah bertubi-tubi dalam hitungan detik yang menyebabkan bot overload atau dibatasi oleh Telegram rate-limit.
              </p>
            </div>
            <button
              onClick={() => handleToggleSetting('enableAntiFlood')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                config.enableAntiFlood ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enableAntiFlood ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Slider Durasi Cooldown */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">Durasi Jeda Cooldown Antar Perintah</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                {config.antiFloodCooldownSeconds || 3} Detik
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={config.antiFloodCooldownSeconds || 3}
              onChange={(e) => handleCooldownChange(parseInt(e.target.value, 10))}
              onMouseUp={handleCooldownBlur}
              onTouchEnd={handleCooldownBlur}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>1 Detik (Cepat)</span>
              <span>3 Detik (Optimal)</span>
              <span>15 Detik (Ketat)</span>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Jika pengguna mengirim perintah baru sebelum jeda selesai, bot akan menolak eksekusi dan memberikan peringatan sekali setiap 8 detik agar tidak ikut nyepam.
            </p>
          </div>

          {/* Panduan BotFather */}
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-slate-300 space-y-1.5">
            <div className="font-bold text-blue-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Petunjuk Izin Grup dari @BotFather:</span>
            </div>
            <p className="text-[11px] text-slate-400">
              1. Buka <strong>@BotFather</strong> di Telegram lalu ketik <code className="text-blue-300 font-mono">/setjoingroups</code> &rarr; Pilih bot Anda &rarr; Pilih <strong>Enable</strong>.<br />
              2. Ketik <code className="text-blue-300 font-mono">/setprivacy</code> &rarr; Jika di-<strong>Disable</strong>, bot dapat membaca pesan grup; jika di-<strong>Enable</strong>, bot hanya membaca pesan yang dimulai dengan tanda slash (/).
            </p>
          </div>
        </div>
      </div>

      {/* Card 3: Filter Whitelist & Blacklist ID Grup */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-amber-400" />
              <span>Filter Akses ID Grup Telegram (Whitelist & Blacklist)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Daftarkan ID grup khusus yang diizinkan (Whitelist) atau ID grup yang dilarang/diblokir (Blacklist).
            </p>
          </div>

          {/* Add ID Form */}
          <div className="flex items-center gap-2">
            <select
              value={newGroupTargetType}
              onChange={(e) => setNewGroupTargetType(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
            >
              <option value="blacklist">🚫 Blokir (Blacklist)</option>
              <option value="whitelist">⭐ Khusus (Whitelist)</option>
            </select>
            <input
              type="text"
              placeholder="Contoh: -1001234567890"
              value={newGroupIdInput}
              onChange={(e) => setNewGroupIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddGroupId()}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono w-44"
            />
            <button
              onClick={handleAddGroupId}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Blacklist Box */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-rose-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5" />
                <span>Grup Diblokir ({config.blockedGroupIds?.length || 0})</span>
              </span>
              <span className="text-[10px] text-slate-500">Bot akan mengabaikan grup ini</span>
            </div>

            {config.blockedGroupIds && config.blockedGroupIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {config.blockedGroupIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-500/30 text-xs font-mono"
                  >
                    <span>{id}</span>
                    <button
                      onClick={() => handleUnblockGroup(id)}
                      className="hover:text-white transition-colors"
                      title="Buka Blokir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2">
                Tidak ada grup yang diblokir.
              </div>
            )}
          </div>

          {/* Whitelist Box */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Whitelist Grup ({config.allowedGroupIds?.length || 0})</span>
              </span>
              <span className="text-[10px] text-slate-500">
                {config.allowedGroupIds?.length ? 'Hanya grup ini yang dilayani' : 'Semua grup diizinkan'}
              </span>
            </div>

            {config.allowedGroupIds && config.allowedGroupIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {config.allowedGroupIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-xs font-mono"
                  >
                    <span>{id}</span>
                    <button
                      onClick={() => handleRemoveWhitelist(id)}
                      className="hover:text-white transition-colors"
                      title="Hapus dari Whitelist"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2">
                Whitelist kosong (Semua grup diizinkan selama izin grup aktif).
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 4: Daftar Grup Telegram yang Terdeteksi */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Daftar Grup Telegram yang Terhubung ({config.knownGroups?.length || 0})</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Riwayat grup di mana bot pernah diundang atau menerima pesan.
            </p>
          </div>
        </div>

        {config.knownGroups && config.knownGroups.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase font-semibold">
                  <th className="py-2.5 px-3">Nama Grup</th>
                  <th className="py-2.5 px-3">Chat ID</th>
                  <th className="py-2.5 px-3">Tipe</th>
                  <th className="py-2.5 px-3">Perintah Dieksekusi</th>
                  <th className="py-2.5 px-3">Terakhir Aktif</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {config.knownGroups.map((g) => {
                  const isBlocked = config.blockedGroupIds?.includes(g.id);
                  const isWhitelisted = config.allowedGroupIds?.includes(g.id);

                  return (
                    <tr key={g.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{g.title || 'Grup Telegram'}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-300 text-[11px]">
                        {g.id}
                      </td>
                      <td className="py-3 px-3 text-slate-400 uppercase text-[10px]">
                        {g.type}
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-mono">
                        {g.totalCommands || 0}x
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {g.lastSeen ? new Date(g.lastSeen).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="py-3 px-3">
                        {isBlocked ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Diblokir
                          </span>
                        ) : isWhitelisted ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Whitelist
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleBlockKnownGroup(g)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                              isBlocked
                                ? 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50'
                                : 'bg-rose-600/30 text-rose-300 hover:bg-rose-600/50'
                            }`}
                          >
                            {isBlocked ? 'Buka Blokir' : 'Blokir'}
                          </button>
                          <button
                            onClick={() => handleDeleteKnownGroup(g.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Hapus dari riwayat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60 space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs">Belum ada grup Telegram yang terdeteksi.</p>
            <p className="text-[11px] text-slate-400">
              Undang bot ke dalam grup Telegram Anda, lalu ketik <code className="text-cyan-300 font-mono">/id</code> atau <code className="text-amber-300 font-mono">/menu</code> di dalam grup.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
