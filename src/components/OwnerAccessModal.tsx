import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Key,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  RotateCcw
} from 'lucide-react';

interface OwnerAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  isUnlocked: boolean;
  onUnlock: (passkey: string) => Promise<boolean>;
  onLock: () => void;
  onUpdatePasskey: (oldKey: string, newKey: string) => Promise<{ success: boolean; message: string }>;
  currentPasskeyHint?: string;
  onShowToast: (text: string, type: 'success' | 'error') => void;
}

export function OwnerAccessModal({
  isOpen,
  onClose,
  isUnlocked,
  onUnlock,
  onLock,
  onUpdatePasskey,
  currentPasskeyHint = 'ax0895',
  onShowToast
}: OwnerAccessModalProps) {
  const [activeTab, setActiveTab] = useState<'unlock' | 'change'>('unlock');
  const [inputPasskey, setInputPasskey] = useState<string>('');
  const [showInputPasskey, setShowInputPasskey] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [rememberSession, setRememberSession] = useState<boolean>(true);

  // Change passkey fields
  const [oldPasskey, setOldPasskey] = useState<string>('');
  const [newPasskey, setNewPasskey] = useState<string>('');
  const [confirmNewPasskey, setConfirmNewPasskey] = useState<string>('');
  const [showChangeFields, setShowChangeFields] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPasskey.trim()) {
      onShowToast('Masukkan kata kunci akses owner terlebih dahulu!', 'error');
      return;
    }
    setIsVerifying(true);
    try {
      const ok = await onUnlock(inputPasskey.trim());
      if (ok) {
        if (rememberSession) {
          localStorage.setItem('owner_passkey_session', inputPasskey.trim());
        }
        onShowToast('🔓 Akses Menu Owner Berhasil Dibuka!', 'success');
        setInputPasskey('');
        onClose();
      } else {
        onShowToast('❌ Kata kunci salah! Gunakan kata kunci owner yang valid.', 'error');
      }
    } catch (err: any) {
      onShowToast(`Gagal verifikasi: ${err.message}`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChangePasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPasskey || !newPasskey || !confirmNewPasskey) {
      onShowToast('Lengkapi seluruh kolom pengisian kata kunci!', 'error');
      return;
    }
    if (newPasskey !== confirmNewPasskey) {
      onShowToast('Konfirmasi kata kunci baru tidak cocok!', 'error');
      return;
    }
    if (newPasskey.length < 4) {
      onShowToast('Kata kunci minimal 4 karakter!', 'error');
      return;
    }
    setIsUpdating(true);
    try {
      const res = await onUpdatePasskey(oldPasskey, newPasskey);
      if (res.success) {
        localStorage.setItem('owner_passkey_session', newPasskey);
        onShowToast('✅ Kata kunci Owner berhasil diperbarui!', 'success');
        setOldPasskey('');
        setNewPasskey('');
        setConfirmNewPasskey('');
        setActiveTab('unlock');
        onClose();
      } else {
        onShowToast(`Gagal: ${res.message}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl ${isUnlocked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              {isUnlocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {isUnlocked ? 'Mode Akses Owner Terbuka' : 'Otorisasi Akses Owner'}
              </h3>
              <p className="text-xs text-slate-400">
                {isUnlocked ? 'Seluruh menu sensitif & kendali bot aktif' : 'Masukkan kata kunci untuk membuka menu pengelola'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 my-5 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('unlock')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'unlock'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isUnlocked ? 'Status Akses' : 'Buka Kunci (Unlock)'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('change')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'change'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ubah Kata Kunci
          </button>
        </div>

        {activeTab === 'unlock' ? (
          <div>
            {isUnlocked ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full mx-auto flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Anda Memiliki Hak Akses Owner Penuh</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    Anda dapat mengelola Multi-Bot, mengatur harga sewa bot, kuota OSINT, serta moderasi super ketat.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      onLock();
                      localStorage.removeItem('owner_passkey_session');
                      onShowToast('🔒 Akses Owner Berhasil Dikunci Kembali.', 'success');
                      onClose();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
                  >
                    <Lock className="w-4 h-4" />
                    Kunci Akses Owner Sekarang
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Kata Kunci / PIN Rahasia Owner:</span>
                    <span className="text-[11px] text-slate-500">Default: <code className="text-amber-400">{currentPasskeyHint}</code></span>
                  </label>
                  <div className="relative">
                    <input
                      type={showInputPasskey ? 'text' : 'password'}
                      value={inputPasskey}
                      onChange={(e) => setInputPasskey(e.target.value)}
                      placeholder="Masukkan kata kunci owner..."
                      autoFocus
                      className="w-full pl-4 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInputPasskey(!showInputPasskey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showInputPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberSession}
                      onChange={(e) => setRememberSession(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Ingat di browser ini</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setInputPasskey(currentPasskeyHint)}
                    className="text-amber-400 hover:underline text-[11px]"
                  >
                    Pakai default ({currentPasskeyHint})
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isVerifying || !inputPasskey.trim()}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 active:scale-98 transition-all"
                  >
                    {isVerifying ? 'Memverifikasi...' : 'Buka Akses Menu Owner'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleChangePasskey} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Kata Kunci Lama:
              </label>
              <input
                type={showChangeFields ? 'text' : 'password'}
                value={oldPasskey}
                onChange={(e) => setOldPasskey(e.target.value)}
                placeholder="Masukkan kata kunci saat ini..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Kata Kunci Baru:
              </label>
              <input
                type={showChangeFields ? 'text' : 'password'}
                value={newPasskey}
                onChange={(e) => setNewPasskey(e.target.value)}
                placeholder="Minimal 4 karakter (huruf/angka)..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Ulangi Kata Kunci Baru:
              </label>
              <input
                type={showChangeFields ? 'text' : 'password'}
                value={confirmNewPasskey}
                onChange={(e) => setConfirmNewPasskey(e.target.value)}
                placeholder="Ketik ulang kata kunci baru..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showChangeFields}
                  onChange={(e) => setShowChangeFields(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>Lihat teks kata kunci</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdating || !oldPasskey || !newPasskey || !confirmNewPasskey}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? 'Menyimpan...' : 'Simpan Kata Kunci Baru'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
