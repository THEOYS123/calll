import React, { useState, useMemo } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Power,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Activity,
  Server,
  Layers,
  Sparkles,
  Key,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Coins,
  Crown,
  Tag,
  Check,
  Calendar,
  MessageSquare,
  Edit,
  Eye,
  EyeOff,
  Copy,
  Info,
  X,
  Search,
  Filter,
  CheckCheck,
  CalendarDays,
  Timer
} from 'lucide-react';
import { MultiBotInstance, BotRentalPlan, DEFAULT_RENTAL_PLANS, TelegramBotInfo, CloneOwnerRequest } from '../types';
import { verifyTelegramTokenDirect } from '../utils/netlifyBridge';

interface MultiBotManagerPanelProps {
  primaryBotToken: string;
  primaryBotInfo: TelegramBotInfo | null;
  isPrimaryActive: boolean;
  multiBots: MultiBotInstance[];
  rentalPlans?: BotRentalPlan[];
  onAddBot: (
    token: string,
    primaryOwner: string,
    notes?: string,
    rentedBy?: string,
    rentExpiryDate?: string,
    secondaryOwners?: string[],
    secretCode?: string
  ) => Promise<{ success: boolean; message: string }>;
  onToggleBot: (botId: string, active: boolean) => Promise<{ success: boolean; message: string }>;
  onDeleteBot: (botId: string) => Promise<{ success: boolean; message: string }>;
  onUpdateBot?: (payload: {
    botId: string;
    token?: string;
    notes?: string;
    rentedBy?: string;
    rentExpiryDate?: string;
    isActive?: boolean;
    primaryOwner?: string;
    secondaryOwners?: string[];
    secretCode?: string;
    newCloneOwner?: string;
    approveCloneRequestId?: string;
    rejectCloneRequestId?: string;
    deleteCloneOwner?: string;
  }) => Promise<{ success: boolean; message: string }>;
  onTestPing: (botId: string) => Promise<{ success: boolean; latencyMs?: number; message: string }>;
  onRefreshList: () => void;
}

