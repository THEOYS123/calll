import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Terminal,
  Trash2,
  Filter,
  RefreshCw,
  Search,
  Radio,
  ArrowDownCircle,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
  ShieldAlert,
  Copy,
  Check,
  Sliders,
  BellRing,
  X,
  History
} from 'lucide-react';
import { BotLogEntry, SpikeAlertItem } from '../types';

interface LiveConsoleLogsProps {
  logs: BotLogEntry[];
  isActive: boolean;
  onClearLogs: () => Promise<void>;
  onRefresh: () => void;
  spikeAlerts?: SpikeAlertItem[];
}

export interface SpikeDetectionRecord {
  id: string;
  timestamp: string;
  formattedTime: string;
  queryCount: number;
  threshold: number;
  suspectChatId?: string | number;
  suspectUser?: string;
  targetSample?: string;
  acknowledged: boolean;
}

// Web Audio API Synthesizer for high-tech warning sound
function playWarningChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc1.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.18); // D5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(293.66, ctx.currentTime + 0.18);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.22);
    osc2.stop(ctx.currentTime + 0.22);
  } catch (err) {
    // Ignore audio permission or context restrictions
  }
}

export function LiveConsoleLogs({
  logs,
  isActive,
  onClearLogs,
  onRefresh,
  spikeAlerts: externalSpikeAlerts
}: LiveConsoleLogsProps) {
  const [filterType, setFilterType] = useState<'all' | 'incoming' | 'outgoing' | 'callback' | 'error' | 'warn'>('all');
  const [search, setSearch] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Threshold-based Spike Alert States
  const [alertThreshold, setAlertThreshold] = useState<number>(5); // 5 queries in sliding window
  const [windowSeconds, setWindowSeconds] = useState<number>(30); // 30 seconds sliding window
  const [audioAlertEnabled, setAudioAlertEnabled] = useState<boolean>(true);
  const [activeSpike, setActiveSpike] = useState<SpikeDetectionRecord | null>(null);
  const [spikeHistory, setSpikeHistory] = useState<SpikeDetectionRecord[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showThresholdSettings, setShowThresholdSettings] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const lastAlertTimestampRef = useRef<number>(0);

  // Real-time Detection Engine (Threshold-Based Suspicious Spike Scanner)
  useEffect(() => {
    if (!logs || logs.length === 0) return;

    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // Filter search-like logs within window
    // Matches logs containing "Hasil OSINT", "search", "/osint", "cari:", short input, or warning spikes
    const searchLogsInWindow = logs.filter((log) => {
      const logTime = new Date(log.timestamp).getTime();
      if (isNaN(logTime) || now - logTime > windowMs) return false;

      const lower = (log.text || '').toLowerCase();
      const isSearchLog =
        lower.includes('osint') ||
        lower.includes('search') ||
        lower.includes('cari') ||
        lower.includes('dataset') ||
        log.type === 'outgoing' ||
        log.text.startsWith('"') ||
        lower.includes('suspicious search spike');

      return isSearchLog;
    });

    const recentCount = searchLogsInWindow.length;

    // Check if threshold breached
    if (recentCount >= alertThreshold) {
      // Cooldown between repeating same alert: 15 seconds
      if (now - lastAlertTimestampRef.current > 15000) {
        lastAlertTimestampRef.current = now;

        // Find suspect user / chat ID with highest queries
        const userFrequency = new Map<string, { count: number; name?: string; chatId?: string | number }>();
        searchLogsInWindow.forEach((l) => {
          const key = String(l.chatId || l.fromUser || 'Anonymous');
          const cur = userFrequency.get(key) || { count: 0, name: l.fromUser, chatId: l.chatId };
          cur.count += 1;
          userFrequency.set(key, cur);
        });

        let topSuspectKey = '';
        let topSuspectCount = 0;
        userFrequency.forEach((val, key) => {
          if (val.count > topSuspectCount) {
            topSuspectCount = val.count;
            topSuspectKey = key;
          }
        });

        const suspectInfo = userFrequency.get(topSuspectKey);
        const sampleQuery = searchLogsInWindow[0]?.text || 'Query Intelijen';

        const newAlert: SpikeDetectionRecord = {
          id: `spike_${now}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          formattedTime: new Date().toLocaleTimeString('id-ID'),
          queryCount: recentCount,
          threshold: alertThreshold,
          suspectChatId: suspectInfo?.chatId,
          suspectUser: suspectInfo?.name || 'Anonim',
          targetSample: sampleQuery.length > 50 ? sampleQuery.substring(0, 48) + '...' : sampleQuery,
          acknowledged: false
        };

        setActiveSpike(newAlert);
        setSpikeHistory((prev) => [newAlert, ...prev.slice(0, 24)]);

        if (audioAlertEnabled) {
          playWarningChime();
        }
      }
    }
  }, [logs, alertThreshold, windowSeconds, audioAlertEnabled]);

  // Sync with external server-provided spike alerts if any
  useEffect(() => {
    if (externalSpikeAlerts && externalSpikeAlerts.length > 0) {
      const latest = externalSpikeAlerts[0];
      const now = Date.now();
      const alertTime = new Date(latest.timestamp).getTime();
      if (!isNaN(alertTime) && now - alertTime < 45000 && !activeSpike) {
        setActiveSpike({
          id: latest.id,
          timestamp: latest.timestamp,
          formattedTime: new Date(latest.timestamp).toLocaleTimeString('id-ID'),
          queryCount: latest.queryCount,
          threshold: latest.threshold || alertThreshold,
          suspectChatId: latest.chatId,
          suspectUser: latest.userName,
          targetSample: latest.targetSample || latest.details,
          acknowledged: false
        });
      }
    }
  }, [externalSpikeAlerts]);

  const handleCopyChatId = (chatId: string | number) => {
    navigator.clipboard.writeText(String(chatId));
    setCopiedId(String(chatId));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDismissSpike = () => {
    if (activeSpike) {
      setSpikeHistory((prev) =>
        prev.map((item) => (item.id === activeSpike.id ? { ...item, acknowledged: true } : item))
      );
    }
    setActiveSpike(null);
  };

  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'all') {
      if (filterType === 'warn') {
        if (log.type !== 'warn' && !log.text.toLowerCase().includes('spike') && !log.text.toLowerCase().includes('anti-flood')) {
          return false;
        }
      } else if (log.type !== filterType) {
        return false;
      }
    }

    if (search) {
      const term = search.toLowerCase();
      const textMatch = log.text.toLowerCase().includes(term);
      const userMatch = log.fromUser ? log.fromUser.toLowerCase().includes(term) : false;
      const chatMatch = log.chatId ? String(log.chatId).includes(term) : false;
      return textMatch || userMatch || chatMatch;
    }
    return true;
  });

  return (
    <div id="live-console-logs" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 flex items-center justify-center shadow-inner">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Live Console & Log Aktivitas Telegram
              </h3>
              {isActive && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Streaming
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pantau seluruh pesan masuk, respon otomatis, penekanan tombol menu, dan sistem alert lonjakan pencarian mencurigakan.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Threshold alert settings toggle */}
          <button
            onClick={() => setShowThresholdSettings(!showThresholdSettings)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
              showThresholdSettings
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700/60'
            }`}
            title="Konfigurasi Ambang Batas (Threshold Alert)"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Threshold: {alertThreshold}x</span>
          </button>

          {/* Sound alert toggle */}
          <button
            onClick={() => {
              const next = !audioAlertEnabled;
              setAudioAlertEnabled(next);
              if (next) playWarningChime();
            }}
            className={`p-2 rounded-lg border transition-colors ${
              audioAlertEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
            }`}
            title={audioAlertEnabled ? 'Suara Alert: AKTIF' : 'Suara Alert: BISU'}
          >
            {audioAlertEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* History of spikes button */}
          {spikeHistory.length > 0 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all"
              title="Lihat riwayat lonjakan pencarian mencurigakan"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>{spikeHistory.length} Alert</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/60"
            title="Muat ulang log"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClearLogs}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700/80 rounded-lg transition-colors border border-slate-700/60"
            title="Bersihkan histori log"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan</span>
          </button>
        </div>
      </div>

      {/* Threshold Configuration Drawer (If Opened) */}
      {showThresholdSettings && (
        <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">
                Pengaturan Ambang Batas Alert Lonjakan (Threshold-Based Spike Alert)
              </span>
            </div>
            <button
              onClick={() => setShowThresholdSettings(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕ Tutup
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">
                Pilih Ambang Batas Jumlah Pencarian (Query Threshold):
              </label>
              <div className="flex items-center gap-1.5">
                {[3, 5, 8, 10, 15].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAlertThreshold(val)}
                    className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all ${
                      alertThreshold === val
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {val}x
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Alert berbunyi bila pencarian mencapai &ge; {alertThreshold} query dalam rentang waktu {windowSeconds} detik.
              </span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">
                Jendela Waktu Analisis (Sliding Window):
              </label>
              <div className="flex items-center gap-1.5">
                {[15, 30, 60, 120].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setWindowSeconds(sec)}
                    className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all ${
                      windowSeconds === sec
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {sec}d
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Evaluasi real-time mendeteksi pola scraper otomatis dan query flood beruntun.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PROMINENT THRESHOLD-BASED SPIKE ALERT BANNER */}
      {activeSpike && (
        <div className="p-4 bg-gradient-to-r from-rose-950/90 via-rose-900/40 to-amber-950/80 border-2 border-rose-500/80 rounded-xl shadow-2xl shadow-rose-950/50 space-y-3 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/30 text-rose-300 border border-rose-400 flex items-center justify-center flex-shrink-0 animate-bounce">
                <Flame className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-rose-200 tracking-wide uppercase flex items-center gap-1.5">
                    🚨 LONJAKAN PENCARIAN MENCURIGAKAN TERDETEKSI!
                  </h4>
                  <span className="px-2 py-0.5 bg-rose-500 text-slate-950 font-black font-mono text-[10px] rounded-full">
                    THRESHOLD BREACHED
                  </span>
                </div>
                <p className="text-xs text-rose-200/90 mt-0.5">
                  Terdeteksi aktivitas query berulang yang melampaui batas kewajaran operasional.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDismissSpike}
                className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Meredamkan notifikasi alert ini"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Meredamkan Alert</span>
              </button>
            </div>
          </div>

          {/* Metric Details Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-rose-500/30 text-xs font-mono">
            <div className="bg-slate-950/60 p-2 rounded-lg border border-rose-500/20">
              <span className="text-[10px] text-rose-300/70 block">Volume Lonjakan:</span>
              <span className="text-sm font-bold text-rose-300">
                {activeSpike.queryCount} query / {windowSeconds}s
              </span>
            </div>

            <div className="bg-slate-950/60 p-2 rounded-lg border border-rose-500/20">
              <span className="text-[10px] text-rose-300/70 block">Ambang Batas (Threshold):</span>
              <span className="text-sm font-bold text-amber-300">
                &ge; {activeSpike.threshold} query
              </span>
            </div>

            <div className="bg-slate-950/60 p-2 rounded-lg border border-rose-500/20">
              <span className="text-[10px] text-rose-300/70 block">Chat ID Terduga:</span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 truncate">
                  {activeSpike.suspectChatId || '-'}
                </span>
                {activeSpike.suspectChatId && (
                  <button
                    onClick={() => handleCopyChatId(activeSpike.suspectChatId!)}
                    className="text-slate-400 hover:text-white ml-1"
                    title="Salin Chat ID"
                  >
                    {copiedId === String(activeSpike.suspectChatId) ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-950/60 p-2 rounded-lg border border-rose-500/20">
              <span className="text-[10px] text-rose-300/70 block">Waktu Insiden:</span>
              <span className="text-xs font-bold text-slate-300">
                {activeSpike.formattedTime} WIB
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <span className="text-slate-500 text-[11px] mr-1">Filter:</span>
          {(['all', 'incoming', 'outgoing', 'callback', 'warn', 'error'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-colors ${
                filterType === type
                  ? 'bg-slate-700 text-slate-100 font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {type === 'all' && 'Semua'}
              {type === 'incoming' && '📥 Masuk'}
              {type === 'outgoing' && '📤 Terkirim'}
              {type === 'callback' && '🔘 Tombol'}
              {type === 'warn' && '🚨 Alert Lonjakan'}
              {type === 'error' && '⚠️ Error'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pesan / chat ID / kata kunci..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 font-mono"
          />
        </div>
      </div>

      {/* Terminal View */}
      <div
        ref={logContainerRef}
        className="bg-[#090d16] border border-slate-800/90 rounded-xl p-4 font-mono text-xs max-h-96 overflow-y-auto space-y-2 select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            {isActive ? (
              <div className="flex flex-col items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
                <span>Menunggu aktivitas pesan Telegram... Silakan ketik /id atau /bot di Telegram Anda.</span>
              </div>
            ) : (
              <span>Bot sedang nonaktif (OFF). Nyalakan bot untuk mulai melihat log aktivitas live.</span>
            )}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`p-2 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-start gap-2 ${
                log.type === 'incoming'
                  ? 'bg-cyan-950/20 border-cyan-900/30 text-cyan-200'
                  : log.type === 'outgoing'
                  ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-200'
                  : log.type === 'callback'
                  ? 'bg-indigo-950/20 border-indigo-900/30 text-indigo-200'
                  : log.type === 'warn' || log.text.includes('SUSPICIOUS SEARCH SPIKE')
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/20'
                  : log.type === 'error'
                  ? 'bg-rose-950/30 border-rose-900/40 text-rose-300'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400'
              }`}
            >
              {/* Timestamp & Type Pill */}
              <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px] text-slate-400 font-mono">
                <span>{new Date(log.timestamp).toLocaleTimeString('id-ID')}</span>
                <span
                  className={`px-1.5 py-0.2 rounded uppercase font-bold text-[9px] ${
                    log.type === 'incoming'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : log.type === 'outgoing'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : log.type === 'callback'
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : log.type === 'warn' || log.text.includes('SUSPICIOUS SEARCH SPIKE')
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                      : log.type === 'error'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {log.type === 'warn' || log.text.includes('SUSPICIOUS SEARCH SPIKE') ? 'ALERT' : log.type}
                </span>
              </div>

              {/* Chat ID & User Info */}
              {(log.chatId || log.fromUser) && (
                <div className="flex items-center gap-1 text-[11px] text-amber-300/90 flex-shrink-0">
                  {log.fromUser && <span>[{log.fromUser}]</span>}
                  {log.chatId && <span className="opacity-75">ID: {log.chatId}</span>}
                </div>
              )}

              {/* Text content */}
              <div className="flex-1 break-words leading-relaxed font-mono">
                {log.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>Menampilkan {filteredLogs.length} dari total {logs.length} catatan log.</span>
          <span className="flex items-center gap-1 text-amber-400/80">
            <BellRing className="w-3 h-3" />
            Ambang batas spike: {alertThreshold}x query / {windowSeconds}s
          </span>
        </div>
        <span>Interval polling auto-refresh: 2.5 detik</span>
      </div>

      {/* Spike Alert History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Riwayat Alert Lonjakan Pencarian
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-xs">
              {spikeHistory.length === 0 ? (
                <p className="text-slate-500 text-center py-6">Belum ada riwayat lonjakan tercatat.</p>
              ) : (
                spikeHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-rose-400 font-bold">
                        🚨 {item.queryCount} Pencarian (Threshold: {item.threshold}x)
                      </span>
                      <span className="text-slate-400">{item.formattedTime} WIB</span>
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      Pengguna: <span className="font-semibold text-white">{item.suspectUser}</span> | ID:{' '}
                      <span className="font-mono text-cyan-300">{item.suspectChatId || '-'}</span>
                    </div>
                    {item.targetSample && (
                      <div className="text-slate-400 text-[10px] truncate">
                        Target Sample: <span className="text-slate-300">{item.targetSample}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setSpikeHistory([])}
                className="text-xs text-rose-400 hover:underline"
              >
                Hapus Riwayat Alert
              </button>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
