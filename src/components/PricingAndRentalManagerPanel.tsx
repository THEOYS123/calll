import React, { useState, useEffect } from 'react';
import {
  Tag,
  Coins,
  Bot,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Clock,
  ShieldCheck,
  Gift,
  DollarSign,
  Copy,
  Check,
  ExternalLink,
  Layers,
  HelpCircle
} from 'lucide-react';
import {
  BotRentalPlan,
  QuotaConfig,
  QuotaPricePackage,
  ReferralConfig,
  DEFAULT_RENTAL_PLANS,
  DEFAULT_QUOTA_PACKAGES,
  DEFAULT_QUOTA_CONFIG,
  DEFAULT_REFERRAL_CONFIG
} from '../types';

interface PricingAndRentalManagerPanelProps {
  rentalPlans?: BotRentalPlan[];
  quotaPackages?: QuotaPricePackage[];
  quotaConfig?: QuotaConfig;
  referralConfig?: ReferralConfig;
  onSavePricing: (payload: {
    rentalPlans: BotRentalPlan[];
    quotaPackages: QuotaPricePackage[];
    quotaConfig: QuotaConfig;
    referralConfig: ReferralConfig;
  }) => Promise<{ success: boolean; message: string }>;
  onShowToast: (text: string, type: 'success' | 'error') => void;
}

