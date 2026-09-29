import React, { useState, useMemo } from 'react';
import {
  Users,
  Gift,
  Coins,
  ArrowDownCircle,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Plus,
  ExternalLink,
  Sliders,
  Send,
  AlertCircle,
  Sparkles,
  Award,
  Wallet,
  UserPlus,
  Copy,
  ChevronRight,
  Filter,
  History
} from 'lucide-react';
import {
  ReferralConfig,
  ReferralRecord,
  ReferralSavingsAccount,
  ReferralWithdrawTransaction,
  BotUserEntry,
  DEFAULT_REFERRAL_CONFIG
} from '../types';

interface ReferralManagerPanelProps {
  referralConfig?: ReferralConfig;
  referralAccounts?: ReferralSavingsAccount[];
  referralRecords?: ReferralRecord[];
  referralWithdrawLogs?: ReferralWithdrawTransaction[];
  activeUsers: BotUserEntry[];
  botUsername?: string;
  isBotActive: boolean;
  onShowToast: (text: string, type: 'success' | 'error') => void;
  onRefreshStatus: () => void;
}

export function ReferralManagerPanel({
  referralConfig,
  referralAccounts = [],
  referralRecords = [],
  referralWithdrawLogs = [],
  activeUsers,
  botUsername = 'axxosintbot',
  isBotActive,
  onShowToast,
  onRefreshStatus
}: ReferralManagerPanelProps) {
  const [config, setConfig] = useState<ReferralConfig>(
    referralConfig || DEFAULT_REFERRAL_CONFIG
  );
  const [activeSubTab, setActiveSubTab] = useState<'leaderboard' | 'records' | 'withdraws' | 'settings'>('leaderboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Modal State for Manual Quota / Savings Adjustment
  const [modalUser, setModalUser] = useState<BotUserEntry | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'add_savings' | 'withdraw_to_quota'>('add_savings');
  const [notifyUserCheck, setNotifyUserCheck] = useState<boolean>(true);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  React.useEffect(() => {
    if (referralConfig) {
      setConfig(referralConfig);
    }
  }, [referralConfig]);

  // Combined accounts data from active users & accounts list
  const combinedAccounts = useMemo(() => {
    const map = new Map<number, ReferralSavingsAccount>();

    // Seed from activeUsers
    activeUsers.forEach((u) => {
      const uid = Number(u.userId || u.chatId);
      map.set(uid, {
        userId: uid,
        userName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Pengguna',
        usernameTag: u.username ? `@${u.username}` : undefined,
        referralCode: `ref_${uid}`,
        totalInvitedCount: u.totalReferralsCount || 0,
        confirmedCount: u.totalReferralsCount || 0,
        savedQuotaBalance: u.referralVaultBalance || 0,
        totalWithdrawnQuota: u.totalReferralQuotaClaimed || 0,
        lastInvitedAt: u.lastSeen
      });
    });

    // Merge from referralAccounts
    referralAccounts.forEach((acc) => {
      const existing = map.get(acc.userId);
      if (existing) {
        existing.savedQuotaBalance = Math.max(existing.savedQuotaBalance, acc.savedQuotaBalance || 0);
        existing.totalInvitedCount = Math.max(existing.totalInvitedCount, acc.totalInvitedCount || 0);
        existing.confirmedCount = Math.max(existing.confirmedCount, acc.confirmedCount || 0);
        existing.totalWithdrawnQuota = Math.max(existing.totalWithdrawnQuota, acc.totalWithdrawnQuota || 0);
      } else {
        map.set(acc.userId, acc);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.confirmedCount !== a.confirmedCount) return b.confirmedCount - a.confirmedCount;
      return b.savedQuotaBalance - a.savedQuotaBalance;
    });
  }, [activeUsers, referralAccounts]);

  // Filtered leaderboard
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return combinedAccounts;
    const q = searchQuery.toLowerCase();
    return combinedAccounts.filter(
      (a) =>
        a.userName.toLowerCase().includes(q) ||
        (a.usernameTag && a.usernameTag.toLowerCase().includes(q)) ||
        String(a.userId).includes(q)
    );
  }, [combinedAccounts, searchQuery]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return referralRecords;
    const q = searchQuery.toLowerCase();
    return referralRecords.filter(
      (r) =>
        r.inviterName.toLowerCase().includes(q) ||
        r.referredName.toLowerCase().includes(q) ||
        String(r.inviterUserId).includes(q) ||
        String(r.referredUserId).includes(q)
    );
  }, [referralRecords, searchQuery]);

  // Key metrics calculation
  const totalConfirmedInvites = useMemo(() => {
    return referralRecords.filter((r) => r.status === 'confirmed').length ||
      combinedAccounts.reduce((acc, curr) => acc + curr.confirmedCount, 0);
  }, [referralRecords, combinedAccounts]);

  const totalSavedVault = useMemo(() => {
    return combinedAccounts.reduce((acc, curr) => acc + (curr.savedQuotaBalance || 0), 0);
  }, [combinedAccounts]);

  const totalWithdrawn = useMemo(() => {
    return combinedAccounts.reduce((acc, curr) => acc + (curr.totalWithdrawnQuota || 0), 0);
  }, [combinedAccounts]);

  const activeReferrersCount = useMemo(() => {
    return combinedAccounts.filter((a) => a.confirmedCount > 0).length;
  }, [combinedAccounts]);

  // Save Config
  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/bot/referral/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Pengaturan referral & tabungan kuota berhasil disimpan!', 'success');
        onRefreshStatus();
      } else {
        onShowToast(data.message || 'Gagal menyimpan pengaturan.', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Perform Manual Adjustment
  const handlePerformAdjustment = async () => {
    if (!modalUser) return;
    setIsProcessingAction(true);
    try {
      const res = await fetch('/api/bot/referral/adjust-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          userId: Number(modalUser.userId || modalUser.chatId),
          amount: adjustAmount,
          actionType: adjustType,
          notifyUser: notifyUserCheck
        })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message || 'Saldo tabungan kuota berhasil diperbarui!', 'success');
        setModalUser(null);
        onRefreshStatus();
      } else {
        onShowToast(data.message || 'Gagal mengubah saldo.', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Copy referral link helper
  const handleCopyLink = (code: string) => {
    const cleanBot = botUsername.replace(/^@/, '');
    const url = `https://t.me/${cleanBot}?start=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(code);
    onShowToast(`Link referral disalin: ${url}`, 'success');
    setTimeout(() => setCopiedLink(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Main Stats */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-[#0c1322] via-[#0e172a] to-[#090e1a] p-6 shadow-xl shadow-indigo-950/20">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 shadow-inner">
              <Gift className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Sistem Referral / Undang Teman & Tabungan Kuota
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  config.enabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {config.enabled ? '● PROGRAM AKTIF' : '● NONAKTIF'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Fitur undang teman dengan reward <span className="text-indigo-300 font-semibold">+1 Kuota per pendaftaran resmi</span> (/start). Kuota otomatis masuk ke <span className="text-cyan-300 font-semibold">Tabungan Kuota</span> dan dapat ditabung atau dicairkan secara fleksibel sesuai jumlah yang diinginkan!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={onRefreshStatus}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Teman Terkonfirmasi</span>
              <UserPlus className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-300 font-mono mt-1.5">
              {totalConfirmedInvites}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Resmi via /start</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Saldo Ditabung (Vault)</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 font-mono mt-1.5">
              {totalSavedVault} <span className="text-xs text-amber-400 font-normal">Kuota</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Wallet className="w-3 h-3 text-amber-400" />
              <span>Tersimpan di Tabungan</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Kuota Ditarik</span>
              <ArrowDownCircle className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-300 font-mono mt-1.5">
              {totalWithdrawn} <span className="text-xs text-cyan-400 font-normal">Kuota</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Aktif dipakai pencarian</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Pengundang Aktif</span>
              <Award className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-300 font-mono mt-1.5">
              {activeReferrersCount} <span className="text-xs text-slate-400 font-normal">Akun</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-purple-400" />
              <span>Memiliki min. 1 referral</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Navigation & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveSubTab('leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'leaderboard'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Leaderboard ({combinedAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('records')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'records'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Riwayat Undangan ({referralRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('withdraws')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'withdraws'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Log Penarikan ({referralWithdrawLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'settings'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Pengaturan</span>
          </button>
        </div>

        {activeSubTab !== 'settings' && (
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari user, nama, ID..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Sub Tab 1: Leaderboard & Accounts */}
      {activeSubTab === 'leaderboard' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Peringkat & Tabungan Kuota Pengguna
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Total {filteredAccounts.length} akun terdata
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Rank & Pengguna</th>
                  <th className="py-3 px-4">User ID & Link Referral</th>
                  <th className="py-3 px-4 text-center">Diundang</th>
                  <th className="py-3 px-4 text-center">Saldo Tabungan</th>
                  <th className="py-3 px-4 text-center">Kuota Ditarik</th>
                  <th className="py-3 px-4 text-center">Kuota Aktif</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Belum ada data referral atau pengguna yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc, idx) => {
                    const rawUser = activeUsers.find((u) => Number(u.userId || u.chatId) === acc.userId);
                    const rank = idx + 1;
                    const rankBadge =
                      rank === 1 ? '🥇 Top 1' :
                      rank === 2 ? '🥈 Top 2' :
                      rank === 3 ? '🥉 Top 3' : `#${rank}`;

                    return (
                      <tr key={acc.userId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              rank === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                              rank === 2 ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40' :
                              rank === 3 ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40' :
                              'text-slate-500 bg-slate-800'
                            }`}>
                              {rankBadge}
                            </span>
                            <div>
                              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                <span>{acc.userName}</span>
                                {acc.confirmedCount >= 5 && (
                                  <Sparkles className="w-3 h-3 text-amber-400" title="Top Referrer" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {acc.usernameTag || '-'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="text-slate-300">{acc.userId}</div>
                          <button
                            onClick={() => handleCopyLink(acc.referralCode)}
                            className="mt-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            <span>{acc.referralCode}</span>
                            {copiedLink === acc.referralCode && (
                              <span className="text-[9px] text-emerald-400 font-bold">Disalin!</span>
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
                            {acc.confirmedCount} orang
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold font-mono">
                            💼 {acc.savedQuotaBalance}x
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="text-cyan-400 font-mono font-semibold">
                            {acc.totalWithdrawnQuota}x
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="text-indigo-300 font-mono font-semibold">
                            {rawUser?.personalQuota || 0}x
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                const targetU = rawUser || {
                                  chatId: acc.userId,
                                  userId: acc.userId,
                                  firstName: acc.userName,
                                  firstSeen: new Date().toISOString(),
                                  lastSeen: new Date().toISOString(),
                                  totalMessages: 1,
                                  type: 'private'
                                };
                                setModalUser(targetU);
                                setAdjustType('add_savings');
                                setAdjustAmount(1);
                              }}
                              className="px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-semibold flex items-center gap-1 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tabungan</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub Tab 2: Referral Records Feed */}
      {activeSubTab === 'records' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Riwayat Pendaftaran Teman Resmi (/start)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Total {filteredRecords.length} transaksi referral
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Pengundang (Inviter)</th>
                  <th className="py-3 px-4">Teman Diundang</th>
                  <th className="py-3 px-4 text-center">Status Konfirmasi</th>
                  <th className="py-3 px-4 text-center">Reward Masuk Tabungan</th>
                  <th className="py-3 px-4 text-right">Waktu Bergabung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Belum ada riwayat referral yang tercatat. Bagikan link referral di Telegram untuk mulai mengundang!
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100">{rec.inviterName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {rec.inviterUserId} {rec.inviterUsername ? `(@${rec.inviterUsername})` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100">{rec.referredName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {rec.referredUserId} {rec.referredUsername ? `(@${rec.referredUsername})` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center gap-1 w-fit mx-auto">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Resmi Terdaftar (/start)</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                          +{rec.rewardQuota} Kuota
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                        {new Date(rec.referredAt).toLocaleString('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })} WIB
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub Tab 3: Withdrawal Logs Feed */}
      {activeSubTab === 'withdraws' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Log Pencairan Tabungan Kuota ke Kuota Aktif
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Total {referralWithdrawLogs.length} penarikan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4 text-center">Jumlah Ditarik</th>
                  <th className="py-3 px-4 text-center">Saldo Tabungan (Sebelum → Sesudah)</th>
                  <th className="py-3 px-4 text-center">Kuota Pencarian Aktif Baru</th>
                  <th className="py-3 px-4 text-right">Waktu Penarikan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {referralWithdrawLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Belum ada penarikan kuota yang dilakukan pengguna.
                    </td>
                  </tr>
                ) : (
                  referralWithdrawLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100">{log.userName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">User ID: {log.userId}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                          💰 {log.amount}x Kuota
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                        <span className="text-amber-400">{log.previousBalance}x</span>
                        <span className="text-slate-500 mx-1.5">→</span>
                        <span className="text-amber-300 font-bold">{log.newBalance}x</span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono text-emerald-300 font-semibold">
                        {log.newPersonalQuota}x
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                        {log.formattedWib || new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub Tab 4: Referral Configuration */}
      {activeSubTab === 'settings' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Pengaturan Program Referral & Menabung Kuota
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Atur besaran reward kuota, validasi anti-exploit, serta perilaku notifikasi bot.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Toggle Enable Referral */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Aktifkan Program Referral</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Izinkan pengguna membagikan link referral dan mendapatkan kuota tabungan.
                </div>
              </div>
              <button
                onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle Notification to Inviter */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Notifikasi Real-Time ke Pengundang</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Kirim pesan Telegram langsung ke pengundang saat teman resmi /start.
                </div>
              </div>
              <button
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    notifyInviterOnRegister: !prev.notifyInviterOnRegister
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.notifyInviterOnRegister ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.notifyInviterOnRegister ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Quota per Invite Input */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-200 block">
                Hadiah Kuota per Undangan Terdaftar (/start)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.quotaPerInvite}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      quotaPerInvite: Math.max(1, parseInt(e.target.value, 10) || 1)
                    }))
                  }
                  className="w-24 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-slate-400">Kuota OSINT / orang</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Standar: 1 kuota per orang. Kuota masuk ke Tabungan Kuota (menabung).
              </p>
            </div>

            {/* Minimum Withdraw Input */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-200 block">
                Minimal Penarikan Tabungan Kuota
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.minWithdrawAmount}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      minWithdrawAmount: Math.max(1, parseInt(e.target.value, 10) || 1)
                    }))
                  }
                  className="w-24 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-slate-400">Kuota minimal</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pengguna dapat menarik kuota tabungan kapan saja (misal: 1, 2, 5, atau semua).
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Referral'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Kelola Tabungan Kuota Pengguna
                </h3>
              </div>
              <button
                onClick={() => setModalUser(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-mono font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
              <div className="text-slate-300">
                <span className="text-slate-400">Pengguna:</span> <span className="font-bold text-white">{modalUser.firstName} {modalUser.lastName}</span>
              </div>
              <div className="text-slate-300 font-mono text-[11px]">
                <span className="text-slate-400">User ID / Chat ID:</span> {modalUser.userId || modalUser.chatId}
              </div>
              <div className="flex items-center gap-4 pt-1 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400">Saldo Tabungan:</span> <span className="text-amber-400 font-bold">{modalUser.referralVaultBalance || 0}x</span>
                </div>
                <div>
                  <span className="text-slate-400">Kuota Aktif:</span> <span className="text-indigo-300 font-bold">{modalUser.personalQuota || 0}x</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Tipe Tindakan:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('add_savings')}
                    className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                      adjustType === 'add_savings'
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ➕ Tambah Saldo Tabungan
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('withdraw_to_quota')}
                    className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                      adjustType === 'withdraw_to_quota'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    💰 Cairkan ke Kuota Aktif
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Jumlah Kuota:</label>
                <input
                  type="number"
                  min="1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="notifyUserCheckbox"
                  checked={notifyUserCheck}
                  onChange={(e) => setNotifyUserCheck(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="notifyUserCheckbox" className="text-slate-300 text-[11px] cursor-pointer">
                  Kirim notifikasi pesan konfirmasi ke Telegram pengguna
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePerformAdjustment}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isProcessingAction ? 'Memproses...' : 'Terapkan Perubahan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
