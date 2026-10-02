export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TokenValidationResult {
  valid: boolean;
  botInfo?: TelegramBotInfo;
  errorCode?: number;
  errorMessage?: string;
  latencyMs?: number;
  checkedAt: string;
}

export interface BotLogEntry {
  id: string;
  timestamp: string;
  type: 'incoming' | 'outgoing' | 'system' | 'error' | 'callback' | 'warn';
  chatId?: string | number;
  fromUser?: string;
  text: string;
  details?: string;
}

export interface SpikeAlertItem {
  id: string;
  timestamp: string;
  queryCount: number;
  threshold: number;
  windowSeconds: number;
  triggerType: 'global_surge' | 'user_burst' | 'repeated_target';
  chatId?: string | number;
  userName?: string;
  targetSample?: string;
  severity: 'warning' | 'high' | 'critical';
  details: string;
}

export interface BotUserEntry {
  chatId: number;
  userId?: number; // Immutable Telegram User ID (protects from group chat spoofing)
  username?: string;
  firstName: string;
  lastName?: string;
  firstSeen: string;
  lastSeen: string;
  totalMessages: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  isVerified?: boolean;
  verifiedAt?: string;
  languageCode?: string;
  // Quota & Anti-Exploit Security Fields
  hasClaimedNewUserQuota?: boolean;
  newUserQuotaClaimedAt?: string;
  dailyQuotaLastClaimedDate?: string; // YYYY-MM-DD in WIB
  dailyQuotaLastClaimedAt?: string;
  dailyQuotaClaimsCount?: number;
  personalQuota?: number;
  personalApiKey?: string;
  originBotId?: string; // Tracks which bot in the cluster this user registered on
  // Referral & Quota Savings (Tabungan) Fields
  referredByUserId?: number; // ID of inviter who invited this user
  referredAt?: string;
  referralVaultBalance?: number; // Kuota yang sedang ditabung (siap ditarik)
  totalReferralsCount?: number; // Jumlah orang yang diundang
  totalReferralQuotaClaimed?: number; // Total kuota tabungan yang pernah ditarik
}

export interface CustomCommand {
  id: string;
  command: string; // e.g. "kontak" (without slash)
  description: string;
  replyText: string;
  enabled: boolean;
}

export interface AutoReplyRule {
  id: string;
  triggerKeyword: string;
  matchType: 'contains' | 'exact';
  replyText: string;
  enabled: boolean;
}

export interface CustomMenuItem {
  id: string;
  label: string; // Text on the inline button in Telegram
  type: 'callback' | 'url';
  url?: string;
  responseText?: string;
  enabled: boolean;
}

export interface OsintApiKey {
  id: string;
  key: string; // e.g. "ppp"
  ownerNotes?: string;
  tier: 'limited' | 'unlimited';
  initialQuota: number;
  remainingQuota: number;
  bonusQuota: number;
  totalUsed: number;
  createdAt: string;
  lastUsedAt?: string;
  enabled: boolean;
}

export interface OsintConfig {
  enabled: boolean;
  ngrokUrl: string;
  ownerUsername: string;
  ownerChatId?: number | null;
  secretPrefix?: string;
  apiKeys: OsintApiKey[];
  notifyOnStatusChange: boolean;
  lastToggledAt?: string;
  searchEngineMode?: 'smart_dataset' | 'hybrid' | 'ngrok_only'; // Smart auto-search dataset.txt is default!
}

export interface DatasetFileInfo {
  name: string;
  filename?: string;
  path: string;
  sizeBytes: number;
  size?: number;
  sizeFormatted: string;
  linesCount: number;
  lineCount?: number;
  lastModified: string;
  isDefaultDataset: boolean;
  isDefault?: boolean;
}

export interface DatasetSearchResult {
  query: string;
  totalMatches: number;
  searchDurationMs: number;
  filesSearched: string[];
  scannedFiles?: string[];
  matches?: {
    fileName: string;
    lineNumber: number;
    rawText: string;
    parsedFields?: Record<string, string>;
  }[];
  results?: {
    index?: number;
    fileName?: string;
    sourceFile?: string;
    lineNumber: number;
    raw?: string;
    rawLine?: string;
    rawText?: string;
    record?: any;
    precisionScore?: number;
    predictionType?: string;
  }[];
}

