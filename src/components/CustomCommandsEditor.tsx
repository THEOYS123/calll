import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  MessageSquare,
  Zap,
  Terminal,
  Code
} from 'lucide-react';
import { CustomCommand, AutoReplyRule } from '../types';

interface CustomCommandsEditorProps {
  customCommands: CustomCommand[];
  autoReplies: AutoReplyRule[];
  welcomeMessage: string;
  onSaveCommands: (commands: CustomCommand[]) => Promise<void>;
  onSaveAutoReplies: (replies: AutoReplyRule[]) => Promise<void>;
  onSaveWelcomeMessage: (message: string) => Promise<void>;
}

export function CustomCommandsEditor({
  customCommands,
  autoReplies,
  welcomeMessage,
  onSaveCommands,
  onSaveAutoReplies,
  onSaveWelcomeMessage
}: CustomCommandsEditorProps) {
  const [activeTab, setActiveTab] = useState<'commands' | 'autoreply' | 'welcome'>('commands');

  // Local states for editing
  const [commandsList, setCommandsList] = useState<CustomCommand[]>(customCommands);
  const [repliesList, setRepliesList] = useState<AutoReplyRule[]>(autoReplies);
  const [welcomeText, setWelcomeText] = useState<string>(welcomeMessage);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // New Command Form
  const [newCmdName, setNewCmdName] = useState('');
  const [newCmdDesc, setNewCmdDesc] = useState('');
  const [newCmdReply, setNewCmdReply] = useState('');

  // New Auto Reply Form
  const [newKeyword, setNewKeyword] = useState('');
  const [newMatchType, setNewMatchType] = useState<'contains' | 'exact'>('contains');
  const [newKeywordReply, setNewKeywordReply] = useState('');

  React.useEffect(() => {
    setCommandsList(customCommands);
  }, [customCommands]);

  React.useEffect(() => {
    setRepliesList(autoReplies);
  }, [autoReplies]);

  React.useEffect(() => {
    setWelcomeText(welcomeMessage);
  }, [welcomeMessage]);

  const showNotification = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  // Add new command
  const handleAddCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCmdName.trim() || !newCmdReply.trim()) return;

    const cleanCmd = newCmdName.trim().replace(/^\//, '').toLowerCase();
    const updated = [
      ...commandsList,
      {
        id: `cmd-${Date.now()}`,
        command: cleanCmd,
        description: newCmdDesc.trim() || `Perintah /${cleanCmd}`,
        replyText: newCmdReply.trim(),
        enabled: true
      }
    ];

    setCommandsList(updated);
    setNewCmdName('');
    setNewCmdDesc('');
    setNewCmdReply('');

    setIsSaving(true);
    await onSaveCommands(updated);
    setIsSaving(false);
    showNotification(`Perintah /${cleanCmd} berhasil ditambahkan!`);
  };

  // Delete command
  const handleDeleteCommand = async (id: string) => {
    const updated = commandsList.filter((c) => c.id !== id);
    setCommandsList(updated);
    setIsSaving(true);
    await onSaveCommands(updated);
    setIsSaving(false);
    showNotification('Perintah berhasil dihapus.');
  };

  // Toggle command
  const handleToggleCommand = async (id: string) => {
    const updated = commandsList.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c));
    setCommandsList(updated);
    setIsSaving(true);
    await onSaveCommands(updated);
    setIsSaving(false);
  };

  // Add new auto reply
  const handleAddAutoReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newKeywordReply.trim()) return;

    const cleanKw = newKeyword.trim().toLowerCase();
    const updated = [
      ...repliesList,
      {
        id: `ar-${Date.now()}`,
        triggerKeyword: cleanKw,
        matchType: newMatchType,
        replyText: newKeywordReply.trim(),
        enabled: true
      }
    ];

    setRepliesList(updated);
    setNewKeyword('');
    setNewKeywordReply('');

    setIsSaving(true);
    await onSaveAutoReplies(updated);
    setIsSaving(false);
    showNotification(`Aturan kata kunci "${cleanKw}" berhasil disimpan!`);
  };

  // Delete auto reply
  const handleDeleteAutoReply = async (id: string) => {
    const updated = repliesList.filter((r) => r.id !== id);
    setRepliesList(updated);
    setIsSaving(true);
    await onSaveAutoReplies(updated);
    setIsSaving(false);
    showNotification('Aturan auto-reply berhasil dihapus.');
  };

  // Toggle auto reply
  const handleToggleAutoReply = async (id: string) => {
    const updated = repliesList.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setRepliesList(updated);
    setIsSaving(true);
    await onSaveAutoReplies(updated);
    setIsSaving(false);
  };

  // Save welcome message
  const handleSaveWelcome = async () => {
    setIsSaving(true);
    await onSaveWelcomeMessage(welcomeText);
    setIsSaving(false);
    showNotification('Pesan sambutan /start berhasil diperbarui!');
  };

  return (
    <div id="custom-commands-editor" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Kustomisasi Perintah & Balasan Otomatis
            </h3>
            <p className="text-xs text-slate-400">
              Tambahkan perintah kustom baru, auto-replies kata kunci, atau sesuaikan ucapan sambutan /start.
            </p>
          </div>
        </div>

        {/* Subtabs */}
        <div className="flex items-center p-1 bg-slate-800 rounded-xl border border-slate-700/80">
          <button
            onClick={() => setActiveTab('commands')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'commands'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Perintah Baru ({commandsList.length})
          </button>
          <button
            onClick={() => setActiveTab('autoreply')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'autoreply'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Auto-Replies ({repliesList.length})
          </button>
          <button
            onClick={() => setActiveTab('welcome')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'welcome'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Teks /start
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Tab 1: Custom Commands */}
      {activeTab === 'commands' && (
        <div className="mt-6 space-y-6">
          {/* Add New Command Form */}
          <form onSubmit={handleAddCommand} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="font-semibold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Perintah Kustom Baru</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nama Perintah (tanpa garis miring)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">/</span>
                  <input
                    type="text"
                    value={newCmdName}
                    onChange={(e) => setNewCmdName(e.target.value)}
                    placeholder="contoh: kontak, harga, jadwal"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Keterangan Singkat</label>
                <input
                  type="text"
                  value={newCmdDesc}
                  onChange={(e) => setNewCmdDesc(e.target.value)}
                  placeholder="Informasi kontak admin WhatsApp / Telegram"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Teks Balasan Bot (Markdown didukung)</label>
              <textarea
                rows={2}
                value={newCmdReply}
                onChange={(e) => setNewCmdReply(e.target.value)}
                placeholder="Tulis balasan bot yang akan dikirim saat pengguna mengetik perintah ini..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving || !newCmdName.trim() || !newCmdReply.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all active:scale-95 disabled:opacity-50"
              >
                + Simpan Perintah Baru
              </button>
            </div>
          </form>

          {/* List of Custom Commands */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Daftar Perintah Kustom Aktif
            </h4>

            {commandsList.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/30 rounded-xl">
                Belum ada perintah kustom. Tambahkan melalui formulir di atas.
              </div>
            ) : (
              commandsList.map((cmd) => (
                <div
                  key={cmd.id}
                  className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        /{cmd.command}
                      </span>
                      <span className="text-xs text-slate-400">
                        — {cmd.description}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg font-mono">
                      {cmd.replyText}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleCommand(cmd.id)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                        cmd.enabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {cmd.enabled ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button
                      onClick={() => handleDeleteCommand(cmd.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Hapus perintah"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Auto-Replies */}
      {activeTab === 'autoreply' && (
        <div className="mt-6 space-y-6">
          {/* Add Form */}
          <form onSubmit={handleAddAutoReply} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="font-semibold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kata Kunci Pemicu (Trigger)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Kata Kunci (Keyword)</label>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="contoh: halo, p, info, bayar"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Tipe Pencocokan</label>
                <select
                  value={newMatchType}
                  onChange={(e) => setNewMatchType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="contains">Mengandung kata kunci (Contains)</option>
                  <option value="exact">Persis sama (Exact match)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Teks Balasan Otomatis</label>
              <textarea
                rows={2}
                value={newKeywordReply}
                onChange={(e) => setNewKeywordReply(e.target.value)}
                placeholder="Tulis balasan yang akan dikirim secara instan..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving || !newKeyword.trim() || !newKeywordReply.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all active:scale-95 disabled:opacity-50"
              >
                + Simpan Auto-Reply
              </button>
            </div>
          </form>

          {/* List of Auto-Replies */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Daftar Aturan Auto-Reply Aktif
            </h4>

            {repliesList.map((rule) => (
              <div
                key={rule.id}
                className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-300 text-xs px-2 py-0.5 bg-cyan-950 rounded border border-cyan-800">
                      &quot;{rule.triggerKeyword}&quot;
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({rule.matchType === 'exact' ? 'Harus Persis' : 'Jika Mengandung'})
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg font-mono">
                    {rule.replyText}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleToggleAutoReply(rule.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      rule.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {rule.enabled ? 'Aktif' : 'Nonaktif'}
                  </button>
                  <button
                    onClick={() => handleDeleteAutoReply(rule.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Hapus aturan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Welcome Message Editor */}
      {activeTab === 'welcome' && (
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="input-welcome-msg" className="text-xs font-semibold text-slate-300 block mb-1">
              Pesan Sambutan Utama (/start)
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Pesan ini akan otomatis dikirimkan kepada pengguna saat mereka pertama kali membuka bot atau mengirim <code className="text-cyan-300">/start</code>.
            </p>
            <textarea
              id="input-welcome-msg"
              rows={6}
              value={welcomeText}
              onChange={(e) => setWelcomeText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveWelcome}
              disabled={isSaving || !welcomeText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Teks Sambutan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
