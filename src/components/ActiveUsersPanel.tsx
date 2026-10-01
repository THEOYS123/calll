import React, { useState, useMemo } from 'react';
import {
  Users,
  Copy,
  Check,
  Send,
  UserCheck,
  UserX,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Gift,
  Coins,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { BotUserEntry } from '../types';

interface ActiveUsersPanelProps {
  users: BotUserEntry[];
  onSelectUserForChat: (chatId: number) => void;
  onToggleVerification?: (chatId: number, currentStatus: boolean) => void;
  onGiftQuota?: (chatId: number, amount: number, notes: string) => Promise<void>;
}

export function ActiveUsersPanel({
  users,
  onSelectUserForChat,
  onToggleVerification,
  onGiftQuota
}: ActiveUsersPanelProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'verified' | 'unverified' | 'has_savings' | 'has_quota'>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Gift Quota Modal State
  const [selectedUserForGift, setSelectedUserForGift] = useState<BotUserEntry | null>(null);
  const [giftAmount, setGiftAmount] = useState<number>(5);
  const [giftNotes, setGiftNotes] = useState<string>('Bonus Kuota dari Admin');
  const [isGifting, setIsGifting] = useState<boolean>(false);

  const handleCopy = (chatId: number) => {
    navigator.clipboard.writeText(String(chatId));
    setCopiedId(chatId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCountryBadge = (langCode?: string) => {
    if (!langCode) return { flag: '🌐', label: 'Global' };
    const code = langCode.toLowerCase();
    if (code.startsWith('id')) return { flag: '🇮🇩', label: 'Indonesia (IDR)' };
    if (code.startsWith('ms') || code.startsWith('my')) return { flag: '🇲🇾', label: 'Malaysia (MYR)' };
    if (code.startsWith('sg')) return { flag: '🇸🇬', label: 'Singapore (SGD)' };
    if (code.startsWith('en')) return { flag: '🇺🇸', label: 'English (USD)' };
    return { flag: '🌐', label: langCode.toUpperCase() };
  };

  const totalUsersCount = users.length;
  const verifiedCount = useMemo(() => users.filter((u) => u.isVerified).length, [users]);
  const unverifiedCount = totalUsersCount - verifiedCount;
  const totalActiveQuota = useMemo(() => users.reduce((acc, u) => acc + (u.personalQuota || 0), 0), [users]);
  const totalSavingsQuota = useMemo(() => users.reduce((acc, u) => acc + (u.referralVaultBalance || 0), 0), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const term = search.toLowerCase();
      const matchesSearch =
        String(u.chatId).includes(term) ||
        (u.userId && String(u.userId).includes(term)) ||
        u.firstName.toLowerCase().includes(term) ||
        (u.lastName && u.lastName.toLowerCase().includes(term)) ||
        (u.username && u.username.toLowerCase().includes(term));

      if (!matchesSearch) return false;
      if (filterType === 'verified') return u.isVerified;
      if (filterType === 'unverified') return !u.isVerified;
      if (filterType === 'has_savings') return (u.referralVaultBalance || 0) > 0;
      if (filterType === 'has_quota') return (u.personalQuota || 0) > 0;
      return true;
    });
  }, [users, search, filterType]);

  // Pagination calculation
  const totalFiltered = filteredUsers.length;
  const totalPages = pageSize === 0 ? 1 : Math.ceil(totalFiltered / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    if (pageSize === 0) return filteredUsers;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safeCurrentPage, pageSize]);

  const submitGiftQuota = async () => {
    if (!selectedUserForGift || !onGiftQuota) return;
    setIsGifting(true);
    try {
      await onGiftQuota(selectedUserForGift.chatId, giftAmount, giftNotes);
      setSelectedUserForGift(null);
    } finally {
      setIsGifting(false);
    }
  };

  return (
    <div id="active-users-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl relative space-y-6">
      {/* Top Metric Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-950/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-bold text-slate-100">
                Pengguna & Manajemen Kuota
              </h3>
              <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/30 text-xs rounded-full font-mono font-bold">
                Total {totalUsersCount} Akun Lengkap
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Database seluruh pengguna Telegram terdaftar, status anti-exploit, saldo kuota aktif, dan tabungan referral.
            </p>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2">
            <div className="text-[10px] uppercase font-mono text-slate-400">Terverifikasi</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">{verifiedCount} akun</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2">
            <div className="text-[10px] uppercase font-mono text-slate-400">Belum /id</div>
            <div className="text-sm font-bold text-amber-400 font-mono">{unverifiedCount} akun</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2">
            <div className="text-[10px] uppercase font-mono text-slate-400">Total Kuota Aktif</div>
            <div className="text-sm font-bold text-cyan-400 font-mono">{totalActiveQuota}x</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2">
            <div className="text-[10px] uppercase font-mono text-slate-400">Total Tabungan</div>
            <div className="text-sm font-bold text-purple-400 font-mono">{totalSavingsQuota}x</div>
          </div>
        </div>
      </div>

      {/* Filter Pills, Search & Page Size */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => { setFilterType('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filterType === 'all'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({totalUsersCount})
          </button>
          <button
            onClick={() => { setFilterType('verified'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filterType === 'verified'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            ✅ Terverifikasi ({verifiedCount})
          </button>
          <button
            onClick={() => { setFilterType('unverified'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filterType === 'unverified'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            ⚠️ Belum ({unverifiedCount})
          </button>
          <button
            onClick={() => { setFilterType('has_savings'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filterType === 'has_savings'
                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                : 'text-slate-400 hover:text-purple-300'
            }`}
          >
            💼 Punya Tabungan
          </button>
          <button
            onClick={() => { setFilterType('has_quota'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filterType === 'has_quota'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            💎 Punya Kuota
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Cari nama, ID, username..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Rows Per Page Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-700">
            <span className="hidden sm:inline">Tampil:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value={20} className="bg-slate-900">20</option>
              <option value={25} className="bg-slate-900">25</option>
              <option value={50} className="bg-slate-900">50</option>
              <option value={100} className="bg-slate-900">100</option>
              <option value={0} className="bg-slate-900">Semua ({totalUsersCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div>
        {totalUsersCount === 0 ? (
          <div className="py-12 px-4 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Belum Ada Pengguna Terdaftar</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Buka aplikasi Telegram dan kirim perintah <code className="text-cyan-300 font-mono">/start</code> atau <code className="text-cyan-300 font-mono">/id</code> ke bot Anda. Chat ID Anda akan langsung tercatat otomatis di sini secara real-time.
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-950/30 rounded-2xl border border-slate-800">
            Tidak ada pengguna yang cocok dengan filter atau pencarian &quot;{search}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono bg-slate-950/70">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 pr-4">PENGGUNA</th>
                  <th className="py-3 pr-4">CHAT / USER ID</th>
                  <th className="py-3 pr-4">STATUS VERIFIKASI</th>
                  <th className="py-3 pr-4">KUOTA AKTIF & TABUNGAN</th>
                  <th className="py-3 pr-4">JATAH KLAIM</th>
                  <th className="py-3 pr-4">LOKASI</th>
                  <th className="py-3 pr-4">PESAN</th>
                  <th className="py-3 pr-4">TERAKHIR AKTIF</th>
                  <th className="py-3 pr-4 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {paginatedUsers.map((u, index) => {
                  const globalIndex = pageSize === 0 ? index + 1 : (safeCurrentPage - 1) * pageSize + index + 1;
                  const country = getCountryBadge(u.languageCode);
                  const hasClaimedNew = Boolean(u.hasClaimedNewUserQuota);
                  const hasDailyClaim = Boolean(u.dailyQuotaLastClaimedDate);
                  const savings = u.referralVaultBalance || 0;
                  const personalQuota = u.personalQuota || 0;

                  return (
                    <tr key={u.userId || u.chatId || index} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {globalIndex}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                            {u.firstName ? u.firstName[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span>{u.firstName} {u.lastName}</span>
                              {u.referredByUserId && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-purple-950/80 text-purple-300 border border-purple-800 rounded font-mono">
                                  Ref
                                </span>
                              )}
                            </div>
                            {u.username ? (
                              <a
                                href={`https://t.me/${u.username}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-0.5"
                              >
                                @{u.username}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-500 font-mono">Tanpa username</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-4 font-mono font-medium text-amber-300">
                        <div className="flex items-center gap-1.5">
                          <span>{u.userId || u.chatId}</span>
                          <button
                            onClick={() => handleCopy(u.userId || u.chatId)}
                            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                            title="Salin User ID"
                          >
                            {copiedId === (u.userId || u.chatId) ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 pr-4">
                        {u.isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[11px] font-medium">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>Terverifikasi</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800 text-[11px] font-medium">
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                            <span>Wajib /id</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center gap-1 font-semibold text-xs text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60 font-mono">
                            <Coins className="w-3 h-3 text-amber-400" />
                            <span>{personalQuota}x Kuota</span>
                          </div>
                          {savings > 0 && (
                            <div className="inline-flex items-center gap-1 text-[11px] text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/60 font-mono">
                              <span>💼 {savings}x Tabung</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1 text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono ${
                              hasClaimedNew
                                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-900/60'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                            title="Status klaim bonus pengguna baru"
                          >
                            {hasClaimedNew ? 'Baru: Klaim ✓' : 'Baru: Belum'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono ${
                              hasDailyClaim
                                ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-900/60'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                            title="Status klaim harian"
                          >
                            {hasDailyClaim ? 'Harian: Klaim ✓' : 'Harian: Siap'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                          <span>{country.flag}</span>
                          <span>{country.label}</span>
                        </span>
                      </td>

                      <td className="py-3 pr-4 font-mono text-slate-300">
                        {u.totalMessages}x
                      </td>

                      <td className="py-3 pr-4 text-slate-400 font-mono text-[11px]">
                        {new Date(u.lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </td>

                      <td className="py-3 pr-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {onGiftQuota && (
                            <button
                              onClick={() => {
                                setSelectedUserForGift(u);
                                setGiftAmount(5);
                                setGiftNotes('Bonus Kuota dari Admin');
                              }}
                              title="Hadiahkan Kuota Tambahan"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
                            >
                              <Gift className="w-3 h-3 text-amber-400" />
                              <span>+Kuota</span>
                            </button>
                          )}
                          {onToggleVerification && (
                            <button
                              onClick={() => onToggleVerification(u.chatId, Boolean(u.isVerified))}
                              title={u.isVerified ? 'Cabut Verifikasi' : 'Verifikasi Pengguna Ini'}
                              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                u.isVerified
                                  ? 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border-amber-800'
                                  : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800'
                              }`}
                            >
                              {u.isVerified ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={() => onSelectUserForChat(u.chatId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span>Kirim Pesan</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {pageSize > 0 && totalFiltered > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-400">
          <div>
            Menampilkan <span className="font-semibold text-slate-200">{Math.min(totalFiltered, (safeCurrentPage - 1) * pageSize + 1)}</span> - <span className="font-semibold text-slate-200">{Math.min(totalFiltered, safeCurrentPage * pageSize)}</span> dari <span className="font-semibold text-purple-400">{totalFiltered}</span> total pengguna terdaftar.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <span className="px-3 py-1 bg-slate-950 rounded-xl border border-slate-800 font-mono text-slate-300">
              Hal {safeCurrentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 flex items-center gap-1"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Gift Quota Modal */}
      {selectedUserForGift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h4 className="text-base font-bold text-slate-100">Beri Hadiah Kuota OSINT</h4>
              </div>
              <button
                onClick={() => setSelectedUserForGift(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 text-xs space-y-1">
              <div className="text-slate-400">Penerima:</div>
              <div className="font-semibold text-slate-200 text-sm">
                {selectedUserForGift.firstName} {selectedUserForGift.lastName} ({selectedUserForGift.username ? `@${selectedUserForGift.username}` : 'Tanpa username'})
              </div>
              <div className="font-mono text-amber-400">
                Chat ID: {selectedUserForGift.chatId} • Kuota Saat Ini: {selectedUserForGift.personalQuota || 0}x
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Jumlah Kuota Tambahan (+x Pencarian):
              </label>
              <div className="flex items-center gap-2 mb-2">
                {[5, 10, 25, 50].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setGiftAmount(amt)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      giftAmount === amt
                        ? 'bg-amber-600 text-white border-amber-500 shadow'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="10000"
                value={giftAmount}
                onChange={(e) => setGiftAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Catatan / Pesan untuk Pengguna (opsional):
              </label>
              <input
                type="text"
                value={giftNotes}
                onChange={(e) => setGiftNotes(e.target.value)}
                placeholder="cth: Hadiah loyalitas dari Owner"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedUserForGift(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isGifting}
                onClick={submitGiftQuota}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>{isGifting ? 'Mengirim Hadiah...' : `Kirim +${giftAmount} Kuota`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