export interface OsintSearchHistoryItem {
  id: string;
  chatId: number;
  userName: string;
  usernameTag?: string;
  target: string;
  apiKey: string;
  totalMatches: number;
  timestamp: string;
  formattedWib: string;
  rawResult: string;
  summaryText?: string;
}

export interface BotStats {
  messagesReceived: number;
  messagesSent: number;
  commandsExecuted: number;
  activeUsersCount: number;
  osintSearchesCount?: number;
}

export interface GithubSyncConfig {
  url: string;
  rawUrl?: string;
  githubToken?: string;
  targetFilename: string;
  replacePrimary: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'error';
  lastTestMessage?: string;
  lastTestSizeFormatted?: string;
  lastTestLinesPreview?: string[];
  lastSyncedAt?: string;
  lastSyncStatus?: 'idle' | 'success' | 'error';
  lastSyncMessage?: string;
  lastSyncedBytes?: number;
  autoSyncEnabled?: boolean;
}

export interface GithubTestResult {
  success: boolean;
  message: string;
  rawUrl: string;
  originalUrl: string;
  statusCode?: number;
  sizeBytes?: number;
  sizeFormatted?: string;
  latencyMs?: number;
  lineCountEstimate?: number;
  previewLines?: string[];
  detectedColumns?: string[];
  sampleParsed?: Record<string, string> | null;
}

export interface KnownTelegramGroup {
  id: number;
  title: string;
  type: 'group' | 'supergroup';
  memberCount?: number;
  firstSeen: string;
  lastSeen: string;
  totalCommands: number;
  status: 'active' | 'blocked' | 'restricted';
}

export interface GroupConfig {
  allowGroups: boolean; // Izinkan bot beroperasi di grup Telegram (default: true)
  groupAdminOnly: boolean; // Hanya admin/owner grup yang dapat menjalankan perintah bot
  silentFallbackInGroup: boolean; // Cegah spam: Abaikan pesan/obrolan biasa di grup (Hanya respon /command & search:)
  allowAllCommandsInGroup: boolean; // Izinkan semua command di grup
  enableAntiFlood: boolean; // Perlindungan anti-spam/anti-flood bot
  antiFloodCooldownSeconds: number; // Jeda anti-spam per pengguna/grup (default: 3 detik)
  allowedGroupIds: number[]; // Whitelist ID grup (jika kosong, semua grup diizinkan)
  blockedGroupIds: number[]; // Blacklist ID grup yang diblokir
  knownGroups: KnownTelegramGroup[]; // Riwayat grup yang terdeteksi
}

export const DEFAULT_GROUP_CONFIG: GroupConfig = {
  allowGroups: true,
  groupAdminOnly: false,
  silentFallbackInGroup: true,
  allowAllCommandsInGroup: true,
  enableAntiFlood: true,
  antiFloodCooldownSeconds: 3, // Default jeda anti-spam 3 detik
  allowedGroupIds: [],
  blockedGroupIds: [],
  knownGroups: []
};

export interface QuotaConfig {
  newUserQuotaEnabled: boolean; // Aktifkan hadiah kuota pengguna baru
  newUserQuotaAmount: number; // Jumlah kuota pengguna baru (default: 5)
  dailyQuotaEnabled: boolean; // Aktifkan klaim kuota harian
  dailyQuotaAmount: number; // Jumlah kuota harian gratis (default: 2)
  dailyResetHourWib: number; // Jam reset harian dalam WIB (0 = 00:00 WIB)
  deductQuotaOnlyOnFound: boolean; // Hanya potong kuota jika data ditemukan
  allowSearchWithoutApiKey: boolean; // Izinkan pencarian otomatis pakai kuota pribadi tanpa API key tambahan
  quotaCostPerSearch: number; // Kuota per pencarian berhasil (default: 1)
}

export const DEFAULT_QUOTA_CONFIG: QuotaConfig = {
  newUserQuotaEnabled: true,
  newUserQuotaAmount: 1, // Default: 1x kuota gratis pengguna baru
  dailyQuotaEnabled: true,
  dailyQuotaAmount: 1, // Default: 1x kuota gratis harian
  dailyResetHourWib: 0,
  deductQuotaOnlyOnFound: true,
  allowSearchWithoutApiKey: true,
  quotaCostPerSearch: 1
};

