import React, { useState } from 'react';
import {
  Users,
  MessageSquare,
  Copy,
  Check,
  Send,
  Clock,
  UserCheck,
  UserX,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Gift,
  Coins,
  X
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
  const [filterType, setFilterType] = useState<'all' | 'verified' | 'unverified'>('all');

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

  const verifiedCount = users.filter((u) => u.isVerified).length;
  const unverifiedCount = users.length - verifiedCount;

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    const matchesSearch =
      String(u.chatId).includes(term) ||
      u.firstName.toLowerCase().includes(term) ||
      (u.username && u.username.toLowerCase().includes(term));

    if (!matchesSearch) return false;
    if (filterType === 'verified') return u.isVerified;
    if (filterType === 'unverified') return !u.isVerified;
    return true;
  });

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
    <div id="active-users-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-100">
                Pengguna & Manajemen Kuota
              </h3>
              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs rounded-full font-mono font-semibold">
                {users.length} Kontak
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Daftar Chat ID pengguna terverifikasi, status anti-reset kuota, dan fitur hadiah kuota dari Web.
            </p>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua ({users.length})
            </button>
            <button
              onClick={() => setFilterType('verified')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterType === 'verified'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              ✅ Terverifikasi ({verifiedCount})
            </button>
            <button
              onClick={() => setFilterType('unverified')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterType === 'unverified'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              ⚠️ Belum ({unverifiedCount})
            </button>
          </div>

          {users.length > 0 && (
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, ID, user..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Users Table or Empty State */}
      <div className="mt-6">
        {users.length === 0 ? (
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
          <div className="py-8 text-center text-xs text-slate-400">
            Tidak ada pengguna yang cocok dengan filter atau pencarian &quot;{search}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="pb-3 pr-4">PENGGUNA</th>
                  <th className="pb-3 pr-4">CHAT ID</th>
                  <th className="pb-3 pr-4">STATUS VERIFIKASI</th>
                  <th className="pb-3 pr-4">KUOTA & JATAH KLAIM</th>
                  <th className="pb-3 pr-4">LOKASI</th>
                  <th className="pb-3 pr-4">PESAN</th>
                  <th className="pb-3 pr-4">TERAKHIR AKTIF</th>
                  <th className="pb-3 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredUsers.map((u) => {
                  const country = getCountryBadge(u.languageCode);
                  const hasClaimedNew = Boolean(u.hasClaimedNewUserQuota);
                  const hasDailyClaim = Boolean(u.dailyQuotaLastClaimedDate);

                  return (
                    <tr key={u.chatId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                            {u.firstName ? u.firstName[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100">{u.firstName} {u.lastName}</div>
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
                              <span className="text-[11px] text-slate-400">Tanpa username</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-4 font-mono font-medium text-amber-300">
                        <div className="flex items-center gap-1.5">
                          <span>{u.chatId}</span>
                          <button
                            onClick={() => handleCopy(u.chatId)}
                            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                            title="Salin Chat ID"
                          >
                            {copiedId === u.chatId ? (
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
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1 font-semibold text-xs text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60 font-mono">
                            <Coins className="w-3 h-3 text-amber-400" />
                            <span>{u.personalQuota || 0}x Kuota</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span
                              className={`px-1.5 py-0.2 rounded font-mono ${
                                hasClaimedNew
                                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-900/60'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                              title="Status klaim bonus pengguna baru (+5x)"
                            >
                              {hasClaimedNew ? 'Baru: Klaim ✓' : 'Baru: Belum'}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-mono ${
                                hasDailyClaim
                                  ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-900/60'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                              title="Status klaim harian (+2x)"
                            >
                              {hasDailyClaim ? 'Harian: Klaim ✓' : 'Harian: Siap'}
                            </span>
                          </div>
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

                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
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
