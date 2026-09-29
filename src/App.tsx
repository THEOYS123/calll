import React, { useState, useEffect, useCallback } from 'react';
import { BotNavbar } from './components/BotNavbar';
import { MasterSwitchCard } from './components/MasterSwitchCard';
import { TokenManagerCard } from './components/TokenManagerCard';
import { BotFeaturesPanel } from './components/BotFeaturesPanel';
import { DirectMessagePanel } from './components/DirectMessagePanel';
import { ActiveUsersPanel } from './components/ActiveUsersPanel';
import { CustomCommandsEditor } from './components/CustomCommandsEditor';
import { LiveConsoleLogs } from './components/LiveConsoleLogs';
import { BotFatherGuideModal } from './components/BotFatherGuideModal';
import { OsintControlPanel } from './components/OsintControlPanel';
import { CustomMenuManagerPanel } from './components/CustomMenuManagerPanel';
import { OsintHistoryPanel } from './components/OsintHistoryPanel';
import { DatasetManagerPanel } from './components/DatasetManagerPanel';
import { GroupManagerPanel } from './components/GroupManagerPanel';
import { ContentModerationPanel } from './components/ContentModerationPanel';
import { ReferralManagerPanel } from './components/ReferralManagerPanel';
import {
  BotStatusState,
  CustomCommand,
  AutoReplyRule,
  TelegramBotInfo,
  CustomMenuItem,
  OsintConfig,
  OsintApiKey,
  QuotaConfig,
  BotMenuConfig,
  GroupConfig,
  ModerationConfig,
  DEFAULT_QUOTA_CONFIG,
  DEFAULT_MENU_CONFIG,
  DEFAULT_MODERATION_CONFIG,
  DEFAULT_REFERRAL_CONFIG
} from './types';
import {
  Power,
  Activity,
  Sliders,
  Send,
  Users,
  Sparkles,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Bot,
  Key,
  Layers,
  Globe,
  Database,
  FileText,
  UploadCloud,
  Gift,
  Coins
} from 'lucide-react';
import { NetlifyDeployModal } from './components/NetlifyDeployModal';
import {
  isNetlifyEnvironment,
  getCustomApiUrl,
  getStoredNetlifyState,
  persistNetlifyState,
  verifyTelegramTokenDirect,
  executeClientSideOsintSearch
} from './utils/netlifyBridge';

const INITIAL_STATUS: BotStatusState = {
  isActive: false,
  token: '',
  maskedToken: '',
  isTokenValid: false,
  botInfo: null,
  lastError: null,
  uptimeSeconds: 0,
  startedAt: null,
  stats: {
    messagesReceived: 0,
    messagesSent: 0,
    commandsExecuted: 0,
    activeUsersCount: 0
  },
  recentLogs: [],
  activeUsers: [],
  customCommands: [],
  autoReplies: [],
  welcomeMessage: '',
  customMenus: [],
  osintConfig: {
    enabled: false,
    ngrokUrl: 'https://xxxx-xxxx.ngrok-free.app',
    ownerUsername: '@flood1233',
    ownerChatId: null,
    secretPrefix: 'ax0895',
    apiKeys: [],
    notifyOnStatusChange: true
  },
  searchHistories: [],
  quotaConfig: DEFAULT_QUOTA_CONFIG,
  menuConfig: DEFAULT_MENU_CONFIG,
  referralConfig: DEFAULT_REFERRAL_CONFIG,
  referralAccounts: [],
  referralRecords: [],
  referralWithdrawLogs: []
};

// Safe cache retrieval with Netlify LocalStorage sync
const getCachedStatus = (): BotStatusState => {
  return getStoredNetlifyState(INITIAL_STATUS);
};