export interface BotMenuConfig {
  welcomeMessageHeader?: string;
  showClaimButtonInMenu: boolean; // Tampilkan tombol 🎁 Klaim Kuota
  showQuotaButtonInMenu: boolean; // Tampilkan tombol 💎 Cek Saldo Kuota
  showReferralButtonInMenu?: boolean; // Tampilkan tombol 👥 Undang & Tabungan Kuota
  showOsintButtonInMenu: boolean; // Tampilkan tombol 🔍 Cara Pakai OSINT
  showPriceButtonInMenu: boolean; // Tampilkan tombol 💎 Daftar Harga / Top Up
  showOwnerButtonInMenu: boolean; // Tampilkan tombol 📞 Hubungi Owner
  showHelpButtonInMenu: boolean; // Tampilkan tombol ℹ️ Bantuan & Fitur
  customButtons: CustomMenuItem[]; // Tombol kustom tambahan yang diatur owner
}

export const DEFAULT_MENU_CONFIG: BotMenuConfig = {
  welcomeMessageHeader: '👋 *Halo! Selamat datang di Telegram Bot Intelligence & Automation.*',
  showClaimButtonInMenu: true,
  showQuotaButtonInMenu: true,
  showReferralButtonInMenu: true,
  showOsintButtonInMenu: true,
  showPriceButtonInMenu: true,
  showOwnerButtonInMenu: true,
  showHelpButtonInMenu: true,
  customButtons: []
};

export interface ReferralConfig {
  enabled: boolean; // Aktifkan sistem referral/undang teman
  quotaPerInvite: number; // Kuota per teman yang resmi terdaftar (default: 1)
  allowInstantWithdraw: boolean; // Izinkan pencairan tabungan kuota kapan saja
  minWithdrawAmount: number; // Minimal kuota untuk ditarik (default: 1)
  notifyInviterOnRegister: boolean; // Notifikasi Telegram real-time ke pengundang saat teman resmi /start
}

export const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
  enabled: true,
  quotaPerInvite: 1,
  allowInstantWithdraw: true,
  minWithdrawAmount: 1,
  notifyInviterOnRegister: true
};

export interface ReferralRecord {
  id: string;
  inviterUserId: number;
  inviterUsername?: string;
  inviterName: string;
  referredUserId: number;
  referredUsername?: string;
  referredName: string;
  referredAt: string;
  confirmedAt?: string;
  status: 'confirmed' | 'pending';
  rewardQuota: number;
}

export interface ReferralSavingsAccount {
  userId: number;
  userName: string;
  usernameTag?: string;
  referralCode: string;
  totalInvitedCount: number;
  confirmedCount: number;
  savedQuotaBalance: number;
  totalWithdrawnQuota: number;
  lastWithdrawAt?: string;
  lastInvitedAt?: string;
}

export interface ReferralWithdrawTransaction {
  id: string;
  userId: number;
  userName: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  newPersonalQuota: number;
  timestamp: string;
  formattedWib: string;
}

export interface ModerationIncident {
  id: string;
  chatId: number;
  chatTitle?: string;
  userId: number;
  userName: string;
  usernameTag?: string;
  category: string;
  matchedKeyword: string;
  originalMessage: string;
  timestamp: string;
  actionTaken: 'deleted_and_warned' | 'deleted_only' | 'delete_failed';
  errorMessage?: string;
}

export interface ModerationConfig {
  enabled: boolean; // Aktifkan sistem auto-delete konten terlarang
  deleteInGroups: boolean; // Aktifkan filter di Grup & Supergroup
  deleteInPrivate: boolean; // Aktifkan filter di Chat Pribadi
  sendExplanationMessage: boolean; // Kirim pesan penjelasan & salinan pesan yang dihapus
  autoDeleteExplanationSeconds: number; // Hapus pesan penjelasan otomatis setelah N detik (0 = tetap simpan)

