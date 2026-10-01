import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Radio,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Download,
  Bot,
  Users,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  CornerDownRight,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';
import { MessageLogEntry, MultiBotInstance, TelegramBotInfo } from '../types';

interface MessageTrafficMonitorPanelProps {
  messageLogs?: MessageLogEntry[];
  multiBots?: MultiBotInstance[];
  primaryBotInfo?: TelegramBotInfo | null;
  isPrimaryActive?: boolean;
  onSendReply?: (botTokenOrId: string, chatId: number | string, text: string) => Promise<{ success: boolean; message: string }>;
  onClearLogs?: () => void;
  onRefresh?: () => void;
  onShowToast: (text: string, type: 'success' | 'error') => void;
}

export function MessageTrafficMonitorPanel({
  messageLogs = [],
  multiBots = [],
  primaryBotInfo,
  isPrimaryActive,
  onSendReply,
  onClearLogs,
  onRefresh,
  onShowToast
}: MessageTrafficMonitorPanelProps) {
  const [selectedBotFilter, setSelectedBotFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [chatTypeFilter, setChatTypeFilter] = useState<'all' | 'private' | 'group'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'filtered' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick Reply Modal State
  const [quickReplyTarget, setQuickReplyTarget] = useState<MessageLogEntry | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replyBotId, setReplyBotId] = useState<string>('primary');
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    onShowToast('Teks berhasil disalin ke clipboard!', 'success');
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return messageLogs.filter((log) => {
      // Bot filter
      if (selectedBotFilter !== 'all') {
        if (selectedBotFilter === 'primary' && !log.isPrimaryBot) return false;
        if (selectedBotFilter !== 'primary' && log.botId !== selectedBotFilter) return false;
      }

      // Direction filter
      if (directionFilter !== 'all' && log.direction !== directionFilter) return false;

      // Chat type filter
      if (chatTypeFilter === 'private' && log.chatType !== 'private') return false;
      if (chatTypeFilter === 'group' && log.chatType !== 'group' && log.chatType !== 'supergroup') return false;

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'delivered' && log.status !== 'delivered' && log.status !== 'handled') return false;
        if (statusFilter === 'filtered' && log.status !== 'filtered') return false;
        if (statusFilter === 'failed' && log.status !== 'failed') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchText = log.text?.toLowerCase().includes(q);
        const matchUser = log.userName?.toLowerCase().includes(q) || log.usernameTag?.toLowerCase().includes(q);
        const matchChatId = String(log.chatId).includes(q);
        const matchUserId = log.userId ? String(log.userId).includes(q) : false;
        const matchBot = log.botUsername?.toLowerCase().includes(q) || log.botName?.toLowerCase().includes(q);
        const matchTitle = log.chatTitle?.toLowerCase().includes(q);
        return matchText || matchUser || matchChatId || matchUserId || matchBot || matchTitle;
      }

      return true;
    });
  }, [messageLogs, selectedBotFilter, directionFilter, chatTypeFilter, statusFilter, searchQuery]);

  // Quick stats
  const totalIncoming = useMemo(() => messageLogs.filter((l) => l.direction === 'incoming').length, [messageLogs]);
  const totalOutgoing = useMemo(() => messageLogs.filter((l) => l.direction === 'outgoing').length, [messageLogs]);
  const totalFiltered = useMemo(() => messageLogs.filter((l) => l.status === 'filtered').length, [messageLogs]);
  const totalActiveBots = useMemo(() => {
    let count = isPrimaryActive ? 1 : 0;
    count += multiBots.filter((b) => b.isActive).length;
    return count;
  }, [isPrimaryActive, multiBots]);

  // Export logs to JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `bot-traffic-logs-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('Berkas riwayat lalu lintas pesan berhasil diunduh.', 'success');
  };

  const handleOpenQuickReply = (log: MessageLogEntry) => {
    setQuickReplyTarget(log);
    setReplyBotId(log.isPrimaryBot ? 'primary' : log.botId);
    setReplyText(`Halo ${log.userName}, `);
  };

  const handleExecuteReply = async () => {
    if (!quickReplyTarget || !replyText.trim() || !onSendReply) return;
    setIsSendingReply(true);
    try {
      const res = await onSendReply(replyBotId, quickReplyTarget.chatId, replyText.trim());
      if (res.success) {
        onShowToast('Pesan balasan berhasil terkirim!', 'success');
        setQuickReplyTarget(null);
        setReplyText('');
      } else {
        onShowToast(`Gagal kirim: ${res.message}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Error kirim pesan: ${err.message}`, 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl shadow-lg shadow-cyan-600/30 text-white">
              <Radio className="w-8 h-8 animate-pulse text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black tracking-tight text-white">
                  Pemantau Pesan & Lalu Lintas Bot
                </h2>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Live Stream Realtime
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Pantau seluruh percakapan masuk & keluar secara transparan dari Bot Utama maupun seluruh Bot Cluster sekunder.
              </p>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              Segarkan
            </button>
            <button
              onClick={handleExportJson}
              disabled={filteredLogs.length === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              Export JSON
            </button>
            {onClearLogs && (
              <button
                onClick={onClearLogs}
                className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 border border-red-800/50 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                Bersihkan Log
              </button>
            )}
          </div>
        </div>

        {/* Real-time Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Pesan Masuk</span>
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-1.5">{totalIncoming}</div>
            <span className="text-[11px] text-emerald-400/90 font-medium">Dari DM & Grup</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Pesan Keluar</span>
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-1.5">{totalOutgoing}</div>
            <span className="text-[11px] text-blue-400/90 font-medium">Balasan & Hasil Search</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Dicegat Moderasi</span>
              <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-1.5">{totalFiltered}</div>
            <span className="text-[11px] text-red-400/90 font-medium">Auto-Delete Terlarang</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Bot Aktif Melayani</span>
              <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-1.5">{totalActiveBots} Node</div>
            <span className="text-[11px] text-purple-400/90 font-medium">Master & Cluster Bot</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pesan, username, nama pengirim, user ID, atau judul grup..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {/* Bot Instance Filter */}
          <select
            value={selectedBotFilter}
            onChange={(e) => setSelectedBotFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">🤖 Semua Bot ({1 + multiBots.length})</option>
            <option value="primary">👑 Bot Utama ({primaryBotInfo?.username ? `@${primaryBotInfo.username}` : 'Master'})</option>
            {multiBots.map((b, idx) => (
              <option key={b.id} value={b.id}>
                🌐 {b.botInfo?.username ? `@${b.botInfo.username}` : `Cluster Bot #${idx + 1}`}
              </option>
            ))}
          </select>

          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">↕️ Semua Arah</option>
            <option value="incoming">📥 Masuk Saja</option>
            <option value="outgoing">📤 Terkirim Saja</option>
          </select>

          {/* Chat Type Filter */}
          <select
            value={chatTypeFilter}
            onChange={(e) => setChatTypeFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">💬 Semua Tipe Chat</option>
            <option value="private">👤 Chat Pribadi (DM)</option>
            <option value="group">👥 Grup & Supergrup</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">🛡️ Semua Status</option>
            <option value="delivered">✅ Normal / Terkirim</option>
            <option value="filtered">🚫 Tercegat Moderasi</option>
            <option value="failed">⚠️ Gagal Kirim</option>
          </select>
        </div>
      </div>

      {/* Message List Table / Stream */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              Daftar Riwayat Percakapan ({filteredLogs.length} Pesan Ditampilkan)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Diurutkan dari pesan terbaru
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-16 h-16 bg-slate-800/80 rounded-2xl mx-auto flex items-center justify-center text-slate-500 mb-4 border border-slate-700/50">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-300">Belum Ada Riwayat Pesan Sesuai Filter</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Pesan yang dikirimkan oleh pengguna ke Bot Utama atau Bot Sekunder akan langsung muncul di sini secara otomatis.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 max-h-[650px] overflow-y-auto">
            {filteredLogs.map((log) => {
              const isIncoming = log.direction === 'incoming';
              const isGroup = log.chatType === 'group' || log.chatType === 'supergroup';
              const isFiltered = log.status === 'filtered';

              return (
                <div
                  key={log.id}
                  className={`p-4 sm:p-5 transition-colors hover:bg-slate-800/40 ${
                    isFiltered ? 'bg-red-950/20 border-l-4 border-red-500' : isIncoming ? 'border-l-4 border-emerald-500/80' : 'border-l-4 border-blue-500/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left Details */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Direction Icon Avatar */}
                      <div
                        className={`p-2.5 rounded-xl shrink-0 mt-0.5 shadow-md ${
                          isFiltered
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : isIncoming
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {isFiltered ? (
                          <ShieldAlert className="w-4 h-4" />
                        ) : isIncoming ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      {/* Content & Metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Sender / Recipient Name */}
                          <span className="font-bold text-sm text-white truncate max-w-[200px]">
                            {log.userName || 'Pengguna'}
                          </span>

                          {/* Username Tag */}
                          {log.usernameTag && log.usernameTag !== '-' && (
                            <span className="text-xs text-cyan-400 font-medium">{log.usernameTag}</span>
                          )}

                          {/* Chat Type Badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isGroup
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {isGroup ? `👥 ${log.chatTitle || 'Grup'}` : '👤 DM'}
                          </span>

                          {/* Bot Handler Tag */}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 flex items-center gap-1">
                            <Bot className="w-2.5 h-2.5" />
                            {log.botUsername ? `@${log.botUsername}` : log.botName}
                            {log.isPrimaryBot && ' (Master)'}
                          </span>

                          {/* Status Badge */}
                          {isFiltered && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                              🚫 Dicegat: {log.filterReason || 'Kata Terlarang'}
                            </span>
                          )}
                        </div>

                        {/* Message Text Bubble */}
                        <div className="mt-2 text-xs sm:text-sm text-slate-200 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 font-mono whitespace-pre-wrap break-words">
                          {log.text}
                        </div>

                        {/* Footer Sub-Info */}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {log.formattedWib || new Date(log.timestamp).toLocaleTimeString('id-ID')} WIB
                          </span>
                          <span>•</span>
                          <span>
                            Chat ID: <code className="text-slate-300">{log.chatId}</code>
                          </span>
                          {log.userId && (
                            <>
                              <span>•</span>
                              <span>
                                User ID: <code className="text-slate-300">{log.userId}</code>
                              </span>
                            </>
                          )}
                          {log.latencyMs && (
                            <>
                              <span>•</span>
                              <span className="text-cyan-400">⚡ {log.latencyMs}ms</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                      <button
                        onClick={() => handleCopy(log.text, log.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Salin Teks Pesan"
                      >
                        {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {onSendReply && isIncoming && (
                        <button
                          onClick={() => handleOpenQuickReply(log)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                          title="Balas pesan ini langsung dari website"
                        >
                          <CornerDownRight className="w-3 h-3 text-cyan-400" />
                          Balas
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Reply Modal */}
      {quickReplyTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-600/20 text-cyan-400 rounded-xl">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Kirim Balasan Cepat</h3>
                  <p className="text-xs text-slate-400">
                    Kirim pesan balasan langsung ke {quickReplyTarget.userName} (Chat ID: {quickReplyTarget.chatId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickReplyTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mt-4">
              {/* Target Message Preview */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <span className="text-slate-400 font-semibold block mb-1">Pesan yang Dibalas:</span>
                <p className="text-slate-300 italic line-clamp-2">"{quickReplyTarget.text}"</p>
              </div>

              {/* Sender Bot Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Kirim Menggunakan Bot:
                </label>
                <select
                  value={replyBotId}
                  onChange={(e) => setReplyBotId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="primary">
                    👑 Bot Master Utama ({primaryBotInfo?.username ? `@${primaryBotInfo.username}` : 'Master'})
                  </option>
                  {multiBots.map((b, i) => (
                    <option key={b.id} value={b.id}>
                      🌐 {b.botInfo?.username ? `@${b.botInfo.username}` : `Cluster Bot #${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Text Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Isi Pesan Balasan (Mendukung Markdown Telegram):
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Ketik pesan balasan..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setQuickReplyTarget(null)}
                  disabled={isSendingReply}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleExecuteReply}
                  disabled={isSendingReply || !replyText.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-600/30 disabled:opacity-50"
                >
                  {isSendingReply ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Kirim Balasan Sekarang
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
