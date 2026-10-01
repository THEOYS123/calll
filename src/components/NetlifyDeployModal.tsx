import React, { useState } from 'react';
import {
  Download,
  UploadCloud,
  CheckCircle2,
  FileArchive,
  ArrowRight,
  ExternalLink,
  Globe,
  Server,
  Zap,
  Copy,
  Check,
  X,
  Sparkles,
  HelpCircle,
  FileCode,
  Layers
} from 'lucide-react';
import { getCustomApiUrl, setCustomApiUrl } from '../utils/netlifyBridge';

interface NetlifyDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectCustomBackend?: (url: string) => void;
}

export function NetlifyDeployModal({ isOpen, onClose, onConnectCustomBackend }: NetlifyDeployModalProps) {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);
  const [backendUrlInput, setBackendUrlInput] = useState<string>(getCustomApiUrl());
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [downloadingZip, setDownloadingZip] = useState<'source' | 'dist' | null>(null);

  if (!isOpen) return null;

  const handleDownloadZip = (type: 'source' | 'dist') => {
    setDownloadingZip(type);
    const link = document.createElement('a');
    link.href = type === 'source' ? '/api/download/full-source-zip' : '/api/download/netlify-dist-zip';
    link.setAttribute('download', type === 'source' ? 'axxosintbot-full-source.zip' : 'axxosintbot-netlify-dist.zip');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      setDownloadingZip(null);
    }, 3500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2500);
  };

  const handleSaveBackendUrl = () => {
    setCustomApiUrl(backendUrlInput);
    setSaveSuccess(true);
    if (onConnectCustomBackend) {
      onConnectCustomBackend(backendUrlInput);
    }
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <UploadCloud className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Paket File .ZIP & Panduan Netlify</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Siap Deploy
                </span>
              </div>
              <p className="text-xs text-slate-400">Unduh seluruh file website axxosintbot dan pindahkan ke Netlify secara manual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-300 text-xs">
          {/* Download Options Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Pre-built Production Zip for Netlify */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 to-slate-800/60 border border-cyan-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                  <FileArchive className="w-4 h-4" />
                  <span>File Siap Deploy Netlify (.ZIP)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                  Berisi folder <code className="text-cyan-300 bg-cyan-950/80 px-1 py-0.5 rounded">dist/</code> hasil build dengan file <code className="text-cyan-300 bg-cyan-950/80 px-1 py-0.5 rounded">_redirects</code> otomatis. Tinggal drag-and-drop ke Netlify Drop!
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadZip('dist')}
                disabled={downloadingZip !== null}
                className="w-full py-2.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all text-xs cursor-pointer disabled:opacity-75"
              >
                <Download className={`w-4 h-4 ${downloadingZip === 'dist' ? 'animate-bounce' : ''}`} />
                <span>{downloadingZip === 'dist' ? 'Sedang Mengunduh ZIP...' : 'Unduh Netlify Dist (.ZIP)'}</span>
              </button>
            </div>

            {/* Box 2: Complete Source Code Zip */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-emerald-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <FileCode className="w-4 h-4" />
                    <span>Full Source Code Proyek (.ZIP)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 font-bold">
                    100% Utuh
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                  Seluruh bagian website utuh sama persis (<code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">src/</code>, <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">server.ts</code>, <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">data/</code>, database, panduan VPS & Netlify).
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadZip('source')}
                disabled={downloadingZip !== null}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 border border-emerald-400 transition-all text-xs cursor-pointer disabled:opacity-75"
              >
                <Download className={`w-4 h-4 ${downloadingZip === 'source' ? 'animate-bounce' : ''}`} />
                <span>{downloadingZip === 'source' ? 'Sedang Mengunduh Full Source...' : 'Unduh Full Source (.ZIP)'}</span>
              </button>
            </div>
          </div>

          {/* Quick Steps Guide */}
          <div className="space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Tata Cara Penggunaan di Netlify (Yang Paling Penting & Cepat)</span>
            </h4>

            {/* Option 1: Netlify Drop */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Cara Tercepat: Netlify Drop (Manual Drag & Drop)</span>
                </div>
                <a
                  href="https://app.netlify.com/drop"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  Buka app.netlify.com/drop <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed pl-1">
                <li>Unduh file <b className="text-cyan-300">axxosintbot-netlify-dist.zip</b> di atas.</li>
                <li>Ekstrak file zip tersebut di komputer kamu (kamu akan mendapatkan folder berisikan file <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded">index.html</code>, <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded">_redirects</code>, dan folder <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded">assets</code>).</li>
                <li>Buka link <b className="text-cyan-400">app.netlify.com/drop</b> lalu seret (*drag-and-drop*) folder tersebut ke area unggah Netlify.</li>
                <li>Netlify akan langsung memberikan tautan website online kamu dalam hitungan detik!</li>
              </ol>
            </div>

            {/* Option 2: Git Repository Deploy */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Cara Kedua: Melalui GitHub / GitLab</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Jika kamu mengunggah repositori ke GitHub:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">Build Command:</span>
                  <span className="text-cyan-300 font-bold">npm run build</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Publish Directory:</span>
                  <span className="text-cyan-300 font-bold">dist</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                File <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded">netlify.toml</code> dan <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded">public/_redirects</code> sudah disiapkan otomatis, sehingga kamu tidak akan pernah mengalami error 404 saat merefresh halaman di Netlify!
              </p>
            </div>

            {/* Why it REALLY functions on Netlify */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 to-blue-950/30 border border-cyan-500/30 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Kenapa Website Ini Dijamin Pasti Berfungsi di Netlify?</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span><b>Mesin Standalone Client-Side:</b> Pencarian OSINT, kalkulasi NIK, dan grafik D3.js langsung berjalan mulus di browser tanpa perlu server Node terpisah.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span><b>Verifikasi Token Telegram Langsung:</b> Token bot diverifikasi secara instan langsung ke server Telegram (<code className="text-cyan-300">api.telegram.org</code>) dari peramban.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span><b>Penyimpanan Browser (LocalStorage):</b> Konfigurasi tombol, token, kuota, perintah, dan riwayat tersimpan aman di browser kamu.</span>
                </li>
              </ul>
            </div>

            {/* Optional: Connect Remote Backend */}
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                  <Server className="w-4 h-4 text-purple-400" />
                  <span>Opsi Tambahan: Sambungkan ke Backend Eksternal (Opsional)</span>
                </div>
                <span className="text-[10px] text-slate-400">Jika deploy backend di Railway/VPS</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Jika kamu juga ingin menjalankan bot Telegram secara 24/7 di backend terpisah (seperti Railway, Render, Fly.io, atau VPS), kamu bisa memasukkan URL API-nya di bawah ini:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://axxosintbot-backend.up.railway.app"
                  value={backendUrlInput}
                  onChange={(e) => setBackendUrlInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  onClick={handleSaveBackendUrl}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition-colors whitespace-nowrap"
                >
                  {saveSuccess ? 'Tersimpan!' : 'Simpan URL'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Dikonfigurasi khusus untuk kompatibilitas penuh Netlify & SPA
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