  // Kategori Konten Terlarang yang disaring:
  blockGamblingSlot: boolean; // Judi Online, Slot Gacor, Pragmatic, Maxwin, Togel, Casino dsb.
  blockAdult18Plus: boolean; // Konten 18+, Bokep, VCS, Open BO, Prostitusi, Pornografi dsb.
  blockDrugs: boolean; // Narkoba, Sabu, Ekstasi, Ganja, Obat Terlarang, Psikotropika dsb.
  blockFraudScam: boolean; // Penipuan Finansial, Phishing, Pinjol Ilegal, Fake Giveaway dsb.
  blockWeaponsExplosives: boolean; // Senjata Ilegal, Bom, Bahan Peledak dsb.

  // Pengecualian Khusus (Cyber & OSINT - DIIZINKAN sesuai instruksi pengguna)
  allowCyberAndOsint: boolean; // Topik Cyber (legal/ilegal, exploit, pentest, osint, leak, dsb.) tetap DIPERBOLEHKAN
  cyberWhitelistKeywords: string[];

  // Kustomisasi kata kunci
  customBannedKeywords: string[]; // Kata terlarang tambahan buatan admin
  whitelistKeywords: string[]; // Pengecualian umum

  recentIncidents?: ModerationIncident[];
}

export interface MessageLogEntry {
  id: string;
  timestamp: string;
  formattedWib: string;
  botId: string;
  botUsername: string;
  botName: string;
  isPrimaryBot: boolean;
  direction: 'incoming' | 'outgoing';
  chatId: number | string;
  chatType: 'private' | 'group' | 'supergroup' | 'channel';
  chatTitle?: string;
  userId?: number;
  userName: string;
  usernameTag?: string;
  text: string;
  command?: string;
  status: 'delivered' | 'handled' | 'filtered' | 'failed';
  filterReason?: string;
  latencyMs?: number;
}

export interface QuotaPricePackage {
  id: string;
  name: string;
  quotaAmount: number;
  price: string;
  description: string;
  badge?: string;
  isPopular?: boolean;
}

export const DEFAULT_QUOTA_PACKAGES: QuotaPricePackage[] = [
  {
    id: 'quota_basic',
    name: 'Paket Hemat OSINT',
    quotaAmount: 10,
    price: 'Rp 15.000',
    description: '10x Kuota Pencarian Intelijen NIK & Kependudukan',
    badge: 'Pemula'
  },
  {
    id: 'quota_pro',
    name: 'Paket Pro Intelijen',
    quotaAmount: 50,
    price: 'Rp 50.000',
    description: '50x Kuota Pencarian Deep OSINT & Trace Nomor Telepon',
    badge: 'Paling Laris',
    isPopular: true
  },
  {
    id: 'quota_ultra',
    name: 'Paket Ultra Unlimited',
    quotaAmount: 200,
    price: 'Rp 150.000',
    description: '200x Kuota Pencarian Prioritas Tanpa Antrian Cooldown',
    badge: 'Investigator'
  }
];

