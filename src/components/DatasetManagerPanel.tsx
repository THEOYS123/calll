import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  Cpu,
  RefreshCw,
  X,
  FileCode,
  HardDrive,
  Sparkles,
  Zap,
  Info,
  ShieldCheck,
  Check,
  Copy,
  Github,
  Link,
  Eye,
  Play,
  ArrowDownToLine,
  Key
} from 'lucide-react';
import { DatasetFileInfo, DatasetSearchResult, GithubSyncConfig, GithubTestResult } from '../types';

interface DatasetManagerPanelProps {
  currentEngineMode?: 'smart_dataset' | 'hybrid' | 'ngrok_only';
  onShowToast: (text: string, type: 'success' | 'error') => void;
  onRefreshStatus: () => void;
}

export function DatasetManagerPanel({
  currentEngineMode = 'smart_dataset',
  onShowToast,
  onRefreshStatus
}: DatasetManagerPanelProps) {
  const [files, setFiles] = useState<DatasetFileInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [engineMode, setEngineMode] = useState<'smart_dataset' | 'hybrid' | 'ngrok_only'>(currentEngineMode);
  const [isUpdatingMode, setIsUpdatingMode] = useState<boolean>(false);

  // Upload State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const [uploadedBytes, setUploadedBytes] = useState<string>('');
  const [setAsDefault, setSetAsDefault] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit State
  const [editingFile, setEditingFile] = useState<{
    filename: string;
    content: string;
    originalContent: string;
    isSaving: boolean;
    truncated: boolean;
    totalLines: number;
  } | null>(null);

  // Create State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [newFileContent, setNewFileContent] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Delete Confirm State
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Smart Search Tester State
  const [testQuery, setTestQuery] = useState<string>('asep');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<DatasetSearchResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // GitHub Dataset Sync & Test State
  const [githubUrl, setGithubUrl] = useState<string>(
    'https://github.com/THEOYS123/track-call/blob/main/data/dataset.txt'
  );
  const [githubToken, setGithubToken] = useState<string>('');
  const [showGithubToken, setShowGithubToken] = useState<boolean>(false);
  const [githubTargetFilename, setGithubTargetFilename] = useState<string>('dataset.txt');
  const [githubReplacePrimary, setGithubReplacePrimary] = useState<boolean>(true);
  const [isTestingGithub, setIsTestingGithub] = useState<boolean>(false);
  const [githubTestResult, setGithubTestResult] = useState<GithubTestResult | null>(null);
  const [isSyncingGithub, setIsSyncingGithub] = useState<boolean>(false);
  const [githubSyncConfig, setGithubSyncConfig] = useState<GithubSyncConfig | null>(null);

  // Load GitHub Sync Config
  const loadGithubConfig = async () => {
    try {
      const res = await fetch('/api/datasets/github/config');
      const data = await res.json();
      if (data.success && data.config) {
        setGithubSyncConfig(data.config);
        if (data.config.url) setGithubUrl(data.config.url);
        if (data.config.targetFilename) setGithubTargetFilename(data.config.targetFilename);
        if (typeof data.config.replacePrimary === 'boolean') setGithubReplacePrimary(data.config.replacePrimary);
      }
    } catch {
      // ignore
    }
  };

  // Test GitHub Connection & Preview Data
  const handleTestGithub = async () => {
    const targetUrl = githubUrl.trim();
    if (!targetUrl) {
      onShowToast('Masukkan URL file GitHub dataset.', 'error');
      return;
    }
    setIsTestingGithub(true);
    setGithubTestResult(null);
    try {
      const res = await fetch('/api/datasets/github/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          githubToken: githubToken.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.result) {
        setGithubTestResult(data.result);
        if (data.result.success) {
          onShowToast(`Tes koneksi berhasil! Ukuran: ${data.result.sizeFormatted}`, 'success');
        } else {
          onShowToast(data.result.message || 'Tes gagal.', 'error');
        }
      } else {
        onShowToast(data.message || 'Gagal menguji GitHub dataset', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error uji GitHub: ${err.message}`, 'error');
    } finally {
      setIsTestingGithub(false);
    }
  };

  // Download / Sync GitHub Dataset to Local File
  const handleSyncGithub = async () => {
    const targetUrl = githubUrl.trim();
    if (!targetUrl) {
      onShowToast('Masukkan URL file GitHub dataset.', 'error');
      return;
    }
    setIsSyncingGithub(true);
    try {
      const res = await fetch('/api/datasets/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          targetFilename: githubTargetFilename.trim() || 'dataset.txt',
          replacePrimary: githubReplacePrimary,
          githubToken: githubToken.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message || 'Dataset berhasil disinkronkan dari GitHub!', 'success');
        if (Array.isArray(data.files)) {
          setFiles(data.files);
        } else {
          await loadFiles();
        }
        if (data.githubSync) {
          setGithubSyncConfig(data.githubSync);
        }
        onRefreshStatus();
      } else {
        onShowToast(data.message || 'Gagal sinkronisasi dataset dari GitHub.', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error sinkronisasi: ${err.message}`, 'error');
    } finally {
      setIsSyncingGithub(false);
    }
  };

  // Load files list
  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/datasets', { headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setFiles(data.files);
      } else if (data.success && typeof data.files === 'object' && data.files !== null) {
        const fileArr = Object.values(data.files) as DatasetFileInfo[];
        setFiles(fileArr);
      } else {
        onShowToast(data.message || 'Gagal memuat daftar file dataset', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error: ${err.message || 'Koneksi ke server gagal'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    loadGithubConfig();
  }, []);

  useEffect(() => {
    setEngineMode(currentEngineMode);
  }, [currentEngineMode]);

  // Handle Update Engine Mode
  const handleUpdateEngineMode = async (mode: 'smart_dataset' | 'hybrid' | 'ngrok_only') => {
    setIsUpdatingMode(true);
    try {
      const res = await fetch('/api/bot/osint/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (data.success) {
        setEngineMode(mode);
        onShowToast(data.message || 'Mode pencarian berhasil diubah', 'success');
        onRefreshStatus();
      } else {
        onShowToast(data.message || 'Gagal mengubah mode', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsUpdatingMode(false);
    }
  };

  // Upload file handler (No file size limits!)
  const handleUploadFile = (file: File) => {
    if (!file) return;

    setUploadProgress(0);
    setUploadSpeed('Memulai upload...');
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    setUploadedBytes(`0 / ${sizeMb} MB`);

    const xhr = new XMLHttpRequest();
    const startTime = Date.now();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && e.total > 0) {
        const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
        setUploadProgress(percent);

        const elapsedSec = (Date.now() - startTime) / 1000;
        const bytesPerSec = elapsedSec > 0 ? e.loaded / elapsedSec : 0;
        const speedMb = (bytesPerSec / (1024 * 1024)).toFixed(2);
        setUploadSpeed(`${speedMb} MB/s`);

        const loadedMb = (e.loaded / (1024 * 1024)).toFixed(2);
        const totalMb = (e.total / (1024 * 1024)).toFixed(2);
        setUploadedBytes(`${loadedMb} MB / ${totalMb} MB`);
      }
    });

    xhr.addEventListener('load', () => {
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            onShowToast(res.message || `File ${file.name} berhasil diunggah!`, 'success');
            if (Array.isArray(res.files)) {
              setFiles(res.files);
            }
            loadFiles();
          } else {
            onShowToast(res.message || 'Upload gagal diproses server', 'error');
          }
        } catch {
          onShowToast(`File ${file.name} berhasil diunggah.`, 'success');
          loadFiles();
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          onShowToast(errRes.message || `Gagal upload (HTTP ${xhr.status})`, 'error');
        } catch {
          onShowToast(`Gagal upload: HTTP ${xhr.status} ${xhr.statusText || 'Error'}`, 'error');
        }
      }
    });

    xhr.addEventListener('error', () => {
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onShowToast('Upload gagal karena koneksi terputus. Pastikan server aktif.', 'error');
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('setAsDefault', setAsDefault ? 'true' : 'false');

    xhr.open('POST', '/api/datasets/upload');
    xhr.send(formData);
  };

  // Open Edit Modal
  const handleOpenEdit = async (filename: string) => {
    try {
      onShowToast(`Membuka berkas ${filename}...`, 'success');
      const res = await fetch(`/api/datasets/content?filename=${encodeURIComponent(filename)}&maxLines=2000`, {
        headers: { Accept: 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setEditingFile({
          filename,
          content: data.content,
          originalContent: data.content,
          isSaving: false,
          truncated: data.truncated || false,
          totalLines: data.totalLines || 0
        });
      } else {
        onShowToast(data.message || 'Gagal membaca isi file', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error baca file: ${err.message}`, 'error');
    }
  };

  // Save Edit Content
  const handleSaveEdit = async () => {
    if (!editingFile) return;
    setEditingFile((prev) => (prev ? { ...prev, isSaving: true } : null));
    try {
      const res = await fetch('/api/datasets/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          filename: editingFile.filename,
          content: editingFile.content
        })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(`File ${editingFile.filename} berhasil disimpan!`, 'success');
        if (Array.isArray(data.files)) {
          setFiles(data.files);
        } else {
          loadFiles();
        }
        setEditingFile(null);
      } else {
        onShowToast(data.message || 'Gagal menyimpan perubahan', 'error');
        setEditingFile((prev) => (prev ? { ...prev, isSaving: false } : null));
      }
    } catch (err: any) {
      onShowToast(`Error simpan file: ${err.message}`, 'error');
      setEditingFile((prev) => (prev ? { ...prev, isSaving: false } : null));
    }
  };

  // Create New Dataset
  const handleCreateDataset = async () => {
    let name = newFileName.trim();
    if (!name) {
      onShowToast('Silakan masukkan nama file (misal: dataset.txt)', 'error');
      return;
    }
    if (!name.includes('.')) {
      name = `${name}.txt`;
    }
    setIsCreating(true);
    try {
      const res = await fetch('/api/datasets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          filename: name,
          content: newFileContent
        })
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message || `File ${name} berhasil dibuat!`, 'success');
        setIsCreateModalOpen(false);
        setNewFileName('');
        setNewFileContent('');
        if (Array.isArray(data.files)) {
          setFiles(data.files);
        }
        await loadFiles();
      } else {
        onShowToast(data.message || 'Gagal membuat file', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete Dataset File
  const handleDeleteFile = async (filename: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/datasets/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message || `File ${filename} berhasil dihapus!`, 'success');
        setDeleteConfirmFile(null);
        if (Array.isArray(data.files)) {
          setFiles(data.files);
        } else {
          loadFiles();
        }
      } else {
        onShowToast(data.message || 'Gagal menghapus file', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error hapus: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Live Smart Search Test
  const handleRunTestSearch = async () => {
    if (!testQuery.trim()) {
      onShowToast('Masukkan target pencarian (nama, NIK, nomor HP, dsb)', 'error');
      return;
    }
    setIsSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch('/api/datasets/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: testQuery.trim(), limit: 50 })
      });
      const data = await res.json();
      if (data.success && data.result) {
        setSearchResult(data.result);
        if (data.result.totalMatches > 0) {
          onShowToast(`Ditemukan ${data.result.totalMatches} data dalam ${data.result.searchDurationMs}ms!`, 'success');
        } else {
          onShowToast(`Target "${testQuery}" tidak ditemukan di arsip dataset.`, 'error');
        }
      } else {
        onShowToast(data.message || 'Gagal memproses pencarian', 'error');
      }
    } catch (err: any) {
      onShowToast(`Error pencarian: ${err.message}`, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Calculate disk totals
  const totalBytes = files.reduce((acc, f) => acc + (f.size ?? f.sizeBytes ?? 0), 0);
  const totalLines = files.reduce((acc, f) => acc + (f.lineCount ?? f.linesCount ?? 0), 0);
  const hasDefaultDataset = files.some(
    (f) => f.isDefault || f.isDefaultDataset || (f.filename || f.name || '').toLowerCase() === 'dataset.txt'
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Smart Engine & Dataset Status */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                SISTEM PINTAR OTOMATIS
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                TANPA BATAS UKURAN FILE (UNLIMITED)
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-amber-400" />
              Manajemen Dataset Intelijen & Auto-Detection
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Sistem pintar ini secara otomatis mencari isi berkas <code className="text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded font-mono">dataset.txt</code> dan seluruh dataset yang Anda unggah ketika perintah <code className="text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded font-mono">search: &lt;target&gt; &lt;key&gt;</code> dijalankan di Telegram atau di Web. Bebas unggah file ukuran berapapun tanpa batasan maksimal!
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="space-y-0.5">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Status dataset.txt</span>
              </div>
              <div className="text-xs font-bold flex items-center gap-1.5 text-white">
                {hasDefaultDataset ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-300">Siap & Aktif</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-amber-300">Belum Ada</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>Total Berkas</span>
              </div>
              <div className="text-xs font-bold text-white">
                {files.length} File <span className="text-slate-500 font-normal">({formatBytes(totalBytes)})</span>
              </div>
            </div>

            <div className="space-y-0.5 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>Total Baris / Rekor</span>
              </div>
              <div className="text-xs font-bold text-emerald-300">
                {totalLines.toLocaleString('id-ID')} Baris Data
              </div>
            </div>
          </div>
        </div>

        {/* Search Mode Switcher */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-300 font-medium">Mode Mesin Pencarian OSINT Bot:</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => handleUpdateEngineMode('smart_dataset')}
              disabled={isUpdatingMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                engineMode === 'smart_dataset'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Dataset (Otomatis & Kilat)</span>
            </button>
            <button
              onClick={() => handleUpdateEngineMode('hybrid')}
              disabled={isUpdatingMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                engineMode === 'hybrid'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Hybrid (Dataset + Ngrok)</span>
            </button>
            <button
              onClick={() => handleUpdateEngineMode('ngrok_only')}
              disabled={isUpdatingMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                engineMode === 'ngrok_only'
                  ? 'bg-rose-500 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Ngrok Saja</span>
            </button>
          </div>
        </div>
      </div>

      {/* GitHub Dataset Repository Sync & Test Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-purple-950/25 border border-purple-500/30 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                <Github className="w-3 h-3" />
                <span>GitHub Dataset Sync Hub</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Streaming Atomic Download
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <span>Sinkronisasi Dataset Langsung dari Repositori GitHub</span>
            </h3>
            <p className="text-xs text-slate-300">
              Ambil berkas <code className="text-purple-300 font-mono font-bold">dataset.txt</code> langsung dari direktori GitHub Anda. Dapat diuji, disesuaikan, dan dicek pratinjaunya sebelum disimpan ke server.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {githubSyncConfig?.lastSyncedAt && (
              <div className="text-right text-[11px] text-slate-400">
                <span className="text-slate-500">Terakhir disinkronkan:</span>{' '}
                <span className="text-purple-300 font-medium">
                  {new Date(githubSyncConfig.lastSyncedAt).toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* GitHub URL */}
          <div className="lg:col-span-8 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-purple-400" />
              <span>URL Repositori GitHub (Blob atau Raw URL):</span>
            </label>
            <div className="relative">
              <Github className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/THEOYS123/track-call/blob/main/data/dataset.txt"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Mendukung URL standar GitHub seperti <code className="text-slate-300 font-mono">https://github.com/owner/repo/blob/main/data/dataset.txt</code> atau <code className="text-slate-300 font-mono">raw.githubusercontent.com</code>.
            </p>
          </div>

          {/* Target Filename */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Nama Berkas Simpanan Lokal:</span>
            </label>
            <input
              type="text"
              value={githubTargetFilename}
              onChange={(e) => setGithubTargetFilename(e.target.value)}
              placeholder="dataset.txt"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="replacePrimaryCheckbox"
                checked={githubReplacePrimary}
                onChange={(e) => setGithubReplacePrimary(e.target.checked)}
                className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 bg-slate-950 cursor-pointer"
              />
              <label htmlFor="replacePrimaryCheckbox" className="text-[11px] text-slate-300 cursor-pointer">
                Jadikan berkas <code className="text-amber-300 font-mono">dataset.txt</code> utama
              </label>
            </div>
          </div>
        </div>

        {/* Optional GitHub Token Collapsible */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowGithubToken(!showGithubToken)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 font-medium transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{showGithubToken ? 'Sembunyikan Opsi GitHub Token' : 'Gunakan GitHub Personal Access Token (Opsional)'}</span>
            </button>
            <span className="text-[10px] text-slate-500">Dibutuhkan jika repositori berstatus Private</span>
          </div>

          {showGithubToken && (
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (GitHub PAT Token)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => setGithubToken('')}
                className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>Sangat dianjurkan untuk menekan <strong>Uji Koneksi</strong> terlebih dahulu sebelum melakukan sinkronisasi unduh.</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Button 1: Test Connection & Preview */}
            <button
              onClick={handleTestGithub}
              disabled={isTestingGithub || isSyncingGithub}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              {isTestingGithub ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span>{isTestingGithub ? 'Menguji Koneksi...' : 'Uji Koneksi & Pratinjau'}</span>
            </button>

            {/* Button 2: Sync / Download Now */}
            <button
              onClick={handleSyncGithub}
              disabled={isSyncingGithub || isTestingGithub}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30"
            >
              {isSyncingGithub ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowDownToLine className="w-3.5 h-3.5" />
              )}
              <span>{isSyncingGithub ? 'Mengunduh & Menyimpan Dataset...' : 'Tarik & Sinkronkan Sekarang'}</span>
            </button>
          </div>
        </div>

        {/* Test Result Inspection Box */}
        {githubTestResult && (
          <div className={`p-4 rounded-xl border transition-all ${
            githubTestResult.success
              ? 'bg-purple-950/20 border-purple-500/40'
              : 'bg-rose-950/20 border-rose-500/40'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                {githubTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
                <span className="text-xs font-bold text-white">
                  {githubTestResult.success ? 'Koneksi GitHub Berhasil!' : 'Koneksi Gagal'}
                </span>
                <span className="text-[11px] text-slate-300 font-mono">
                  ({githubTestResult.message})
                </span>
              </div>

              {githubTestResult.success && (
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Ukuran: {githubTestResult.sizeFormatted}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Perkiraan: {githubTestResult.estimatedLines?.toLocaleString('id-ID')} Baris
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Latency: {githubTestResult.latencyMs}ms
                  </span>
                </div>
              )}
            </div>

            {/* Column Headers Detected */}
            {githubTestResult.detectedHeaders && githubTestResult.detectedHeaders.length > 0 && (
              <div className="mb-3 space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-semibold">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  <span>Header Kolom Terdeteksi Otomatis:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {githubTestResult.detectedHeaders.map((col, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-cyan-300 text-[11px] font-mono"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Parsed Record */}
            {githubTestResult.sampleParsedRecord && Object.keys(githubTestResult.sampleParsedRecord).length > 0 && (
              <div className="mb-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Contoh Hasil Pemetaan Record Pintar (Parsed Sample):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Nama Lengkap:</span>
                    <span className="text-white font-semibold">{githubTestResult.sampleParsedRecord.name || githubTestResult.sampleParsedRecord.fullName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">NIK:</span>
                    <span className="text-cyan-300 font-mono font-semibold">{githubTestResult.sampleParsedRecord.nik || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">No. Telepon / HP:</span>
                    <span className="text-emerald-300 font-mono">{githubTestResult.sampleParsedRecord.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Email / Surel:</span>
                    <span className="text-purple-300 font-mono">{githubTestResult.sampleParsedRecord.email || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Preview of Lines */}
            {githubTestResult.previewLines && githubTestResult.previewLines.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold">Pratinjau Data (Baris Awal):</span>
                  <span className="font-mono text-slate-500">{githubTestResult.previewLines.length} baris pertama</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-x-auto max-h-48 text-[11px] font-mono text-slate-300 divide-y divide-slate-800/40">
                  {githubTestResult.previewLines.map((line, idx) => (
                    <div key={idx} className="py-1 flex gap-3 hover:bg-slate-900/50 px-1 rounded">
                      <span className="text-slate-600 select-none w-8 text-right">{idx + 1}</span>
                      <span className="break-all">{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid: Upload Zone & Smart Search Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Zone (No File Size Limits) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                Unggah File Dataset (Upload)
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Maksimal: Unlimited Size
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Pilih atau tarik berkas dataset Anda (<code className="text-amber-300 font-mono">.txt</code>, <code className="text-amber-300 font-mono">.csv</code>, <code className="text-amber-300 font-mono">.json</code>, dsb). Tidak ada batasan ukuran file, file 10MB hingga 10GB+ didukung dengan aman.
            </p>

            {/* Hidden native file input placed outside the clickable card to prevent event bubbling conflicts */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,.json,.tsv,.log,text/*"
              className="hidden"
              onClick={(e) => {
                e.stopPropagation();
                (e.target as HTMLInputElement).value = '';
              }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadFile(e.target.files[0]);
                }
              }}
            />

            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
                setIsDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleUploadFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
                isDragging
                  ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30'
                  : 'border-slate-700/80 hover:border-amber-500/60 hover:bg-slate-800/40 bg-slate-950/40'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-white">
                  Klik untuk Jelajahi File atau Tarik ke Sini
                </div>
                <div className="text-[11px] text-slate-400">
                  Format didukung: .txt (dataset.txt), .csv, .tsv, .json, .log
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-1 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih Berkas Dari Perangkat</span>
                </button>
              </div>
            </div>

            {/* Upload Progress Display */}
            {uploadProgress !== null && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Sedang Mengunggah Berkas...
                  </span>
                  <span className="text-white font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{uploadedBytes}</span>
                  <span>{uploadSpeed}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-slate-300">
                Gantikan langsung sebagai <strong className="text-amber-300">dataset.txt</strong> utama
              </span>
            </label>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Tambah Berkas Baru (+ Add)</span>
            </button>
          </div>
        </div>

        {/* Smart Live Search Tester */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                Uji Pencarian Pintar Langsung (Live Query Tester)
              </h3>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                Sama Persis Seperti Bot Telegram
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Uji coba bagaimana sistem pintar mencari target di seluruh berkas dataset aktif secara otomatis dalam hitungan milidetik.
            </p>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunTestSearch()}
                  placeholder="Ketik target (misal: asep, jokowi, 3174051204080001, 081289214432)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                onClick={handleRunTestSearch}
                disabled={isSearching}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Cari Otomatis</span>
              </button>
            </div>

            {/* Live Search Result Output */}
            {searchResult && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Target: "{searchResult.query}"</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      {searchResult.totalMatches} Ditemukan
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    ⏱️ {searchResult.searchDurationMs} ms ({(searchResult.scannedFiles || searchResult.filesSearched || []).length} file dipindai)
                  </span>
                </div>

                {searchResult.totalMatches === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Tidak ada data yang cocok untuk target "{searchResult.query}" di seluruh file dataset.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(searchResult.results || searchResult.matches || []).map((item: any, idx: number) => {
                      const itemSource = item.sourceFile || item.fileName || 'dataset.txt';
                      const itemLine = item.lineNumber || idx + 1;
                      const itemText = item.rawLine || item.rawText || item.raw || (item.record ? JSON.stringify(item.record) : '');

                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 hover:border-slate-700 transition-colors relative group"
                        >
                          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                            <span className="text-amber-400">📁 {itemSource} (Baris {itemLine})</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(itemText);
                                setCopiedIndex(idx);
                                setTimeout(() => setCopiedIndex(null), 1500);
                              }}
                              className="text-slate-400 hover:text-white flex items-center gap-1"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Salin</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="break-all whitespace-pre-wrap text-slate-200">
                            {itemText}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Berkas dipindai: {files.map((f) => f.filename || f.name).join(', ') || 'Belum ada'}</span>
            <button
              onClick={loadFiles}
              className="text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dataset Files Table List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              Daftar Berkas Dataset Aktif ({files.length})
            </h3>
            <p className="text-xs text-slate-400">
              Setiap berkas di sini akan otomatis diakses dan dipindai secara pintar oleh sistem bot saat ada yang menjalankan perintah pencarian OSINT.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-slate-700"
              title="Unggah berkas dataset dari perangkat"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Unggah File</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah File (+ Add)</span>
            </button>
            <button
              onClick={loadFiles}
              disabled={isLoading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Nama Berkas Dataset</th>
                <th className="px-4 py-3">Tipe & Status</th>
                <th className="px-4 py-3">Ukuran File</th>
                <th className="px-4 py-3">Jumlah Baris / Data</th>
                <th className="px-4 py-3">Terakhir Diperbarui</th>
                <th className="px-4 py-3 text-right">Aksi Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
              {files.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Belum ada berkas dataset yang terdaftar. Klik "Tambah File (+ Add)" atau unggah file Anda sekarang.
                  </td>
                </tr>
              ) : (
                files.map((file) => {
                  const fileName = file.filename || file.name || 'dataset.txt';
                  const isDefault = file.isDefault ?? file.isDefaultDataset ?? (fileName.toLowerCase() === 'dataset.txt');
                  const fileSize = file.size ?? file.sizeBytes ?? 0;
                  const lineCount = file.lineCount ?? file.linesCount ?? 0;

                  return (
                    <tr key={fileName} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span>{fileName}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isDefault ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-amber-400" />
                            Dataset Utama (dataset.txt)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium inline-flex items-center gap-1">
                            Dataset Tambahan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {formatBytes(fileSize)}
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-mono font-bold">
                        {lineCount.toLocaleString('id-ID')} baris
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {file.lastModified ? new Date(file.lastModified).toLocaleString('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        }) : '-'} WIB
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Test Search in This File */}
                          <button
                            onClick={() => {
                              setTestQuery('asep');
                              handleRunTestSearch();
                            }}
                            className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 rounded-lg text-[11px] font-semibold transition-colors border border-cyan-500/30 flex items-center gap-1"
                            title="Cari di berkas ini"
                          >
                            <Search className="w-3 h-3" />
                            <span>Cari</span>
                          </button>

                          {/* Edit File Button */}
                          <button
                            onClick={() => handleOpenEdit(fileName)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-semibold transition-colors border border-slate-700 flex items-center gap-1"
                            title="Edit isi berkas di browser"
                          >
                            <Edit3 className="w-3 h-3 text-amber-400" />
                            <span>Edit</span>
                          </button>

                          {/* Download File */}
                          <a
                            href={`/api/datasets/download/${encodeURIComponent(fileName)}`}
                            download
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                            title="Unduh Berkas ke Komputer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteConfirmFile(fileName)}
                            className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg transition-colors border border-rose-500/30"
                            title="Hapus berkas ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL: In-Browser Text/Code Editor */}
      {editingFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Edit Berkas: <span className="font-mono text-amber-300">{editingFile.filename}</span>
                </h3>
                {editingFile.truncated && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    Menampilkan 2.000 Baris Pertama
                  </span>
                )}
              </div>
              <button
                onClick={() => setEditingFile(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Editor Body */}
            <div className="p-4 flex-1 overflow-hidden flex flex-col space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Gunakan format pipa pemisah <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">|</code> atau format teks bebas per baris:</span>
                <span className="font-mono">{editingFile.content.length.toLocaleString('id-ID')} Karakter</span>
              </div>
              <textarea
                value={editingFile.content}
                onChange={(e) =>
                  setEditingFile((prev) => (prev ? { ...prev, content: e.target.value } : null))
                }
                rows={18}
                className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                placeholder="Isi baris dataset di sini..."
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                Tips: File yang Anda simpan akan langsung aktif dan otomatis terbaca oleh mesin pencarian bot.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingFile(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={editingFile.isSaving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  {editingFile.isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create New Dataset File (+ Add) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Tambah Berkas Dataset Baru (+ Add)</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nama File Dataset:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateDataset();
                      }
                    }}
                    placeholder="dataset.txt atau database_target.txt"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                  <span>Pilihan Cepat:</span>
                  <button
                    type="button"
                    onClick={() => setNewFileName('dataset.txt')}
                    className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30"
                  >
                    dataset.txt (Utama)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFileName('database_target.txt')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono border border-slate-700"
                  >
                    database_target.txt
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFileName('nik_indonesia.txt')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono border border-slate-700"
                  >
                    nik_indonesia.txt
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">Isi Data Awal (Opsional):</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewFileContent(
                        '# FORMAT DATASET INTELIJEN\n# NIK|NAMA_LENGKAP|NOMOR_HP|ALAMAT|EMAIL\n3174051204080001|Ahmad Subagyo|081289214432|Jakarta Selatan|ahmad@example.com\n3271010101900002|Budi Santoso|085712345678|Bandung|budi@example.com'
                      );
                    }}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    + Masukkan Template Contoh
                  </button>
                </div>
                <textarea
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  rows={8}
                  placeholder="Ketik atau tempel baris data di sini..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreateDataset}
                disabled={isCreating}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                {isCreating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Buat & Daftarkan File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirm */}
      {deleteConfirmFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Konfirmasi Hapus Berkas</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus berkas <strong className="text-white font-mono">{deleteConfirmFile}</strong>?
              {deleteConfirmFile.toLowerCase() === 'dataset.txt' ? (
                <span className="block mt-1 text-amber-400">
                  Catatan: Karena ini adalah file dataset.txt utama, isinya akan dikosongkan/dibersihkan.
                </span>
              ) : (
                <span className="block mt-1 text-slate-400">
                  Tindakan ini permanen dan berkas tidak dapat dipulihkan kembali.
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmFile(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteFile(deleteConfirmFile)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Ya, Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
