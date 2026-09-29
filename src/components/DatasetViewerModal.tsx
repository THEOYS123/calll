import React, { useState, useEffect } from 'react';
import { X, Database, FileText, Download, Check, Copy, ExternalLink, RefreshCw, KeyRound } from 'lucide-react';

interface DatasetViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalRecords: number;
  datasetUrl?: string;
  onSyncUrl?: (url: string, filePassword?: string) => Promise<{ success: boolean; count?: number; message?: string }>;
}

export const DatasetViewerModal: React.FC<DatasetViewerModalProps> = ({
  isOpen,
  onClose,
  totalRecords,
  datasetUrl = 'https://fileup.to/5oca/dataset.txt',
  onSyncUrl
}) => {
  const [datasetText, setDatasetText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [filePasswordInput, setFilePasswordInput] = useState<string>('');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const loadDataset = () => {
    setIsLoading(true);
    fetch('/api/dataset/raw')
      .then((res) => res.text())
      .then((text) => {
        setDatasetText(text);
      })
      .catch(() => {
        setDatasetText(`Gagal memuat dataset dari sumber: ${datasetUrl}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      loadDataset();
      setSyncFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(datasetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(datasetUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([datasetText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dataset.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSyncWithPassword = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      if (onSyncUrl) {
        const res = await onSyncUrl(datasetUrl, filePasswordInput);
        setSyncFeedback(res.message || 'Sinkronisasi URL berhasil diproses.');
      } else {
        const res = await fetch('/api/dataset/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: datasetUrl, filePassword: filePasswordInput })
        });
        const data = await res.json();
        setSyncFeedback(data.message || 'Sinkronisasi berhasil.');
      }
      loadDataset();
    } catch (err: any) {
      setSyncFeedback(`Gagal sinkronisasi: ${err.message || 'Kesalahan jaringan'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-950/80 border border-sky-600/40 flex items-center justify-center text-sky-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
                SUMBER DATASET (URL CLOUD)
                <span className="text-[11px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  {totalRecords} Profil Terdaftar
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1 truncate max-w-lg">
                <span>URL:</span>
                <span className="text-sky-300 select-all font-semibold truncate">{datasetUrl}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyUrl}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition-colors"
              title="Salin tautan URL dataset"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'URL Tersalin' : 'Salin URL'}</span>
            </button>

            <a
              href={datasetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-sky-900/60 hover:bg-sky-800 border border-sky-700/50 text-xs font-mono text-sky-200 transition-colors"
              title="Buka URL file di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka URL</span>
            </a>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition-colors"
              title="Unduh file dataset"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh File</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* URL Remote Sync Bar */}
        <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Tersinkronisasi dengan remote repository: <strong className="text-sky-300">{datasetUrl}</strong></span>
          </div>

          {/* Optional password input if the remote link is password-protected */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <KeyRound className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
              <input
                type="password"
                value={filePasswordInput}
                onChange={(e) => setFilePasswordInput(e.target.value)}
                placeholder="Sandi Fileup (jika ada)"
                className="pl-6 pr-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 w-36"
              />
            </div>
            <button
              onClick={handleSyncWithPassword}
              disabled={isSyncing}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-200"
              title="Sinkronisasi ulang dari URL"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
              <span>{isSyncing ? 'Menghubungkan...' : 'Sinkronkan'}</span>
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="bg-sky-950/40 border-b border-sky-800/60 px-4 py-2 text-xs font-mono text-sky-300">
            {syncFeedback}
          </div>
        )}

        {/* Content Preview */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#070a12] font-mono text-xs text-slate-300">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
              <span>Menghubungkan & memuat dataset dari {datasetUrl}...</span>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap leading-relaxed text-[11px] select-all">
              {datasetText}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">Format: NIK | Nama | Tgl Lahir | Gender | Usia | Kota | Provinsi | Alamat | No HP | Email | Profesi</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              {copied ? 'Tersalin' : 'Salin Data'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