export function PricingAndRentalManagerPanel({
  rentalPlans,
  quotaPackages,
  quotaConfig,
  referralConfig,
  onSavePricing,
  onShowToast
}: PricingAndRentalManagerPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'rental' | 'quota' | 'referral_rewards' | 'preview'>('rental');

  // State
  const [plans, setPlans] = useState<BotRentalPlan[]>(rentalPlans || DEFAULT_RENTAL_PLANS);
  const [packages, setPackages] = useState<QuotaPricePackage[]>(quotaPackages || DEFAULT_QUOTA_PACKAGES);
  const [qConfig, setQConfig] = useState<QuotaConfig>(quotaConfig || DEFAULT_QUOTA_CONFIG);
  const [refConfig, setRefConfig] = useState<ReferralConfig>(referralConfig || DEFAULT_REFERRAL_CONFIG);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Sync from props
  useEffect(() => {
    if (rentalPlans && !isDirty) setPlans(rentalPlans);
    if (quotaPackages && !isDirty) setPackages(quotaPackages);
    if (quotaConfig && !isDirty) setQConfig(quotaConfig);
    if (referralConfig && !isDirty) setRefConfig(referralConfig);
  }, [rentalPlans, quotaPackages, quotaConfig, referralConfig, isDirty]);

  // Plan Handlers
  const handleUpdatePlan = (index: number, field: keyof BotRentalPlan, value: any) => {
    setPlans((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setIsDirty(true);
  };

  const handleAddFeatureToPlan = (planIndex: number) => {
    const text = prompt('Masukkan poin fitur baru untuk paket ini:');
    if (!text || !text.trim()) return;
    setPlans((prev) => {
      const next = [...prev];
      next[planIndex] = {
        ...next[planIndex],
        features: [...next[planIndex].features, text.trim()]
      };
      return next;
    });
    setIsDirty(true);
  };

  const handleRemoveFeatureFromPlan = (planIndex: number, featureIndex: number) => {
    setPlans((prev) => {
      const next = [...prev];
      const newFeatures = [...next[planIndex].features];
      newFeatures.splice(featureIndex, 1);
      next[planIndex] = { ...next[planIndex], features: newFeatures };
      return next;
    });
    setIsDirty(true);
  };

  const handleAddNewPlan = () => {
    const newId = `plan_${Date.now()}`;
    const newPlan: BotRentalPlan = {
      id: newId,
      name: 'Paket Kustom Baru',
      duration: '30 Hari',
      price: 'Rp 75.000',
      description: 'Deskripsi paket sewa bot kustom.',
      features: [
        'Dedicated Telegram Bot Instance',
        'Database OSINT & Kependudukan Lengkap',
        'Uptime 24/7 Hosting Server'
      ]
    };
    setPlans((prev) => [...prev, newPlan]);
    setIsDirty(true);
  };

  const handleDeletePlan = (index: number) => {
    if (plans.length <= 1) {
      onShowToast('Minimal harus ada 1 paket sewa bot!', 'error');
      return;
    }
    if (!confirm(`Hapus paket "${plans[index].name}"?`)) return;
    setPlans((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  // Quota Package Handlers
  const handleUpdatePackage = (index: number, field: keyof QuotaPricePackage, value: any) => {
    setPackages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setIsDirty(true);
  };

  const handleAddNewPackage = () => {
    const newPkg: QuotaPricePackage = {
      id: `quota_${Date.now()}`,
      name: 'Paket Kuota Baru',
      quotaAmount: 25,
      price: 'Rp 30.000',
      description: '25x Kuota Pencarian Intelijen',
      badge: 'Spesial'
    };
    setPackages((prev) => [...prev, newPkg]);
    setIsDirty(true);
  };

  const handleDeletePackage = (index: number) => {
    if (packages.length <= 1) {
      onShowToast('Minimal harus ada 1 paket kuota!', 'error');
      return;
    }
    setPackages((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  // Save All
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const res = await onSavePricing({
        rentalPlans: plans,
        quotaPackages: packages,
        quotaConfig: qConfig,
        referralConfig: refConfig
      });
      if (res.success) {
        setIsDirty(false);
        onShowToast('✅ Pengaturan Harga Sewa Bot & Kuota Berhasil Disimpan & Diterapkan!', 'success');
      } else {
        onShowToast(`Gagal: ${res.message}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/30 text-slate-950 font-black">
              <Tag className="w-8 h-8 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black tracking-tight text-white">
                  Pengaturan Harga Sewa Bot & Kuota OSINT
                </h2>
                {isDirty && (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                    Perubahan Belum Disimpan
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Atur tarif sewa bot telegram, paket kuota API, bonus pendaftaran baru, dan kuota referral yang tampil di menu /pricing dan /sewa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan & Terapkan Perubahan'}
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-800/80 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveSubTab('rental')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'rental'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Paket Sewa Bot Telegram ({plans.length})
          </button>

          <button
            onClick={() => setActiveSubTab('quota')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'quota'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Paket Kuota OSINT ({packages.length})
          </button>

          <button
            onClick={() => setActiveSubTab('referral_rewards')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'referral_rewards'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            Bonus Kuota Gratis & Hadiah Referral
          </button>

          <button
            onClick={() => setActiveSubTab('preview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'preview'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Pratinjau Tampilan Telegram (/pricing & /sewa)
          </button>
        </div>
      </div>

      {/* Tab 1: Bot Rental Plans */}
      {activeSubTab === 'rental' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Daftar Paket Sewa Bot Telegram</h3>
              <p className="text-xs text-slate-400">
                Paket ini akan ditampilkan saat pengguna mengetik <code className="text-amber-400">/sewa</code> atau menekan tombol <strong>🤖 Sewa Bot Telegram</strong> di menu.
              </p>
            </div>
            <button
              onClick={handleAddNewPlan}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Paket Sewa Baru
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan, planIdx) => (
              <div
                key={plan.id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-xl flex flex-col justify-between relative ${
                  plan.isPopular ? 'border-amber-500/60 bg-gradient-to-b from-slate-900 to-amber-950/20' : 'border-slate-800'
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                    ⭐ PALING POPULER
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nama Paket</label>
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => handleUpdatePlan(planIdx, 'name', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      onClick={() => handleDeletePlan(planIdx)}
                      className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 transition-colors mt-4"
                      title="Hapus Paket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Durasi</label>
                      <input
                        type="text"
                        value={plan.duration}
                        onChange={(e) => handleUpdatePlan(planIdx, 'duration', e.target.value)}
                        placeholder="e.g. 30 Hari"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Harga</label>
                      <input
                        type="text"
                        value={plan.price}
                        onChange={(e) => handleUpdatePlan(planIdx, 'price', e.target.value)}
                        placeholder="e.g. Rp 50.000"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Deskripsi Singkat</label>
                    <textarea
                      rows={2}
                      value={plan.description}
                      onChange={(e) => handleUpdatePlan(planIdx, 'description', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Poin Fitur ({plan.features.length})</label>
                      <button
                        onClick={() => handleAddFeatureToPlan(planIdx)}
                        className="text-[11px] text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        + Tambah Poin
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {plan.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center justify-between gap-2 p-1.5 bg-slate-950 rounded-lg text-xs text-slate-300 border border-slate-800/80">
                          <span className="truncate flex-1">✓ {feat}</span>
                          <button
                            onClick={() => handleRemoveFeatureFromPlan(planIdx, fIdx)}
                            className="text-slate-500 hover:text-red-400 text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                      <input
                        type="checkbox"
                        checked={!!plan.isPopular}
                        onChange={(e) => handleUpdatePlan(planIdx, 'isPopular', e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-0"
                      />
                      <span>Tandai sebagai Paket Terpopuler (Badge VIP)</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Quota Packages */}
      {activeSubTab === 'quota' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Daftar Paket Kuota API OSINT</h3>
              <p className="text-xs text-slate-400">
                Pilihan kuota pencarian dataset NIK & OSINT yang dibeli pengguna secara mandiri.
              </p>
            </div>
            <button
              onClick={handleAddNewPackage}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Paket Kuota
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {packages.map((pkg, pIdx) => (
              <div
                key={pkg.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nama Paket</label>
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => handleUpdatePackage(pIdx, 'name', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={() => handleDeletePackage(pIdx)}
                    className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 transition-colors mt-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Jumlah Kuota</label>
                    <input
                      type="number"
                      value={pkg.quotaAmount}
                      onChange={(e) => handleUpdatePackage(pIdx, 'quotaAmount', Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Harga</label>
                    <input
                      type="text"
                      value={pkg.price}
                      onChange={(e) => handleUpdatePackage(pIdx, 'price', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Badge Label</label>
                  <input
                    type="text"
                    value={pkg.badge || ''}
                    onChange={(e) => handleUpdatePackage(pIdx, 'badge', e.target.value)}
                    placeholder="e.g. Best Seller / Promo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Keterangan Paket</label>
                  <textarea
                    rows={2}
                    value={pkg.description}
                    onChange={(e) => handleUpdatePackage(pIdx, 'description', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Free Quota & Referral Rewards */}
      {activeSubTab === 'referral_rewards' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">Konfigurasi Kuota Gratis, Bonus & Tabungan Referral</h3>
            <p className="text-xs text-slate-400 mt-1">
              Atur kuota gratis harian, bonus pengguna pertama kali, dan besaran reward referral yang dapat ditarik pengguna.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Free Quota Settings */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Sistem Kuota Gratis & Klaim Harian
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bonus Kuota Sambutan (Pengguna Baru Pertama Daftar):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={qConfig.newUserFreeQuota || 1}
                    onChange={(e) => {
                      setQConfig((p) => ({ ...p, newUserFreeQuota: Number(e.target.value) }));
                      setIsDirty(true);
                    }}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-400">x Kuota Gratis saat pertama kali klik /start</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jumlah Kuota Klaim Harian (Reset Tiap Jam 00:00 WIB):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={qConfig.dailyFreeQuota || 1}
                    onChange={(e) => {
                      setQConfig((p) => ({ ...p, dailyFreeQuota: Number(e.target.value) }));
                      setIsDirty(true);
                    }}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-400">x Kuota per hari via tombol Klaim Harian</span>
                </div>
              </div>
            </div>

            {/* Referral Reward Settings */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Hadiah & Penarikan Tabungan Referral
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Hadiah Kuota per Teman yang Berhasil Diundang:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={refConfig.rewardQuotaPerReferral || 1}
                    onChange={(e) => {
                      setRefConfig((p) => ({ ...p, rewardQuotaPerReferral: Number(e.target.value) }));
                      setIsDirty(true);
                    }}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-xs text-slate-400">x Kuota reward otomatis masuk ke tabungan pengundang</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Minimal Penarikan Kuota Tabungan (/tarik):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={refConfig.minWithdrawAmount || 1}
                    onChange={(e) => {
                      setRefConfig((p) => ({ ...p, minWithdrawAmount: Number(e.target.value) }));
                      setIsDirty(true);
                    }}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-xs text-slate-400">Minimal saldo tabungan untuk dicairkan ke kuota aktif</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Telegram Message Preview */}
      {activeSubTab === 'preview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Pratinjau Pesan Telegram</h3>
              <p className="text-xs text-slate-400">
                Berikut format pesan resmi yang akan diterima pengguna di Telegram secara otomatis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Sewa Bot Telegram Card Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">
                🤖 Pratinjau Pesan Sewa Bot (/sewa)
              </span>
              <pre className="p-4 bg-slate-900/90 rounded-xl text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
{`🤖 *LAYANAN SEWA DEDICATED TELEGRAM BOT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Miliki bot intelijen OSINT & NIK pribadi dengan Username & Avatar Brand Anda sendiri!

${plans.map((p, i) => `${i + 1}. *${p.name.toUpperCase()}* (${p.price} / ${p.duration})
   • ${p.description}
   ${p.features.map((f) => `• ${f}`).join('\n   ')}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━
📞 *Pemesanan & Konsultasi Langsung:*
Hubungi Pengelola Resmi: @flood1233`}
              </pre>
            </div>

            {/* Pricing API Quota Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-2">
                💎 Pratinjau Daftar Harga Kuota (/pricing)
              </span>
              <pre className="p-4 bg-slate-900/90 rounded-xl text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
{`💎 *DAFTAR HARGA API KEY & SEWA BOT TELEGRAM*
━━━━━━━━━━━━━━━━━━━━━━━━━
Mata Uang: *IDR (Rupiah)*

📊 *PAKET KUOTA API PENCARIAN OSINT:*
${packages.map((pkg, i) => `${i + 1}. *${pkg.name}* — *${pkg.price}* (${pkg.quotaAmount}x Kuota)
   • ${pkg.description}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *PAKET SEWA BOT DEDICATED:*
${plans.map((p) => `• *${p.name}* (${p.duration}): *${p.price}*`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━
📞 *Cara Pembelian & Order:*
Hubungi Owner Resmi: @flood1233`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
