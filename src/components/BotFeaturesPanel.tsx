import React, { useState } from 'react';
import {
  MessageSquare,
  Bot,
  Sparkles,
  Zap,
  Clock,
  Send,
  CheckCircle2,
  Terminal,
  HelpCircle,
  ExternalLink,
  Code2,
  Copy,
  Check,
  ChevronRight
} from 'lucide-react';
import { TelegramBotInfo } from '../types';

interface BotFeaturesPanelProps {
  botInfo: TelegramBotInfo | null;
  isActive: boolean;
  onSelectFeatureForDirectMessage?: (commandText: string) => void;
}

export function BotFeaturesPanel({
  botInfo,
  isActive,
  onSelectFeatureForDirectMessage
}: BotFeaturesPanelProps) {
  const [activeTab, setActiveTab] = useState<
    'verif' | 'osint' | 'pricing' | 'owner' | 'cmenu' | 'id' | 'bot' | 'menu' | 'ping' | 'waktu' | 'calc' | 'auto'
  >('verif');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const botUsername = botInfo?.username || 'axxosintbot';

  return (
    <div id="bot-features-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Fitur-Fitur &amp; Menu Interaktif axxosintbot
          </div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Katalog Perintah &amp; Respon axxosintbot</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-normal">
              Created by Ax.
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Setiap perintah di bawah ini ditangani oleh engine backend axxosintbot buatan Ax. dan siap digunakan langsung di Telegram.
          </p>
        </div>

        {botInfo?.username && (
          <a
            href={`https://t.me/${botInfo.username}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-950/40 transition-all active:scale-95 whitespace-nowrap self-start sm:self-auto"
          >
            <span>Buka Bot di Telegram</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Feature Selector Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 pb-2">
        {[
          { id: 'verif', label: '🔒 Wajib Verifikasi', cmd: '/id' },
          { id: 'osint', label: '🔍 Server OSINT', cmd: 'search:' },
          { id: 'pricing', label: '💎 Tarif & Kuota', cmd: '/harga' },
          { id: 'owner', label: '👑 Menu Owner', cmd: 'ax0895' },
          { id: 'cmenu', label: '🗂️ Menu Kustom', cmd: 'Dinamis' },
          { id: 'id', label: '🆔 Cek Chat ID', cmd: '/id' },
          { id: 'bot', label: '🤖 Detail Bot', cmd: '/bot' },
          { id: 'menu', label: '📱 Menu Utama', cmd: '/menu' },
          { id: 'ping', label: '🏓 Ping & Status', cmd: '/ping' },
          { id: 'waktu', label: '⏰ Jam WIB', cmd: '/waktu' },
          { id: 'calc', label: '🧮 Kalkulator', cmd: '/calc' },
          { id: 'auto', label: '⚡ Auto-Replies', cmd: 'Keyword' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <span>{tab.label}</span>
            <span className="font-mono text-[10px] opacity-75 bg-slate-900/60 px-1.5 py-0.5 rounded">
              {tab.cmd}
            </span>
          </button>
        ))}
      </div>

      {/* Feature Detail Showcase */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Explanation Column */}
        <div className="lg:col-span-5 space-y-4">
          {activeTab === 'verif' && (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-mono font-medium">
                Alur Wajib: /start ➔ /id
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Pintu Verifikasi Akun Pengguna (/id)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ketika pengguna baru mengirim perintah <code className="text-cyan-300 font-mono">/start</code>, bot menginstruksikan pengguna untuk mengirim pesan <code className="text-amber-300 font-mono">/id</code> terlebih dahulu. Sebelum diverifikasi, seluruh fitur terkunci.
              </p>
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs space-y-1.5">
                <div className="font-semibold text-slate-200">Kelebihan Mekanisme Ini:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Mencegah bot spamming dan query otomatis tak terkendali.</li>
                  <li>Data Chat ID pengguna langsung terekam dan statusnya berubah ke <span className="text-emerald-400 font-semibold">Terverifikasi</span>.</li>
                  <li>Setelah verifikasi selesai, semua tombol menu langsung terbuka.</li>
                </ul>
              </div>
              <button
                onClick={() => handleCopy('/id')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
              >
                {copiedCmd === '/id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Salin Perintah: /id</span>
              </button>
            </div>
          )}

          {activeTab === 'osint' && (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-mono font-medium">
                Perintah: search: &lt;target&gt; &lt;apiKey&gt;
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Fitur Intelijen OSINT & Server Ngrok
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pencarian data intelijen terhubung langsung ke tunnel server Ngrok. Fitur ini <strong>hanya bisa digunakan bila diaktifkan oleh Owner</strong> dan pengguna menyertakan API Key yang memiliki kuota aktif.
              </p>
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs space-y-1.5">
                <div className="font-semibold text-slate-200">Ketentuan & Logika Proteksi:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Jika server OFF: Bot menolak dan menampilkan status OFF serta tombol kontak owner.</li>
                  <li>Jika server ON: Bot memverifikasi API Key dan kuota sebelum mengirim query ke Ngrok.</li>
                  <li>Jika koneksi Ngrok mati: Kuota API Key <strong>TIDAK akan dipotong</strong>.</li>
                </ul>
              </div>
              <button
                onClick={() => handleCopy('search: 08123456789 ppp')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
              >
                {copiedCmd === 'search: 08123456789 ppp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Salin Contoh: search: 08123456789 ppp</span>
              </button>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-mono font-medium">
                Perintah: /harga, /api, api &lt;key&gt;
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Daftar Harga & Deteksi Mata Uang Otomatis
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bot otomatis membaca kode bahasa akun Telegram pengguna untuk menampilkan mata uang lokal:
                <strong className="text-slate-100"> IDR (Rp), MYR (RM), SGD (S$), atau USD ($)</strong>.
              </p>
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs space-y-1.5">
                <div className="font-semibold text-slate-200">Sistem Bonus Kuota Ekstra:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Paket Rp 10.000 (15x pakai) ➔ Otomatis dapat +1x bonus pakai!</li>
                  <li>Paket Rp 50.000 (100x pakai) ➔ Otomatis dapat +2x bonus pakai!</li>
                  <li>Paket Unlimited Rp 100.000 ➔ Akses permanen tanpa batas kuota.</li>
                </ul>
              </div>
              <button
                onClick={() => handleCopy('api ppp')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
              >
                {copiedCmd === 'api ppp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Salin Cek Kuota: api ppp</span>
              </button>
            </div>
          )}

          {activeTab === 'owner' && (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs font-mono font-medium">
                Perintah Rahasia: ax0895
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Menu Rahasia Owner Bot (ax0895)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Owner dapat mengontrol seluruh operasi bot langsung dari aplikasi Telegram tanpa harus membuka browser web:
              </p>
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs space-y-1.5 font-mono">
                <div>• <code className="text-cyan-300">ax0895 on / off</code> (Nyalakan / matikan OSINT)</div>
                <div>• <code className="text-cyan-300">ax0895 ngrok &lt;url&gt;</code> (Ganti tunnel Ngrok)</div>
                <div>• <code className="text-cyan-300">ax0895 addkey &lt;key&gt; &lt;kuota&gt;</code> (Buat API Key)</div>
                <div>• <code className="text-cyan-300">ax0895 addmenu &lt;label&gt; | &lt;balasan&gt;</code> (Tambah Menu)</div>
                <div>• <code className="text-cyan-300">ax0895 test</code> (Tes ping server Ngrok)</div>
              </div>
              <button
                onClick={() => handleCopy('ax0895')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
              >
                {copiedCmd === 'ax0895' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Salin Perintah: ax0895</span>
              </button>
            </div>
          )}

          {activeTab === 'cmenu' && (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-mono font-medium">
                Menu Kustom Dinamis
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Sistem Menu Tambahan Tanpa Batas
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tambahkan tombol interaktif baru sesuai kebutuhan bisnis Anda kapan saja. Tombol langsung disisipkan secara otomatis ke inline keyboard menu utama di Telegram.
              </p>
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs space-y-1.5">
                <div className="font-semibold text-slate-200">Jenis Tombol:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong>Respon Teks:</strong> Menampilkan pesan kustom dengan format Markdown Telegram.</li>
                  <li><strong>Tautan URL:</strong> Membuka website, channel promosi, atau chat Telegram.</li>
                </ul>
              </div>
            </div>
          )}
          {activeTab === 'id' && (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-mono font-medium">
                Perintah: /id, /myid, /chatid
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Fitur Pengecekan Chat ID & Identitas Pengguna
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Fitur ini membaca objek pesan yang dikirim oleh pengguna dan mengembalikan nomor unik <strong>Chat ID</strong>, nama akun, username, jenis obrolan (Private atau Group), serta timestamp WIB saat pesan dikirim.
              </p>
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs space-y-1.5">
                <div className="font-semibold text-slate-200">Keunggulan Fitur:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Chat ID diformat dalam blok kode Telegram (bisa disalin hanya dengan 1 ketukan).</li>
                  <li>Pengguna langsung terdata di tabel Dashboard Web Controller.</li>
                  <li>Dapat dipanggil via teks maupun tombol inline.</li>
                </ul>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleCopy('/id')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
                >
                  {copiedCmd === '/id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin Perintah: /id</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'bot' && (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-mono font-medium">
                Perintah: /bot, /detail, /info, /about
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Detail & Spesifikasi Lengkap Bot Telegram
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Menyajikan informasi komprehensif mengenai bot: nama bot resmi, username bot (<code className="text-cyan-300">@{botUsername}</code>), ID unik bot, durasi uptime server, izin grup, dan jumlah total pesan yang telah diproses.
              </p>
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs space-y-1.5">
                <div className="font-semibold text-slate-200">Data yang Ditampilkan:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Nama & Username Bot Resmi Telegram</li>
                  <li>Status Online & Durasi Uptime Real-Time</li>
                  <li>Kemampuan Grup & Privasi</li>
                  <li>Koneksi ke Web Controller Dashboard</li>
                </ul>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleCopy('/bot')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
                >
                  {copiedCmd === '/bot' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin Perintah: /bot</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-mono font-medium">
                Perintah: /start atau /menu
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Menu Navigasi Interaktif & Inline Keyboard
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Saat pengguna mengetik <code className="text-cyan-300">/start</code> atau <code className="text-cyan-300">/menu</code>, bot memberikan ucapan selamat datang lengkap dengan tombol-tombol interaktif (Inline Keyboard) di bawah pesan.
              </p>
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs space-y-1.5">
                <div className="font-semibold text-slate-200">Tombol Tersedia:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>🆔 Cek Chat ID Saya</li>
                  <li>🤖 Detail & Info Bot</li>
                  <li>🏓 Ping & Respon Server</li>
                  <li>⏰ Waktu Real-Time WIB</li>
                  <li>📖 Daftar Semua Perintah</li>
                </ul>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleCopy('/start')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
                >
                  {copiedCmd === '/start' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin Perintah: /start</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ping' && (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-mono font-medium">
                Perintah: /ping
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Pemeriksaan Latency & Status Server
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Digunakan untuk memverifikasi bahwa bot aktif, responsif, dan menghitung kecepatan transmisi server secara langsung.
              </p>
              <button
                onClick={() => handleCopy('/ping')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
              >
                {copiedCmd === '/ping' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Salin Perintah: /ping</span>
              </button>
            </div>
          )}

          {activeTab === 'waktu' && (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-mono font-medium">
                Perintah: /waktu atau /time
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Penyaji Waktu Real-Time 3 Zona Indonesia
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Menyajikan waktu dan tanggal presisi untuk Waktu Indonesia Barat (WIB), Waktu Indonesia Tengah (WITA), dan Waktu Indonesia Timur (WIT).
              </p>
              <button
                onClick={() => handleCopy('/waktu')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
              >
                {copiedCmd === '/waktu' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Salin Perintah: /waktu</span>
              </button>
            </div>
          )}

          {activeTab === 'calc' && (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-mono font-medium">
                Perintah: /calc &lt;perhitungan&gt;
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Kalkulator Cepat Otomatis
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pengguna Telegram bisa menghitung operasi matematika cepat langsung di dalam chat, contohnya: <code className="text-cyan-300 font-mono">/calc 150000 * 3 + 25000</code>.
              </p>
              <button
                onClick={() => handleCopy('/calc 150000 * 3 + 25000')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
              >
                {copiedCmd?.includes('/calc') ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Salin Contoh: /calc</span>
              </button>
            </div>
          )}

          {activeTab === 'auto' && (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-mono font-medium">
                Keyword Auto-Responder
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Balasan Cerdas Berdasarkan Kata Kunci
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Merespon otomatis jika pengguna menyapa seperti &quot;halo&quot;, &quot;assalamualaikum&quot;, &quot;p&quot;, &quot;siapa kamu&quot;, dll. Anda juga bisa menambahkan kata kunci kustom di tab Pengaturan Perintah.
              </p>
            </div>
          )}
        </div>

        {/* Right Telegram Message Mockup Screen */}
        <div className="lg:col-span-7">
          <div className="bg-[#0e1621] border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-2xl relative">
            {/* Telegram Header Mockup */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-xs">
                  {botInfo?.first_name ? botInfo.first_name[0].toUpperCase() : 'B'}
                </div>
                <div>
                  <div className="font-bold text-slate-200">
                    {botInfo?.first_name || 'Telegram Bot'}
                  </div>
                  <div className="text-[10px] text-cyan-400">bot • @{botUsername}</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Live Preview
              </span>
            </div>

            {/* Telegram Chat Bubble */}
            <div className="space-y-4">
              {/* User Outgoing Bubble */}
              <div className="flex justify-end">
                <div className="bg-[#2b5278] text-white px-3.5 py-2 rounded-2xl rounded-tr-sm text-xs max-w-xs sm:max-w-md shadow">
                  <div className="font-mono font-semibold">
                    {activeTab === 'verif' && '/start'}
                    {activeTab === 'osint' && 'search: 08123456789 ppp'}
                    {activeTab === 'pricing' && '/harga'}
                    {activeTab === 'owner' && 'ax0895'}
                    {activeTab === 'cmenu' && 'Tekan Tombol: 🎁 Info Promo'}
                    {activeTab === 'id' && '/id'}
                    {activeTab === 'bot' && '/bot'}
                    {activeTab === 'menu' && '/menu'}
                    {activeTab === 'ping' && '/ping'}
                    {activeTab === 'waktu' && '/waktu'}
                    {activeTab === 'calc' && '/calc 150000 * 3 + 25000'}
                    {activeTab === 'auto' && 'halo apa kabar?'}
                  </div>
                  <div className="text-[10px] text-right text-cyan-200/80 mt-1">12:30 WIB ✓✓</div>
                </div>
              </div>

              {/* Bot Incoming Bubble */}
              <div className="flex justify-start">
                <div className="bg-[#182533] text-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm text-xs max-w-xs sm:max-w-md border border-slate-700/50 shadow-md space-y-2">
                  {activeTab === 'verif' && (
                    <div className="space-y-2 leading-relaxed font-sans">
                      <div className="font-bold text-amber-400">⚠️ VERIFIKASI AKUN DIPERLUKAN</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                      <p className="text-slate-200">
                        Halo <strong>John Doe</strong>! Untuk mulai menggunakan layanan bot ini, Anda diwajibkan mengirim perintah verifikasi terlebih dahulu:
                      </p>
                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-amber-500/30 text-amber-300 font-mono text-center font-bold">
                        /id
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Ketik <code>/id</code> di chat atau klik tombol di bawah untuk verifikasi otomatis dan membuka semua menu.
                      </p>
                      <div className="pt-2">
                        <button className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-lg text-xs shadow transition-all">
                          🆔 Verifikasi Akun Sekarang (/id)
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'osint' && (
                    <div className="space-y-1.5 leading-relaxed font-sans">
                      <div className="font-bold text-cyan-400">🔍 HASIL PENELUSURAN INTELIJEN OSINT</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                      <div>🎯 <strong>Target:</strong> <code className="text-amber-300 font-mono">08123456789</code></div>
                      <div>🔑 <strong>API Key:</strong> <code className="text-cyan-300 font-mono">ppp</code> (Sisa: 9x)</div>
                      <div>🌐 <strong>Status Server:</strong> 🟢 Online (Tunnel Ngrok)</div>
                      <div>👤 <strong>Identitas:</strong> Budi Santoso</div>
                      <div>📍 <strong>Lokasi/Operator:</strong> Telkomsel - Jawa Barat</div>
                      <div>⚡ <strong>Waktu Eksekusi:</strong> 240ms</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                      <div className="text-[11px] text-emerald-400 font-mono">
                        ✓ Kuota tersisa 9x dari paket 10x
                      </div>
                    </div>
                  )}

                  {activeTab === 'pricing' && (
                    <div className="space-y-1.5 leading-relaxed font-sans">
                      <div className="font-bold text-emerald-400">💎 DAFTAR HARGA & KUOTA API KEY</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                      <div className="text-slate-300 text-[11px]">Mata uang: 🇮🇩 IDR (Rupiah Indonesia)</div>
                      <div className="space-y-1 font-mono text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <div className="flex justify-between"><span>• 5x Pakai:</span><strong>Rp 3.000</strong></div>
                        <div className="flex justify-between"><span>• 10x Pakai:</span><strong>Rp 5.000</strong></div>
                        <div className="flex justify-between text-amber-300"><span>• 15x (+1 Bonus):</span><strong>Rp 10.000</strong></div>
                        <div className="flex justify-between text-amber-300"><span>• 40x (+1 Bonus):</span><strong>Rp 25.000</strong></div>
                        <div className="flex justify-between text-amber-300"><span>• 100x (+2 Bonus):</span><strong>Rp 50.000</strong></div>
                        <div className="flex justify-between text-cyan-300"><span>• Unlimited:</span><strong>Rp 100.000</strong></div>
                      </div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                      <div className="text-[11px] text-slate-300">
                        Hubungi Owner <strong className="text-cyan-400">@flood1233</strong> untuk pemesanan API Key.
                      </div>
                    </div>
                  )}

                  {activeTab === 'owner' && (
                    <div className="space-y-1.5 leading-relaxed font-mono text-[11px]">
                      <div className="font-bold text-purple-400">👑 PANEL KONTROL OWNER (ax0895)</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                      <div>Status OSINT: 🟢 AKTIF (ON)</div>
                      <div>Tunnel Ngrok: https://tunnel.ngrok-free.app</div>
                      <div className="text-slate-400 mt-1">Perintah Tersedia:</div>
                      <div className="text-cyan-300">• ax0895 on / off</div>
                      <div className="text-cyan-300">• ax0895 ngrok &lt;url&gt;</div>
                      <div className="text-cyan-300">• ax0895 addkey &lt;key&gt; &lt;kuota&gt;</div>
                      <div className="text-cyan-300">• ax0895 addmenu &lt;label&gt; | &lt;teks&gt;</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                    </div>
                  )}

                  {activeTab === 'cmenu' && (
                    <div className="space-y-1.5 leading-relaxed font-sans">
                      <div className="font-bold text-blue-400">🎁 PROMOSI SPESIAL HARI INI</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                      <p className="text-slate-200">
                        Dapatkan bonus +1x kuota ekstra gratis untuk setiap pembelian paket API Key mulai dari Rp 10.000 ke atas!
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        Hubungi kontak resmi owner di Telegram: <strong className="text-cyan-300">@flood1233</strong>
                      </p>
                    </div>
                  )}
                  {activeTab === 'id' && (
                    <div className="space-y-1.5 leading-relaxed font-sans">
                      <div className="font-bold text-cyan-400">📋 INFORMASI CHAT ID & AKUN</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                      <div>🆔 <strong>Chat ID:</strong> <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">1892837462</code></div>
                      <div>👤 <strong>Nama:</strong> John Doe</div>
                      <div>🏷 <strong>Username:</strong> @johndoe</div>
                      <div>💬 <strong>Tipe Chat:</strong> PRIVATE</div>
                      <div>🔢 <strong>Message ID:</strong> 421</div>
                      <div>🕒 <strong>Waktu:</strong> Jumat, 28 Agustus 2026, 12:30 WIB</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                      <div className="text-[11px] text-slate-400 italic">
                        Salin Chat ID di atas untuk integrasi pesan langsung dari Web Controller.
                      </div>
                    </div>
                  )}

                  {activeTab === 'bot' && (
                    <div className="space-y-1.5 leading-relaxed">
                      <div className="font-bold text-cyan-400">🤖 DETAIL & SPESIFIKASI RESMI BOT</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                      <div>📛 <strong>Nama Bot:</strong> {botInfo?.first_name || 'axxosintbot'}</div>
                      <div>🏷 <strong>Username:</strong> @{botUsername}</div>
                      <div>👑 <strong>Creator / Owner:</strong> Ax. (@flood1233)</div>
                      <div>🔢 <strong>Bot ID:</strong> <code className="bg-slate-900 px-1 rounded text-cyan-300 font-mono">{botInfo?.id || '819203948'}</code></div>
                      <div>🟢 <strong>Status:</strong> AKTIF (Always-ON Service)</div>
                      <div>⏱ <strong>Uptime:</strong> 2 hari 4 jam 15 menit</div>
                      <div>👥 <strong>Izin Grup:</strong> {botInfo?.can_join_groups ? '✅ Diizinkan' : '❌ Dilarang'}</div>
                      <div>⚡ <strong>Engine:</strong> axxosintbot Core Engine v3.0 (by Ax.)</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                    </div>
                  )}

                  {activeTab === 'menu' && (
                    <div className="space-y-1.5 leading-relaxed">
                      <div className="font-bold text-emerald-400">👋 Halo, John Doe! Selamat datang.</div>
                      <p className="text-slate-300">
                        Saya adalah <strong>axxosintbot</strong>, bot intelijen OSINT &amp; otomatisasi yang diciptakan oleh <strong>Ax.</strong>
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        Silakan gunakan tombol menu interaktif di bawah atau ketik perintah langsung.
                      </p>
                    </div>
                  )}

                  {activeTab === 'ping' && (
                    <div className="space-y-1.5 leading-relaxed">
                      <div className="font-bold text-amber-400">🏓 PONG! BOT ONLINE & RESPONSIF</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                      <div>⚡ <strong>Kecepatan:</strong> Normal (~32ms)</div>
                      <div>🟢 <strong>Mode:</strong> Always ON (Aktif terus)</div>
                      <div>🖥 <strong>Server:</strong> Cloud Node.js Container</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                    </div>
                  )}

                  {activeTab === 'waktu' && (
                    <div className="space-y-1.5 leading-relaxed">
                      <div className="font-bold text-cyan-400">⏰ INFORMASI WAKTU REAL-TIME</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                      <div>🇮🇩 <strong>WIB (Jakarta):</strong> 12:30:15 WIB</div>
                      <div>🇮🇩 <strong>WITA (Bali/Makassar):</strong> 13:30:15 WITA</div>
                      <div>🇮🇩 <strong>WIT (Jayapura):</strong> 14:30:15 WITA</div>
                      <div className="text-slate-500">━━━━━━━━━━━━━━━━━━━━━━</div>
                    </div>
                  )}

                  {activeTab === 'calc' && (
                    <div className="space-y-1.5 leading-relaxed">
                      <div className="font-bold text-indigo-400">🧮 Hasil Perhitungan Cepat:</div>
                      <div><code className="bg-slate-900 px-1 rounded text-slate-300 font-mono">150000 * 3 + 25000</code> = <strong className="text-emerald-400 font-mono text-sm">475000</strong></div>
                    </div>
                  )}

                  {activeTab === 'auto' && (
                    <div className="space-y-1.5 leading-relaxed">
                      <div>Halo juga John Doe! Ada yang bisa saya bantu? Ketik <code className="text-cyan-300 font-mono">/menu</code> untuk melihat opsi perintah yang tersedia.</div>
                    </div>
                  )}

                  {/* Inline Buttons Mockup (Simulated Telegram Buttons) */}
                  {(activeTab === 'id' || activeTab === 'menu' || activeTab === 'bot') && (
                    <div className="pt-2 grid grid-cols-2 gap-1.5">
                      <button className="px-2.5 py-1.5 bg-[#2b5278]/60 hover:bg-[#2b5278] text-[11px] rounded-lg text-slate-200 border border-slate-700/50 transition-colors text-center">
                        🆔 Cek Chat ID
                      </button>
                      <button className="px-2.5 py-1.5 bg-[#2b5278]/60 hover:bg-[#2b5278] text-[11px] rounded-lg text-slate-200 border border-slate-700/50 transition-colors text-center">
                        🤖 Detail Bot
                      </button>
                      <button className="px-2.5 py-1.5 bg-[#2b5278]/60 hover:bg-[#2b5278] text-[11px] rounded-lg text-slate-200 border border-slate-700/50 transition-colors text-center">
                        🏓 Ping Server
                      </button>
                      <button className="px-2.5 py-1.5 bg-[#2b5278]/60 hover:bg-[#2b5278] text-[11px] rounded-lg text-slate-200 border border-slate-700/50 transition-colors text-center">
                        ⏰ Waktu WIB
                      </button>
                    </div>
                  )}

                  <div className="text-[10px] text-right text-slate-500 pt-1">12:30 WIB</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