export const DEFAULT_STRICT_BANNED_KEYWORDS: string[] = [
  // 18+ / Pornografi / VCS / Prostitusi / Pelecehan
  'bokep', 'b0kep', 'porn', 'porno', 'pornografi', '18+', 'vcs', 'open bo', 'bo cod',
  'pap tt', 'pap bugil', 'pap toket', 'pap memek', 'pap nude', 'pap bug1l', 'desah',
  'sange', 'sangean', 'bugil', 'toket', 'croot', 'crot', 'prostitusi', 'becek', 'mesum',
  'seks', 'sex gratis', 'masturbasi', 'ngentot', 'memek', 'kontol', 'jav sub', 'onlyfans bocor',
  'video mesum', 'doodstream', 'terabox bokep', 'vcs murah', 'pepek', 'ngocok', 'lonte',
  'perek', 'tetek', 'colmek', 'colik', 'hentai', 'bokep viral', 'lendir', 'bacol', 'bahan coli',
  'cewek sange', 'michat bo', 'bo include', 'cs mesum', 'videy', 'lulustream', 'gofile bokep',
  'dildo', 'kondom', 'blowjob', 'ngocok kontol', 'hisap toket', 'remas toket', 'sex chat',
  'pedofil', 'child porn', 'lolicon', 'shotacon', 'incest', 'ngaceng', 'cairan mani', 'sperma',
  'psk', 'mucikari', 'germo', 'tante girang', 'pelacur', 'sundal', 'jablay', 'kimcil', 'cabe cabean',
  'skandal selebgram', 'kebaya merah', 'chindo viral', 'video syur', 'doodla', 'doodli', 'terabox',

  // Judi Online / Slot / Togel / Kasino
  'slot', 'sl0t', 'judol', 'judi online', 'judi bola', 'gacor', 'scatter', 'maxwin',
  'pragmatic', 'zeus slot', 'kakek zeus', 'olympus', 'sweet bonanza', 'mahjong ways',
  'bandar togel', 'togel online', 'toto gelap', 'togel sgp', 'togel hk', 'toto macau',
  'casino online', 'live casino', 'sbobet', 'agen judi', 'daftar slot', 'link slot',
  'link gacor', 'situs slot', 'situs judi', 'depo pulsa', 'depo 10k', 'depo 25k', 'depo 50k',
  'wd kilat', 'freebet', 'bocoran slot', 'pola gacor', 'jackpot slot', 'slot88', 'slot777',
  'rtp slot', 'rtp live', 'rolet online', 'baccarat online', 'domino qiu', 'judi slot',
  'agen slot', 'situs gacor', 'menang slot', 'gates of olympus', 'starlight princess',
  'spxslot', 'mposlot', 'hoki slot', 'sensational slot', 'pola slot', 'cheat slot', 'scatter hitam',
  'chip domino', 'chip higgs', 'anti rungkat', 'anti rungkad', 'garansi kekalahan', 'bonus new member',

  // Narkoba / Obat Terlarang / Psikotropika
  'narkoba', 'sabu', 'sabu-sabu', 'ekstasi', 'inex', 'inek', 'ganja', 'tembakau gorila',
  'tembakau sintetis', 'sinte', 'pil koplo', 'tramadol', 'trihex', 'alprazolam', 'dumolid',
  'kokain', 'heroin', 'psikotropika', 'jual sabu', 'beli ganja', 'bong sabu', 'shabu',
  'obat keras daftar g', 'narkotika', 'methamphetamine', 'amfetamin', 'hexymer', 'riklona',
  'calmlet', 'zypraz', 'putaw', 'bong kaca', 'pahe sabu',

  // Penipuan / Phishing / Scam / Pinjol Ilegal
  'pinjol ilegal', 'pengganda uang', 'pesugihan uang gaib', 'dana kaget palsu', 'jasa gestun ilegal',
  'jasa hack saldo dana', 'apk pembobol rekening', 'saldo dana gratis tipu', 'jual beli rekening',
  'rekening penampung', 'jual akun e-wallet bodong', 'arisan bodong', 'investasi bodong',
  'kloning atm', 'joki pinjol', 'surat tilang apk', 'undangan pernikahan apk', 'jual uang palsu', 'upal',

  // Senjata Ilegal & Peledak
  'jual senpi', 'senjata api rakitan', 'jual celurit begal', 'bom ikan', 'bahan peledak rakitan',
  'jual pistol rakitan', 'senjata tajam tawuran', 'celurit corbek'
];

export const DEFAULT_MODERATION_CONFIG: ModerationConfig = {
  enabled: true,
  deleteInGroups: true,
  deleteInPrivate: true,
  sendExplanationMessage: true,
  autoDeleteExplanationSeconds: 0, // permanen tampil sebagai peringatan transparansi

  blockGamblingSlot: true,
  blockAdult18Plus: true,
  blockDrugs: true,
  blockFraudScam: true,
  blockWeaponsExplosives: true,

  allowCyberAndOsint: true,
  cyberWhitelistKeywords: [
    'cyber', 'osint', 'intel', 'pentest', 'penetration testing', 'exploit',
    'breach', 'leak', 'kebocoran data', 'hacking', 'ethical hacking', 'hacker',
    'security', 'cve', 'vulnerability', 'payload', 'reverse engineering',
    'malware', 'bug bounty', 'infosec', 'deface', 'soc', 'threat intelligence',
    'nik', 'dox', 'doxing', 'tracer', 'recon', 'kali linux', 'shodan',
    'sql injection', 'xss', 'rce', 'zeroday', '0day', 'forensic', 'darkweb'
  ],

  customBannedKeywords: DEFAULT_STRICT_BANNED_KEYWORDS,
  whitelistKeywords: [],
  recentIncidents: []
};

