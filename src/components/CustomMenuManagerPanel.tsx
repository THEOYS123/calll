import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Power,
  Sparkles,
  Smartphone,
  Shield,
  Gift,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Save,
  MessageSquare,
  Search,
  Users,
  Settings2,
  Info
} from 'lucide-react';
import {
  CustomMenuItem,
  BotMenuConfig,
  QuotaConfig,
  GroupConfig,
  BotUserEntry,
  DEFAULT_MENU_CONFIG,
  DEFAULT_QUOTA_CONFIG
} from '../types';

interface CustomMenuManagerPanelProps {
  customMenus: CustomMenuItem[];
  onSaveCustomMenus: (menus: CustomMenuItem[]) => Promise<void>;
  menuConfig?: BotMenuConfig;
  onSaveMenuConfig?: (config: BotMenuConfig) => Promise<void>;
  quotaConfig?: QuotaConfig;
  onSaveQuotaConfig?: (config: QuotaConfig) => Promise<void>;
  groupConfig?: GroupConfig;
  onSaveGroupConfig?: (config: GroupConfig) => Promise<void>;
  activeUsers?: BotUserEntry[];
  onResetUserClaims?: (userId: number, resetNew: boolean, resetDaily: boolean) => Promise<void>;
}

export function CustomMenuManagerPanel({
  customMenus,
  onSaveCustomMenus,
  menuConfig = DEFAULT_MENU_CONFIG,
  onSaveMenuConfig,
  quotaConfig = DEFAULT_QUOTA_CONFIG,
  onSaveQuotaConfig,
  groupConfig,
  onSaveGroupConfig,
  activeUsers = [],
  onResetUserClaims
}: CustomMenuManagerPanelProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'menus' | 'quota' | 'antispam'>('menus');

  // Local State: Custom Menus
  const [menus, setMenus] = useState<CustomMenuItem[]>(customMenus);
  const [isSavingMenus, setIsSavingMenus] = useState(false);

  // Local State: Menu Config
  const [localMenuConfig, setLocalMenuConfig] = useState<BotMenuConfig>(menuConfig);
  const [isSavingMenuCfg, setIsSavingMenuCfg] = useState(false);
  const [isMenuDirty, setIsMenuDirty] = useState(false);

  // Local State: Quota Config
  const [localQuotaConfig, setLocalQuotaConfig] = useState<QuotaConfig>(quotaConfig);
  const [isSavingQuotaCfg, setIsSavingQuotaCfg] = useState(false);
  const [newUserQuotaInput, setNewUserQuotaInput] = useState<string>(
    String(quotaConfig?.newUserQuotaAmount ?? 5)
  );
  const [dailyQuotaInput, setDailyQuotaInput] = useState<string>(
    String(quotaConfig?.dailyQuotaAmount ?? 2)
  );
  const [isQuotaDirty, setIsQuotaDirty] = useState(false);

  // Local State: Anti-Flood Group Config
  const [antiFloodEnabled, setAntiFloodEnabled] = useState<boolean>(groupConfig?.enableAntiFlood ?? true);
  const [antiFloodCooldown, setAntiFloodCooldown] = useState<number>(groupConfig?.antiFloodCooldownSeconds ?? 3);
  const [antiFloodCooldownInput, setAntiFloodCooldownInput] = useState<string>(
    String(groupConfig?.antiFloodCooldownSeconds ?? 3)
  );
  const [isSavingAntiSpam, setIsSavingAntiSpam] = useState(false);
  const [isGroupDirty, setIsGroupDirty] = useState(false);

  // Modal State for Custom Buttons
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'callback' | 'url'>('callback');
  const [responseText, setResponseText] = useState('');
  const [url, setUrl] = useState('');

  // Notification Toast State
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setBannerNotice(msg);
    setTimeout(() => setBannerNotice(null), 3500);
  };

  // Sync if props change ONLY when user is not actively editing
  React.useEffect(() => {
    setMenus(customMenus);
  }, [customMenus]);

  React.useEffect(() => {
    if (menuConfig && !isMenuDirty) {
      setLocalMenuConfig(menuConfig);
    }
  }, [menuConfig, isMenuDirty]);

  React.useEffect(() => {
    if (quotaConfig && !isQuotaDirty) {
      setLocalQuotaConfig(quotaConfig);
      setNewUserQuotaInput(String(quotaConfig.newUserQuotaAmount ?? 5));
      setDailyQuotaInput(String(quotaConfig.dailyQuotaAmount ?? 2));
    }
  }, [quotaConfig, isQuotaDirty]);

  React.useEffect(() => {
    if (groupConfig && !isGroupDirty) {
      setAntiFloodEnabled(groupConfig.enableAntiFlood ?? true);
      setAntiFloodCooldown(groupConfig.antiFloodCooldownSeconds ?? 3);
      setAntiFloodCooldownInput(String(groupConfig.antiFloodCooldownSeconds ?? 3));
    }
  }, [groupConfig, isGroupDirty]);

  // Handler: Save Menu Config (Button Toggles & Header)
  const handleSaveMenuSettings = async () => {
    if (!onSaveMenuConfig) return;
    setIsSavingMenuCfg(true);
    try {
      await onSaveMenuConfig(localMenuConfig);
      setIsMenuDirty(false);
      showNotice('Pengaturan menu & tombol bot berhasil disimpan!');
    } catch {
      showNotice('Gagal menyimpan pengaturan menu.');
    } finally {
      setIsSavingMenuCfg(false);
    }
  };

  // Handler: Save Quota Settings
  const handleSaveQuotaSettings = async () => {
    if (!onSaveQuotaConfig) return;
    setIsSavingQuotaCfg(true);
    try {
      const parsedNew = parseInt(newUserQuotaInput, 10);
      const parsedDaily = parseInt(dailyQuotaInput, 10);

      const finalNewUser = !isNaN(parsedNew) && parsedNew > 0 ? Math.min(100, parsedNew) : 5;
      const finalDaily = !isNaN(parsedDaily) && parsedDaily > 0 ? Math.min(50, parsedDaily) : 2;

      const configToSave: QuotaConfig = {
        ...localQuotaConfig,
        newUserQuotaAmount: finalNewUser,
        dailyQuotaAmount: finalDaily
      };

      setLocalQuotaConfig(configToSave);
      setNewUserQuotaInput(String(finalNewUser));
      setDailyQuotaInput(String(finalDaily));

      await onSaveQuotaConfig(configToSave);
      setIsQuotaDirty(false);
      showNotice('Pengaturan klaim kuota gratis & anti-celah berhasil diperbarui!');
    } catch {
      showNotice('Gagal menyimpan konfigurasi kuota.');
    } finally {
      setIsSavingQuotaCfg(false);
    }
  };

  // Handler: Save Anti-Spam / Anti-Flood Settings
  const handleSaveAntiSpamSettings = async () => {
    if (!onSaveGroupConfig || !groupConfig) return;
    setIsSavingAntiSpam(true);
    try {
      const parsedCd = parseInt(antiFloodCooldownInput, 10);
      const finalCd = !isNaN(parsedCd) && parsedCd > 0 ? Math.min(30, parsedCd) : 3;

      const updated: GroupConfig = {
        ...groupConfig,
        enableAntiFlood: antiFloodEnabled,
        antiFloodCooldownSeconds: finalCd
      };

      setAntiFloodCooldown(finalCd);
      setAntiFloodCooldownInput(String(finalCd));

      await onSaveGroupConfig(updated);
      setIsGroupDirty(false);
      showNotice('Sistem Anti-Spam & Anti-Flood berhasil diperbarui!');
    } catch {
      showNotice('Gagal menyimpan pengaturan anti-spam.');
    } finally {
      setIsSavingAntiSpam(false);
    }
  };

  // Handler: Reset User Claims
  const handleResetClaims = async (userId: number, resetNew: boolean, resetDaily: boolean) => {
    if (!onResetUserClaims) return;
    try {
      await onResetUserClaims(userId, resetNew, resetDaily);
      showNotice(`Jatah klaim untuk User ID ${userId} berhasil direset!`);
    } catch {
      showNotice('Gagal mereset jatah klaim.');
    }
  };

  // Custom Button Actions
  const handleOpenCreate = () => {
    setEditingId(null);
    setLabel('');
    setType('callback');
    setResponseText('');
    setUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CustomMenuItem) => {
    setEditingId(item.id);
    setLabel(item.label);
    setType(item.type);
    setResponseText(item.responseText || '');
    setUrl(item.url || '');
    setIsModalOpen(true);
  };

  const handleSaveCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    let updatedList: CustomMenuItem[];
    if (editingId) {
      updatedList = menus.map((m) =>
        m.id === editingId
          ? {
              ...m,
              label: label.trim(),
              type,
              responseText: type === 'callback' ? responseText.trim() : undefined,
              url: type === 'url' ? url.trim() : undefined
            }
          : m
      );
    } else {
      const newItem: CustomMenuItem = {
        id: `menu-${Date.now()}`,
        label: label.trim(),
        type,
        responseText: type === 'callback' ? responseText.trim() : undefined,
        url: type === 'url' ? url.trim() : undefined,
        enabled: true
      };
      updatedList = [...menus, newItem];
    }

    setMenus(updatedList);
    setIsModalOpen(false);

    setIsSavingMenus(true);
    try {
      await onSaveCustomMenus(updatedList);
      showNotice('Tombol menu baru berhasil disimpan!');
    } finally {
      setIsSavingMenus(false);
    }
  };

  const handleToggleEnabled = async (id: string) => {
    const updated = menus.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m));
    setMenus(updated);
    setIsSavingMenus(true);
    try {
      await onSaveCustomMenus(updated);
    } finally {
      setIsSavingMenus(false);
    }
  };

  const handleDelete = async (id: string) => {
    const updated = menus.filter((m) => m.id !== id);
    setMenus(updated);
    setIsSavingMenus(true);
    try {
      await onSaveCustomMenus(updated);
      showNotice('Tombol menu berhasil dihapus.');
    } finally {
      setIsSavingMenus(false);
    }
  };

  const applyTemplate = (tmpl: { label: string; text: string; type: 'callback' | 'url'; url?: string }) => {
    setLabel(tmpl.label);
    setType(tmpl.type);
    setResponseText(tmpl.text);
    if (tmpl.url) setUrl(tmpl.url);
  };

  return (
    <div id="custom-menu-manager-panel" className="space-y-6">
      {/* Toast Notice */}
      {bannerNotice && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{bannerNotice}</span>
          </div>
        </div>
      )}

      {/* Main Header & Subnav */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-100">
                  Pengaturan Menu Bot, Klaim Kuota Gratis & Anti-Celah
                </h3>
                <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs rounded-full font-mono font-semibold">
                  Sistem V2.5
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Atur tata letak menu Telegram, bonus kuota pengguna baru, kuota harian, serta perlindungan anti-spam & anti-exploit.
              </p>
            </div>
          </div>

          {/* Quick Tabs Switcher */}
          <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('menus')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'menus'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Menu & Tombol Bot</span>
            </button>
            <button
              onClick={() => setActiveTab('quota')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'quota'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Klaim Kuota Gratis</span>
            </button>
            <button
              onClick={() => setActiveTab('antispam')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'antispam'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Anti-Spam & Celah</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: MENU & TOMBOL BOT TELEGRAM */}
        {/* ========================================================================= */}
        {activeTab === 'menus' && (
          <div className="pt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Menu Controls */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Header Teks Sambutan /menu */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <span>Header Teks Sambutan Menu Bot (/menu)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isMenuDirty && (
                        <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded">
                          Belum Disimpan
                        </span>
                      )}
                      <button
                        onClick={handleSaveMenuSettings}
                        disabled={isSavingMenuCfg}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingMenuCfg ? 'Menyimpan...' : 'Simpan Teks'}</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={localMenuConfig.welcomeMessageHeader || ''}
                    onChange={(e) => {
                      setIsMenuDirty(true);
                      setLocalMenuConfig({
                        ...localMenuConfig,
                        welcomeMessageHeader: e.target.value
                      });
                    }}
                    placeholder="👋 Halo! Selamat datang di axxosintbot Intelligence & Automation (by Ax.)."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400">
                    Teks ini akan selalu tampil di bagian atas menu interaktif saat pengguna mengirimkan perintah <code className="text-cyan-300 font-mono">/menu</code> atau <code className="text-cyan-300 font-mono">/start</code>.
                  </p>
                </div>

                {/* 2. Tombol Utama Inline Keyboard Toggle */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                      <Settings2 className="w-4 h-4 text-indigo-400" />
                      <span>Visibilitas Tombol Utama di Telegram</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Aktifkan/Nonaktifkan tombol bawaan</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Toggle Klaim Kuota */}
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>🎁 Klaim Kuota Gratis</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Menu klaim kuota baru & harian</div>
                      </div>
                      <button
                        onClick={() =>
                          setLocalMenuConfig({
                            ...localMenuConfig,
                            showClaimButtonInMenu: !localMenuConfig.showClaimButtonInMenu
                          })
                        }
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                          localMenuConfig.showClaimButtonInMenu !== false ? 'bg-blue-600' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            localMenuConfig.showClaimButtonInMenu !== false ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle Sisa Kuota */}
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>💎 Sisa Kuota Saya</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Status kuota pribadi pengguna</div>
                      </div>
                      <button
                        onClick={() =>
                          setLocalMenuConfig({
                            ...localMenuConfig,
                            showQuotaButtonInMenu: !localMenuConfig.showQuotaButtonInMenu
                          })
                        }
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                          localMenuConfig.showQuotaButtonInMenu !== false ? 'bg-blue-600' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            localMenuConfig.showQuotaButtonInMenu !== false ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle OSINT Intel */}
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>🟢/🔴 Status OSINT Intel</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Petunjuk & status ON/OFF</div>
                      </div>
                      <button
                        onClick={() =>
                          setLocalMenuConfig({
                            ...localMenuConfig,
                            showOsintButtonInMenu: !localMenuConfig.showOsintButtonInMenu
                          })
                        }
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                          localMenuConfig.showOsintButtonInMenu !== false ? 'bg-blue-600' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            localMenuConfig.showOsintButtonInMenu !== false ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle Tarif API Key */}
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>💎 Tarif & Cek API Key</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Daftar harga & cek key</div>
                      </div>
                      <button
                        onClick={() =>
                          setLocalMenuConfig({
                            ...localMenuConfig,
                            showPriceButtonInMenu: !localMenuConfig.showPriceButtonInMenu
                          })
                        }
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                          localMenuConfig.showPriceButtonInMenu !== false ? 'bg-blue-600' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            localMenuConfig.showPriceButtonInMenu !== false ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle Hubungi Owner */}
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>📞 Kontak Owner</span>
                        </div>
                        <div className="text-[10px] text-slate-400">@flood1233 bantuan & order</div>
                      </div>
                      <button
                        onClick={() =>
                          setLocalMenuConfig({
                            ...localMenuConfig,
                            showOwnerButtonInMenu: !localMenuConfig.showOwnerButtonInMenu
                          })
                        }
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                          localMenuConfig.showOwnerButtonInMenu !== false ? 'bg-blue-600' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            localMenuConfig.showOwnerButtonInMenu !== false ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle Bantuan & Fitur */}
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>ℹ️ Bantuan & Panduan</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Petunjuk daftar perintah lengkap</div>
                      </div>
                      <button
                        onClick={() =>
                          setLocalMenuConfig({
                            ...localMenuConfig,
                            showHelpButtonInMenu: !localMenuConfig.showHelpButtonInMenu
                          })
                        }
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                          localMenuConfig.showHelpButtonInMenu !== false ? 'bg-blue-600' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            localMenuConfig.showHelpButtonInMenu !== false ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveMenuSettings}
                      disabled={isSavingMenuCfg}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingMenuCfg ? 'Menyimpan...' : 'Simpan Pengaturan Menu'}</span>
                    </button>
                  </div>
                </div>

                {/* 3. Tombol Tambahan Kustom */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span>Tombol Kustom Tambahan ({menus.length})</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Tambahkan tombol kustom fleksibel untuk promo, grup telegram, atau jawaban otomatis.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenCreate}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Tombol</span>
                    </button>
                  </div>

                  {menus.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      Belum ada tombol kustom tambahan. Klik &quot;Tambah Tombol&quot; untuk menambahkan.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {menus.map((m) => (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                            m.enabled ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/40 border-slate-800/40 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <button
                              onClick={() => handleToggleEnabled(m.id)}
                              className={`p-1.5 rounded-lg border text-xs ${
                                m.enabled
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                              title={m.enabled ? 'Nonaktifkan' : 'Aktifkan'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-200 truncate">{m.label}</span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono uppercase">
                                  {m.type}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                {m.type === 'url' ? m.url : m.responseText}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenEdit(m)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Interactive Telegram Mock Simulation */}
              <div className="lg:col-span-5 bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider pb-2 border-b border-slate-800">
                  <Smartphone className="w-4 h-4" />
                  <span>Simulasi Real-Time Tampilan di Telegram</span>
                </div>

                {/* Mock Telegram Message Container */}
                <div className="bg-[#182533] p-4 rounded-2xl border border-[#2b5278]/40 shadow-inner space-y-3">
                  <div className="text-xs text-slate-200 leading-relaxed font-sans">
                    {localMenuConfig.welcomeMessageHeader || '👋 Halo! Selamat datang di axxosintbot Intelligence & Automation (Created by Ax.).'}
                    <div className="mt-2 text-[11px] text-slate-400">
                      👤 <strong>Pengguna:</strong> Pengguna Baru
                      <br />
                      🆔 <strong>Chat ID:</strong> <code>6010911941</code> ✅ <em>(Terdaftar Resmi)</em>
                      <br />
                      💎 <strong>Sisa Kuota Pribadi:</strong> {newUserQuotaInput || '5'}x Pencarian
                    </div>
                  </div>

                  {/* Dynamic Keyboard Preview based on Config */}
                  <div className="space-y-1.5 pt-2">
                    {/* Row 1: Claim & Quota */}
                    {(localMenuConfig.showClaimButtonInMenu !== false || localMenuConfig.showQuotaButtonInMenu !== false) && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {localMenuConfig.showClaimButtonInMenu !== false && (
                          <div className="py-2 px-2.5 bg-blue-600/90 text-white text-[11px] font-bold text-center rounded-lg shadow-sm truncate">
                            🎁 Klaim Kuota Gratis
                          </div>
                        )}
                        {localMenuConfig.showQuotaButtonInMenu !== false && (
                          <div className="py-2 px-2.5 bg-[#2b5278]/90 text-white text-[11px] font-semibold text-center rounded-lg shadow-sm truncate">
                            💎 Sisa Kuota Saya
                          </div>
                        )}
                      </div>
                    )}

                    {/* Row 2: OSINT & Pricing */}
                    {(localMenuConfig.showOsintButtonInMenu !== false || localMenuConfig.showPriceButtonInMenu !== false) && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {localMenuConfig.showOsintButtonInMenu !== false && (
                          <div className="py-2 px-2.5 bg-[#2b5278]/90 text-white text-[11px] font-semibold text-center rounded-lg shadow-sm truncate">
                            🟢 OSINT Intel (AKTIF)
                          </div>
                        )}
                        {localMenuConfig.showPriceButtonInMenu !== false && (
                          <div className="py-2 px-2.5 bg-[#2b5278]/90 text-white text-[11px] font-semibold text-center rounded-lg shadow-sm truncate">
                            💎 Tarif & Cek API Key
                          </div>
                        )}
                      </div>
                    )}

                    {/* Row 3: ID & Bot info */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="py-2 px-2.5 bg-[#2b5278]/80 text-white text-[11px] font-semibold text-center rounded-lg shadow-sm truncate">
                        🆔 Cek Chat ID & Profil
                      </div>
                      <div className="py-2 px-2.5 bg-[#2b5278]/80 text-white text-[11px] font-semibold text-center rounded-lg shadow-sm truncate">
                        🤖 Detail & Info Bot
                      </div>
                    </div>

                    {/* Row 4: Ping & WIB Time */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="py-2 px-2.5 bg-[#2b5278]/80 text-white text-[11px] font-semibold text-center rounded-lg shadow-sm truncate">
                        🏓 Ping & Status Server
                      </div>
                      <div className="py-2 px-2.5 bg-[#2b5278]/80 text-white text-[11px] font-semibold text-center rounded-lg shadow-sm truncate">
                        ⏰ Jam Real-Time (WIB)
                      </div>
                    </div>

                    {/* Row 5: Owner & Calculator */}
                    {localMenuConfig.showOwnerButtonInMenu !== false && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="py-2 px-2.5 bg-[#2b5278]/80 text-white text-[11px] font-semibold text-center rounded-lg shadow-sm truncate">
                          🧮 Kalkulator Cepat
                        </div>
                        <div className="py-2 px-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[11px] font-bold text-center rounded-lg shadow-sm truncate">
                          📞 Hubungi Owner
                        </div>
                      </div>
                    )}

                    {/* Custom Buttons */}
                    {menus.filter((m) => m.enabled).length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#2b5278]/40">
                        {menus.filter((m) => m.enabled).map((m) => (
                          <div
                            key={m.id}
                            className="py-2 px-2.5 bg-gradient-to-r from-blue-700/80 to-indigo-700/80 text-white text-[11px] font-bold text-center rounded-lg shadow-sm truncate ring-1 ring-blue-400/30 flex items-center justify-center gap-1"
                          >
                            <span>{m.label}</span>
                            {m.type === 'url' && <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-75" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-blue-300 text-[11px] leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                  <span>
                    Semua perubahan tombol di atas akan langsung aktif di Telegram tanpa perlu me-restart bot.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PENGATURAN KLAIM KUOTA GRATIS (PENGGUNA BARU & HARIAN) */}
        {/* ========================================================================= */}
        {activeTab === 'quota' && (
          <div className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Bonus Pengguna Baru */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30 flex items-center justify-center">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">Kuota Hadiah Pengguna Baru</h4>
                      <p className="text-[11px] text-slate-400">Bonus sambutan 1x seumur hidup</p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setLocalQuotaConfig({
                        ...localQuotaConfig,
                        newUserQuotaEnabled: !localQuotaConfig.newUserQuotaEnabled
                      })
                    }
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      localQuotaConfig.newUserQuotaEnabled ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        localQuotaConfig.newUserQuotaEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Jumlah Kuota Gratis Pengguna Baru (Kali Pemakaian):
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        id="input-new-user-quota"
                        value={newUserQuotaInput}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setNewUserQuotaInput(raw);
                          setIsQuotaDirty(true);
                          const parsed = parseInt(raw, 10);
                          if (!isNaN(parsed) && parsed > 0) {
                            setLocalQuotaConfig((prev) => ({
                              ...prev,
                              newUserQuotaAmount: Math.min(100, parsed)
                            }));
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseInt(newUserQuotaInput, 10);
                          const valid = isNaN(parsed) || parsed < 1 ? 5 : Math.min(100, parsed);
                          setNewUserQuotaInput(String(valid));
                          setLocalQuotaConfig((prev) => ({
                            ...prev,
                            newUserQuotaAmount: valid
                          }));
                        }}
                        placeholder="5"
                        className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-blue-500 text-center"
                      />
                      <span className="text-xs text-slate-400 font-medium">x Kuota Pencarian</span>

                      {/* Quick adjuster buttons */}
                      <div className="flex items-center gap-1">
                        {[-1, +1, +5].map((delta) => (
                          <button
                            key={delta}
                            type="button"
                            onClick={() => {
                              const curr = parseInt(newUserQuotaInput, 10) || 5;
                              const updated = Math.min(100, Math.max(1, curr + delta));
                              setNewUserQuotaInput(String(updated));
                              setIsQuotaDirty(true);
                              setLocalQuotaConfig((prev) => ({
                                ...prev,
                                newUserQuotaAmount: updated
                              }));
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-bold transition-colors"
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-xl text-[11px] text-blue-300/90 leading-relaxed">
                    🛡️ <strong>Anti-Celah Terpasang:</strong> Setiap akun Telegram diverifikasi permanen berdasarkan Immutable User ID Telegram. Pengguna tidak dapat menghapus chat atau mengulang perintah untuk mengambil kuota ini lebih dari satu kali.
                  </div>
                </div>
              </div>

              {/* Card 2: Kuota Gratis Harian */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">Klaim Kuota Gratis Harian</h4>
                      <p className="text-[11px] text-slate-400">Dapat diklaim setiap 24 jam kalender WIB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsQuotaDirty(true);
                      setLocalQuotaConfig({
                        ...localQuotaConfig,
                        dailyQuotaEnabled: !localQuotaConfig.dailyQuotaEnabled
                      });
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      localQuotaConfig.dailyQuotaEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        localQuotaConfig.dailyQuotaEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Jumlah Kuota Harian (Kali Pemakaian per Hari):
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        id="input-daily-quota"
                        value={dailyQuotaInput}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setDailyQuotaInput(raw);
                          setIsQuotaDirty(true);
                          const parsed = parseInt(raw, 10);
                          if (!isNaN(parsed) && parsed > 0) {
                            setLocalQuotaConfig((prev) => ({
                              ...prev,
                              dailyQuotaAmount: Math.min(50, parsed)
                            }));
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseInt(dailyQuotaInput, 10);
                          const valid = isNaN(parsed) || parsed < 1 ? 2 : Math.min(50, parsed);
                          setDailyQuotaInput(String(valid));
                          setLocalQuotaConfig((prev) => ({
                            ...prev,
                            dailyQuotaAmount: valid
                          }));
                        }}
                        placeholder="2"
                        className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-indigo-500 text-center"
                      />
                      <span className="text-xs text-slate-400 font-medium">x Kuota / Hari</span>

                      {/* Quick adjuster buttons */}
                      <div className="flex items-center gap-1">
                        {[-1, +1, +3].map((delta) => (
                          <button
                            key={delta}
                            type="button"
                            onClick={() => {
                              const curr = parseInt(dailyQuotaInput, 10) || 2;
                              const updated = Math.min(50, Math.max(1, curr + delta));
                              setDailyQuotaInput(String(updated));
                              setIsQuotaDirty(true);
                              setLocalQuotaConfig((prev) => ({
                                ...prev,
                                dailyQuotaAmount: updated
                              }));
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-bold transition-colors"
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-950/20 border border-indigo-800/40 rounded-xl text-[11px] text-indigo-300/90 leading-relaxed">
                    ⏰ <strong>Waktu Reset Otomatis:</strong> Kuota harian ter-reset otomatis tepat pukul <strong>00:00 WIB (Tengah Malam)</strong> menggunakan sinkronisasi kalender zona waktu Indonesia (Asia/Jakarta).
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Aturan Penggunaan Kuota (Fix Masalah Kuota Tidak Bisa Digunakan) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Aturan Penggunaan &amp; Pemotongan Kuota Pencarian</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Memastikan kuota hasil klaim gratis pengguna baru &amp; harian langsung bisa dipakai dan bekerja lancar.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isQuotaDirty && (
                    <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-semibold flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Belum Disimpan</span>
                    </span>
                  )}
                  <button
                    id="btn-save-quota-config"
                    onClick={handleSaveQuotaSettings}
                    disabled={isSavingQuotaCfg}
                    className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5 ${
                      isQuotaDirty
                        ? 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 ring-2 ring-amber-400/40'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingQuotaCfg ? 'Menyimpan...' : 'Simpan Semua Konfigurasi Kuota'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        Potong Kuota Hanya Jika Target Ditemukan
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Jika target 0 match di dataset, kuota tidak akan dipotong sama sekali.
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setLocalQuotaConfig({
                          ...localQuotaConfig,
                          deductQuotaOnlyOnFound: !localQuotaConfig.deductQuotaOnlyOnFound
                        })
                      }
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                        localQuotaConfig.deductQuotaOnlyOnFound !== false ? 'bg-amber-600' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          localQuotaConfig.deductQuotaOnlyOnFound !== false ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        Pencarian Otomatis Pakai Kuota Pribadi
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Pengguna tidak perlu mengetikkan API key, cukup <code>search: &lt;target&gt;</code>.
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setLocalQuotaConfig({
                          ...localQuotaConfig,
                          allowSearchWithoutApiKey: !localQuotaConfig.allowSearchWithoutApiKey
                        })
                      }
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                        localQuotaConfig.allowSearchWithoutApiKey !== false ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          localQuotaConfig.allowSearchWithoutApiKey !== false ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Panduan Format Perintah Agar Kuota Bekerja */}
              <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-emerald-300 text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Format Perintah yang Didukung untuk Menggunakan Kuota:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-emerald-300/90 font-mono">
                  <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/30">
                    • <code>/search &lt;target&gt;</code> (Contoh: /search asep)
                    <br />
                    • <code>search: &lt;target&gt;</code> (Contoh: search: budi)
                  </div>
                  <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/30">
                    • <code>/cari &lt;target&gt;</code> atau <code>cari: &lt;target&gt;</code>
                    <br />
                    • <code>/cek &lt;target&gt;</code> atau <code>cek: &lt;target&gt;</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Audit & Reset Jatah Klaim Pengguna Terdaftar */}
            {activeUsers.length > 0 && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>Audit Status Klaim &amp; Sisa Kuota Pengguna ({activeUsers.length})</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Lihat status klaim masing-masing user atau reset jatah mereka jika diperlukan.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-3 font-semibold">User</th>
                        <th className="py-2.5 px-3 font-semibold">Chat ID / UID</th>
                        <th className="py-2.5 px-3 font-semibold">Sisa Kuota</th>
                        <th className="py-2.5 px-3 font-semibold">Bonus Baru</th>
                        <th className="py-2.5 px-3 font-semibold">Klaim Harian</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Aksi Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {activeUsers.slice(0, 10).map((u) => {
                        const uid = Number(u.userId || u.chatId);
                        const isNewClaimed = Boolean(u.hasClaimedNewUserQuota);
                        const isDailyClaimed = Boolean(u.dailyQuotaLastClaimedDate);

                        return (
                          <tr key={uid} className="hover:bg-slate-900/50">
                            <td className="py-2.5 px-3 font-medium text-slate-200">
                              {u.firstName} {u.lastName}
                              {u.username && <span className="text-slate-400 text-[11px] block">@{u.username}</span>}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">{uid}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded font-bold font-mono">
                                {u.personalQuota || 0}x
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {isNewClaimed ? (
                                <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                                  <CheckCircle2 className="w-3 h-3" /> Sudah Klaim
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">Belum Klaim</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {isDailyClaimed ? (
                                <span className="text-indigo-400 text-[11px] block">
                                  {u.dailyQuotaLastClaimedDate} ({u.dailyQuotaClaimsCount || 1}x)
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">Belum Hari Ini</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleResetClaims(uid, true, false)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded border border-slate-700 transition-colors"
                                  title="Reset status bonus pengguna baru agar bisa diklaim ulang"
                                >
                                  Reset Bonus
                                </button>
                                <button
                                  onClick={() => handleResetClaims(uid, false, true)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded border border-slate-700 transition-colors"
                                  title="Reset status kuota harian hari ini"
                                >
                                  Reset Harian
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ANTI-SPAM & ANTI-CELAH KEAMANAN */}
        {/* ========================================================================= */}
        {activeTab === 'antispam' && (
          <div className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Anti-Spam Rate Limiter */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">Anti-Spam &amp; Anti-Flood Engine</h4>
                      <p className="text-[11px] text-slate-400">Proteksi aktif untuk Private Chat &amp; Grup</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAntiFloodEnabled(!antiFloodEnabled)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      antiFloodEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        antiFloodEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Jeda Cooldown Antar Perintah (Detik):
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        id="input-antiflood-cooldown"
                        value={antiFloodCooldownInput}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setAntiFloodCooldownInput(raw);
                          setIsGroupDirty(true);
                          const parsed = parseInt(raw, 10);
                          if (!isNaN(parsed) && parsed > 0) {
                            setAntiFloodCooldown(Math.min(30, parsed));
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseInt(antiFloodCooldownInput, 10);
                          const valid = isNaN(parsed) || parsed < 1 ? 3 : Math.min(30, parsed);
                          setAntiFloodCooldownInput(String(valid));
                          setAntiFloodCooldown(valid);
                        }}
                        placeholder="3"
                        className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-emerald-500 text-center"
                      />
                      <span className="text-xs text-slate-400 font-medium">detik jeda per pengguna</span>

                      <div className="flex items-center gap-1">
                        {[-1, +1, +5].map((delta) => (
                          <button
                            key={delta}
                            type="button"
                            onClick={() => {
                              const curr = parseInt(antiFloodCooldownInput, 10) || 3;
                              const updated = Math.min(30, Math.max(1, curr + delta));
                              setAntiFloodCooldownInput(String(updated));
                              setIsGroupDirty(true);
                              setAntiFloodCooldown(updated);
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-bold transition-colors"
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-[11px] text-emerald-300/90 leading-relaxed space-y-1">
                    <div>
                      ⚡ <strong>Debounce Tombol Interaktif:</strong> Mencegah klik tombol ganda (double-click) atau serangan bot spammer pada tombol klaim &amp; menu.
                    </div>
                    <div>
                      🛡️ <strong>Peringatan Ringkas:</strong> Sistem hanya mengirimkan 1 pesan pengingat cooldown jika pengguna terdeteksi spam tanpa membanjiri obrolan.
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAntiSpamSettings}
                    disabled={isSavingAntiSpam}
                    className={`w-full py-2 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                      isGroupDirty
                        ? 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 ring-2 ring-amber-400/40'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingAntiSpam ? 'Menyimpan...' : isGroupDirty ? 'Simpan Pengaturan Anti-Spam (Ada Perubahan)' : 'Simpan Pengaturan Anti-Spam'}</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Status Audit Proteksi Celah */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">Status Audit Proteksi Celah</h4>
                      <p className="text-[11px] text-emerald-400 font-medium">Semua Celah Tertutup Rapat (100% Aman)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs rounded-full font-mono font-bold">
                    SECURE
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-100">Proteksi Race Condition Lock Atomik:</strong>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Setiap proses klaim dikunci dengan Mutex Lock sehingga panggilan simultan / multithread langsung ditolak.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-100">Sinkronisasi Tulis Instan ke Disk (Atomic Write):</strong>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Status klaim disimpan permanen ke disk <em>sebelum</em> pesan sukses dikirimkan ke Telegram, mencegah exploit saat server restart.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-100">Anti-Spoofing Kalender WIB:</strong>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Perhitungan pergantian hari berbasis zona waktu resmi <code>Asia/Jakarta</code> (00:00 WIB), tidak dapat dimanipulasi dari timezone pengguna.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT TOMBOL KUSTOM */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-100">
                {editingId ? 'Edit Tombol Kustom' : 'Tambah Tombol Kustom Baru'}
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveCustomItem} className="p-6 space-y-4 text-xs">
              {/* Template Cepat */}
              {!editingId && (
                <div className="space-y-1.5 pb-2 border-b border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400">Gunakan Template Cepat:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        applyTemplate({
                          label: '🎁 Promo Spesial Kuota',
                          type: 'callback',
                          text: '🎉 Promo Spesial API Key OSINT:\n• Beli paket Rp 10.000 dapat bonus +1x!\n• Paket Unlimited Rp 100.000 aktif selamanya!\nHubungi owner @flood1233.'
                        })
                      }
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-lg transition-colors"
                    >
                      Promo Kuota
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applyTemplate({
                          label: '📜 Ketentuan &amp; Tata Tertib',
                          type: 'callback',
                          text: '📜 Ketentuan Penggunaan Bot:\n1. Dilarang melakukan spamming request.\n2. Hormati privasi data.\n3. Hubungi @flood1233 untuk kendala.'
                        })
                      }
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-lg transition-colors"
                    >
                      Ketentuan
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applyTemplate({
                          label: '📢 Channel Resmi Telegram',
                          type: 'url',
                          text: '',
                          url: 'https://t.me/flood1233'
                        })
                      }
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-lg transition-colors"
                    >
                      Link Channel/Grup
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Label Tombol (Teks di Telegram):</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 🎁 Promo Hari Ini"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Tipe Aksi Tombol:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('callback')}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${
                      type === 'callback'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    💬 Balasan Pesan Bot (Callback)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('url')}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${
                      type === 'url'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    🔗 Tautan Web / URL
                  </button>
                </div>
              </div>

              {type === 'callback' ? (
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Teks Balasan Bot (Mendukung Markdown Telegram):
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tulis balasan pesan yang akan dikirim bot saat tombol ini ditekan..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Alamat URL (Tautan Web):</label>
                  <input
                    type="url"
                    required
                    placeholder="https://t.me/flood1233"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingMenus}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg active:scale-95"
                >
                  {isSavingMenus ? 'Menyimpan...' : 'Simpan Tombol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
