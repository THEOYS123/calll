import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Download,
  Trash2,
  Search,
  AlertTriangle,
  User,
  Clock,
  Key,
  Database,
  ExternalLink,
  Copy,
  Check,
  Eye,
  X,
  ShieldAlert,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { OsintSearchHistoryItem } from '../types';
import { OsintD3Charts } from './OsintD3Charts';

interface OsintHistoryPanelProps {
  searchHistories: OsintSearchHistoryItem[];
  onDeleteHistory: (id: string) => Promise<void>;
  onClearHistory: (chatId?: number) => Promise<void>;
}

// Stagger animation variants for smooth, reactive list transitions
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 26
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.97,
    transition: {
      duration: 0.18,
      ease: 'easeOut'
    }
  }
};

const statCardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: custom * 0.06,
      duration: 0.35,
      ease: 'easeOut'
    }
  })
};

export function OsintHistoryPanel({
  searchHistories,
  onDeleteHistory,
  onClearHistory
}: OsintHistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [selectedD3Keyword, setSelectedD3Keyword] = useState<string>('');
  const [activeItemModal, setActiveItemModal] = useState<OsintSearchHistoryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Extract unique users from history
  const uniqueUsers = useMemo(() => {
    const map = new Map<number, { chatId: number; userName: string; usernameTag?: string }>();
    searchHistories.forEach((item) => {
      if (!map.has(item.chatId)) {
        map.set(item.chatId, {
          chatId: item.chatId,
          userName: item.userName,
          usernameTag: item.usernameTag
        });
      }
    });
    return Array.from(map.values());
  }, [searchHistories]);

  // Filtered histories
  const filteredHistories = useMemo(() => {
    return searchHistories.filter((item) => {
      const matchSearch =
        item.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.chatId).includes(searchTerm) ||
        item.apiKey.toLowerCase().includes(searchTerm.toLowerCase());

      const matchUser =
        selectedUserFilter === 'all' || String(item.chatId) === selectedUserFilter;

      return matchSearch && matchUser;
    });
  }, [searchHistories, searchTerm, selectedUserFilter]);

  // Summary statistics
  const totalSearches = searchHistories.length;
  const totalDataFound = useMemo(() => {
    return searchHistories.reduce((acc, curr) => acc + (curr.totalMatches || 0), 0);
  }, [searchHistories]);
  const highVolumeCount = useMemo(() => {
    return searchHistories.filter((item) => item.totalMatches > 50).length;
  }, [searchHistories]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    setIsDeletingId(id);
    try {
      await onDeleteHistory(id);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    try {
      const filterChatId = selectedUserFilter !== 'all' ? Number(selectedUserFilter) : undefined;
      await onClearHistory(filterChatId);
      setShowClearConfirm(false);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6" id="osint-history-panel">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Riwayat & Arsip Pencarian OSINT
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md text-[10px] font-semibold">
                  Tersimpan Per Pengguna
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Setiap hasil pencarian tersimpan utuh tanpa dipersingkat. Dilengkapi animasi reaktif, unduh berkas, dan proteksi anti-crash smartphone (&gt; 50 data).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {searchHistories.length > 0 && (
              <button
                id="btn-clear-history"
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{selectedUserFilter === 'all' ? 'Bersihkan Semua Riwayat' : 'Hapus Riwayat User Ini'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Safety Crash Warning Notice */}
        <div className="mt-4 p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-start gap-3">
          <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400 mt-0.5 flex-shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-xs text-amber-200/90 leading-relaxed">
            <span className="font-semibold text-amber-300">Proteksi Anti-Crash Smartphone (&gt; 50 Data): </span>
            Bila pencarian menghasilkan lebih dari 50 baris data intelijen, bot Telegram secara otomatis memunculkan peringatan bahaya lag/freeze dan menyediakan tombol <span className="underline font-semibold">Download File (.txt/.json)</span> agar smartphone pengguna tidak mengalami forced close.
          </div>
        </div>

        {/* Quick Stats Grid with Stagger Animation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <motion.div
            custom={0}
            variants={statCardVariants}
            initial="hidden"
            animate="visible"
            className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Total Pencarian</span>
              <p className="text-lg font-bold text-slate-100">{totalSearches}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </motion.div>

          <motion.div
            custom={1}
            variants={statCardVariants}
            initial="hidden"
            animate="visible"
            className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Total Data/Record Intel</span>
              <p className="text-lg font-bold text-emerald-400">{totalDataFound} data</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </motion.div>

          <motion.div
            custom={2}
            variants={statCardVariants}
            initial="hidden"
            animate="visible"
            className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Pencarian &gt; 50 Data (Warning)</span>
              <p className="text-lg font-bold text-amber-400">{highVolumeCount}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* D3.js Charts Visualization: Daily Search Volume & Frequency of Top Search Keywords */}
      <OsintD3Charts
        searchHistories={searchHistories}
        selectedKeyword={selectedD3Keyword}
        onSelectKeyword={(kw) => {
          if (kw === selectedD3Keyword) {
            setSelectedD3Keyword('');
            setSearchTerm('');
          } else {
            setSelectedD3Keyword(kw);
            setSearchTerm(kw);
          }
        }}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-history"
            type="text"
            placeholder="Cari target (nama, NIK, HP), Chat ID, atau API Key..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* User filter selector */}
        <div className="w-full sm:w-72">
          <select
            id="select-user-history-filter"
            value={selectedUserFilter}
            onChange={(e) => setSelectedUserFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 transition-colors"
          >
            <option value="all">Semua Pengguna ({uniqueUsers.length} orang)</option>
            {uniqueUsers.map((u) => (
              <option key={u.chatId} value={String(u.chatId)}>
                {u.userName} ({u.chatId}) {u.usernameTag && u.usernameTag !== '-' ? u.usernameTag : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* History Items List with Staggered Entrance Animation */}
      {filteredHistories.length === 0 ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <Database className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">Belum Ada Riwayat Pencarian</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {searchHistories.length === 0
              ? 'Ketika ada pengguna yang menjalankan perintah search: <target> <apiKey> di Telegram, hasilnya akan otomatis terarsip di sini.'
              : 'Tidak ada riwayat yang cocok dengan kata kunci atau filter pengguna yang dipilih.'}
          </p>
        </div>
      ) : (
        <motion.div
          key={`history-list-${selectedUserFilter}-${searchTerm ? 'filtered' : 'all'}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredHistories.map((item) => {
              const isHighVolume = item.totalMatches > 50;
              return (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  layout
                  className={`bg-slate-900/90 border rounded-2xl p-4 transition-colors hover:border-cyan-500/40 shadow-sm ${
                    isHighVolume ? 'border-amber-500/30' : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Target & User Information */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          🎯 <span className="text-cyan-300 font-mono">{item.target}</span>
                        </span>

                        {/* Total Matches Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                            isHighVolume
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isHighVolume && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                          <span>{item.totalMatches} Data Ditemukan</span>
                        </span>

                        {isHighVolume && (
                          <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded text-[10px] font-medium flex items-center gap-1">
                            <Smartphone className="w-2.5 h-2.5" /> Peringatan Crash HP Aktif
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-300 font-medium">{item.userName}</span>
                          {item.usernameTag && item.usernameTag !== '-' && (
                            <span className="text-cyan-400">({item.usernameTag})</span>
                          )}
                          <span className="text-slate-500 font-mono">[{item.chatId}]</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <Key className="w-3 h-3 text-slate-500" />
                          Key: <span className="font-mono text-slate-300">{item.apiKey}</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {item.formattedWib}
                        </span>
                      </div>
                    </div>

                    {/* Actions buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View full result modal button */}
                      <button
                        id={`btn-view-${item.id}`}
                        onClick={() => setActiveItemModal(item)}
                        className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Lengkap</span>
                      </button>

                      {/* Direct download .TXT */}
                      <a
                        href={`/api/bot/osint/download/${item.id}?format=txt`}
                        download={`osint_${item.target}_${item.id}.txt`}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>.TXT</span>
                      </a>

                      {/* Direct download .JSON */}
                      <a
                        href={`/api/bot/osint/download/${item.id}?format=json`}
                        download={`osint_${item.target}_${item.id}.json`}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>.JSON</span>
                      </a>

                      {/* Delete single item */}
                      <button
                        id={`btn-delete-${item.id}`}
                        onClick={() => handleDelete(item.id)}
                        disabled={isDeletingId === item.id}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all disabled:opacity-50 active:scale-95"
                        title="Hapus riwayat ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal: View Full Unshortened Result */}
      {activeItemModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    🎯 Hasil Lengkap: <span className="text-cyan-300 font-mono">{activeItemModal.target}</span>
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold">
                    {activeItemModal.totalMatches} Data
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Dicari oleh {activeItemModal.userName} (Chat ID: {activeItemModal.chatId}) • Waktu: {activeItemModal.formattedWib}
                </p>
              </div>

              <button
                onClick={() => setActiveItemModal(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning banner if > 50 records */}
            {activeItemModal.totalMatches > 50 && (
              <div className="p-3 bg-amber-950/60 border-b border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Peringatan Volume Data Tinggi:</strong> Terdapat {activeItemModal.totalMatches} baris data intelijen lengkap tanpa dipersingkat.
                </span>
              </div>
            )}

            {/* Modal Body / Raw Content */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs bg-slate-950 text-slate-200 select-all scrollbar-thin">
              <pre className="whitespace-pre-wrap break-words">{activeItemModal.rawResult}</pre>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  id="btn-copy-modal-content"
                  onClick={() => handleCopy(activeItemModal.rawResult, activeItemModal.id)}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {copiedId === activeItemModal.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Berhasil Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Seluruh Hasil</span>
                    </>
                  )}
                </button>

                <a
                  href={`/api/bot/osint/download/${activeItemModal.id}?format=txt`}
                  download={`osint_${activeItemModal.target}_${activeItemModal.id}.txt`}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download .TXT</span>
                </a>

                <a
                  href={`/api/bot/osint/download/${activeItemModal.id}?format=json`}
                  download={`osint_${activeItemModal.target}_${activeItemModal.id}.json`}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download .JSON</span>
                </a>
              </div>

              <button
                onClick={() => setActiveItemModal(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing History */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Konfirmasi Pembersihan Riwayat</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedUserFilter === 'all'
                    ? 'Apakah Anda yakin ingin menghapus SELURUH riwayat pencarian OSINT dari semua pengguna?'
                    : `Hanya menghapus riwayat untuk pengguna terpilih (Chat ID: ${selectedUserFilter})?`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleClear}
                disabled={isClearing}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {isClearing ? 'Membersihkan...' : 'Ya, Bersihkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