// Helper to format remaining rental time and check expiry
function calculateRentalStatus(expiryStr?: string): {
  isExpired: boolean;
  remainingText: string;
  formattedDate: string;
  isPermanent: boolean;
} {
  if (!expiryStr || !expiryStr.trim()) {
    return {
      isExpired: false,
      remainingText: 'Sewa Permanen / Tanpa Batas',
      formattedDate: 'Permanen',
      isPermanent: true
    };
  }

  try {
    const normalized = expiryStr.includes(' ') || expiryStr.includes('T') ? expiryStr : `${expiryStr} 23:59:59`;
    const expDate = new Date(normalized);
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();

    const formattedDate = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(expDate) + ' WIB';

    if (isNaN(diffMs)) {
      return { isExpired: false, remainingText: expiryStr, formattedDate: expiryStr, isPermanent: false };
    }

    if (diffMs <= 0) {
      return { isExpired: true, remainingText: 'Masa Sewa Telah Habis!', formattedDate, isPermanent: false };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let remainingText = '';
    if (days > 0) {
      remainingText = `Sisa ${days} hari ${hours} jam`;
    } else if (hours > 0) {
      remainingText = `Sisa ${hours} jam ${minutes} menit`;
    } else {
      remainingText = `Sisa ${minutes} menit`;
    }

    return { isExpired: false, remainingText, formattedDate, isPermanent: false };
  } catch {
    return { isExpired: false, remainingText: expiryStr, formattedDate: expiryStr, isPermanent: false };
  }
}

export function MultiBotManagerPanel({
  primaryBotToken,
  primaryBotInfo,
  isPrimaryActive,
  multiBots = [],
  rentalPlans = DEFAULT_RENTAL_PLANS,
  onAddBot,
  onToggleBot,
  onDeleteBot,
  onUpdateBot,
  onTestPing,
  onRefreshList
}: MultiBotManagerPanelProps) {
  // Add Bot Form State
  const [newToken, setNewToken] = useState<string>('');
  const [newPrimaryOwner, setNewPrimaryOwner] = useState<string>('');
  const [newSecondaryOwners, setNewSecondaryOwners] = useState<string>('');
  const [newSecretCode, setNewSecretCode] = useState<string>('ax0895');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newRentedBy, setNewRentedBy] = useState<string>('');
  const [newExpiryDate, setNewExpiryDate] = useState<string>(''); // YYYY-MM-DD
  const [newExpiryTime, setNewExpiryTime] = useState<string>(''); // HH:mm
  const [newCustomExpiry, setNewCustomExpiry] = useState<string>(''); // Bebas teks semaunya
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modals State
  const [selectedDetailBot, setSelectedDetailBot] = useState<MultiBotInstance | null>(null);
  const [selectedEditBot, setSelectedEditBot] = useState<MultiBotInstance | null>(null);
  const [selectedDeleteBot, setSelectedDeleteBot] = useState<MultiBotInstance | null>(null);

  // Edit Bot Form State
  const [editToken, setEditToken] = useState<string>('');
  const [editPrimaryOwner, setEditPrimaryOwner] = useState<string>('');
  const [editSecretCode, setEditSecretCode] = useState<string>('ax0895');
  const [editSecondaryOwners, setEditSecondaryOwners] = useState<string[]>([]);
  const [editPendingClones, setEditPendingClones] = useState<CloneOwnerRequest[]>([]);
  const [editNewCloneOwnerInput, setEditNewCloneOwnerInput] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editRentedBy, setEditRentedBy] = useState<string>('');
  const [editExpiryDate, setEditExpiryDate] = useState<string>(''); // YYYY-MM-DD
  const [editExpiryTime, setEditExpiryTime] = useState<string>(''); // HH:mm
  const [editCustomExpiry, setEditCustomExpiry] = useState<string>(''); // Bebas teks semaunya
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isEditSubmitting, setIsEditSubmitting] = useState<boolean>(false);

  // Action status state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [pingResults, setPingResults] = useState<Record<string, { latencyMs: number; time: string }>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'cluster' | 'rental_plans' | 'owner_guide'>('cluster');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTokenInDetail, setShowTokenInDetail] = useState<boolean>(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'paused'>('all');

  // Stats
  const totalBotsCount = (primaryBotInfo ? 1 : 0) + multiBots.length;
  const activeBotsCount = (isPrimaryActive ? 1 : 0) + multiBots.filter((b) => b.isActive).length;
  const totalMessagesCluster = multiBots.reduce(
    (acc, b) => acc + (b.stats?.messagesReceived || 0) + (b.stats?.messagesSent || 0),
    0
  );

  // Filtered Secondary Bots
  const filteredBots = useMemo(() => {
    return multiBots.filter((bot) => {
      if (statusFilter === 'online' && !bot.isActive) return false;
      if (statusFilter === 'paused' && bot.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (bot.botInfo?.first_name || '').toLowerCase();
        const username = (bot.botInfo?.username || '').toLowerCase();
        const notes = (bot.notes || '').toLowerCase();
        const rented = (bot.rentedBy || '').toLowerCase();
        const id = bot.id.toLowerCase();
        return name.includes(q) || username.includes(q) || notes.includes(q) || rented.includes(q) || id.includes(q);
      }
      return true;
    });
  }, [multiBots, statusFilter, searchQuery]);

  // Token live test state for Add Bot
  const [isTestingNewToken, setIsTestingNewToken] = useState<boolean>(false);
  const [newTokenTestResult, setNewTokenTestResult] = useState<{
    valid: boolean;
    botInfo?: any;
    errorMessage?: string;
  } | null>(null);

  const handleTestNewToken = async (targetToken?: string) => {
    const target = (targetToken || newToken).trim();
    if (!target) {
      setNewTokenTestResult({ valid: false, errorMessage: 'Masukkan token terlebih dahulu.' });
      return;
    }
    setIsTestingNewToken(true);
    setNewTokenTestResult(null);

    try {
      let data: any = null;
      try {
        const res = await fetch('/api/multibot/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-web-client': '1' },
          body: JSON.stringify({ token: target })
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await res.json();
        }
      } catch {
        // Backend not directly reachable
      }

      if (data) {
        setNewTokenTestResult({
          valid: data.valid,
          botInfo: data.botInfo,
          errorMessage: data.errorMessage
        });
      } else {
        const direct = await verifyTelegramTokenDirect(target);
        if (direct.valid) {
          setNewTokenTestResult({
            valid: true,
            botInfo: direct.botInfo
          });
        } else {
          setNewTokenTestResult({
            valid: false,
            errorMessage: direct.error || 'Token tidak valid menurut Telegram API.'
          });
        }
      }
    } catch (err: any) {
      setNewTokenTestResult({
        valid: false,
        errorMessage: `Gagal verifikasi: ${err.message}`
      });
    } finally {
      setIsTestingNewToken(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Helper for quick date presets
  const applyDatePreset = (days: number, isEdit = false) => {
    const target = new Date(Date.now() + days * 86400000);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (isEdit) {
      setEditExpiryDate(dateStr);
      if (!editExpiryTime) setEditExpiryTime('23:59');
      setEditCustomExpiry(`${dateStr} 23:59`);
    } else {
      setNewExpiryDate(dateStr);
      if (!newExpiryTime) setNewExpiryTime('23:59');
      setNewCustomExpiry(`${dateStr} 23:59`);
    }
  };

  const clearDatePreset = (isEdit = false) => {
    if (isEdit) {
      setEditExpiryDate('');
      setEditExpiryTime('');
      setEditCustomExpiry('Permanen');
    } else {
      setNewExpiryDate('');
      setNewExpiryTime('');
      setNewCustomExpiry('Permanen');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const tokenTrimmed = newToken.trim();
    if (!tokenTrimmed) {
      setErrorMsg('Token Telegram tidak boleh kosong.');
      return;
    }

    const primaryOwnerTrimmed = newPrimaryOwner.trim();
    if (!primaryOwnerTrimmed) {
      setErrorMsg('Akun Owner Utama wajib diisi (@username atau Chat ID Telegram).');
      return;
    }

    // Combine date + optional time or custom free text
    let combinedExpiry: string | undefined = undefined;
    if (newCustomExpiry.trim()) {
      combinedExpiry = newCustomExpiry.trim();
    } else if (newExpiryDate.trim()) {
      const timePart = newExpiryTime.trim() || '23:59';
      combinedExpiry = `${newExpiryDate.trim()} ${timePart}`;
    }

    const secondaryList = newSecondaryOwners
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const res = await onAddBot(
        tokenTrimmed,
        primaryOwnerTrimmed,
        newNotes.trim(),
        newRentedBy.trim(),
        combinedExpiry,
        secondaryList,
        newSecretCode.trim() || 'ax0895'
      );
      if (res.success) {
        setSuccessMsg(res.message || 'Bot berhasil ditambahkan ke cluster dengan proteksi owner!');
        setNewToken('');
        setNewPrimaryOwner('');
        setNewSecondaryOwners('');
        setNewSecretCode('ax0895');
        setNewNotes('');
        setNewRentedBy('');
        setNewExpiryDate('');
        setNewExpiryTime('');
        setNewCustomExpiry('');
        onRefreshList();
      } else {
        setErrorMsg(res.message || 'Gagal menambahkan bot.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (botId: string, currentActive: boolean) => {
    setActionLoadingId(botId);
    setErrorMsg(null);
    try {
      const res = await onToggleBot(botId, !currentActive);
      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setSuccessMsg(`Status bot ${botId} berhasil diubah.`);
        onRefreshList();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenEdit = (bot: MultiBotInstance) => {
    setSelectedEditBot(bot);
    setEditToken(bot.token || '');
    setEditPrimaryOwner(bot.primaryOwner || '');
    setEditSecretCode(bot.secretCode || 'ax0895');
    setEditSecondaryOwners(bot.secondaryOwners ? [...bot.secondaryOwners] : []);
    setEditPendingClones(bot.pendingCloneOwners ? [...bot.pendingCloneOwners] : []);
    setEditNewCloneOwnerInput('');
    setEditNotes(bot.notes || '');
    setEditRentedBy(bot.rentedBy || '');
    setEditIsActive(bot.isActive);

    // Parse existing rentExpiryDate
    if (bot.rentExpiryDate) {
      setEditCustomExpiry(bot.rentExpiryDate);
      const parts = bot.rentExpiryDate.split(/[ T]/);
      setEditExpiryDate(parts[0] || '');
      setEditExpiryTime(parts[1] ? parts[1].substring(0, 5) : '');
    } else {
      setEditCustomExpiry('');
      setEditExpiryDate('');
      setEditExpiryTime('');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditBot || !onUpdateBot) return;

    if (!editPrimaryOwner.trim()) {
      setErrorMsg('Akun Owner Utama wajib diisi (@username atau Chat ID).');
      return;
    }

    setIsEditSubmitting(true);
    setErrorMsg(null);

    let combinedExpiry: string | undefined = undefined;
    if (editCustomExpiry.trim()) {
      combinedExpiry = editCustomExpiry.trim();
    } else if (editExpiryDate.trim()) {
      const timePart = editExpiryTime.trim() || '23:59';
      combinedExpiry = `${editExpiryDate.trim()} ${timePart}`;
    }

    try {
      const res = await onUpdateBot({
        botId: selectedEditBot.id,
        token: editToken.trim() || undefined,
        primaryOwner: editPrimaryOwner.trim(),
        secretCode: editSecretCode.trim() || 'ax0895',
        secondaryOwners: editSecondaryOwners,
        notes: editNotes.trim(),
        rentedBy: editRentedBy.trim(),
        rentExpiryDate: combinedExpiry,
        isActive: editIsActive
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Data bot & konfigurasi owner berhasil diperbarui.');
        setSelectedEditBot(null);
        onRefreshList();
      } else {
        setErrorMsg(res.message || 'Gagal memperbarui data bot.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleApproveCloneRequest = async (reqId: string) => {
    if (!selectedEditBot || !onUpdateBot) return;
    setIsEditSubmitting(true);
    try {
      const res = await onUpdateBot({
        botId: selectedEditBot.id,
        approveCloneRequestId: reqId
      });
      if (res.success) {
        setSuccessMsg(res.message || 'Owner Clone berhasil disetujui!');
        const approvedReq = editPendingClones.find((p) => p.id === reqId);
        if (approvedReq && !editSecondaryOwners.includes(approvedReq.ownerIdentifier)) {
          setEditSecondaryOwners((prev) => [...prev, approvedReq.ownerIdentifier]);
        }
        setEditPendingClones((prev) => prev.filter((p) => p.id !== reqId));
        onRefreshList();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleRejectCloneRequest = async (reqId: string) => {
    if (!selectedEditBot || !onUpdateBot) return;
    setIsEditSubmitting(true);
    try {
      const res = await onUpdateBot({
        botId: selectedEditBot.id,
        rejectCloneRequestId: reqId
      });
      if (res.success) {
        setSuccessMsg(res.message || 'Permintaan Owner Clone ditolak.');
        setEditPendingClones((prev) => prev.filter((p) => p.id !== reqId));
        onRefreshList();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteCloneOwner = async (ownerStr: string) => {
    if (!selectedEditBot || !onUpdateBot) return;
    setIsEditSubmitting(true);
    try {
      const res = await onUpdateBot({
        botId: selectedEditBot.id,
        deleteCloneOwner: ownerStr
      });
      if (res.success) {
        setSuccessMsg(res.message || `Owner Clone ${ownerStr} berhasil dihapus.`);
        setEditSecondaryOwners((prev) => prev.filter((o) => o !== ownerStr));
        onRefreshList();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleAddNewCloneOwner = async () => {
    if (!selectedEditBot || !onUpdateBot || !editNewCloneOwnerInput.trim()) return;
    const target = editNewCloneOwnerInput.trim();
    setIsEditSubmitting(true);
    try {
      const res = await onUpdateBot({
        botId: selectedEditBot.id,
        newCloneOwner: target
      });
      if (res.success) {
        setSuccessMsg(
          `Notifikasi konfirmasi persetujuan telah dikirimkan ke Telegram Owner Utama (${selectedEditBot.primaryOwner}) untuk mengizinkan ${target}!`
        );
        setEditNewCloneOwnerInput('');
        onRefreshList();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeleteBot) return;
    const botId = selectedDeleteBot.id;
    const botName = selectedDeleteBot.botInfo?.first_name || botId;

    setActionLoadingId(botId);
    setErrorMsg(null);
    try {
      const res = await onDeleteBot(botId);
      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setSuccessMsg(`Bot ${botName} berhasil dihapus dari cluster.`);
        setSelectedDeleteBot(null);
        if (selectedDetailBot?.id === botId) {
          setSelectedDetailBot(null);
        }
        onRefreshList();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePing = async (botId: string) => {
    setActionLoadingId(botId);
    try {
      const res = await onTestPing(botId);
      if (res.success && res.latencyMs !== undefined) {
        setPingResults((prev) => ({
          ...prev,
          [botId]: {
            latencyMs: res.latencyMs!,
            time: new Date().toLocaleTimeString('id-ID')
          }
        }));
      } else {
        setErrorMsg(res.message || 'Gagal tes ping');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Preview combined date or custom text in form
  const addExpiryPreview = useMemo(() => {
    const raw = newCustomExpiry.trim() || (newExpiryDate ? `${newExpiryDate} ${newExpiryTime || '23:59'}` : '');
    if (!raw) return null;
    return calculateRentalStatus(raw);
  }, [newCustomExpiry, newExpiryDate, newExpiryTime]);

  const editExpiryPreview = useMemo(() => {
    const raw = editCustomExpiry.trim() || (editExpiryDate ? `${editExpiryDate} ${editExpiryTime || '23:59'}` : '');
    if (!raw) return null;
    return calculateRentalStatus(raw);
  }, [editCustomExpiry, editExpiryDate, editExpiryTime]);

  return (
    <div id="multibot-manager-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl relative space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-950/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-bold text-slate-100">
                Kelola Multi-Bot Cluster & Sewa Bot
              </h3>
              <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs rounded-full font-mono font-bold">
                {activeBotsCount} / {totalBotsCount} Bot Aktif
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Jalankan banyak bot Telegram sekaligus dengan kalender masa sewa otomatis, database 1 juta record OSINT, kuota, dan fitur 100% tersinkronisasi.
            </p>
          </div>
        </div>

        {/* Action Buttons & Subtabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('cluster')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'cluster'
                  ? 'bg-slate-800 text-slate-100 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>Daftar Bot ({totalBotsCount})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('rental_plans')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'rental_plans'
                  ? 'bg-purple-900/60 text-purple-200 border border-purple-700/60 shadow'
                  : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Paket Sewa Bot</span>
            </button>
            <button
              onClick={() => setActiveSubTab('owner_guide')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'owner_guide'
                  ? 'bg-slate-800 text-slate-100 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>Perintah Owner</span>
            </button>
          </div>

          <button
            onClick={onRefreshList}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
            title="Segarkan data bot"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-3.5 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">TOTAL BOT CLUSTER</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono mt-2">
            {totalBotsCount} Bot
          </div>
          <div className="text-[11px] text-cyan-400 mt-1">
            1 Master + {multiBots.length} Secondary
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">BOT AKTIF ONLINE</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-2">
            {activeBotsCount} Online
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Always-ON polling aktif
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">KORELASI FITUR</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300 font-mono mt-2">
            100% Sama
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Dataset & kuota terpadu
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">TRAFIK CLUSTER</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-2">
            {totalMessagesCluster} Msg
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total lalu lintas bot
          </div>
        </div>
      </div>

      {activeSubTab === 'cluster' && (
        <div className="space-y-6">
          {/* Add New Bot Form */}
          <div className="bg-slate-950/90 border border-cyan-900/40 rounded-2xl p-5 lg:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-100">
                  Tambah Bot Telegram Baru ke Cluster (Dedicated / Sewa)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Otomatis divalidasi via Telegram getMe
              </span>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Token Bot Telegram (@BotFather): <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTestNewToken()}
                      disabled={isTestingNewToken || !newToken.trim()}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 disabled:opacity-40"
                    >
                      {isTestingNewToken ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Mengecek...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3" />
                          <span>Uji Token</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 7891234567:AAHfkjld89723_kjdhs8..."
                    value={newToken}
                    onChange={(e) => {
                      setNewToken(e.target.value);
                      if (newTokenTestResult) setNewTokenTestResult(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  {newTokenTestResult && (
                    <div
                      className={`mt-1 p-1.5 rounded-lg text-[11px] flex items-center gap-1.5 border ${
                        newTokenTestResult.valid
                          ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
                          : 'bg-rose-950/50 border-rose-800/80 text-rose-300'
                      }`}
                    >
                      {newTokenTestResult.valid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            ✅ Valid: <strong>@{newTokenTestResult.botInfo?.username}</strong> ({newTokenTestResult.botInfo?.first_name || 'Bot'})
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{newTokenTestResult.errorMessage || 'Token tidak valid.'}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" />
                    <span>Akun Owner Utama Bot: <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: @flood1233 atau ID 123456789"
                    value={newPrimaryOwner}
                    onChange={(e) => setNewPrimaryOwner(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Wajib diisi! Pemilik sah yang berhak mengontrol bot & menyetujui calon clone owner.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    <span>Kode Rahasia Menu Owner (Bisa Kustom):</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Default: ax0895"
                    value={newSecretCode}
                    onChange={(e) => setNewSecretCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Perintah rahasia untuk membuka menu owner (misal: <code>/ax0895</code>).
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Owner Clone Tambahan (Bisa Lebih Dari 1):</span>
                  </label>
                  <input
                    type="text"
                    placeholder="cth: @owner2, @owner3 (pisahkan koma)"
                    value={newSecondaryOwners}
                    onChange={(e) => setNewSecondaryOwners(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Bot akan mengirim pesan konfirmasi persetujuan ke Telegram Owner Utama sebelum aktif.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Catatan / Label Internal:
                  </label>
                  <input
                    type="text"
                    placeholder="cth: Bot Sewa Komunitas Cyber ID"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nama / Kontak Penyewa (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="cth: @username_penyewa / John Doe"
                    value={newRentedBy}
                    onChange={(e) => setNewRentedBy(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* KALENDER & WAKTU SEWA - BEBAS INPUT SEMEUNYA */}
              <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
                    <span>Masa Berlaku Sewa (Input Bebas Semaunya / Kalender):</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Fleksibel</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400">Ketik Bebas (cth: Permanen, 30 Hari, 3 Bulan, atau tanggal kustom):</span>
                  <input
                    type="text"
                    placeholder="cth: Permanen, 30 Hari, 90d, atau 2026-12-31 23:59"
                    value={newCustomExpiry}
                    onChange={(e) => {
                      setNewCustomExpiry(e.target.value);
                      if (e.target.value.trim().match(/^\d{4}-\d{2}-\d{2}/)) {
                        const parts = e.target.value.trim().split(/[ T]/);
                        setNewExpiryDate(parts[0] || '');
                        if (parts[1]) setNewExpiryTime(parts[1].substring(0, 5));
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400">Atau Pilih Lewat Kalender:</span>
                    <input
                      type="date"
                      value={newExpiryDate}
                      onChange={(e) => {
                        setNewExpiryDate(e.target.value);
                        const time = newExpiryTime.trim() || '23:59';
                        setNewCustomExpiry(e.target.value ? `${e.target.value} ${time}` : '');
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Timer className="w-3 h-3 text-amber-400" />
                      <span>Jam (Default: 23:59 WIB):</span>
                    </span>
                    <input
                      type="time"
                      value={newExpiryTime}
                      onChange={(e) => {
                        setNewExpiryTime(e.target.value);
                        if (newExpiryDate) {
                          setNewCustomExpiry(`${newExpiryDate} ${e.target.value || '23:59'}`);
                        }
                      }}
                      placeholder="23:59"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Preset Shortcut Buttons */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] text-slate-500">Preset Cepat:</span>
                  <button
                    type="button"
                    onClick={() => applyDatePreset(30)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-slate-700 hover:border-purple-600 text-[10px] transition-all"
                  >
                    +30 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset(90)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-slate-700 hover:border-purple-600 text-[10px] transition-all"
                  >
                    +90 Hari (3 Bulan)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset(365)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-slate-700 hover:border-purple-600 text-[10px] transition-all"
                  >
                    +1 Tahun
                  </button>
                  <button
                    type="button"
                    onClick={() => clearDatePreset()}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] transition-all"
                  >
                    Permanen
                  </button>
                </div>

                {/* Live Expiry Preview */}
                {addExpiryPreview && (
                  <div className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                    addExpiryPreview.isExpired
                      ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                      : 'bg-purple-950/40 border-purple-900/60 text-purple-300'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      <span>Masa sewa: <strong>{addExpiryPreview.formattedDate}</strong></span>
                    </div>
                    <span className="font-bold">{addExpiryPreview.remainingText}</span>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 leading-snug">
                  💡 Masa sewa dapat diinput semaunya berupa durasi hari, bulan, teks bebas seperti &apos;Permanen&apos;, atau kalender spesifik.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💡 Bot baru langsung mendapatkan engine OSINT, kuota harian, referral, dan sistem keamanan otomatis yang sama secara instan.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting || !newToken.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-900/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memverifikasi Token...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Verifikasi & Tambahkan Bot</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* List of Connected Bots with Filters */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>Daftar Bot Terkoneksi di Cluster ({totalBotsCount})</span>
              </h4>

              {/* Search & Filter Controls */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari bot / username / id..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44 md:w-56"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[11px] font-semibold">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setStatusFilter('online')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      statusFilter === 'online' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-emerald-300'
                    }`}
                  >
                    Online
                  </button>
                  <button
                    onClick={() => setStatusFilter('paused')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      statusFilter === 'paused' ? 'bg-slate-800 text-slate-300' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Paused
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PRIMARY MASTER BOT CARD */}
              <div className="bg-slate-950/80 border-2 border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm shadow">
                      👑
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-100">
                          {primaryBotInfo?.first_name || 'Master Bot Utama'}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] rounded-full font-mono font-bold">
                          PRIMARY MASTER
                        </span>
                      </div>
                      {primaryBotInfo?.username ? (
                        <a
                          href={`https://t.me/${primaryBotInfo.username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          @{primaryBotInfo.username}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">ID: {primaryBotInfo?.id || '-'}</span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                      isPrimaryActive
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : 'bg-red-950/80 text-red-300 border border-red-800'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isPrimaryActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    <span>{isPrimaryActive ? 'ONLINE' : 'OFFLINE'}</span>
                  </span>
                </div>

                <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Token:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-200">{primaryBotToken ? primaryBotToken.substring(0, 10) + '...' : '-'}</span>
                      {primaryBotToken && (
                        <button
                          onClick={() => handleCopy(primaryBotToken, 'primary_token')}
                          className="text-slate-400 hover:text-cyan-400"
                          title="Salin token"
                        >
                          {copiedId === 'primary_token' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Role:</span>
                    <span className="text-amber-300">Master Controller Principal</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Konfigurasi via Overview / Master Switch
                  </span>
                  {primaryBotInfo?.username && (
                    <a
                      href={`https://t.me/${primaryBotInfo.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Buka di Telegram</span>
                    </a>
                  )}
                </div>
              </div>

              {/* SECONDARY BOT CARDS */}
              {filteredBots.map((bot) => {
                const isPingLoading = actionLoadingId === bot.id;
                const ping = pingResults[bot.id];
                const rentalStatus = calculateRentalStatus(bot.rentExpiryDate);

                return (
                  <div
                    key={bot.id}
                    className={`bg-slate-950/80 rounded-2xl p-5 shadow-xl space-y-3 relative transition-all border ${
                      rentalStatus.isExpired
                        ? 'border-red-900/60 bg-red-950/10'
                        : bot.isActive
                        ? 'border-cyan-900/40 hover:border-cyan-700/60'
                        : 'border-slate-800 hover:border-slate-700 opacity-90'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${
                          rentalStatus.isExpired
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : bot.isActive
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-slate-100">
                              {bot.botInfo?.first_name || bot.notes || 'Secondary Bot'}
                            </span>
                            {bot.rentedBy && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] rounded-full font-mono">
                                Sewa: {bot.rentedBy}
                              </span>
                            )}
                          </div>
                          {bot.botInfo?.username ? (
                            <a
                              href={`https://t.me/${bot.botInfo.username}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              @{bot.botInfo.username}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">ID: {bot.id}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                            bot.isActive
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${bot.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          <span>{bot.isActive ? 'ONLINE' : 'PAUSED'}</span>
                        </span>

                        {/* Rental Expiry Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${
                          rentalStatus.isExpired
                            ? 'bg-red-950 text-red-300 border-red-800 animate-pulse'
                            : rentalStatus.isPermanent
                            ? 'bg-slate-800 text-slate-300 border-slate-700'
                            : 'bg-purple-950 text-purple-300 border-purple-800'
                        }`}>
                          <Clock className="w-2.5 h-2.5" />
                          <span>{rentalStatus.remainingText}</span>
                        </span>
                      </div>
                    </div>

                    {/* Bot Specs & Rental Detail */}
                    <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Token:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300">{bot.maskedToken || '••••••••'}</span>
                          <button
                            onClick={() => handleCopy(bot.token, `token_${bot.id}`)}
                            className="text-slate-500 hover:text-cyan-400"
                            title="Salin token bot"
                          >
                            {copiedId === `token_${bot.id}` ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                      {bot.notes && (
                        <div className="flex justify-between text-slate-400">
                          <span>Catatan:</span>
                          <span className="text-cyan-300 font-sans truncate max-w-[200px]">{bot.notes}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="flex items-center gap-1 font-sans">
                          <CalendarDays className="w-3 h-3 text-purple-400" />
                          <span>Masa Sewa:</span>
                        </span>
                        <span className={`font-semibold ${rentalStatus.isExpired ? 'text-red-400' : 'text-purple-300'}`}>
                          {bot.rentExpiryDate ? `${bot.rentExpiryDate} WIB` : 'Permanen'}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Pesan Diterima:</span>
                        <span className="text-slate-200">{(bot.stats?.messagesReceived || 0)}x</span>
                      </div>
                      {ping && (
                        <div className="flex justify-between text-slate-400">
                          <span>Latensi Ping:</span>
                          <span className={`font-bold ${ping.latencyMs < 500 ? 'text-emerald-400' : ping.latencyMs < 1200 ? 'text-amber-400' : 'text-red-400'}`}>
                            {ping.latencyMs} ms ({ping.time})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {/* Toggle Button */}
                        <button
                          onClick={() => handleToggle(bot.id, bot.isActive)}
                          disabled={actionLoadingId === bot.id}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            bot.isActive
                              ? 'bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{bot.isActive ? 'Pause' : 'Aktifkan'}</span>
                        </button>

                        {/* Detail Modal Button */}
                        <button
                          onClick={() => {
                            setSelectedDetailBot(bot);
                            setShowTokenInDetail(false);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Lihat Detail Bot"
                        >
                          <Info className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Detail</span>
                        </button>

                        {/* Edit Bot Button */}
                        <button
                          onClick={() => handleOpenEdit(bot)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Edit Bot"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-400" />
                          <span>Edit</span>
                        </button>

                        {/* Ping Button */}
                        <button
                          onClick={() => handlePing(bot.id)}
                          disabled={isPingLoading}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Tes Latensi Ping Telegram"
                        >
                          <Activity className={`w-3.5 h-3.5 text-cyan-400 ${isPingLoading ? 'animate-spin' : ''}`} />
                          <span>Ping</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {bot.botInfo?.username && (
                          <a
                            href={`https://t.me/${bot.botInfo.username}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700 rounded-xl transition-colors"
                            title="Buka Bot di Telegram"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => setSelectedDeleteBot(bot)}
                          disabled={actionLoadingId === bot.id}
                          className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60 rounded-xl transition-colors"
                          title="Hapus Bot dari Cluster"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {multiBots.length === 0 && (
                <div className="col-span-1 md:col-span-2 p-8 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-2">
                  <Bot className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">
                    Belum ada secondary bot yang terdaftar di cluster.
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Masukkan token bot Telegram pada formulir di atas untuk menyambungkan bot baru secara instan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: PAKET SEWA BOT */}
      {activeSubTab === 'rental_plans' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-950/60 border border-purple-800/40 rounded-2xl p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2.5">
              <Crown className="w-5 h-5 text-amber-400" />
              <h4 className="text-base font-bold text-slate-100">
                Peluang Bisnis Sewa Bot Telegram (Dedicated Bot)
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Pengguna atau komunitas lain dapat menyewa bot Telegram mereka sendiri menggunakan sistem cluster ini. Bot penyewa akan memiliki nama, username, avatar, dan watermark mereka sendiri, tetapi menggunakan mesin dan dataset OSINT intelijen 24/7 milik Anda secara otomatis tanpa perlu sewa VPS tambahan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {rentalPlans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col justify-between relative transition-all ${
                  plan.isPopular
                    ? 'bg-gradient-to-b from-purple-950/70 to-slate-950 border-2 border-purple-500/80 shadow-2xl shadow-purple-950/50'
                    : 'bg-slate-950/80 border border-slate-800 hover:border-slate-700 shadow-xl'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow">
                    PILIHAN TERPOPULER
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h5 className="text-base font-bold text-slate-100">{plan.name}</h5>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{plan.duration}</div>
                  </div>

                  <div className="pb-3 border-b border-slate-800">
                    <div className="text-2xl font-black text-amber-400 font-mono">
                      {plan.price}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{plan.description}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-300">Fitur & Keunggulan:</div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800/80 mt-6">
                  <a
                    href="https://t.me/flood1233"
                    target="_blank"
                    rel="noreferrer"
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow ${
                      plan.isPopular
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Pesan via Owner @flood1233</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* How to activate rented bot */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Alur Cepat Aktivasi Sewa Bot:</span>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-cyan-400 mb-1">1. Buat Bot di @BotFather</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Penyewa membuat bot baru di Telegram melalui @BotFather, tentukan username dan nama bot sendiri.
                </p>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-purple-400 mb-1">2. Berikan Token ke Owner</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Kirimkan Token HTTP API ke Owner @flood1233. Owner bisa menambahkan bot langsung dari Web atau ketik <code className="text-cyan-300">/addbot &lt;token&gt;</code> di Telegram.
                </p>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-emerald-400 mb-1">3. Bot Langsung Beroperasi 24/7</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Bot langsung aktif dengan seluruh fitur intelijen OSINT, kuota, referral, dan sistem keamanan otomatis tanpa jeda.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: OWNER TELEGRAM COMMANDS */}
      {activeSubTab === 'owner_guide' && (
        <div className="space-y-4">
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <Key className="w-5 h-5 text-emerald-400" />
              <h4 className="text-base font-bold text-slate-100">
                Panduan Perintah Owner via Telegram (Kustom & Fleksibel)
              </h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Sebagai Owner, Anda dapat mengatur masa sewa bot dengan menentukan tanggal dan waktu secara kustom langsung dari chat Telegram tanpa perlu membuka browser.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-emerald-400 font-bold">1. Tambah Bot dengan Masa Sewa (Tanggal & Jam):</div>
                <div className="text-slate-200 bg-slate-950 p-2 rounded border border-slate-800">
                  /addbot &lt;TOKEN_BOT&gt; [CATATAN] [TANGGAL/DURASI] [JAM]
                </div>
                <div className="text-[11px] text-slate-400 font-sans space-y-1 pt-1">
                  <div>• Contoh tanggal saja (otomatis s/d 23:59 WIB): <code className="text-cyan-300">/addbot 7891234:AA... Sewa_VIP 2026-12-31</code></div>
                  <div>• Contoh dengan jam kustom: <code className="text-cyan-300">/addbot 7891234:AA... Sewa_VIP 2026-12-31 18:30</code></div>
                  <div>• Contoh durasi hari: <code className="text-cyan-300">/addbot 7891234:AA... Sewa_John 30d</code></div>
                </div>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-amber-400 font-bold">2. Atur / Perpanjang Masa Sewa Bot:</div>
                <div className="text-slate-200 bg-slate-950 p-2 rounded border border-slate-800">
                  /setexpiry &lt;USERNAME_ATAU_ID_BOT&gt; &lt;TANGGAL/DURASI&gt; [JAM]
                </div>
                <div className="text-[11px] text-slate-400 font-sans space-y-1 pt-1">
                  <div>• Contoh: <code className="text-cyan-300">/setexpiry @bot_ku 2026-12-31</code></div>
                  <div>• Contoh dengan jam: <code className="text-cyan-300">/setexpiry @bot_ku 2026-12-31 15:00</code></div>
                  <div>• Contoh tambah 30 hari: <code className="text-cyan-300">/setexpiry @bot_ku 30d</code></div>
                  <div>• Contoh hapus batas: <code className="text-cyan-300">/setexpiry @bot_ku permanen</code></div>
                </div>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-cyan-400 font-bold">3. Cek Seluruh Bot & Sisa Sewa:</div>
                <div className="text-slate-200 bg-slate-950 p-2 rounded border border-slate-800">
                  /listbot atau /multibot
                </div>
                <div className="text-[11px] text-slate-400 font-sans pt-1">
                  Menampilkan daftar bot aktif, username @bot, status, latensi, dan hitung mundur sisa masa sewa (contoh: Sisa 29 hari 14 jam).
                </div>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-red-400 font-bold">4. Hapus / Putuskan Bot:</div>
                <div className="text-slate-200 bg-slate-950 p-2 rounded border border-slate-800">
                  /delbot &lt;USERNAME_ATAU_ID_BOT&gt;
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL BOT LENGKAP */}
      {/* ========================================================================= */}
      {selectedDetailBot && (() => {
        const rentalStatus = calculateRentalStatus(selectedDetailBot.rentExpiryDate);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-cyan-800/60 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <span>{selectedDetailBot.botInfo?.first_name || 'Detail Bot'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        selectedDetailBot.isActive
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {selectedDetailBot.isActive ? 'ONLINE' : 'PAUSED'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      ID Bot: <code className="text-cyan-300 font-mono">{selectedDetailBot.id}</code>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDetailBot(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                {/* Telegram Info Card */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-cyan-400 font-sans flex items-center gap-1.5 pb-1 border-b border-slate-800">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Metadata Telegram API</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Username:</span>
                    <span className="text-slate-200">
                      {selectedDetailBot.botInfo?.username ? `@${selectedDetailBot.botInfo.username}` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nama Pertama:</span>
                    <span className="text-slate-200 font-sans">{selectedDetailBot.botInfo?.first_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Join Grup:</span>
                    <span className={selectedDetailBot.botInfo?.can_join_groups !== false ? 'text-emerald-400' : 'text-red-400'}>
                      {selectedDetailBot.botInfo?.can_join_groups !== false ? 'Diizinkan (Yes)' : 'Dilarang'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Baca Semua Pesan:</span>
                    <span className="text-slate-200">
                      {selectedDetailBot.botInfo?.can_read_all_group_messages ? 'Privacy Mode OFF' : 'Privacy Mode ON'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Inline Queries:</span>
                    <span className="text-slate-200">
                      {selectedDetailBot.botInfo?.supports_inline_queries ? 'Didukung' : 'Tidak'}
                    </span>
                  </div>
                </div>

                {/* Status & Cluster Specs */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-400 font-sans flex items-center gap-1.5 pb-1 border-b border-slate-800">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Kondisi Mesin & Latensi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status Worker:</span>
                    <span className={selectedDetailBot.isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      {selectedDetailBot.isActive ? 'Aktif Polling' : 'Berhenti (Pause)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Latensi Terakhir:</span>
                    <span className="text-emerald-400 font-bold">
                      {pingResults[selectedDetailBot.id]?.latencyMs || selectedDetailBot.latencyMs || '-'} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pesan Diterima:</span>
                    <span className="text-slate-200">{selectedDetailBot.stats?.messagesReceived || 0}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pesan Dikirim:</span>
                    <span className="text-slate-200">{selectedDetailBot.stats?.messagesSent || 0}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Perintah OSINT:</span>
                    <span className="text-slate-200">{selectedDetailBot.stats?.commandsExecuted || 0}x</span>
                  </div>
                </div>
              </div>

              {/* Token & Secret Details */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 font-sans flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Token HTTP Bot API</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowTokenInDetail(!showTokenInDetail)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-sans"
                    >
                      {showTokenInDetail ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showTokenInDetail ? 'Sembunyikan' : 'Perlihatkan'}</span>
                    </button>
                    <button
                      onClick={() => handleCopy(selectedDetailBot.token, `detail_token_${selectedDetailBot.id}`)}
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-sans"
                    >
                      {copiedId === `detail_token_${selectedDetailBot.id}` ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Salin Token</span>
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-lg text-slate-200 break-all select-all font-mono">
                  {showTokenInDetail ? selectedDetailBot.token : selectedDetailBot.maskedToken}
                </div>
              </div>

              {/* Rental Information & Expiry Details */}
              <div className={`p-4 rounded-xl border text-xs space-y-3 ${
                rentalStatus.isExpired
                  ? 'bg-red-950/30 border-red-800/60'
                  : 'bg-purple-950/30 border-purple-900/40'
              }`}>
                <div className="flex items-center justify-between pb-1 border-b border-purple-900/30">
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5 font-sans">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Masa Sewa & Durasi Aktif</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                    rentalStatus.isExpired
                      ? 'bg-red-950 text-red-300 border-red-700'
                      : rentalStatus.isPermanent
                      ? 'bg-slate-800 text-slate-300 border-slate-700'
                      : 'bg-purple-900 text-purple-200 border-purple-600'
                  }`}>
                    {rentalStatus.remainingText}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
                  <div>
                    <div className="text-[11px] text-slate-400">Penyewa:</div>
                    <div className="font-semibold text-slate-100 mt-0.5">{selectedDetailBot.rentedBy || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Batas Kedaluwarsa:</div>
                    <div className={`font-semibold mt-0.5 ${rentalStatus.isExpired ? 'text-red-400' : 'text-purple-300'}`}>
                      {selectedDetailBot.rentExpiryDate ? `${selectedDetailBot.rentExpiryDate} WIB` : 'Permanen'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Catatan:</div>
                    <div className="font-semibold text-slate-300 mt-0.5">{selectedDetailBot.notes || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePing(selectedDetailBot.id)}
                    disabled={actionLoadingId === selectedDetailBot.id}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Tes Ping Ulang</span>
                  </button>
                  {selectedDetailBot.botInfo?.username && (
                    <a
                      href={`https://t.me/${selectedDetailBot.botInfo.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka di Telegram</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleOpenEdit(selectedDetailBot);
                      setSelectedDetailBot(null);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit / Atur Sewa</span>
                  </button>
                  <button
                    onClick={() => setSelectedDetailBot(null)}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: EDIT BOT & ATUR KALENDER MASA SEWA */}
      {/* ========================================================================= */}
      {selectedEditBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">
                    Edit Konfigurasi Bot: {selectedEditBot.botInfo?.first_name || selectedEditBot.id}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Perbarui token, catatan, atau atur tanggal kalender & waktu sewa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEditBot(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Token Telegram Bot (Kosongkan jika tidak ingin mengubah):
                </label>
                <input
                  type="text"
                  value={editToken}
                  onChange={(e) => setEditToken(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin mengganti token"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" />
                    <span>Akun Owner Utama Bot: <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editPrimaryOwner}
                    onChange={(e) => setEditPrimaryOwner(e.target.value)}
                    placeholder="cth: @flood1233 atau ID 123456789"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400">
                    Owner utama adalah pemilik sah yang berhak mengontrol bot & menyetujui clone owner.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    <span>Kode Rahasia Menu Owner (Bisa Diubah Bebas):</span>
                  </label>
                  <input
                    type="text"
                    value={editSecretCode}
                    onChange={(e) => setEditSecretCode(e.target.value)}
                    placeholder="cth: ax0895 atau rahasia123"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400">
                    Perintah rahasia untuk membuka menu owner (misal: <code>/{editSecretCode || 'ax0895'}</code>).
                  </p>
                </div>
              </div>

              {/* KELOLA OWNER CLONE / CO-OWNERS */}
              <div className="space-y-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Kelola Owner Clone / Co-Owners (Bisa Lebih Dari 1):</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Konfirmasi via Telegram</span>
                </div>

                {/* Daftar Owner Clone yang Disetujui */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-300 font-medium">Owner Clone yang Disetujui ({editSecondaryOwners.length}):</span>
                  {editSecondaryOwners.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">Belum ada Owner Clone yang terdaftar untuk bot ini.</p>
                  ) : (
                    <div className="space-y-1">
                      {editSecondaryOwners.map((owner, idx) => (
                        <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <span className="font-mono text-cyan-300 font-semibold">{owner}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCloneOwner(owner)}
                            className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/40 text-[10px] flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Daftar Permintaan Pending Menunggu Konfirmasi Owner Utama */}
                {editPendingClones.filter((p) => p.status === 'pending').length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Menunggu Konfirmasi Owner Utama ({editPendingClones.filter((p) => p.status === 'pending').length}):</span>
                    </span>
                    <div className="space-y-1">
                      {editPendingClones
                        .filter((p) => p.status === 'pending')
                        .map((req) => (
                          <div key={req.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-950/30 border border-amber-900/50 text-xs">
                            <div>
                              <span className="font-mono text-amber-200 font-semibold">{req.ownerIdentifier}</span>
                              <span className="text-[10px] text-slate-400 ml-2">Diajukan: {new Date(req.requestedAt).toLocaleTimeString('id-ID')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleApproveCloneRequest(req.id)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Izinkan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectCloneRequest(req.id)}
                                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                <span>Tolak</span>
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Form Tambah Calon Owner Clone Baru */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-300 font-medium">Ajukan Calon Owner Clone Baru:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editNewCloneOwnerInput}
                      onChange={(e) => setEditNewCloneOwnerInput(e.target.value)}
                      placeholder="cth: @calon_clone_owner atau ID 987654321"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      disabled={!editNewCloneOwnerInput.trim() || isEditSubmitting}
                      onClick={handleAddNewCloneOwner}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
                    >
                      <Send className="w-3 h-3" />
                      <span>Kirim Konfirmasi ke Owner</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    💡 Bot akan mengirimkan notifikasi Telegram resmi kepada Owner Utama ({selectedEditBot.primaryOwner}) dengan tombol persetujuan sebelum akun ini diizinkan membuka menu owner.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Catatan / Label Internal:
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="cth: Bot Sewa Komunitas Cyber ID"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nama / Kontak Penyewa:
                  </label>
                  <input
                    type="text"
                    value={editRentedBy}
                    onChange={(e) => setEditRentedBy(e.target.value)}
                    placeholder="cth: @penyewa / Budi"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* KALENDER & WAKTU DI EDIT MODAL - INPUT BEBAS SEMAUNYA */}
              <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-purple-400" />
                    <span>Masa Berlaku Sewa (Input Bebas Semaunya / Kalender):</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Fleksibel</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400">Input Kustom Bebas (cth: Permanen, 30 Hari, 3 Bulan, atau tanggal bebas):</span>
                  <input
                    type="text"
                    value={editCustomExpiry}
                    onChange={(e) => {
                      setEditCustomExpiry(e.target.value);
                      if (e.target.value.trim().match(/^\d{4}-\d{2}-\d{2}/)) {
                        const parts = e.target.value.trim().split(/[ T]/);
                        setEditExpiryDate(parts[0] || '');
                        if (parts[1]) setEditExpiryTime(parts[1].substring(0, 5));
                      }
                    }}
                    placeholder="cth: Permanen, 30 Hari, 2026-12-31 23:59, atau 90d"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Atau Pilih Lewat Kalender:</span>
                    <input
                      type="date"
                      value={editExpiryDate}
                      onChange={(e) => {
                        setEditExpiryDate(e.target.value);
                        const time = editExpiryTime.trim() || '23:59';
                        setEditCustomExpiry(e.target.value ? `${e.target.value} ${time}` : '');
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Timer className="w-3 h-3 text-amber-400" />
                      <span>Jam (Default: 23:59 WIB):</span>
                    </span>
                    <input
                      type="time"
                      value={editExpiryTime}
                      onChange={(e) => {
                        setEditExpiryTime(e.target.value);
                        if (editExpiryDate) {
                          setEditCustomExpiry(`${editExpiryDate} ${e.target.value || '23:59'}`);
                        }
                      }}
                      placeholder="23:59"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Preset Shortcut Buttons */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] text-slate-500">Preset:</span>
                  <button
                    type="button"
                    onClick={() => applyDatePreset(30, true)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-slate-700 hover:border-purple-600 text-[10px] transition-all"
                  >
                    +30 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset(90, true)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-slate-700 hover:border-purple-600 text-[10px] transition-all"
                  >
                    +90 Hari (3 Bulan)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset(365, true)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-slate-700 hover:border-purple-600 text-[10px] transition-all"
                  >
                    +1 Tahun
                  </button>
                  <button
                    type="button"
                    onClick={() => clearDatePreset(true)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] transition-all"
                  >
                    Permanen
                  </button>
                </div>

                {/* Live Expiry Preview */}
                {editExpiryPreview && (
                  <div className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                    editExpiryPreview.isExpired
                      ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                      : 'bg-purple-950/40 border-purple-900/60 text-purple-300'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      <span>Berakhir: <strong>{editExpiryPreview.formattedDate}</strong></span>
                    </div>
                    <span className="font-bold">{editExpiryPreview.remainingText}</span>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 leading-snug">
                  💡 Masa sewa dapat diinput semaunya berupa durasi hari, bulan, teks bebas seperti &apos;Permanen&apos;, atau kalender spesifik.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="editIsActive" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Aktifkan Bot di Cluster (Polling Always-ON)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedEditBot(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {isEditSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS BOT */}
      {/* ========================================================================= */}
      {selectedDeleteBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-red-800/80 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-100">Hapus Bot dari Cluster?</h4>
                <p className="text-xs text-slate-400">Tindakan ini akan menghentikan service bot</p>
              </div>
            </div>

            <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-xs text-red-200 space-y-1">
              <p>
                Anda akan menghapus bot <strong>{selectedDeleteBot.botInfo?.first_name || selectedDeleteBot.id}</strong> (
                {selectedDeleteBot.botInfo?.username ? `@${selectedDeleteBot.botInfo.username}` : selectedDeleteBot.id}).
              </p>
              <p className="text-[11px] text-red-300/80">
                Polling worker untuk bot ini akan segera dihentikan dan dinonaktifkan dari cluster.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedDeleteBot(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoadingId === selectedDeleteBot.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-red-950/50"
              >
                {actionLoadingId === selectedDeleteBot.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Bot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