export interface CloneOwnerRequest {
  id: string;
  ownerIdentifier: string; // @username or numeric Chat ID
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface MultiBotInstance {
  id: string; // e.g. "bot_1710000000_123"
  token: string;
  maskedToken: string;
  isPrimary?: boolean;
  isActive: boolean;
  botInfo: TelegramBotInfo | null;
  addedAt: string;
  startedAt?: string | null;
  lastPollingAt?: string;
  lastError?: string | null;
  latencyMs?: number;
  stats?: {
    messagesReceived: number;
    messagesSent: number;
    commandsExecuted: number;
  };
  notes?: string;
  rentedBy?: string;
  rentExpiryDate?: string;

  // Strict Owner Security & Multi-Owner Controls
  primaryOwner: string; // Akun Owner Utama (Wajib: @username atau Chat ID)
  primaryOwnerChatId?: number | null;
  secondaryOwners?: string[]; // Daftar Owner Clone / Co-Owners yang telah disetujui
  pendingCloneOwners?: CloneOwnerRequest[]; // Permintaan konfirmasi clone owner
  secretCode?: string; // Kode rahasia menu owner kustom (default: ax0895)
}

export interface BotRentalPlan {
  id: string;
  name: string;
  duration: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}

export const DEFAULT_RENTAL_PLANS: BotRentalPlan[] = [
  {
    id: 'starter',
    name: 'Paket Starter Dedicated',
    duration: '30 Hari (1 Bulan)',
    price: 'Rp 50.000',
    description: 'Cocok untuk penggunaan pribadi atau grup komunitas kecil dengan bot branding sendiri.',
    features: [
      '1 Dedicated Bot Telegram (Username & Avatar milik Anda)',
      'Akses Penuh Database Intelijen OSINT & NIK Nasional',
      'Hosting Server 24/7 Uptime (Tanpa Perlu Sewa VPS)',
      'Sistem Kuota Gratis & Manajemen Pengguna Otomatis',
      'Fitur Anti-Spam & Moderasi Grup Bawaan'
    ]
  },
  {
    id: 'pro',
    name: 'Paket Pro VIP Cluster',
    duration: '90 Hari (3 Bulan)',
    price: 'Rp 125.000',
    description: 'Pilihan paling hemat & populer! Fitur terlengkap dengan performa pencarian prioritas.',
    features: [
      'Semua fitur Paket Starter',
      'Kustomisasi Pesan Sambutan & Menu Interaktif Bebas',
      'Jalur Proxy Pencarian Prioritas (Super Cepat)',
      'Bebas pasang Watermark Brand Komunitas Anda',
      'Koneksi Multi-Bot Cluster & Backup Server Otomatis',
      'Admin Bot Mendapatkan Akses Unlimited'
    ],
    isPopular: true
  },
  {
    id: 'lifetime',
    name: 'Paket Lifetime / Permanen',
    duration: 'Permanen (Sekali Bayar)',
    price: 'Rp 250.000',
    description: 'Investasi sekali bayar aktif selamanya tanpa biaya perpanjangan bulanan.',
    features: [
      'Semua fitur Paket Pro VIP',
      'Aktivasi Bot Selamanya (Tanpa Biaya Bulanan)',
      'Update Dataset Otomatis saat ada Kebocoran Data Baru',
      'Dukungan Teknis & Maintenance Prioritas Langsung dari Ax.',
      'API & Webhook Integrasi Bebas untuk Channel/Grup'
    ]
  }
];

export interface BotStatusState {
  isActive: boolean;
  token: string;
  maskedToken: string;
  isTokenValid: boolean;
  botInfo: TelegramBotInfo | null;
  lastError: string | null;
  uptimeSeconds: number;
  startedAt: string | null;
  stats: BotStats;
  recentLogs: BotLogEntry[];
  activeUsers: BotUserEntry[];
  customCommands: CustomCommand[];
  autoReplies: AutoReplyRule[];
  customMenus: CustomMenuItem[];
  welcomeMessage: string;
  lastPollingAt?: string;
  osintConfig: OsintConfig;
  searchHistories?: OsintSearchHistoryItem[];
  githubSync?: GithubSyncConfig;
  groupConfig?: GroupConfig;
  quotaConfig?: QuotaConfig;
  menuConfig?: BotMenuConfig;
  moderationConfig?: ModerationConfig;
  spikeAlerts?: SpikeAlertItem[];
  referralConfig?: ReferralConfig;
  referralAccounts?: ReferralSavingsAccount[];
  referralRecords?: ReferralRecord[];
  referralWithdrawLogs?: ReferralWithdrawTransaction[];
  multiBots?: MultiBotInstance[];
  rentalPlans?: BotRentalPlan[];
  quotaPackages?: QuotaPricePackage[];
  messageLogs?: MessageLogEntry[];
  ownerWebsitePasskey?: string;
  coOwners?: string[];
  pendingCoOwners?: CloneOwnerRequest[];
}

// Legacy types for compatibility
export interface IdentityRecord {
  id: string;
  fullName: string;
  nik: string;
  gender: 'male' | 'female';
  age: number;
  birthDate: string;
  birthYear: number;
  city: string;
  province: string;
  address: string;
  nikLocation?: string;
  phone: string;
  email: string;
  occupation: string;
  threatLevel: 'Low' | 'Medium' | 'High' | 'Critical' | 'Informational';
  sourceDataset: string;
  lastKnownActivity: string;
  searchCount: number;
  lastSearchedTime?: string;
  notes?: string;
}

export interface ParsedQuery {
  raw: string;
  nameKeywords: string[];
  age?: number;
  gender?: 'male' | 'female';
  city?: string;
  birthYear?: number;
  nik?: string;
  phone?: string;
  email?: string;
  rawTokens: string[];
}

export interface SearchMatchResult {
  record: IdentityRecord;
  precisionScore: number;
  matchedCriteria: any;
  matchedTags: string[];
  predictionType: 'Exact Match' | 'High Precision' | 'Correlated Link' | 'Predictive Match';
}

export interface NIKAnalysisResult {
  valid: boolean;
  nik: string;
  provinceCode: string;
  provinceName: string;
  regencyCode: string;
  regencyName: string;
  districtCode: string;
  birthDate: string;
  gender: 'male' | 'female';
  age: number;
  sequenceNumber: string;
  formatCorrect: boolean;
  rawDetails: string;
}

export interface PhoneAnalysisResult {
  valid: boolean;
  rawPhone: string;
  formattedInternational: string;
  formattedLocal: string;
  carrier: string;
  prefix: string;
  type: string;
}

export interface SearchUsageQuota {
  freeQuotaTotal: number;
  freeQuotaRemaining: number;
  isVipUnlocked: boolean;
  vipToken?: string;
  hasReachedLimit: boolean;
}

export interface SecretClearanceCode {
  code: string;
  name: string;
  clearanceLevel: string;
  description: string;
  limit?: number;
  used?: number;
  remaining?: number;
  status?: string;
}

export interface LiveTrendingItem {
  id: string;
  fullName: string;
  searchCount: number;
  lastSearchedTime: string;
  trendVelocity: 'RISING' | 'STABLE' | 'HIGH_INTEREST';
  category: string;
}

export interface TopSearchedTarget {
  id: string;
  fullName: string;
  searchCount: number;
  city: string;
  province: string;
  occupation: string;
}

// ==========================================
// TIERED OWNER AUTHENTICATION & JWT TYPES
// ==========================================
export type OwnerRole = 'master_owner' | 'bot_primary_owner' | 'clone_owner';

export interface OwnerJwtPayload {
  sub: string;
  role: OwnerRole;
  userId?: number;
  username?: string;
  displayName?: string;
  allowedBotIds: string[]; // ['*'] for master_owner, or list of specific botIds for rented/clone owners
  sessionId: string;
  iat: number;
  exp: number;
}

export interface OwnerSessionRecord {
  sessionId: string;
  role: OwnerRole;
  userId?: number;
  username?: string;
  displayName?: string;
  allowedBotIds: string[];
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
}

export interface OwnerLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  role?: OwnerRole;
  allowedBotIds?: string[];
  displayName?: string;
  expiresAt?: string;
}