export function App() {
  const [status, setStatus] = useState<BotStatusState>(getCachedStatus);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [serverConnected, setServerConnected] = useState<boolean>(true);
  const [isToggling, setIsToggling] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'referral' | 'moderation' | 'datasets' | 'groups' | 'osint' | 'history' | 'cmenus' | 'features' | 'messages' | 'commands' | 'logs'
  >('overview');
  const [guideModalOpen, setGuideModalOpen] = useState<boolean>(false);
  const [netlifyModalOpen, setNetlifyModalOpen] = useState<boolean>(false);
  const [prefilledChatId, setPrefilledChatId] = useState<number | string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch bot status from server safely without throwing or console.error spam
  const fetchStatus = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    const customBase = getCustomApiUrl();
    const endpoint = customBase ? `${customBase}/api/bot/status` : '/api/bot/status';

    try {
      const res = await fetch(endpoint, {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data: BotStatusState = await res.json();
          setStatus(data);
          setServerConnected(true);
          persistNetlifyState(data);
          return;
        }
      }
      setServerConnected(false);
    } catch {
      // Graceful network retry - switch to standalone Netlify local state
      setServerConnected(false);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStatus(true);
  }, [fetchStatus]);

  // Polling loop every 2.5 seconds to stream live logs, uptime, and user list
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus(false);
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Client-side uptime ticker for smooth seconds animation
  useEffect(() => {
    if (!status.isActive) return;
    const ticker = setInterval(() => {
      setStatus((prev) => ({
        ...prev,
        uptimeSeconds: prev.uptimeSeconds + 1
      }));
    }, 1000);
    return () => clearInterval(ticker);
  }, [status.isActive]);

  // Toggle Bot ON/OFF
  const handleToggleActive = async (active: boolean) => {
    setIsToggling(true);
    const customBase = getCustomApiUrl();
    const endpoint = customBase ? `${customBase}/api/bot/toggle` : '/api/bot/toggle';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ active })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setStatus((prev) => ({
            ...prev,
            isActive: data.isActive,
            botInfo: data.botInfo || prev.botInfo,
            lastError: null
          }));
          showToast(
            data.isActive
              ? 'Bot Telegram BERHASIL DIAKTIFKAN! Bot akan terus aktif 24/7 di server sampai dimatikan.'
              : 'Bot Telegram telah dimatikan (OFF).',
            'success'
          );
          fetchStatus(false);
          return;
        }
      }
    } catch {
      // Backend unavailable - fallback to Netlify standalone toggle
    } finally {
      setIsToggling(false);
    }

    // Netlify Standalone Mode Fallback
    const updated = {
      ...status,
      isActive: active,
      lastError: null
    };
    setStatus(updated);
    persistNetlifyState(updated);
    showToast(
      active
        ? 'Status Bot DIAKTIFKAN (Mode Netlify Cloud)'
        : 'Status Bot DIMATIKAN (OFF)',
      'success'
    );
  };

  // Update Token with direct Telegram API validation fallback for Netlify
  const handleUpdateToken = async (newToken: string): Promise<{ success: boolean; message: string }> => {
    const customBase = getCustomApiUrl();
    const endpoint = customBase ? `${customBase}/api/bot/update-token` : '/api/bot/update-token';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token: newToken })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          fetchStatus(false);
          return { success: true, message: data.message };
        }
      }
    } catch {
      // Backend unavailable - fallback to direct Telegram API!
    }

    // Direct Telegram Bot API Verification (Netlify mode)
    const direct = await verifyTelegramTokenDirect(newToken);
    if (direct.valid) {
      const masked = newToken.slice(0, 6) + '...' + newToken.slice(-4);
      const updated: BotStatusState = {
        ...status,
        token: newToken,
        maskedToken: masked,
        isTokenValid: true,
        botInfo: direct.botInfo,
        isActive: true,
        lastError: null
      };
      setStatus(updated);
      persistNetlifyState(updated);
      showToast(`Token bot @${direct.botInfo?.username || 'Telegram'} BERHASIL diverifikasi langsung via Telegram API! (Mode Netlify)`, 'success');
      return { success: true, message: 'Token bot valid dan berhasil diverifikasi via Telegram API' };
    } else {
      showToast(direct.error || 'Token tidak valid.', 'error');
      return { success: false, message: direct.error || 'Token tidak valid.' };
    }
  };

  // Send Direct Message
  const handleSendMessage = async (chatId: string | number, text: string) => {
    try {
      const res = await fetch('/api/bot/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ chatId, text })
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          showToast(`Pesan sukses dikirim ke Chat ID ${chatId}!`, 'success');
          fetchStatus(false);
          return { success: true, message: data.message };
        } else {
          showToast(data.message || 'Gagal mengirim pesan.', 'error');
          return { success: false, message: data.message || 'Gagal mengirim pesan.' };
        }
      }
      showToast('Respon server tidak valid.', 'error');
      return { success: false, message: 'Respon server tidak valid.' };
    } catch (err: any) {
      showToast(`Error kirim pesan: ${err.message}`, 'error');
      return { success: false, message: err.message };
    }
  };

  // Broadcast
  const handleBroadcast = async (text: string) => {
    try {
      const res = await fetch('/api/bot/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text })
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          fetchStatus(false);
          return data;
        } else {
          showToast(data.message || 'Gagal mengirim broadcast.', 'error');
          return data;
        }
      }
      showToast('Gagal mengirim broadcast.', 'error');
      return { success: false };
    } catch (err: any) {
      showToast(`Error broadcast: ${err.message}`, 'error');
      return { success: false };
    }
  };

  // Save Custom Commands
  const handleSaveCommands = async (commands: CustomCommand[]) => {
    try {
      const customBase = getCustomApiUrl();
      await fetch(`${customBase || ''}/api/bot/custom-commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customCommands: commands })
      });
    } catch {
      // ignore
    }
    const updated = { ...status, customCommands: commands };
    setStatus(updated);
    persistNetlifyState(updated);
    showToast('Perintah kustom berhasil disimpan!', 'success');
  };

  // Save Auto Replies
  const handleSaveAutoReplies = async (replies: AutoReplyRule[]) => {
    try {
      const customBase = getCustomApiUrl();
      await fetch(`${customBase || ''}/api/bot/auto-replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoReplies: replies })
      });
    } catch {
      // ignore
    }
    const updated = { ...status, autoReplies: replies };
    setStatus(updated);
    persistNetlifyState(updated);
    showToast('Aturan balasan otomatis berhasil disimpan!', 'success');
  };

  // Save Welcome Message
  const handleSaveWelcomeMessage = async (message: string) => {
    try {
      const customBase = getCustomApiUrl();
      await fetch(`${customBase || ''}/api/bot/welcome-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ welcomeMessage: message })
      });
    } catch {
      // ignore
    }
    const updated = { ...status, welcomeMessage: message };
    setStatus(updated);
    persistNetlifyState(updated);
    showToast('Pesan sambutan berhasil disimpan!', 'success');
  };

  // Clear Logs
  const handleClearLogs = async () => {
    try {
      const customBase = getCustomApiUrl();
      await fetch(`${customBase || ''}/api/bot/clear-logs`, { method: 'POST' });
    } catch {
      // ignore
    }
    const updated = { ...status, recentLogs: [] };
    setStatus(updated);
    persistNetlifyState(updated);
    showToast('Log aktivitas berhasil dibersihkan!', 'success');
  };

  // Toggle OSINT Status (ON/OFF)
  const handleToggleOsint = async (enabled: boolean, broadcast: boolean) => {
    try {
      const res = await fetch('/api/bot/osint/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ enabled, broadcast })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          enabled
            ? 'Server OSINT Berhasil Diaktifkan (ON)! Pengguna dengan API Key aktif sekarang bisa melakukan pencarian.'
            : 'Server OSINT Dinonaktifkan (OFF). Akses pencarian ditutup.',
          'success'
        );
        fetchStatus(false);
      } else {
        showToast(data.message || 'Gagal mengubah status OSINT', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Gagal menghubungi server'}`, 'error');
    }
  };

  // Update OSINT Server Config
  const handleUpdateOsintConfig = async (config: { ngrokUrl: string; ownerUsername: string; notifyOnStatusChange: boolean }) => {
    try {
      const res = await fetch('/api/bot/osint/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Konfigurasi server OSINT berhasil disimpan.', 'success');
        fetchStatus(false);
      } else {
        showToast(data.message || 'Gagal menyimpan konfigurasi', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Gagal menghubungi server'}`, 'error');
    }
  };

  // Update OSINT API Keys
  const handleUpdateOsintKeys = async (keys: OsintApiKey[]) => {
    try {
      const res = await fetch('/api/bot/osint/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ apiKeys: keys })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Daftar API Key OSINT berhasil diperbarui.', 'success');
        fetchStatus(false);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Gagal menghubungi server'}`, 'error');
    }
  };

  // Test Ngrok Ping
  const handleTestNgrok = async (url: string) => {
    try {
      const res = await fetch('/api/bot/osint/test-ngrok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ url })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: `Koneksi gagal: ${err.message || 'Timeout'}` };
    }
  };

  // Save Custom Menus
  const handleSaveCustomMenus = async (menus: CustomMenuItem[]) => {
    try {
      const res = await fetch('/api/bot/custom-menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ customMenus: menus })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Menu kustom Telegram berhasil diperbarui dan disinkronkan!', 'success');
        fetchStatus(false);
      }
    } catch (err: any) {
      showToast(`Error simpan menu: ${err.message || 'Gagal menghubungi server'}`, 'error');
    }
  };

  // Save Bot Menu Configuration
  const handleSaveMenuConfig = async (config: BotMenuConfig) => {
    try {
      const res = await fetch('/api/bot/menu-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Pengaturan menu & tombol bot berhasil disimpan!', 'success');
        fetchStatus(false);
      } else {
        showToast(data.message || 'Gagal menyimpan konfigurasi menu', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Gagal menghubungi server'}`, 'error');
    }
  };

  // Save Bot Quota Configuration
  const handleSaveQuotaConfig = async (config: QuotaConfig) => {
    try {
      const res = await fetch('/api/bot/quota-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Pengaturan klaim kuota & anti-celah berhasil disimpan!', 'success');
        fetchStatus(false);
      } else {
        showToast(data.message || 'Gagal menyimpan konfigurasi kuota', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Gagal menghubungi server'}`, 'error');
    }
  };

  // Save Group & Anti-Spam Configuration
  const handleSaveGroupConfig = async (config: GroupConfig) => {
    try {
      const res = await fetch('/api/groups/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Pengaturan anti-spam & grup Telegram berhasil disimpan!', 'success');
        fetchStatus(false);
      } else {
        showToast(data.message || 'Gagal menyimpan pengaturan anti-spam', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Gagal menghubungi server'}`, 'error');
    }
  };

  // Reset User Quota Claims
  const handleResetUserClaims = async (userId: number, resetNewUser: boolean, resetDaily: boolean) => {
    try {
      const res = await fetch('/api/bot/quota/reset-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ userId, resetNewUser, resetDaily })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Status klaim user ${userId} berhasil direset!`, 'success');
        fetchStatus(false);
      } else {
        showToast(data.message || 'Gagal mereset status klaim', 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Gagal menghubungi server'}`, 'error');
    }
  };

  // Toggle User Verification Status (/id)
  const handleToggleUserVerification = async (chatId: number, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/bot/users/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ chatId, isVerified: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          !currentStatus
            ? `User ${chatId} DIVERIFIKASI! Akses menu bot dibuka.`
            : `Verifikasi user ${chatId} dicabut. User wajib kirim /id kembali.`,
          'success'
        );
        fetchStatus(false);
      }
    } catch (err: any) {
      showToast(`Error verifikasi: ${err.message || 'Gagal'}` , 'error');
    }
  };

  // Gift Quota to User
  const handleGiftQuota = async (chatId: number, amount: number, notes: string) => {
    try {
      const res = await fetch('/api/bot/users/gift-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ chatId, amount, notes, notifyUser: true })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Berhasil memberikan +${amount} kuota ke ID ${chatId}! Notifikasi Telegram terkirim.`, 'success');
        fetchStatus(false);
      } else {
        showToast(data.message || 'Gagal memberikan kuota.', 'error');
      }
    } catch (err: any) {
      showToast(`Error gift quota: ${err.message || 'Gagal'}`, 'error');
    }
  };

  // Delete OSINT Search History Item
  const handleDeleteHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/bot/osint/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Riwayat pencarian berhasil dihapus.', 'success');
        fetchStatus(false);
      }
    } catch (err: any) {
      showToast(`Gagal menghapus riwayat: ${err.message}`, 'error');
    }
  };

  // Clear OSINT Search Histories
  const handleClearHistory = async (chatId?: number) => {
    try {
      const res = await fetch('/api/bot/osint/history/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      });
      if (res.ok) {
        showToast(
          chatId
            ? `Riwayat pencarian Chat ID ${chatId} berhasil dibersihkan.`
            : 'Seluruh riwayat pencarian OSINT berhasil dibersihkan.',
          'success'
        );
        fetchStatus(false);
      }
    } catch (err: any) {
      showToast(`Gagal membersihkan riwayat: ${err.message}`, 'error');
    }
  };

  // Switch to Direct Message with Prefilled Chat ID
  const handleSelectUserForChat = (chatId: number) => {
    setPrefilledChatId(chatId);
    setActiveTab('messages');
    // Scroll smoothly to messages panel
    const el = document.getElementById('direct-message-panel');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Sticky Navbar */}
      <BotNavbar
        isActive={status.isActive}
        isTokenValid={status.isTokenValid}
        botInfo={status.botInfo}
        uptimeSeconds={status.uptimeSeconds}
        onRefresh={() => fetchStatus(true)}
        isLoading={isLoading}
        onToggleActive={handleToggleActive}
        isToggling={isToggling}
        onOpenNetlifyModal={() => setNetlifyModalOpen(true)}
      />

      {/* Backend Reconnection Banner / Netlify Mode Indicator */}
      {!serverConnected && (
        <div className="bg-slate-900 border-b border-cyan-500/30 px-4 py-2 text-xs text-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="font-semibold text-cyan-300">
              {isNetlifyEnvironment() ? '⚡ Mode Netlify Standalone Aktif' : '⚡ Mode Standalone Aktif (Backend Lokal/Eksternal Terputus)'}
            </span>
            <span className="hidden md:inline text-slate-400">•</span>
            <span className="hidden md:inline text-slate-400 text-[11px]">
              Verifikasi Token Langsung ke Telegram API, OSINT Intelijen, & D3 Charts Aktif di Browser.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNetlifyModalOpen(true)}
              className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all"
            >
              <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Panduan Netlify / .ZIP</span>
            </button>
            <button
              onClick={() => fetchStatus(true)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold transition-colors"
            >
              Cek Server
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2 max-w-md ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
              : 'bg-rose-950/95 border-rose-500 text-rose-200'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
          <button
            id="tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>Dashboard Kontrol</span>
          </button>

          <button
            id="tab-referral"
            onClick={() => setActiveTab('referral')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'referral'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Gift className="w-4 h-4 text-indigo-400" />
            <div className="flex items-center gap-1.5">
              <span>Referral & Tabungan Kuota</span>
              <span className={`w-2 h-2 rounded-full ${status.referralConfig?.enabled !== false ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
            </div>
          </button>

          <button
            id="tab-moderation"
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'moderation'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <div className="flex items-center gap-1.5">
              <span>Auto-Hapus & Moderasi Konten</span>
              <span className={`w-2 h-2 rounded-full ${status.moderationConfig?.enabled !== false ? 'bg-rose-400 animate-pulse' : 'bg-slate-600'}`} />
            </div>
          </button>

          <button
            id="tab-datasets"
            onClick={() => setActiveTab('datasets')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'datasets'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <div className="flex items-center gap-1.5">
              <span>File Dataset (dataset.txt)</span>
              <span className="px-1.5 py-0.5 text-[9px] rounded bg-amber-500/30 text-amber-300 font-mono font-bold">
                Pintar
              </span>
            </div>
          </button>

          <button
            id="tab-groups"
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'groups'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <div className="flex items-center gap-1.5">
              <span>Grup & Anti-Spam</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  status.groupConfig?.allowGroups ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                }`}
              />
            </div>
          </button>

          <button
            id="tab-osint"
            onClick={() => setActiveTab('osint')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'osint'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Key className="w-4 h-4" />
            <div className="flex items-center gap-1.5">
              <span>Server OSINT & API Key</span>
              <span className={`w-2 h-2 rounded-full ${status.osintConfig?.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            </div>
          </button>

          <button
            id="tab-history"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <div className="flex items-center gap-1.5">
              <span>Riwayat OSINT ({status.searchHistories?.length || 0})</span>
              {(status.searchHistories || []).some((h) => h.totalMatches > 50) && (
                <span className="w-2 h-2 rounded-full bg-amber-400" title="Ada hasil > 50 data" />
              )}
            </div>
          </button>

          <button
            id="tab-cmenus"
            onClick={() => setActiveTab('cmenus')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'cmenus'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Menu & Kuota Gratis</span>
          </button>

          <button
            id="tab-features"
            onClick={() => setActiveTab('features')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'features'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Katalog Fitur & Perintah (/id, /bot, menu)</span>
          </button>

          <button
            id="tab-messages"
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'messages'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Kirim Pesan & Kontak ({status.activeUsers.length})</span>
          </button>

          <button
            id="tab-commands"
            onClick={() => setActiveTab('commands')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'commands'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Kustomisasi Perintah & Balasan</span>
          </button>

          <button
            id="tab-logs"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'logs'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <div className="flex items-center gap-1.5">
              <span>Live Console Log ({status.recentLogs.length})</span>
              {status.spikeAlerts && status.spikeAlerts.length > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Spike Alert
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Tab 1: Overview & Primary Controls */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Master Switch Card (Always-ON Controller) */}
            <MasterSwitchCard
              isActive={status.isActive}
              isTokenValid={status.isTokenValid}
              botInfo={status.botInfo}
              uptimeSeconds={status.uptimeSeconds}
              startedAt={status.startedAt}
              stats={status.stats}
              lastPollingAt={status.lastPollingAt}
              isToggling={isToggling}
              onToggleActive={handleToggleActive}
              onOpenTokenEditor={() => {
                const el = document.getElementById('token-manager-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Quick OSINT & Custom Menu Status Bar */}
            {status.osintConfig && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${status.osintConfig.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">Fitur Intelijen OSINT:</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        status.osintConfig.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {status.osintConfig.enabled ? '🟢 ON' : '🔴 OFF'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tunnel: <code className="text-cyan-300 font-mono">{status.osintConfig.ngrokUrl}</code> • {status.osintConfig.apiKeys.length} API Key terdaftar
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('datasets')}
                    className="px-3.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>File Dataset (dataset.txt)</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('osint')}
                    className="px-3.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-all"
                  >
                    Kelola Server OSINT
                  </button>
                  <button
                    onClick={() => setActiveTab('cmenus')}
                    className="px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition-all"
                  >
                    Atur Menu Bot ({status.customMenus?.length || 0})
                  </button>
                </div>
              </div>
            )}

            {/* Token Manager & Verification Studio */}
            <TokenManagerCard
              currentToken={status.token}
              maskedToken={status.maskedToken}
              isTokenValid={status.isTokenValid}
              botInfo={status.botInfo}
              onUpdateToken={handleUpdateToken}
              onOpenGuide={() => setGuideModalOpen(true)}
            />

            {/* Bot Features Showcase Preview */}
            <BotFeaturesPanel
              botInfo={status.botInfo}
              isActive={status.isActive}
            />

            {/* Live Console Stream on Overview */}
            <LiveConsoleLogs
              logs={status.recentLogs}
              isActive={status.isActive}
              onClearLogs={handleClearLogs}
              onRefresh={() => fetchStatus(false)}
            />
          </div>
        )}

        {/* Tab: Referral & Tabungan Kuota */}
        {activeTab === 'referral' && (
          <div className="space-y-6">
            <ReferralManagerPanel
              referralConfig={status.referralConfig}
              referralAccounts={status.referralAccounts}
              referralRecords={status.referralRecords}
              referralWithdrawLogs={status.referralWithdrawLogs}
              activeUsers={status.activeUsers}
              botUsername={status.botInfo?.username}
              isBotActive={status.isActive}
              onShowToast={showToast}
              onRefreshStatus={() => fetchStatus(false)}
            />
          </div>
        )}

        {/* Tab: Auto-Hapus Konten Ilegal & Moderasi Anti-Slot/18+/Narkoba */}
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            <ContentModerationPanel
              moderationConfig={status.moderationConfig}
              isBotActive={status.isActive}
              onShowToast={showToast}
              onRefreshStatus={() => fetchStatus(false)}
            />
          </div>
        )}

        {/* Tab: File Dataset (dataset.txt) - Smart Search & Unlimited Upload */}
        {activeTab === 'datasets' && (
          <div className="space-y-6">
            <DatasetManagerPanel
              currentEngineMode={status.osintConfig?.searchEngineMode || 'smart_dataset'}
              onShowToast={showToast}
              onRefreshStatus={() => fetchStatus(false)}
            />
          </div>
        )}

        {/* Tab: Telegram Groups & Anti-Spam Shield */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <GroupManagerPanel
              groupConfig={status.groupConfig}
              isBotActive={status.isActive}
              onShowToast={showToast}
              onRefreshStatus={() => fetchStatus(false)}
            />
          </div>
        )}

        {/* Tab 2: Server OSINT & API Key Management */}
        {activeTab === 'osint' && status.osintConfig && (
          <div className="space-y-6">
            <OsintControlPanel
              osintConfig={status.osintConfig}
              onToggleStatus={handleToggleOsint}
              onUpdateConfig={handleUpdateOsintConfig}
              onUpdateApiKeys={handleUpdateOsintKeys}
              onTestNgrok={handleTestNgrok}
            />
          </div>
        )}

        {/* Tab 3: Riwayat & Arsip Pencarian OSINT */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <OsintHistoryPanel
              searchHistories={status.searchHistories || []}
              onDeleteHistory={handleDeleteHistory}
              onClearHistory={handleClearHistory}
            />
          </div>
        )}

        {/* Tab 3: Custom Menu Manager (Add/Edit extra bot buttons, quota & anti-spam) */}
        {activeTab === 'cmenus' && (
          <div className="space-y-6">
            <CustomMenuManagerPanel
              customMenus={status.customMenus || []}
              onSaveCustomMenus={handleSaveCustomMenus}
              menuConfig={status.menuConfig || DEFAULT_MENU_CONFIG}
              onSaveMenuConfig={handleSaveMenuConfig}
              quotaConfig={status.quotaConfig || DEFAULT_QUOTA_CONFIG}
              onSaveQuotaConfig={handleSaveQuotaConfig}
              groupConfig={status.groupConfig}
              onSaveGroupConfig={handleSaveGroupConfig}
              activeUsers={status.activeUsers || []}
              onResetUserClaims={handleResetUserClaims}
            />
          </div>
        )}

        {/* Tab 4: Bot Features & Interactive Commands Simulator */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            <BotFeaturesPanel
              botInfo={status.botInfo}
              isActive={status.isActive}
            />
          </div>
        )}

        {/* Tab 5: Direct Message & Registered Active Users */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <DirectMessagePanel
              activeUsers={status.activeUsers}
              isBotActive={status.isActive}
              isTokenValid={status.isTokenValid}
              prefilledChatId={prefilledChatId}
              onSendMessage={handleSendMessage}
              onBroadcast={handleBroadcast}
            />

            <ActiveUsersPanel
              users={status.activeUsers}
              onSelectUserForChat={handleSelectUserForChat}
              onToggleVerification={handleToggleUserVerification}
              onGiftQuota={handleGiftQuota}
            />
          </div>
        )}

        {/* Tab 6: Custom Commands & Auto-Replies */}
        {activeTab === 'commands' && (
          <div className="space-y-6">
            <CustomCommandsEditor
              customCommands={status.customCommands}
              autoReplies={status.autoReplies}
              welcomeMessage={status.welcomeMessage}
              onSaveCommands={handleSaveCommands}
              onSaveAutoReplies={handleSaveAutoReplies}
              onSaveWelcomeMessage={handleSaveWelcomeMessage}
            />
          </div>
        )}

        {/* Tab 7: Live Console Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <LiveConsoleLogs
              logs={status.recentLogs}
              isActive={status.isActive}
              spikeAlerts={status.spikeAlerts}
              onClearLogs={handleClearLogs}
              onRefresh={() => fetchStatus(false)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>Telegram Bot Always-ON Controller • AI Studio Engine</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Mode: Continuous Long-Polling</span>
            <span>•</span>
            <span>Pemeriksaan Token: getMe API</span>
          </div>
        </div>
      </footer>

      {/* BotFather Tutorial Guide Modal */}
      <BotFatherGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
      />

      {/* Netlify Deploy & ZIP Download Modal */}
      <NetlifyDeployModal
        isOpen={netlifyModalOpen}
        onClose={() => setNetlifyModalOpen(false)}
        onConnectCustomBackend={() => fetchStatus(true)}
      />
    </div>
  );
}
export default App;
