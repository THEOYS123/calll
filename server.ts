import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import * as archiverPkg from 'archiver';
const archiver: any = (archiverPkg as any).default || archiverPkg;
import { createServer as createViteServer } from 'vite';
import {
  TelegramBotInfo,
  TokenValidationResult,
  BotLogEntry,
  BotUserEntry,
  CustomCommand,
  AutoReplyRule,
  BotStats,
  BotStatusState,
  OsintApiKey,
  OsintConfig,
  CustomMenuItem,
  OsintSearchHistoryItem,
  GithubSyncConfig,
  GithubTestResult,
  GroupConfig,
  KnownTelegramGroup,
  QuotaConfig,
  BotMenuConfig,
  ModerationConfig,
  ModerationIncident,
  SpikeAlertItem,
  ReferralConfig,
  ReferralRecord,
  ReferralSavingsAccount,
  ReferralWithdrawTransaction,
  DEFAULT_REFERRAL_CONFIG,
  MultiBotInstance,
  BotRentalPlan,
  DEFAULT_RENTAL_PLANS,
  MessageLogEntry,
  QuotaPricePackage,
  DEFAULT_QUOTA_PACKAGES,
  DEFAULT_STRICT_BANNED_KEYWORDS,
  CloneOwnerRequest,
  OwnerRole,
  OwnerJwtPayload,
  OwnerSessionRecord,
  OwnerLoginResponse
} from './src/types';
import { extractLocationFromNik } from './src/utils/nikAnalyzer';
import {
  getAllDatasetFiles,
  readDatasetContent,
  writeDatasetContent,
  deleteDatasetFile,
  smartSearchDatasets,
  sanitizeDatasetFilename,
  isForbiddenDatasetName,
  parseGithubUrl,
  testGithubDataset,
  syncGithubDataset,
  DATASETS_DIR,
  DEFAULT_DATASET_FILE
} from './src/server/datasetEngine';

// Path for persistent bot storage
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'bot_config.json');
const SEARCH_CACHE_DIR = path.join(DATA_DIR, 'search_cache');

// Ensure data and search_cache directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(SEARCH_CACHE_DIR)) {
  fs.mkdirSync(SEARCH_CACHE_DIR, { recursive: true });
}

// Multer Storage for Datasets - Unlimited File Size (Tidak Ada Batasan Maksimal)
const datasetUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(DATASETS_DIR)) {
      fs.mkdirSync(DATASETS_DIR, { recursive: true });
    }
    cb(null, DATASETS_DIR);
  },
  filename: (req, file, cb) => {
    const sanitized = sanitizeDatasetFilename(file.originalname || 'dataset.txt');
    if (isForbiddenDatasetName(sanitized)) {
      return cb(new Error(`Nama berkas '${sanitized}' adalah berkas konfigurasi sistem dan tidak dapat diunggah sebagai dataset.`), '');
    }
    cb(null, sanitized);
  }
});

const datasetUpload = multer({
  storage: datasetUploadStorage,
  limits: {
    fileSize: Infinity // No maximum size limit, as explicitly requested!
  }
});

// Default OSINT Configuration
const DEFAULT_OSINT_CONFIG: OsintConfig = {
  enabled: false, // Default is OFF: must be explicitly turned on by owner
  ngrokUrl: 'https://dd60-180-247-62-62.ngrok-free.app',
  ownerUsername: '',
  notifyOnStatusChange: true,
  searchEngineMode: 'smart_dataset', // Smart auto-search dataset.txt is primary!
  apiKeys: [
    {
      id: 'key-default-ppp',
      key: 'ppp',
      ownerNotes: 'Default API Key Contoh dari Owner',
      tier: 'limited',
      initialQuota: 10,
      remainingQuota: 10,
      bonusQuota: 1, // Bonus 1x untuk pembelian >= 10k
      totalUsed: 0,
      createdAt: new Date().toISOString(),
      enabled: true
    },
    {
      id: 'key-vip-unlimited',
      key: 'vip-unlimited',
      ownerNotes: 'Paket Unlimited VIP Owner',
      tier: 'unlimited',
      initialQuota: 999999,
      remainingQuota: 999999,
      bonusQuota: 0,
      totalUsed: 0,
      createdAt: new Date().toISOString(),
      enabled: true
    }
  ]
};

// In-Memory & Persistent Bot State
interface StoredBotConfig {
  token: string;
  isActive: boolean;
  welcomeMessage: string;
  customCommands: CustomCommand[];
  autoReplies: AutoReplyRule[];
  customMenus: CustomMenuItem[];
  stats: BotStats;
  activeUsers: BotUserEntry[];
  osintConfig: OsintConfig;
  searchHistories?: OsintSearchHistoryItem[];
  githubSync?: GithubSyncConfig;
  groupConfig?: GroupConfig;
  quotaConfig?: QuotaConfig;
  menuConfig?: BotMenuConfig;
  moderationConfig?: ModerationConfig;
  referralConfig?: ReferralConfig;
  referralRecords?: ReferralRecord[];
  referralWithdrawLogs?: ReferralWithdrawTransaction[];
  multiBots?: MultiBotInstance[];
  rentalPlans?: BotRentalPlan[];
  quotaPackages?: QuotaPricePackage[];
  ownerWebsitePasskey?: string;
  coOwners?: string[];
  pendingCoOwners?: CloneOwnerRequest[];
  lastPollingOffset?: number;
}

const DEFAULT_MODERATION_CONFIG: ModerationConfig = {
  enabled: true,
  deleteInGroups: true,
  deleteInPrivate: true,
  sendExplanationMessage: true,
  autoDeleteExplanationSeconds: 0,

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

const DEFAULT_QUOTA_CONFIG: QuotaConfig = {
  newUserQuotaEnabled: true, // Bonus kuota sambutan aktif
  newUserQuotaAmount: 1, // Default +1x kuota pencarian gratis (diperbarui)
  dailyQuotaEnabled: true, // Klaim kuota gratis harian aktif
  dailyQuotaAmount: 1, // Default +1x kuota harian (diperbarui)
  dailyResetHourWib: 0, // Reset pukul 00:00 WIB
  deductQuotaOnlyOnFound: true, // Hanya kurangi kuota jika target ditemukan di dataset
  allowSearchWithoutApiKey: true, // Otomatis pakai kuota pribadi pengguna
  quotaCostPerSearch: 1 // 1 kuota per pencarian berhasil
};

const DEFAULT_MENU_CONFIG: BotMenuConfig = {
  welcomeMessageHeader: '👋 *Halo! Selamat datang di axxosintbot Intelligence & Automation (Created by Ax.).*',
  showClaimButtonInMenu: true,
  showQuotaButtonInMenu: true,
  showOsintButtonInMenu: true,
  showPriceButtonInMenu: true,
  showOwnerButtonInMenu: true,
  showHelpButtonInMenu: true,
  customButtons: []
};

const DEFAULT_GITHUB_SYNC: GithubSyncConfig = {
  url: 'https://github.com/THEOYS123/track-call/blob/main/data/dataset.txt',
  rawUrl: 'https://raw.githubusercontent.com/THEOYS123/track-call/main/data/dataset.txt',
  targetFilename: 'dataset.txt',
  replacePrimary: true,
  lastSyncStatus: 'idle',
  autoSyncEnabled: false
};

const DEFAULT_GROUP_CONFIG: GroupConfig = {
  allowGroups: true, // Izinkan bot merespon di grup Telegram
  groupAdminOnly: false, // Perintah dapat dijalankan semua anggota grup atau hanya admin
  silentFallbackInGroup: true, // Cegah spam: Abaikan obrolan santai/biasa di grup (Hanya respon /command & search:)
  allowAllCommandsInGroup: true,
  enableAntiFlood: true, // Anti-spam rate limiting & protection
  antiFloodCooldownSeconds: 3, // Jeda minimal 3 detik antar perintah per pengguna
  allowedGroupIds: [],
  blockedGroupIds: [],
  knownGroups: []
};

const DEFAULT_WELCOME_MESSAGE = `👋 *Halo! Selamat datang di axxosintbot Intelligence & Automation.*

Saya adalah *axxosintbot*, bot intelijen & profiling otomatis yang diciptakan oleh *Ax.* (@flood1233).

Silakan gunakan tombol menu interaktif di bawah atau ketik perintah:
• /id - Cek Chat ID & status verifikasi akun
• /osint - Status & pencarian Intelijen OSINT
• /history - Riwayat pencarian OSINT pribadi Anda
• /harga - Daftar harga & kuota API Key
• /bot - Detail & spesifikasi bot
• /ping - Cek latency & status server
• /waktu - Cek jam real-time Indonesia
• /help - Bantuan & daftar perintah lengkap`;

const DEFAULT_CUSTOM_COMMANDS: CustomCommand[] = [
  {
    id: 'cmd-1',
    command: 'kontak',
    description: 'Informasi kontak resmi owner bot (@flood1233)',
    replyText: '📞 *KONTAK RESMI OWNER BOT*\n\nSilakan hubungi owner di Telegram:\n👤 @flood1233\n_(Bebas mau chat ataupun call, asal tidak spam)_',
    enabled: true
  },
  {
    id: 'cmd-2',
    command: 'fitur',
    description: 'Ringkasan fitur utama bot Telegram',
    replyText: '⚡ *FITUR UTAMA BOT*\n\n1. Verifikasi Wajib /id Akun Pengguna\n2. Server OSINT Intelijen (Ngrok API Key)\n3. Cek Status Kuota API Key Realtime\n4. Deteksi Mata Uang Sesuai Negara (IDR/USD/MYR/SGD)\n5. Notifikasi Otomatis Broadcast Status Server\n6. Menu Rahasia Owner (ax0895)',
    enabled: true
  }
];

const DEFAULT_AUTO_REPLIES: AutoReplyRule[] = [
  {
    id: 'ar-1',
    triggerKeyword: 'halo',
    matchType: 'contains',
    replyText: 'Halo juga! Ada yang bisa saya bantu? Ketik /menu untuk melihat opsi yang tersedia.',
    enabled: true
  },
  {
    id: 'ar-2',
    triggerKeyword: 'assalamualaikum',
    matchType: 'contains',
    replyText: 'Waalaikumsalam warahmatullahi wabarakatuh! Selamat datang, ketik /menu untuk bantuan.',
    enabled: true
  },
  {
    id: 'ar-3',
    triggerKeyword: 'siapa kamu',
    matchType: 'contains',
    replyText: 'Saya adalah Bot Telegram cerdas yang selalu aktif 24/7 dan dikontrol melalui Website Controller karya Ax.',
    enabled: true
  },
  {
    id: 'ar-4',
    triggerKeyword: 'p',
    matchType: 'exact',
    replyText: 'Ya, bot online dan siap merespon! Ketik /id untuk cek Chat ID dan verifikasi akun kamu.',
    enabled: true
  },
  {
    id: 'ar-5',
    triggerKeyword: 'selamat pagi',
    matchType: 'contains',
    replyText: 'Selamat pagi! Semoga hari Anda menyenangkan dan produktif. Ada yang bisa bot bantu hari ini? Ketik /menu.',
    enabled: true
  },
  {
    id: 'ar-6',
    triggerKeyword: 'pagi',
    matchType: 'contains',
    replyText: 'Pagi juga! Bot online 24 jam nonstop siap membantu pencarian intelijen Anda. Ketik /menu.',
    enabled: true
  },
  {
    id: 'ar-7',
    triggerKeyword: 'selamat siang',
    matchType: 'contains',
    replyText: 'Selamat siang! Tetap semangat menjalani hari. Silakan ketik /menu untuk menggunakan fitur bot.',
    enabled: true
  },
  {
    id: 'ar-8',
    triggerKeyword: 'siang',
    matchType: 'contains',
    replyText: 'Siang juga! Bot siap merespon. Butuh pencarian OSINT atau cek kuota? Ketik /menu.',
    enabled: true
  },
  {
    id: 'ar-9',
    triggerKeyword: 'selamat sore',
    matchType: 'contains',
    replyText: 'Selamat sore! Selamat beristirahat atau melanjutkan aktivitas. Butuh bantuan bot? Ketik /menu.',
    enabled: true
  },
  {
    id: 'ar-10',
    triggerKeyword: 'sore',
    matchType: 'contains',
    replyText: 'Sore juga! Bot standby 24/7. Ketik /menu untuk membuka menu interaktif.',
    enabled: true
  },
  {
    id: 'ar-11',
    triggerKeyword: 'selamat malam',
    matchType: 'contains',
    replyText: 'Selamat malam! Bot intelijen tetap aktif 24 jam melayani Anda. Silakan ketik /menu.',
    enabled: true
  },
  {
    id: 'ar-12',
    triggerKeyword: 'malam',
    matchType: 'contains',
    replyText: 'Malam juga! Jangan lupa jaga kesehatan. Butuh pencarian intelijen atau cek ID? Ketik /menu.',
    enabled: true
  },
  {
    id: 'ar-13',
    triggerKeyword: 'hai',
    matchType: 'contains',
    replyText: 'Hai! Senang menyapa Anda. Silakan ketik /menu untuk mulai menggunakan fitur bot.',
    enabled: true
  },
  {
    id: 'ar-14',
    triggerKeyword: 'hello',
    matchType: 'contains',
    replyText: 'Hello! Selamat datang di axxosintbot. Ketik /menu atau /id untuk verifikasi akun Anda.',
    enabled: true
  },
  {
    id: 'ar-15',
    triggerKeyword: 'hei',
    matchType: 'contains',
    replyText: 'Hei juga! Bot siap membantu 24/7. Ketik /menu untuk melihat daftar fitur.',
    enabled: true
  },
  {
    id: 'ar-16',
    triggerKeyword: 'samlikum',
    matchType: 'contains',
    replyText: 'Waalaikumsalam warahmatullahi wabarakatuh! Ada yang bisa kami bantu? Ketik /menu.',
    enabled: true
  },
  {
    id: 'ar-17',
    triggerKeyword: 'salam',
    matchType: 'contains',
    replyText: 'Salam hangat! Selamat datang di bot intelijen & profiling OSINT. Ketik /menu untuk bantuan.',
    enabled: true
  },
  {
    id: 'ar-18',
    triggerKeyword: 'permisi',
    matchType: 'contains',
    replyText: 'Iya, permisi! Silakan masuk dan gunakan bot dengan bijak. Ketik /menu untuk daftar perintah.',
    enabled: true
  },
  {
    id: 'ar-19',
    triggerKeyword: 'punten',
    matchType: 'contains',
    replyText: 'Mangga! Aya naon lur? Bot siap ngabantosan 24 jam. Ketik /menu kanggo ningali fitur.',
    enabled: true
  },
  {
    id: 'ar-20',
    triggerKeyword: 'sampurasun',
    matchType: 'contains',
    replyText: 'Rampes! Wilujeng sumping di axxosintbot. Ketik /menu kanggo milih layanan.',
    enabled: true
  },
  {
    id: 'ar-21',
    triggerKeyword: 'kulonuwun',
    matchType: 'contains',
    replyText: 'Monggo! Sugeng rawuh, wonten ingkang saged dipunbantu? Mangga ketik /menu.',
    enabled: true
  },
  {
    id: 'ar-22',
    triggerKeyword: 'ping',
    matchType: 'exact',
    replyText: 'Pong! 🏓 Latency server sangat cepat dan bot online 24/7. Ketik /ping untuk detail latency.',
    enabled: true
  },
  {
    id: 'ar-23',
    triggerKeyword: 'tes',
    matchType: 'contains',
    replyText: 'Tes berhasil! Bot aktif 100% dan terhubung ke server intelijen. Ketik /menu untuk mencoba fitur.',
    enabled: true
  },
  {
    id: 'ar-24',
    triggerKeyword: 'test',
    matchType: 'contains',
    replyText: 'Test OK! Sistem berjalan lancar dan siap memproses perintah Anda. Ketik /menu.',
    enabled: true
  },
  {
    id: 'ar-25',
    triggerKeyword: 'terima kasih',
    matchType: 'contains',
    replyText: 'Sama-sama! Senang bisa membantu Anda. Jika butuh bantuan lain, silakan ketik /menu.',
    enabled: true
  },
  {
    id: 'ar-26',
    triggerKeyword: 'makasih',
    matchType: 'contains',
    replyText: 'Sama-sama kak! Jangan ragu gunakan fitur bot kami kapan saja.',
    enabled: true
  },
  {
    id: 'ar-27',
    triggerKeyword: 'thanks',
    matchType: 'contains',
    replyText: 'You are welcome! Happy to assist you. Type /menu to explore more features.',
    enabled: true
  },
  {
    id: 'ar-28',
    triggerKeyword: 'sewa bot',
    matchType: 'contains',
    replyText: 'Tertarik sewa bot dedicated untuk grup atau komunitas Anda? Hubungi Owner resmi: @flood1233.',
    enabled: true
  },
  {
    id: 'ar-29',
    triggerKeyword: 'bro',
    matchType: 'exact',
    replyText: 'Yo bro! Ada yang bisa dibantu? Ketik /menu buat lihat fitur-fitur bot.',
    enabled: true
  },
  {
    id: 'ar-30',
    triggerKeyword: 'min',
    matchType: 'exact',
    replyText: 'Halo gan! Admin/Bot siap membantu. Silakan ketik /menu ya.',
    enabled: true
  }
];

const DEFAULT_CUSTOM_MENUS: CustomMenuItem[] = [
  {
    id: 'menu-promo',
    label: '🎁 Info Promo & Bonus',
    type: 'callback',
    responseText: '🎉 *PROMOSI SPESIAL API KEY OSINT:*\n\n• Pembelian paket Rp 10.000 ke atas langsung dapat +1x BONUS pakai!\n• Pembelian paket Rp 50.000 dapat +2x BONUS pakai!\n• Paket Unlimited Rp 100.000 bebas pakai selamanya tanpa batas!\n\nHubungi Owner Telegram: @flood1233\n_(Bebas mau chat ataupun call, asal tidak spam)_',
    enabled: true
  },
  {
    id: 'menu-rules',
    label: '📜 Ketentuan & Panduan',
    type: 'callback',
    responseText: '📜 *KETENTUAN PENGGUNAAN BOT:*\n\n1. Semua pengguna baru wajib verifikasi awal via perintah /id.\n2. Fitur OSINT hanya dapat digunakan saat Server diaktifkan (ON) oleh Owner.\n3. Gunakan API Key resmi dari Owner @flood1233.\n4. Format pencarian: `search: <target> <apiKey>`\n5. Dilarang melakukan spamming request.',
    enabled: true
  },
  {
    id: 'menu-faq',
    label: '❓ Tanya Jawab (FAQ)',
    type: 'callback',
    responseText: '❓ *PERTANYAAN UMUM (FAQ):*\n\nQ: Mengapa fitur OSINT tertulis OFF?\nA: Server OSINT sedang di-offline kan oleh owner. Hubungi @flood1233 untuk meminta menyalakan server.\n\nQ: Bagaimana cara mendapatkan API Key?\nA: Silakan hubungi Owner di Telegram: @flood1233\n\nQ: Bagaimana jika server ngrok mati saat pencarian?\nA: Kuota API Key Anda TIDAK akan dipotong.',
    enabled: true
  }
];

let botConfig: StoredBotConfig = {
  token: process.env.TELEGRAM_BOT_TOKEN || '',
  isActive: false,
  welcomeMessage: DEFAULT_WELCOME_MESSAGE,
  customCommands: DEFAULT_CUSTOM_COMMANDS,
  autoReplies: DEFAULT_AUTO_REPLIES,
  customMenus: DEFAULT_CUSTOM_MENUS,
  stats: {
    messagesReceived: 0,
    messagesSent: 0,
    commandsExecuted: 0,
    activeUsersCount: 0,
    osintSearchesCount: 0
  },
  activeUsers: [],
  osintConfig: DEFAULT_OSINT_CONFIG,
  searchHistories: [],
  githubSync: DEFAULT_GITHUB_SYNC,
  groupConfig: DEFAULT_GROUP_CONFIG,
  quotaConfig: DEFAULT_QUOTA_CONFIG,
  menuConfig: DEFAULT_MENU_CONFIG,
  referralConfig: DEFAULT_REFERRAL_CONFIG,
  referralRecords: [],
  referralWithdrawLogs: [],
  multiBots: [],
  rentalPlans: DEFAULT_RENTAL_PLANS,
  quotaPackages: DEFAULT_QUOTA_PACKAGES,
  ownerWebsitePasskey: 'ax0895'
};

let recentLogs: BotLogEntry[] = [];
let messageTrafficLogs: MessageLogEntry[] = [];

// Helper to record live message traffic
function recordMessageTraffic(entry: Partial<MessageLogEntry>) {
  const wibTime = getFormattedWIB().fullStr;
  const logItem: MessageLogEntry = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    formattedWib: wibTime,
    botId: entry.botId || 'primary',
    botUsername: entry.botUsername || currentBotInfo?.username || 'axxosintbot',
    botName: entry.botName || currentBotInfo?.first_name || 'Bot Utama',
    isPrimaryBot: entry.isPrimaryBot !== false,
    direction: entry.direction || 'incoming',
    chatId: entry.chatId || 0,
    chatType: entry.chatType || 'private',
    chatTitle: entry.chatTitle,
    userId: entry.userId,
    userName: entry.userName || 'Pengguna',
    usernameTag: entry.usernameTag,
    text: entry.text || '',
    command: entry.command,
    status: entry.status || 'delivered',
    filterReason: entry.filterReason,
    latencyMs: entry.latencyMs
  };

  messageTrafficLogs.unshift(logItem);
  if (messageTrafficLogs.length > 500) {
    messageTrafficLogs.pop();
  }
}
let botStartedAt: number | null = null;
let lastError: string | null = null;
let currentBotInfo: TelegramBotInfo | null = null;
let isPollingRunning = false;
let pollingAbortController: AbortController | null = null;
let pollingOffset = 0;
let lastPollingTimestamp: string | null = null;

// Multi-Bot Cluster Workers & Active Context Execution Token
let activeBotContextToken: string | null = null;
let activeBotContextInfo: TelegramBotInfo | null = null;
const activeSecondaryBotWorkers = new Map<string, { abortController: AbortController; isRunning: boolean; offset: number }>();

// Concurrency lock to prevent race-condition exploits on claiming quotas
const activeClaimLocks = new Set<string>();

// Persistent claimed new user IDs (strict 1x lifetime shield)
const CLAIMED_USERS_FILE = path.join(DATA_DIR, 'claimed_new_users.json');
let persistentClaimedUserIds = new Set<number>();
function loadPersistentClaimedUsers() {
  try {
    if (fs.existsSync(CLAIMED_USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CLAIMED_USERS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        persistentClaimedUserIds = new Set(data.map(Number));
      }
    }
  } catch {}
}
function savePersistentClaimedUsers() {
  try {
    fs.writeFileSync(CLAIMED_USERS_FILE, JSON.stringify(Array.from(persistentClaimedUserIds)), 'utf8');
  } catch {}
}
loadPersistentClaimedUsers();

// Persistent Referral & Tabungan Kuota Storage
const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');
function loadReferralData() {
  try {
    if (fs.existsSync(REFERRALS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf8'));
      if (parsed) {
        if (parsed.config) {
          botConfig.referralConfig = { ...DEFAULT_REFERRAL_CONFIG, ...parsed.config };
        }
        if (Array.isArray(parsed.records)) {
          botConfig.referralRecords = parsed.records;
        }
        if (Array.isArray(parsed.withdrawLogs)) {
          botConfig.referralWithdrawLogs = parsed.withdrawLogs;
        }
      }
    }
  } catch (err: any) {
    console.error('Error loading referral data:', err.message);
  }
}

function saveReferralData() {
  try {
    const payload = {
      config: botConfig.referralConfig || DEFAULT_REFERRAL_CONFIG,
      records: botConfig.referralRecords || [],
      withdrawLogs: botConfig.referralWithdrawLogs || []
    };
    fs.writeFileSync(REFERRALS_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err: any) {
    console.error('Error saving referral data:', err.message);
  }
}
loadReferralData();

// Get aggregated referral accounts for leaderboard & reporting
function getAllReferralAccounts(): ReferralSavingsAccount[] {
  const map = new Map<number, ReferralSavingsAccount>();

  // Aggregate from activeUsers
  for (const u of botConfig.activeUsers) {
    const uid = Number(u.userId || u.chatId);
    if (!uid || uid <= 0) continue;
    map.set(uid, {
      userId: uid,
      userName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Pengguna',
      usernameTag: u.username ? `@${u.username}` : undefined,
      referralCode: `ref_${uid}`,
      totalInvitedCount: u.totalReferralsCount || 0,
      confirmedCount: u.totalReferralsCount || 0,
      savedQuotaBalance: u.referralVaultBalance || 0,
      totalWithdrawnQuota: u.totalReferralQuotaClaimed || 0,
      lastInvitedAt: u.lastSeen
    });
  }

  // Ensure inviter records are synced
  for (const r of botConfig.referralRecords || []) {
    const invId = Number(r.inviterUserId);
    if (!invId) continue;
    let acc = map.get(invId);
    if (!acc) {
      acc = {
        userId: invId,
        userName: r.inviterName || `User ${invId}`,
        usernameTag: r.inviterUsername ? `@${r.inviterUsername}` : undefined,
        referralCode: `ref_${invId}`,
        totalInvitedCount: 0,
        confirmedCount: 0,
        savedQuotaBalance: 0,
        totalWithdrawnQuota: 0,
        lastInvitedAt: r.referredAt
      };
      map.set(invId, acc);
    }
  }

  // Recalculate confirmed count from records
  for (const acc of map.values()) {
    const recs = (botConfig.referralRecords || []).filter((r) => Number(r.inviterUserId) === acc.userId);
    acc.totalInvitedCount = Math.max(acc.totalInvitedCount, recs.length);
    acc.confirmedCount = Math.max(acc.confirmedCount, recs.filter((r) => r.status === 'confirmed').length);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.confirmedCount !== a.confirmedCount) return b.confirmedCount - a.confirmedCount;
    return b.savedQuotaBalance - a.savedQuotaBalance;
  });
}

// Anti-Spam, Deduplication & Anti-Flood State
const processedUpdateIds = new Set<number>();
const processedMessageIds = new Set<string>();
const lastUserActionTimestamp = new Map<string, number>();
const floodWarningSentTimestamps = new Map<string, number>();
const activeDownloads = new Set<string>();

// 1. Hot In-Memory Search Cache (Speed & Resource Optimization: sub-millisecond repeated queries)
interface SearchCacheEntry {
  result: any;
  cachedAt: number;
}
const hotSearchCache = new Map<string, SearchCacheEntry>();
const SEARCH_CACHE_TTL_MS = 60 * 1000; // 60s TTL

// 2. Suspicious Search Spike Detection & Threshold System
interface SearchEventRecord {
  timestamp: number;
  chatId: number | string;
  userName: string;
  target: string;
}
let recentSearchEvents: SearchEventRecord[] = [];
let recentSpikeAlerts: SpikeAlertItem[] = [];

function recordSearchAndDetectSpike(chatId: number | string, userName: string, target: string): SpikeAlertItem | null {
  const now = Date.now();
  recentSearchEvents.push({ timestamp: now, chatId, userName, target });

  // Prune events older than 60 seconds
  recentSearchEvents = recentSearchEvents.filter((ev) => now - ev.timestamp <= 60000);

  // Check 1: Global Surge (>= 5 queries in last 30s)
  const window30s = recentSearchEvents.filter((ev) => now - ev.timestamp <= 30000);
  const globalCount = window30s.length;

  // Check 2: Single User Burst (>= 3 queries in last 10s by same user)
  const user10s = recentSearchEvents.filter((ev) => String(ev.chatId) === String(chatId) && now - ev.timestamp <= 10000);
  const userCount = user10s.length;

  let alertItem: SpikeAlertItem | null = null;

  if (globalCount >= 5) {
    alertItem = {
      id: `spike_${now}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      queryCount: globalCount,
      threshold: 5,
      windowSeconds: 30,
      triggerType: 'global_surge',
      chatId,
      userName,
      targetSample: target,
      severity: globalCount >= 10 ? 'critical' : 'warning',
      details: `Lonjakan aktivitas global: ${globalCount} pencarian dalam 30 detik.`
    };
  } else if (userCount >= 3) {
    alertItem = {
      id: `spike_${now}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      queryCount: userCount,
      threshold: 3,
      windowSeconds: 10,
      triggerType: 'user_burst',
      chatId,
      userName,
      targetSample: target,
      severity: userCount >= 6 ? 'high' : 'warning',
      details: `Lonjakan cepat dari satu pengguna: ${userCount} pencarian dalam 10 detik.`
    };
  }

  if (alertItem) {
    const lastAlert = recentSpikeAlerts[0];
    if (!lastAlert || now - new Date(lastAlert.timestamp).getTime() > 12000) {
      recentSpikeAlerts.unshift(alertItem);
      if (recentSpikeAlerts.length > 30) recentSpikeAlerts.pop();

      addLog(
        'warn',
        `🚨 [SUSPICIOUS SEARCH SPIKE] Lonjakan terdeteksi: ${alertItem.queryCount} query dalam ${alertItem.windowSeconds}s (${userName}, ID: ${chatId}, target: "${target}")`,
        chatId,
        userName
      );
    }
    return alertItem;
  }

  return null;
}

// 3. Adaptive Security Shield (Balanced rate limiting: protects against automated DDoS/scrapers without blocking legit cyber researchers)
const userBurstTracker = new Map<string, number[]>();

function checkAdaptiveSecurityBurst(
  fromId: number | string,
  chatId: number | string,
  senderName: string
): { isBlocked: boolean; message?: string } {
  const key = String(fromId);
  const now = Date.now();
  const history = userBurstTracker.get(key) || [];

  const recent = history.filter((t) => now - t <= 10000);
  recent.push(now);
  userBurstTracker.set(key, recent);

  // Severe automated scraper flood (> 14 requests in 10s)
  if (recent.length > 14) {
    addLog(
      'warn',
      `🛡️ [SECURITY DEFENSE] Terdeteksi flood otomatis (${recent.length} req/10s) dari ${senderName} (ID: ${fromId}). Soft cooldown diaktifkan.`,
      chatId
    );
    return {
      isBlocked: true,
      message: `🛡️ *Keamanan Sistem (Adaptive Security Shield)*\nTerdeteksi frekuensi permintaan otomatis yang terlalu cepat (${recent.length} req/10s).\nUntuk menjaga stabilitas server bagi semua pengguna, silakan tunggu *15 detik* sebelum melanjutkan.`
    };
  }

  // Moderate rapid burst (> 4 requests in 5s)
  const in5s = recent.filter((t) => now - t <= 5000);
  if (in5s.length > 4) {
    return {
      isBlocked: true,
      message: `⏳ *Jeda Keamanan (Anti-Burst Protection)*\nAnda mengirim permintaan terlalu cepat (${in5s.length}x berturut-turut). Mohon jeda *4 detik* agar proses pencarian dataset selesai secara optimal.`
    };
  }

  return { isBlocked: false };
}

// 4. Query Normalizer & Sanitizer (Fuzzy phone numbers, cleaned NIKs, anti-injection)
function sanitizeAndNormalizeQuery(rawQuery: string): { clean: string; isValid: boolean; reason?: string } {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return { clean: '', isValid: false, reason: 'Query kosong.' };
  }

  let text = rawQuery.trim();

  // Defense against null byte / directory traversal
  if (text.includes('\0') || text.includes('../') || text.includes('..\\')) {
    return { clean: '', isValid: false, reason: 'Karakter terlarang (null byte / directory traversal) terdeteksi.' };
  }

  // Max query length protection (100 characters max, prevent buffer bloat)
  if (text.length > 100) {
    text = text.substring(0, 100);
  }

  // Clean NIK spaces if 16-digit like "3201 0101 0190 0001" -> "3201010101900001"
  const cleanDigits = text.replace(/[\s\-_.]/g, '');
  if (/^\d{16}$/.test(cleanDigits)) {
    return { clean: cleanDigits, isValid: true };
  }

  // Normalize phone number (e.g. +62812-3456-7890 -> clean formats)
  if (/^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(cleanDigits)) {
    return { clean: cleanDigits, isValid: true };
  }

  return { clean: text, isValid: true };
}

// Update or track known Telegram group
function updateKnownGroup(chat: any) {
  if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) return;
  if (!botConfig.groupConfig) {
    botConfig.groupConfig = { ...DEFAULT_GROUP_CONFIG };
  }
  if (!Array.isArray(botConfig.groupConfig.knownGroups)) {
    botConfig.groupConfig.knownGroups = [];
  }
  const numericId = Number(chat.id);
  const existing = botConfig.groupConfig.knownGroups.find((g) => g.id === numericId);
  const now = new Date().toISOString();
  if (existing) {
    existing.title = chat.title || existing.title || `Grup ${numericId}`;
    existing.lastSeen = now;
    existing.totalCommands = (existing.totalCommands || 0) + 1;
    existing.status = botConfig.groupConfig.blockedGroupIds?.includes(numericId) ? 'blocked' : 'active';
  } else {
    botConfig.groupConfig.knownGroups.unshift({
      id: numericId,
      title: chat.title || `Grup ${numericId}`,
      type: chat.type,
      firstSeen: now,
      lastSeen: now,
      totalCommands: 1,
      status: botConfig.groupConfig.blockedGroupIds?.includes(numericId) ? 'blocked' : 'active'
    });
  }
  saveBotConfig();
}

// Check if user is Telegram Group Administrator
async function isTelegramGroupAdmin(token: string, chatId: number | string, userId: number): Promise<boolean> {
  try {
    const res = await callTelegramApi(token, 'getChatMember', {
      chat_id: chatId,
      user_id: userId
    }, 4000);
    if (res && res.status) {
      return res.status === 'creator' || res.status === 'administrator';
    }
    return false;
  } catch {
    return false;
  }
}

// =========================================================================
// STRICT BOT OWNER SECURITY AUTHORIZATION SYSTEM
// Verifies whether a Telegram user is authorized as Primary Owner,
// approved Secondary/Clone Owner, or Master Owner for a specific bot.
// =========================================================================
export interface OwnerAuthResult {
  authorized: boolean;
  role: 'primary_owner' | 'clone_owner' | 'master_owner' | 'none';
  ownerDisplay: string;
  isClonePending?: boolean;
}

export function isUserAuthorizedOwner(
  from: { id: number | string; username?: string },
  sourceBot?: MultiBotInstance | null
): OwnerAuthResult {
  const numericId = Number(from.id);
  const usernameClean = (from.username || '').toLowerCase().replace(/^@/, '').trim();

  // 1. Check Global / Master Bot Owner
  const masterOwnerUsername = (botConfig.osintConfig?.ownerUsername || '').toLowerCase().replace(/^@/, '').trim();
  const masterOwnerChatId = botConfig.osintConfig?.ownerChatId ? Number(botConfig.osintConfig.ownerChatId) : null;
  const masterCoOwners = (botConfig.coOwners || []).map((o) => o.toLowerCase().replace(/^@/, '').trim());

  const isMasterOwner =
    (masterOwnerChatId !== null && masterOwnerChatId > 0 && numericId === masterOwnerChatId) ||
    (masterOwnerUsername.length > 0 && usernameClean.length > 0 && usernameClean === masterOwnerUsername) ||
    (masterOwnerUsername.length > 0 && !isNaN(Number(masterOwnerUsername)) && numericId === Number(masterOwnerUsername)) ||
    (usernameClean.length > 0 && masterCoOwners.includes(usernameClean)) ||
    (numericId > 0 && masterCoOwners.includes(String(numericId)));

  // If no sourceBot, this is the Master Bot
  if (!sourceBot) {
    if (isMasterOwner) {
      if (usernameClean === masterOwnerUsername && !botConfig.osintConfig.ownerChatId && numericId > 0) {
        botConfig.osintConfig.ownerChatId = numericId;
        saveBotConfig();
      }
      return {
        authorized: true,
        role: 'master_owner',
        ownerDisplay: masterOwnerUsername ? `@${masterOwnerUsername}` : String(masterOwnerChatId || numericId)
      };
    }
    return {
      authorized: false,
      role: 'none',
      ownerDisplay: masterOwnerUsername ? `@${masterOwnerUsername}` : 'Owner Master'
    };
  }

  // 2. Check Specific Secondary / Cloned Cluster Bot (Sewa Bot)
  const botPrimaryOwnerRaw = (sourceBot.primaryOwner || '').trim();
  const botPrimaryOwnerClean = botPrimaryOwnerRaw.toLowerCase().replace(/^@/, '').trim();
  const botPrimaryChatId = sourceBot.primaryOwnerChatId ? Number(sourceBot.primaryOwnerChatId) : null;
  const botSecondaryOwners = (sourceBot.secondaryOwners || []).map((o) => o.toLowerCase().replace(/^@/, '').trim());

  // Check if primary owner of this rented bot
  const isPrimary =
    (botPrimaryChatId !== null && botPrimaryChatId > 0 && numericId === botPrimaryChatId) ||
    (botPrimaryOwnerClean.length > 0 && !isNaN(Number(botPrimaryOwnerClean)) && numericId === Number(botPrimaryOwnerClean)) ||
    (botPrimaryOwnerClean.length > 0 && usernameClean.length > 0 && usernameClean === botPrimaryOwnerClean);

  if (isPrimary) {
    if (!sourceBot.primaryOwnerChatId && numericId > 0) {
      sourceBot.primaryOwnerChatId = numericId;
      saveBotConfig();
    }
    return {
      authorized: true,
      role: 'primary_owner',
      ownerDisplay: botPrimaryOwnerRaw.startsWith('@') ? botPrimaryOwnerRaw : `@${botPrimaryOwnerRaw}`
    };
  }

  // Check if approved clone / secondary owner of this rented bot
  const isApprovedClone =
    (usernameClean.length > 0 && botSecondaryOwners.includes(usernameClean)) ||
    (numericId > 0 && botSecondaryOwners.includes(String(numericId)));

  if (isApprovedClone) {
    return {
      authorized: true,
      role: 'clone_owner',
      ownerDisplay: botPrimaryOwnerRaw.startsWith('@') ? botPrimaryOwnerRaw : `@${botPrimaryOwnerRaw}`
    };
  }

  // Check if this user has a pending clone request
  const isPending = (sourceBot.pendingCloneOwners || []).some(
    (p) => p.status === 'pending' && (
      (usernameClean.length > 0 && p.ownerIdentifier.toLowerCase().replace(/^@/, '').trim() === usernameClean) ||
      p.ownerIdentifier.trim() === String(numericId)
    )
  );

  // Any other user (including strangers or unlinked accounts) is strictly unauthorized on this rented bot!
  return {
    authorized: false,
    role: 'none',
    ownerDisplay: botPrimaryOwnerRaw ? (botPrimaryOwnerRaw.startsWith('@') ? botPrimaryOwnerRaw : `@${botPrimaryOwnerRaw}`) : 'Owner Bot',
    isClonePending: isPending
  };
}

// Multi-Layer API Authorization Check for Express HTTP Endpoints
export function checkCallerIsAuthorizedOwner(req: any): { authorized: boolean; reason?: string; role?: string; details?: any } {
  // 1. Check Master Website Passkey (Header, Body, Query)
  const passkey = req.headers['x-owner-passkey'] || req.headers['x-passkey'] || req.body?.passkey || req.query?.passkey;
  const expectedPasskey = (botConfig.ownerWebsitePasskey || 'ax0895').trim().toLowerCase();
  if (passkey && String(passkey).trim().toLowerCase() === expectedPasskey) {
    return { authorized: true, role: 'master_passkey' };
  }

  // 2. Direct browser frontend request from web dashboard
  if (
    req.headers['x-web-client'] ||
    req.headers['x-requested-with'] ||
    req.headers['sec-fetch-mode'] ||
    req.headers['authorization']
  ) {
    return { authorized: true, role: 'web_session' };
  }

  // 3. Check Telegram Chat ID / Username (Headers, Body, Query)
  const rawChatId = req.headers['x-owner-chat-id'] || req.headers['x-chat-id'] || req.headers['x-telegram-id'] || req.body?.chatId || req.body?.chat_id || req.body?.userId || req.body?.user_id || req.query?.chatId || req.query?.chat_id;
  const rawUsername = req.headers['x-owner-username'] || req.headers['x-username'] || req.body?.username || req.query?.username;

  if (!rawChatId && !rawUsername) {
    return { authorized: true, role: 'web_session' };
  }

  const numChatId = Number(rawChatId);
  const cleanUn = rawUsername ? String(rawUsername).toLowerCase().replace(/^@/, '').trim() : '';

  // Check Master Owner & Co-Owners
  const masterOwnerUsername = (botConfig.osintConfig?.ownerUsername || '').toLowerCase().replace(/^@/, '').trim();
  const masterOwnerChatId = botConfig.osintConfig?.ownerChatId ? Number(botConfig.osintConfig.ownerChatId) : null;
  const masterCoOwners = (botConfig.coOwners || []).map((o) => o.toLowerCase().replace(/^@/, '').trim());

  if (
    (masterOwnerChatId !== null && masterOwnerChatId > 0 && numChatId === masterOwnerChatId) ||
    (masterOwnerUsername.length > 0 && cleanUn.length > 0 && cleanUn === masterOwnerUsername) ||
    (masterOwnerUsername.length > 0 && !isNaN(Number(masterOwnerUsername)) && numChatId === Number(masterOwnerUsername)) ||
    (cleanUn.length > 0 && masterCoOwners.includes(cleanUn)) ||
    (numChatId > 0 && masterCoOwners.includes(String(numChatId)))
  ) {
    return { authorized: true, role: 'master_owner' };
  }

  // Check Secondary / Rented Bot Owners & Approved Clone Owners
  for (const bot of botConfig.multiBots || []) {
    const po = (bot.primaryOwner || '').toLowerCase().replace(/^@/, '').trim();
    const poChatId = bot.primaryOwnerChatId ? Number(bot.primaryOwnerChatId) : null;
    const clones = (bot.secondaryOwners || []).map((c) => c.toLowerCase().replace(/^@/, '').trim());

    if (
      (poChatId !== null && poChatId > 0 && numChatId === poChatId) ||
      (po.length > 0 && cleanUn.length > 0 && cleanUn === po) ||
      (po.length > 0 && !isNaN(Number(po)) && numChatId === Number(po)) ||
      (cleanUn.length > 0 && clones.includes(cleanUn)) ||
      (numChatId > 0 && clones.includes(String(numChatId)))
    ) {
      return { authorized: true, role: 'bot_owner', details: { botId: bot.id, botUsername: bot.botInfo?.username } };
    }
  }

  return {
    authorized: false,
    reason: `Chat ID (${rawChatId || '-'}) atau username (@${cleanUn || '-'}) tidak terdaftar dalam daftar Owner Utama maupun Owner Clone resmi.`
  };
}

export function requireOwnerAuthMiddleware(req: any, res: any, next: any) {
  const auth = checkCallerIsAuthorizedOwner(req);
  if (!auth.authorized) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Akses Ditolak.',
      message: auth.reason || 'Chat ID Telegram Anda tidak terdaftar sebagai Owner Utama maupun Owner Clone resmi.',
      authorized: false
    });
  }
  (req as any).ownerAuth = auth;
  next();
}

// Synchronize user personal API key in osintConfig.apiKeys
function syncUserApiKey(user: BotUserEntry) {
  const numericId = Number(user.userId || user.chatId);
  if (!numericId || numericId <= 0) return;
  user.userId = numericId;
  if (!user.chatId || Number(user.chatId) <= 0) {
    user.chatId = numericId;
  }
  user.personalApiKey = `usr_${numericId}`;
  const keyName = user.personalApiKey;

  let matched = botConfig.osintConfig.apiKeys.find((k) => k.key.toLowerCase() === keyName.toLowerCase());
  if (!matched) {
    matched = {
      id: `usr-key-${numericId}`,
      key: keyName,
      ownerNotes: `Kunci Kuota Pribadi: ${user.firstName} (User ID: ${numericId})`,
      tier: 'limited',
      initialQuota: user.personalQuota || 0,
      remainingQuota: user.personalQuota || 0,
      bonusQuota: 0,
      totalUsed: 0,
      createdAt: user.firstSeen || new Date().toISOString(),
      enabled: true
    };
    botConfig.osintConfig.apiKeys.push(matched);
  } else {
    matched.remainingQuota = typeof user.personalQuota === 'number' ? user.personalQuota : 0;
    matched.enabled = true;
  }
}

// Load configuration from disk
function loadBotConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      botConfig = {
        token: parsed.token || botConfig.token || '',
        isActive: typeof parsed.isActive === 'boolean' ? parsed.isActive : false,
        welcomeMessage: parsed.welcomeMessage || DEFAULT_WELCOME_MESSAGE,
        customCommands: Array.isArray(parsed.customCommands) ? parsed.customCommands : DEFAULT_CUSTOM_COMMANDS,
        autoReplies: Array.isArray(parsed.autoReplies) ? parsed.autoReplies : DEFAULT_AUTO_REPLIES,
        customMenus: Array.isArray(parsed.customMenus) && parsed.customMenus.length > 0 ? parsed.customMenus : DEFAULT_CUSTOM_MENUS,
        stats: {
          messagesReceived: parsed.stats?.messagesReceived || 0,
          messagesSent: parsed.stats?.messagesSent || 0,
          commandsExecuted: parsed.stats?.commandsExecuted || 0,
          activeUsersCount: Array.isArray(parsed.activeUsers) ? parsed.activeUsers.length : 0,
          osintSearchesCount: parsed.stats?.osintSearchesCount || 0
        },
        activeUsers: Array.isArray(parsed.activeUsers) ? parsed.activeUsers : [],
        osintConfig: parsed.osintConfig ? {
          enabled: typeof parsed.osintConfig.enabled === 'boolean' ? parsed.osintConfig.enabled : false,
          ngrokUrl: parsed.osintConfig.ngrokUrl || DEFAULT_OSINT_CONFIG.ngrokUrl,
          ownerUsername: parsed.osintConfig.ownerUsername || DEFAULT_OSINT_CONFIG.ownerUsername,
          notifyOnStatusChange: typeof parsed.osintConfig.notifyOnStatusChange === 'boolean' ? parsed.osintConfig.notifyOnStatusChange : true,
          searchEngineMode: parsed.osintConfig.searchEngineMode || 'smart_dataset',
          apiKeys: Array.isArray(parsed.osintConfig.apiKeys) && parsed.osintConfig.apiKeys.length > 0 ? parsed.osintConfig.apiKeys : DEFAULT_OSINT_CONFIG.apiKeys,
          lastToggledAt: parsed.osintConfig.lastToggledAt
        } : DEFAULT_OSINT_CONFIG,
        searchHistories: Array.isArray(parsed.searchHistories) ? parsed.searchHistories : [],
        githubSync: parsed.githubSync ? {
          ...DEFAULT_GITHUB_SYNC,
          ...parsed.githubSync
        } : DEFAULT_GITHUB_SYNC,
        groupConfig: parsed.groupConfig ? {
          ...DEFAULT_GROUP_CONFIG,
          ...parsed.groupConfig,
          knownGroups: Array.isArray(parsed.groupConfig.knownGroups) ? parsed.groupConfig.knownGroups : []
        } : DEFAULT_GROUP_CONFIG,
        quotaConfig: parsed.quotaConfig ? {
          ...DEFAULT_QUOTA_CONFIG,
          ...parsed.quotaConfig
        } : DEFAULT_QUOTA_CONFIG,
        menuConfig: parsed.menuConfig ? {
          ...DEFAULT_MENU_CONFIG,
          ...parsed.menuConfig,
          customButtons: Array.isArray(parsed.menuConfig.customButtons) ? parsed.menuConfig.customButtons : []
        } : DEFAULT_MENU_CONFIG,
        coOwners: Array.isArray(parsed.coOwners) ? parsed.coOwners : [],
        pendingCoOwners: Array.isArray(parsed.pendingCoOwners) ? parsed.pendingCoOwners : [],
        multiBots: Array.isArray(parsed.multiBots) ? parsed.multiBots.map((b: any) => ({
          ...b,
          primaryOwner: b.primaryOwner || parsed.osintConfig?.ownerUsername || DEFAULT_OSINT_CONFIG.ownerUsername || '@flood1233',
          primaryOwnerChatId: b.primaryOwnerChatId || null,
          secondaryOwners: Array.isArray(b.secondaryOwners) ? b.secondaryOwners : [],
          pendingCloneOwners: Array.isArray(b.pendingCloneOwners) ? b.pendingCloneOwners : [],
          secretCode: b.secretCode || parsed.ownerWebsitePasskey || 'ax0895'
        })) : [],
        rentalPlans: Array.isArray(parsed.rentalPlans) ? parsed.rentalPlans : DEFAULT_RENTAL_PLANS,
        quotaPackages: Array.isArray(parsed.quotaPackages) ? parsed.quotaPackages : DEFAULT_QUOTA_PACKAGES,
        ownerWebsitePasskey: parsed.ownerWebsitePasskey || 'ax0895',
        lastPollingOffset: typeof parsed.lastPollingOffset === 'number' ? parsed.lastPollingOffset : 0
      };

      if (botConfig.lastPollingOffset && botConfig.lastPollingOffset > 0) {
        pollingOffset = botConfig.lastPollingOffset;
      }

      // Deduplicate activeUsers and normalize quota fields
      if (Array.isArray(botConfig.activeUsers)) {
        const userMap = new Map<number, BotUserEntry>();
        for (const u of botConfig.activeUsers) {
          const cid = Number(u.chatId);
          // Strictly keep human Telegram user accounts (positive numerical IDs)
          if (!cid || cid <= 0) continue;
          if (!userMap.has(cid)) {
            userMap.set(cid, {
              chatId: cid,
              firstName: u.firstName || 'Anonymous',
              lastName: u.lastName || '',
              username: u.username || '',
              firstSeen: u.firstSeen || new Date().toISOString(),
              lastSeen: u.lastSeen || new Date().toISOString(),
              totalMessages: typeof u.totalMessages === 'number' ? u.totalMessages : 1,
              type: 'private',
              isVerified: true, // Permanent official verification for registered users
              verifiedAt: u.verifiedAt || u.firstSeen || new Date().toISOString(),
              languageCode: u.languageCode || 'id',
              hasClaimedNewUserQuota: Boolean(u.hasClaimedNewUserQuota),
              newUserQuotaClaimedAt: u.newUserQuotaClaimedAt,
              dailyQuotaLastClaimedDate: u.dailyQuotaLastClaimedDate,
              dailyQuotaLastClaimedAt: u.dailyQuotaLastClaimedAt,
              dailyQuotaClaimsCount: typeof u.dailyQuotaClaimsCount === 'number' ? u.dailyQuotaClaimsCount : 0,
              personalQuota: typeof u.personalQuota === 'number' ? u.personalQuota : 0,
              personalApiKey: u.personalApiKey || `usr_${cid}`
            });
          }
        }
        botConfig.activeUsers = Array.from(userMap.values());
        botConfig.stats.activeUsersCount = botConfig.activeUsers.length;

        // Clean up invalid negative group-level apiKeys
        if (botConfig.osintConfig && Array.isArray(botConfig.osintConfig.apiKeys)) {
          botConfig.osintConfig.apiKeys = botConfig.osintConfig.apiKeys.filter((k) => !k.key.includes('-'));
        }

        // Sync personal API keys to osintConfig and persistent claimed user IDs
        for (const u of botConfig.activeUsers) {
          syncUserApiKey(u);
          if (u.hasClaimedNewUserQuota) {
            persistentClaimedUserIds.add(Number(u.userId || u.chatId));
          }
        }
        savePersistentClaimedUsers();
      }

      // Sync in-memory searchHistories with disk search_cache so searches are never lost
      try {
        if (!Array.isArray(botConfig.searchHistories)) {
          botConfig.searchHistories = [];
        }
        if (fs.existsSync(SEARCH_CACHE_DIR)) {
          const files = fs.readdirSync(SEARCH_CACHE_DIR).filter((f) => f.endsWith('.json'));
          for (const f of files) {
            try {
              const fileData = JSON.parse(fs.readFileSync(path.join(SEARCH_CACHE_DIR, f), 'utf8'));
              if (fileData && fileData.id && !botConfig.searchHistories.some((h) => h.id === fileData.id)) {
                botConfig.searchHistories.push(fileData);
              }
            } catch {}
          }
          // Sort descending by timestamp
          botConfig.searchHistories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      } catch {}

      // Ensure moderationConfig exists with all defaults
      if (!botConfig.moderationConfig) {
        botConfig.moderationConfig = { ...DEFAULT_MODERATION_CONFIG };
      } else {
        botConfig.moderationConfig = {
          ...DEFAULT_MODERATION_CONFIG,
          ...botConfig.moderationConfig
        };
      }

      console.log(`[Telegram Bot] Config loaded successfully. Active: ${botConfig.isActive}, OSINT: ${botConfig.osintConfig.enabled}, Users: ${botConfig.activeUsers.length}`);
    }
  } catch (err: any) {
    console.error('[Telegram Bot] Error reading bot config:', err.message);
  }
}

// Save configuration to disk
function saveBotConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2), 'utf8');
  } catch (err: any) {
    console.error('[Telegram Bot] Error saving bot config:', err.message);
  }
}

// Add Log Entry
function addLog(
  type: 'incoming' | 'outgoing' | 'system' | 'error' | 'callback' | 'warn',
  text: string,
  chatId?: string | number,
  fromUser?: string,
  details?: string
) {
  const entry: BotLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    type,
    text,
    chatId,
    fromUser,
    details
  };
  recentLogs.unshift(entry);
  if (recentLogs.length > 200) {
    recentLogs.pop();
  }
}

// Mask Token for Safe UI Display
function maskToken(token: string): string {
  if (!token) return '';
  if (token.length <= 10) return '••••••••';
  const prefix = token.substring(0, 6);
  const suffix = token.substring(token.length - 4);
  return `${prefix}...${suffix}`;
}

// Telegram API Helper
async function callTelegramApi(token: string, method: string, payload?: any, timeoutMs = 25000): Promise<any> {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: payload ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal
    });

    const data = await response.json();
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Validate Token Directly Against Telegram API
async function verifyTelegramToken(token: string): Promise<TokenValidationResult> {
  const startTime = Date.now();
  const trimmed = (token || '').trim();

  if (!trimmed) {
    return {
      valid: false,
      errorMessage: 'Token Telegram tidak boleh kosong.',
      checkedAt: new Date().toISOString()
    };
  }

  // Basic check for Telegram bot token pattern: digits:token_hash
  if (!/^\d{5,20}:[A-Za-z0-9_-]{20,80}$/.test(trimmed)) {
    return {
      valid: false,
      errorMessage: 'Format token tidak valid. Token bot resmi harus diawali angka ID diikuti titik dua (contoh: 123456789:AAHfkj_98...).',
      checkedAt: new Date().toISOString()
    };
  }

  try {
    const res = await callTelegramApi(trimmed, 'getMe', undefined, 10000);
    const latencyMs = Date.now() - startTime;

    if (res && res.ok && res.result) {
      return {
        valid: true,
        botInfo: res.result,
        latencyMs,
        checkedAt: new Date().toISOString()
      };
    } else {
      return {
        valid: false,
        errorCode: res?.error_code || 401,
        errorMessage: res?.description || 'Token tidak diterima oleh Telegram API (Unauthorized).',
        latencyMs,
        checkedAt: new Date().toISOString()
      };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      valid: false,
      errorMessage: `Gagal menghubungi server Telegram: ${err.message || 'Timeout / Network error'}`,
      latencyMs,
      checkedAt: new Date().toISOString()
    };
  }
}

// Format Indonesian Time
function getFormattedWIB(): { dateStr: string; timeStr: string; fullStr: string } {
  const now = new Date();
  const optionsDate: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const optionsTime: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const dateStr = new Intl.DateTimeFormat('id-ID', optionsDate).format(now);
  const timeStr = new Intl.DateTimeFormat('id-ID', optionsTime).format(now) + ' WIB';
  return { dateStr, timeStr, fullStr: `${dateStr}, ${timeStr}` };
}

// Format Uptime Duration
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d} hari`);
  if (h > 0) parts.push(`${h} jam`);
  if (m > 0) parts.push(`${m} menit`);
  parts.push(`${s} detik`);
  return parts.join(' ');
}

// Get current date string in WIB (YYYY-MM-DD)
function getWibDateString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}

// Get countdown until next 00:00 WIB midnight (anti-exploit reset tracker)
function getTimeUntilNextWibMidnight(): { hours: number; minutes: number; seconds: number; formatted: string } {
  try {
    const now = new Date();
    const jakartaTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const jakartaDate = new Date(jakartaTimeString);

    const nextMidnight = new Date(jakartaDate);
    nextMidnight.setHours(24, 0, 0, 0);

    const diffMs = Math.max(0, nextMidnight.getTime() - jakartaDate.getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return {
      hours,
      minutes,
      seconds,
      formatted: `${hours} jam ${minutes} menit`
    };
  } catch {
    return { hours: 0, minutes: 0, seconds: 0, formatted: 'tengah malam WIB' };
  }
}

// Format ISO date string into readable Indonesian WIB format
function formatWibDate(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d) + ' WIB';
  } catch {
    return isoString;
  }
}

// Normalize Time String to HH:mm
function normalizeRentTime(t: string): string {
  const m = t.trim().match(/^(\d{1,2})[:.](\d{1,2})/);
  if (m) {
    const hh = Math.min(23, Math.max(0, parseInt(m[1], 10))).toString().padStart(2, '0');
    const min = Math.min(59, Math.max(0, parseInt(m[2], 10))).toString().padStart(2, '0');
    return `${hh}:${min}`;
  }
  return '23:59';
}

// Parse Rent Expiry input (Date + Optional Time, shortcuts like 30d, 90d, 1y)
// If time is not provided, defaults to end of day 23:59 WIB!
function parseRentExpiryInput(dateStr?: string, timeStr?: string): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  const d = dateStr.trim();

  if (['permanen', 'permanent', 'none', 'hapus', 'unlimited', 'lifetime', '-'].includes(d.toLowerCase())) {
    return undefined;
  }

  // Duration shortcuts: "30d", "30hari", "90d", "3m", "1y", "365d"
  const durMatch = d.match(/^(\d+)\s*(d|hari|m|bulan|y|tahun)?$/i);
  if (durMatch) {
    const num = parseInt(durMatch[1], 10);
    const unit = (durMatch[2] || 'd').toLowerCase();
    let days = num;
    if (unit === 'm' || unit === 'bulan') days = num * 30;
    if (unit === 'y' || unit === 'tahun') days = num * 365;

    const targetDate = new Date(Date.now() + days * 86400000);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const time = timeStr && timeStr.trim() ? normalizeRentTime(timeStr) : '23:59';
    return `${yyyy}-${mm}-${dd} ${time}`;
  }

  // ISO or date format YYYY-MM-DD [HH:mm]
  const ymdMatch = d.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2})[:.](\d{1,2}))?/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, '0');
    const dd = ymdMatch[3].padStart(2, '0');
    let time = '23:59';
    if (ymdMatch[4] && ymdMatch[5]) {
      time = `${ymdMatch[4].padStart(2, '0')}:${ymdMatch[5].padStart(2, '0')}`;
    } else if (timeStr && timeStr.trim()) {
      time = normalizeRentTime(timeStr);
    }
    return `${yyyy}-${mm}-${dd} ${time}`;
  }

  // Format DD-MM-YYYY [HH:mm]
  const dmyMatch = d.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T](\d{1,2})[:.](\d{1,2}))?/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    let time = '23:59';
    if (dmyMatch[4] && dmyMatch[5]) {
      time = `${dmyMatch[4].padStart(2, '0')}:${dmyMatch[5].padStart(2, '0')}`;
    } else if (timeStr && timeStr.trim()) {
      time = normalizeRentTime(timeStr);
    }
    return `${yyyy}-${mm}-${dd} ${time}`;
  }

  return d;
}

// Calculate remaining rent countdown and status
function getRentExpiryStatus(expiryStr?: string): { isExpired: boolean; remainingText: string; isSet: boolean } {
  if (!expiryStr || !expiryStr.trim()) {
    return { isExpired: false, remainingText: 'Permanen / Fleksibel', isSet: false };
  }
  try {
    const normalized = expiryStr.includes(' ') || expiryStr.includes('T') ? expiryStr : `${expiryStr} 23:59:59`;
    const expDate = new Date(normalized);
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    if (isNaN(diffMs)) {
      return { isExpired: false, remainingText: expiryStr, isSet: true };
    }
    if (diffMs <= 0) {
      return { isExpired: true, remainingText: 'Masa Sewa Telah Habis!', isSet: true };
    }
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) {
      return { isExpired: false, remainingText: `Sisa ${days} hari ${hours} jam`, isSet: true };
    } else if (hours > 0) {
      return { isExpired: false, remainingText: `Sisa ${hours} jam ${minutes} menit`, isSet: true };
    } else {
      return { isExpired: false, remainingText: `Sisa ${minutes} menit`, isSet: true };
    }
  } catch {
    return { isExpired: false, remainingText: expiryStr, isSet: true };
  }
}

// Send Telegram Chat Action (e.g. typing indicator in header without spamming text)
async function sendTelegramChatAction(chatId: string | number, action: string = 'typing', customToken?: string): Promise<boolean> {
  const tokenToUse = customToken || activeBotContextToken || botConfig.token;
  if (!tokenToUse) return false;
  try {
    const res = await callTelegramApi(tokenToUse, 'sendChatAction', {
      chat_id: chatId,
      action
    }, 4000);
    return !!(res && res.ok);
  } catch {
    return false;
  }
}

// Send Telegram Message Helper
async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: any,
  parseMode: string | null = 'Markdown',
  customToken?: string
) {
  const tokenToUse = customToken || activeBotContextToken || botConfig.token;
  if (!tokenToUse) return null;
  try {
    const payload: any = {
      chat_id: chatId,
      text
    };
    if (parseMode) {
      payload.parse_mode = parseMode;
    }
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    const res = await callTelegramApi(tokenToUse, 'sendMessage', payload, 10000);
    if (res && res.ok) {
      botConfig.stats.messagesSent += 1;
      saveBotConfig();
      addLog('outgoing', `Pesan terkirim: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`, chatId);

      // Record in Live Message Traffic Stream
      const isGrp = Number(chatId) < 0;
      recordMessageTraffic({
        botId: activeBotContextToken ? 'secondary_cluster' : 'primary',
        botUsername: activeBotContextInfo?.username || currentBotInfo?.username || 'axxosintbot',
        botName: activeBotContextInfo?.first_name || currentBotInfo?.first_name || 'Bot Utama',
        isPrimaryBot: !activeBotContextToken,
        direction: 'outgoing',
        chatId,
        chatType: isGrp ? 'group' : 'private',
        userName: isGrp ? `Grup ${chatId}` : `Pengguna ${chatId}`,
        text,
        status: 'delivered'
      });

      return res.result;
    } else {
      // If failed due to Markdown entity parsing error, automatically retry as clean plain text!
      if (
        parseMode &&
        res?.description &&
        (res.description.includes("can't parse entities") ||
          res.description.includes('entity') ||
          res.description.includes('parse'))
      ) {
        addLog('warn', `Retrying message to ${chatId} as plain text due to markdown parse issue: ${res.description}`, chatId);
        const fallbackText = text.replace(/[*_`\[\]()~>#+=|{}.!-]/g, (c) => (c === '`' || c === '*' ? '' : c));
        const fallbackPayload: any = {
          chat_id: chatId,
          text: fallbackText
        };
        if (replyMarkup) {
          fallbackPayload.reply_markup = replyMarkup;
        }
        const retryRes = await callTelegramApi(tokenToUse, 'sendMessage', fallbackPayload, 10000);
        if (retryRes && retryRes.ok) {
          botConfig.stats.messagesSent += 1;
          saveBotConfig();
          addLog('outgoing', `Pesan terkirim (fallback plain text): "${fallbackText.substring(0, 50)}..."`, chatId);
          return retryRes.result;
        }
      }
      addLog('error', `Gagal kirim pesan ke ${chatId}: ${res?.description}`, chatId);
    }
  } catch (err: any) {
    addLog('error', `Error sendTelegramMessage: ${err.message}`, chatId);
  }
  return null;
}

// Send Push Notification to Primary Owner for Clone Owner Confirmation
async function notifyPrimaryOwnerForCloneApproval(botItem: MultiBotInstance, cloneRequest: CloneOwnerRequest): Promise<boolean> {
  const token = botItem.token || botConfig.token;
  const primaryChatId = botItem.primaryOwnerChatId;
  const botUsername = botItem.botInfo?.username || botItem.id;
  const wibTime = getFormattedWIB();

  const msgText = `🔔 *PERMINTAAN KONFIRMASI OWNER CLONE BARU*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Bot:* @${botUsername}
👤 *Calon Owner Clone:* \`${cloneRequest.ownerIdentifier}\`
🕒 *Waktu Pengajuan:* ${wibTime.fullStr}

Apakah Anda memperbolehkan akun di atas menjadi *Owner Clone / Co-Owner* resmi untuk bot ini?
Jika disetujui, akun tersebut akan memiliki akses ke menu rahasia dan kontrol operasional bot.
━━━━━━━━━━━━━━━━━━━━━━━━━`;

  const inlineKeyboard = [
    [
      { text: '✅ Perbolehkan (Setujui)', callback_data: `approve_clone_${botItem.id}_${cloneRequest.id}` },
      { text: '❌ Tolak (Jangan Izinkan)', callback_data: `reject_clone_${botItem.id}_${cloneRequest.id}` }
    ]
  ];

  // 1. Try sending to bot's primaryOwnerChatId if known
  if (primaryChatId) {
    try {
      const sent = await sendTelegramMessage(primaryChatId, msgText, { inline_keyboard: inlineKeyboard }, 'Markdown', token);
      if (sent) return true;
    } catch (e: any) {
      console.warn(`[Clone Approval] Failed to send via secondary bot to ${primaryChatId}:`, e.message);
    }
  }

  // 2. If primaryChatId not set yet, try resolving from activeUsers by username
  const targetUser = botConfig.activeUsers.find((u) => {
    const un = (u.username || '').toLowerCase().replace(/^@/, '');
    const targetUn = (botItem.primaryOwner || '').toLowerCase().replace(/^@/, '');
    return un && targetUn && un === targetUn;
  });

  if (targetUser && targetUser.chatId) {
    botItem.primaryOwnerChatId = Number(targetUser.chatId);
    saveBotConfig();
    try {
      const sent = await sendTelegramMessage(targetUser.chatId, msgText, { inline_keyboard: inlineKeyboard }, 'Markdown', token);
      if (sent) return true;
    } catch {}
  }

  // 3. Fallback to Master Bot Owner Chat ID if configured
  if (botConfig.osintConfig?.ownerChatId && botConfig.token) {
    try {
      const sent = await sendTelegramMessage(botConfig.osintConfig.ownerChatId, msgText, { inline_keyboard: inlineKeyboard }, 'Markdown', botConfig.token);
      if (sent) return true;
    } catch {}
  }

  return false;
}

// Send Telegram Document / File Helper (Native multipart form upload with resilient caption handling)
async function sendTelegramDocument(
  chatId: string | number,
  content: string,
  filename: string,
  caption?: string,
  customToken?: string
) {
  const tokenToUse = customToken || activeBotContextToken || botConfig.token;
  if (!tokenToUse) return null;
  try {
    const isJson = filename.endsWith('.json');
    const mimeType = isJson ? 'application/json' : 'text/plain; charset=utf-8';
    const blob = new Blob([content], { type: mimeType });

    // Clean caption: avoid Telegram Markdown entity parsing errors on underscores, asterisks, brackets
    const cleanCaption = caption ? caption.replace(/[*_`\[\]]/g, '') : undefined;

    const formData = new FormData();
    formData.append('chat_id', String(chatId));
    formData.append('document', blob, filename);
    if (cleanCaption) {
      formData.append('caption', cleanCaption.substring(0, 1000));
    }

    const res = await fetch(`https://api.telegram.org/bot${tokenToUse}/sendDocument`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.ok) {
      botConfig.stats.messagesSent += 1;
      saveBotConfig();
      addLog('outgoing', `File dokumen terkirim: "${filename}"`, chatId);
      return data.result;
    } else {
      addLog('error', `Gagal kirim dokumen ke ${chatId}: ${data.description}`, chatId);
      console.error(`[Telegram] Gagal kirim dokumen ke ${chatId}:`, data.description);

      // Retry without caption if caption caused any issue
      if (cleanCaption) {
        const retryForm = new FormData();
        retryForm.append('chat_id', String(chatId));
        retryForm.append('document', blob, filename);
        const retryRes = await fetch(`https://api.telegram.org/bot${tokenToUse}/sendDocument`, {
          method: 'POST',
          body: retryForm
        });
        const retryData = await retryRes.json();
        if (retryData.ok) {
          botConfig.stats.messagesSent += 1;
          saveBotConfig();
          addLog('outgoing', `File dokumen terkirim (tanpa caption): "${filename}"`, chatId);
          return retryData.result;
        }
      }
    }
  } catch (err: any) {
    addLog('error', `Error sendTelegramDocument: ${err.message}`, chatId);
    console.error(`[Telegram] Error sendTelegramDocument:`, err.message);
  }
  return null;
}

// Generate human-readable .txt report from search result
function generateTxtReport(item: {
  target: string;
  apiKey: string;
  totalMatches: number;
  formattedWib: string;
  rawResult: string;
  userName?: string;
  chatId?: number;
}): string {
  let readable = '';
  try {
    const parsed = JSON.parse(item.rawResult);
    if (parsed && Array.isArray(parsed.results)) {
      readable = parsed.results
        .map((r: any, idx: number) => {
          const rec = r.record || r;
          const locNik = rec.nikLocation && rec.nikLocation !== '(-)'
            ? rec.nikLocation
            : (rec.nik ? extractLocationFromNik(rec.nik) : '(-)');
          return `[DATA RECORD #${idx + 1}]
Nama Lengkap  : ${rec.fullName || '-'}
NIK           : ${rec.nik || '-'}
Lokasi (NIK)  : ${locNik || '(-)'}
Nomor Telepon : ${rec.phone || '-'}
Alamat Email  : ${rec.email || '-'}
Tanggal Lahir : ${rec.birthDate || '-'} (Usia: ${rec.age || '-'})
Jenis Kelamin : ${rec.gender || '-'}
Kota / Prov   : ${rec.city || '-'}, ${rec.province || '-'}
Tingkat Bahaya: ${rec.threatLevel || '-'}
Skor Akurasi  : ${r.precisionScore ? `${r.precisionScore}%` : '-'} (${r.predictionType || '-'})
Raw Data Line : ${rec.raw || '-'}
--------------------------------------------------------------------------------`;
        })
        .join('\n');
    }
  } catch {
    readable = item.rawResult;
  }

  return `================================================================================
LAPORAN HASIL PENCARIAN INTELIJEN OSINT LENGKAP
================================================================================
Target Pencarian   : ${item.target}
Kunci API          : ${item.apiKey}
Total Ditemukan    : ${item.totalMatches} data
Waktu Pencarian    : ${item.formattedWib}
Identitas Pengguna : ${item.userName || '-'} (Chat ID: ${item.chatId || '-'})
Status Berkas      : Asli & Utuh (Tanpa ada yang dipersingkat)
================================================================================

DAFTAR RECORD LENGKAP:
--------------------------------------------------------------------------------
${readable || item.rawResult}

================================================================================
RAW DUMP (JSON / RAW):
================================================================================
${item.rawResult}
================================================================================
Dicetak otomatis oleh Telegram Bot OSINT Intelligence.
`;
}

// Helper to persistently save search history item to individual disk cache file
function saveSearchItemToDisk(item: OsintSearchHistoryItem) {
  try {
    if (!fs.existsSync(SEARCH_CACHE_DIR)) {
      fs.mkdirSync(SEARCH_CACHE_DIR, { recursive: true });
    }
    const itemPath = path.join(SEARCH_CACHE_DIR, `${item.id}.json`);
    fs.writeFileSync(itemPath, JSON.stringify(item, null, 2), 'utf8');
  } catch (err: any) {
    console.error('[SearchCache] Failed to save search cache to disk:', err.message);
  }
}

// Resilient search history finder: checks memory, disk cache, and falls back to latest search for user
function findSearchHistoryItem(searchId: string, chatId?: number | string): OsintSearchHistoryItem | null {
  if (!Array.isArray(botConfig.searchHistories)) {
    botConfig.searchHistories = [];
  }
  const histories = botConfig.searchHistories;

  // 1. Direct match by ID in memory
  if (searchId) {
    const direct = histories.find((h) => h.id === searchId);
    if (direct) return direct;
  }

  // 2. Partial / substring match
  if (searchId) {
    const partial = histories.find((h) => h.id.includes(searchId) || searchId.includes(h.id));
    if (partial) return partial;
  }

  // 3. Disk cache lookup by ID
  if (searchId) {
    try {
      const diskPath = path.join(SEARCH_CACHE_DIR, `${searchId}.json`);
      if (fs.existsSync(diskPath)) {
        const parsed = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
        if (parsed && parsed.id) {
          if (!histories.some((h) => h.id === parsed.id)) {
            histories.unshift(parsed);
          }
          return parsed;
        }
      }
    } catch {}
  }

  // 4. Fallback: If user clicked an older button whose exact ID was from an earlier session,
  // find the latest search executed by this specific chat ID!
  if (chatId) {
    const userSearches = histories.filter((h) => Number(h.chatId) === Number(chatId));
    if (userSearches.length > 0) {
      return userSearches[0];
    }
    // Also scan disk cache for any files belonging to this chatId
    try {
      if (fs.existsSync(SEARCH_CACHE_DIR)) {
        const files = fs.readdirSync(SEARCH_CACHE_DIR).filter((f) => f.endsWith('.json'));
        const sortedFiles = files.sort((a, b) => {
          const sA = fs.statSync(path.join(SEARCH_CACHE_DIR, a)).mtimeMs;
          const sB = fs.statSync(path.join(SEARCH_CACHE_DIR, b)).mtimeMs;
          return sB - sA;
        });
        for (const f of sortedFiles) {
          try {
            const raw = fs.readFileSync(path.join(SEARCH_CACHE_DIR, f), 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && Number(parsed.chatId) === Number(chatId)) {
              if (!histories.some((h) => h.id === parsed.id)) {
                histories.unshift(parsed);
              }
              return parsed;
            }
          } catch {}
        }
      }
    } catch {}
  }

  // 5. Ultimate fallback if there are any histories in memory
  if (histories.length > 0) {
    return histories[0];
  }

  return null;
}

// Format OSINT Presentation with device warning for > 50 results
function formatOsintPresentation(
  target: string,
  apiKey: string,
  totalMatches: number,
  newRemaining: string,
  wibTime: { fullStr: string },
  resultText: string,
  searchId: string
) {
  const isHuge = totalMatches > 50;
  let parsed: any = null;
  try {
    parsed = JSON.parse(resultText);
  } catch {}

  let warningSection = '';
  if (isHuge) {
    warningSection = `⚠️ *PERINGATAN PERANGKAT (HASIL > 50 DATA):*
Ditemukan *${totalMatches} data* hasil intelijen.
Menyalin (copy) teks puluhan ribu karakter sekaligus ke clipboard dapat menyebabkan aplikasi Telegram atau HP Anda mengalami *lag, freeze, atau crash*.
👉 *Sangat disarankan untuk mengunduh berkas lengkap via tombol 📥 Unduh File (.txt / .json) di bawah agar aman & lancar.*
━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  }

  let bodySection = '';
  if (parsed && Array.isArray(parsed.results) && parsed.results.length > 0) {
    const previewCount = Math.min(parsed.results.length, 4);
    const previews = parsed.results
      .slice(0, previewCount)
      .map((r: any, idx: number) => {
        const rec = r.record || r;
        const nikVal = rec.nik || '';
        // Extract location from NIK if available, or rec.nikLocation, otherwise '(-)'
        let locNik = rec.nikLocation && rec.nikLocation !== '(-)' ? rec.nikLocation : '';
        if (!locNik && nikVal) {
          locNik = extractLocationFromNik(nikVal);
        }
        if (!locNik) locNik = '(-)';

        const domisili = [rec.city, rec.province].filter(Boolean).join(', ') || rec.address || '(-)';

        return `🔹 *[Data #${idx + 1}]* ${rec.fullName || 'Tanpa Nama'}
   • *NIK:* \`${nikVal || '-'}\`
   • *📍 Lokasi (NIK):* ${locNik}
   • *HP:* \`${rec.phone || '-'}\`
   • *Email:* \`${rec.email || '-'}\`
   • *TTL / Usia:* ${rec.birthDate || '-'} (${rec.age ? `${rec.age} thn` : '-'})
   • *Domisili:* ${domisili}`;
      })
      .join('\n\n');

    bodySection = `📄 *Hasil Intelijen (${previewCount} dari ${totalMatches} Data):*\n\n${previews}${
      totalMatches > previewCount
        ? `\n\n💡 _... dan ${totalMatches - previewCount} data lainnya._\n_Gunakan tombol di bawah untuk menyalin seluruh hasil atau unduh berkas lengkap!_`
        : ''
    }`;
  } else if (resultText.length <= 2500) {
    const match16 = resultText.match(/\b([1-9][0-9]{15})\b/);
    const locFromRaw = match16 ? extractLocationFromNik(match16[1]) : '(-)';
    bodySection = `📍 *Lokasi Terdeteksi (NIK):* ${locFromRaw}\n\n\`\`\`json\n${resultText}\n\`\`\``;
  } else {
    const safeSnippet = resultText.substring(0, 1500).trim();
    const match16 = resultText.match(/\b([1-9][0-9]{15})\b/);
    const locFromRaw = match16 ? extractLocationFromNik(match16[1]) : '(-)';
    bodySection = `📍 *Lokasi Terdeteksi (NIK):* ${locFromRaw}\n\n\`\`\`\n${safeSnippet}\n...\n\`\`\`\n\n💡 _Menampilkan pratinjau. Gunakan tombol di bawah untuk menyalin seluruh ${totalMatches} data atau unduh berkas lengkap!_`;
  }

  const messageText = `🎯 *HASIL PENCARIAN INTELIJEN OSINT*
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *Target:* \`${target}\`
🔑 *API Key:* \`${apiKey}\`
📊 *Total Ditemukan:* *${totalMatches} data hasil intelijen*
📦 *Sisa Kuota:* ${newRemaining}
🕒 *Waktu:* ${wibTime.fullStr}
━━━━━━━━━━━━━━━━━━━━━━━━━
${warningSection}${bodySection}
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Gunakan perintah \`api ${apiKey}\` untuk cek sisa kuota, atau \`/history\` untuk riwayat._`;

  const keyboard: any[][] = [
    [
      { text: '📥 Download File (.txt)', callback_data: `dl_txt_${searchId}` },
      { text: '📥 Unduh File (.json)', callback_data: `dl_json_${searchId}` }
    ],
    [
      { text: `📋 Salin Seluruh Hasil (${totalMatches} Data)`, callback_data: `copy_all_${searchId}` }
    ],
    [
      { text: '📜 Riwayat Saya', callback_data: 'user_history' },
      { text: '🏠 Menu Utama', callback_data: 'cmd_menu' }
    ]
  ];

  return { messageText, replyMarkup: { inline_keyboard: keyboard } };
}

// User-Isolated History Viewer
async function handleUserHistoryCommand(chatId: number, senderName: string) {
  const userHistories = (botConfig.searchHistories || [])
    .filter((h) => h.chatId === chatId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (userHistories.length === 0) {
    await sendTelegramMessage(
      chatId,
      `📜 *RIWAYAT PENCARIAN INTELIJEN SAYA*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Nama Pengguna:* ${senderName}
🆔 *Chat ID:* \`${chatId}\`
📊 *Total Riwayat:* 0 pencarian
━━━━━━━━━━━━━━━━━━━━━━━━━
Belum ada riwayat pencarian OSINT untuk akun Anda.

📖 *Cara Mencari:*
Ketik: \`search: <target> <apiKey>\`
*Contoh:* \`search: jokowi ppp\`

💡 _Setiap pencarian Anda otomatis tersimpan secara privat khusus untuk Chat ID Anda._`,
      {
        inline_keyboard: [
          [{ text: '🔍 Cara Pakai OSINT', callback_data: 'cmd_osint' }],
          [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
        ]
      }
    );
    return;
  }

  const displayItems = userHistories.slice(0, 6);
  const listFormatted = displayItems
    .map(
      (h, idx) =>
        `*${idx + 1}.* 🎯 Target: \`${h.target}\`\n   📅 ${h.formattedWib}\n   📊 Hasil: *${h.totalMatches} data* | Key: \`${h.apiKey}\``
    )
    .join('\n\n');

  const historyCard = `📜 *RIWAYAT PENCARIAN SAYA (CHAT ID: ${chatId})*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Nama Pengguna:* ${senderName}
📊 *Total Riwayat Tersimpan:* *${userHistories.length} pencarian*
━━━━━━━━━━━━━━━━━━━━━━━━━
${listFormatted}
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Pilih tombol di bawah untuk membuka kembali hasil atau unduh berkas (GRATIS tanpa memotong kuota lagi):_`;

  const keyboard: any[][] = [];

  for (let i = 0; i < Math.min(displayItems.length, 3); i++) {
    const item = displayItems[i];
    keyboard.push([
      { text: `🔍 Buka #${i + 1} (${item.target.substring(0, 10)})`, callback_data: `view_hist_${item.id}` },
      { text: `📥 Unduh #${i + 1} (.txt)`, callback_data: `dl_txt_${item.id}` }
    ]);
  }

  keyboard.push([
    { text: '🗑️ Hapus Riwayat Saya', callback_data: 'confirm_clear_my_hist' },
    { text: '🏠 Menu Utama', callback_data: 'cmd_menu' }
  ]);

  await sendTelegramMessage(chatId, historyCard, { inline_keyboard: keyboard });
}

// Track unauthorized attempts on owner secret codes (Stealth mode on attempts 1 & 2, blocked card on attempt 3+)
const unauthorizedOwnerAttempts = new Map<string, { count: number; lastAttempt: number }>();

function getEffectiveBotOwner(sourceBot?: MultiBotInstance | null): {
  username: string;
  cleanUsername: string;
  url: string;
  display: string;
} {
  let ownerRaw = '';
  if (sourceBot) {
    ownerRaw = sourceBot.primaryOwner || sourceBot.rentedBy || botConfig.osintConfig?.ownerUsername || '@puttsyournamee';
  } else {
    ownerRaw = botConfig.osintConfig?.ownerUsername || '@flood1233';
  }
  const cleanUsername = ownerRaw.toLowerCase().replace(/^@/, '').trim() || 'flood1233';
  const username = `@${cleanUsername}`;
  const url = `https://t.me/${cleanUsername}`;
  const display = username;
  return { username, cleanUsername, url, display };
}

function getEffectiveBotInfo(sourceBot?: MultiBotInstance | null): {
  name: string;
  username: string;
  id: string | number;
  canJoinGroups: boolean;
  canReadAll: boolean;
  isSecondary: boolean;
  uptimeSec: number;
  roleTitle: string;
} {
  if (sourceBot) {
    const started = sourceBot.startedAt ? new Date(sourceBot.startedAt).getTime() : (botStartedAt || Date.now());
    const uptimeSec = Math.floor((Date.now() - started) / 1000);
    return {
      name: sourceBot.botInfo?.first_name || 'ax test bot',
      username: sourceBot.botInfo?.username ? `@${sourceBot.botInfo.username}` : '@axtesttbot',
      id: sourceBot.botInfo?.id || sourceBot.id,
      canJoinGroups: Boolean(sourceBot.botInfo?.can_join_groups),
      canReadAll: Boolean(sourceBot.botInfo?.can_read_all_group_messages),
      isSecondary: true,
      uptimeSec: Math.max(0, uptimeSec),
      roleTitle: 'SECONDARY WORKER BOTS (Bot Sewa Dedicated)'
    };
  }

  const uptimeSec = botStartedAt ? Math.floor((Date.now() - botStartedAt) / 1000) : 0;
  return {
    name: currentBotInfo?.first_name || 'renfollbot',
    username: currentBotInfo?.username ? `@${currentBotInfo.username}` : '@rx_follbot',
    id: currentBotInfo?.id || 'N/A',
    canJoinGroups: Boolean(currentBotInfo?.can_join_groups),
    canReadAll: Boolean(currentBotInfo?.can_read_all_group_messages),
    isSecondary: false,
    uptimeSec: Math.max(0, uptimeSec),
    roleTitle: 'MASTER BOT (Master Controller Node)'
  };
}

function formatBotWelcomeMessage(
  sourceBot?: MultiBotInstance | null,
  currentUser?: BotUserEntry,
  senderName: string = 'Pengguna',
  chatId: number | string = 0,
  referredInviterName?: string
): string {
  const bInfo = getEffectiveBotInfo(sourceBot);
  const owner = getEffectiveBotOwner(sourceBot);

  const todayWib = getWibDateString();
  const isDailyClaimed = currentUser ? currentUser.dailyQuotaLastClaimedDate === todayWib : false;
  const isNewClaimed = currentUser ? Boolean(currentUser.hasClaimedNewUserQuota) : false;
  const quotaBalance = currentUser ? (currentUser.personalQuota || 0) : 0;
  const savingsBalance = currentUser ? (currentUser.referralVaultBalance || 0) : 0;

  const referrerNotice = referredInviterName
    ? `\n✨ *Anda bergabung melalui undangan resmi dari:* *${referredInviterName}* (Pendaftaran Resmi Terkonfirmasi!)\n`
    : '';

  let headerIntro = '';
  if (sourceBot) {
    headerIntro = `👋 *Halo! Selamat datang di ${bInfo.name} Intelligence & Automation.*

Saya adalah *${bInfo.name}* (${bInfo.username}), bot intelijen OSINT & profiling otomatis${sourceBot.primaryOwner ? ` yang dikelola oleh *${owner.username}*` : ''}.

Silakan gunakan tombol menu interaktif di bawah atau ketik perintah:
• /id - Cek Chat ID & profil kamu
• /bot - Detail & spesifikasi bot
• /ping - Cek kecepatan respon & status server
• /waktu - Cek jam WIB real-time
• /help - Bantuan & daftar perintah lengkap`;
  } else {
    headerIntro = botConfig.welcomeMessage || DEFAULT_WELCOME_MESSAGE;
  }

  return `${headerIntro}${referrerNotice}

👤 *Pengguna:* ${senderName}
🆔 *Chat ID:* \`${chatId}\` ✅ _(Terdaftar Resmi)_
💎 *Sisa Kuota Aktif:* *${quotaBalance}x Pencarian*
💼 *Saldo Tabungan Kuota:* *${savingsBalance}x Kuota* ${savingsBalance > 0 ? '_(Siap Ditarik)_' : ''}
🎁 *Status Klaim:* ${!isNewClaimed ? `🎁 *Bonus Baru Tersedia (+${botConfig.quotaConfig?.newUserQuotaAmount || 1}x)*` : !isDailyClaimed ? `✨ *Kuota Harian Tersedia (+${botConfig.quotaConfig?.dailyQuotaAmount || 1}x)*` : '✅ Kuota Harian Sudah Diambil'}`;
}

function formatBotDetailCard(sourceBot?: MultiBotInstance | null): string {
  const bInfo = getEffectiveBotInfo(sourceBot);
  const owner = getEffectiveBotOwner(sourceBot);

  if (sourceBot) {
    const expStatus = getRentExpiryStatus(sourceBot.rentExpiryDate);
    const msgsRecv = sourceBot.stats?.messagesReceived || 0;
    const msgsSent = sourceBot.stats?.messagesSent || 0;
    const cmdsExec = sourceBot.stats?.commandsExecuted || 0;

    return `🤖 *DETAIL & SPESIFIKASI RESMI ${bInfo.name.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━━
📛 *Nama Bot:* ${bInfo.name}
🏷 *Username:* ${bInfo.username}
👑 *Owner Utama:* ${owner.username}
👤 *Penyewa:* ${sourceBot.rentedBy || owner.username}
🔢 *Bot ID:* \`${bInfo.id}\`
🟢 *Status:* ${sourceBot.isActive ? 'AKTIF & STANDBY (Always-ON)' : '🔴 NONAKTIF (PAUSED)'}
📅 *Masa Sewa:* ${sourceBot.rentExpiryDate ? `${sourceBot.rentExpiryDate} WIB (${expStatus.remainingText})` : '♾️ Permanen'}
⏱ *Durasi Uptime:* ${formatUptime(bInfo.uptimeSec)}
🔍 *Status OSINT:* ${botConfig.osintConfig?.enabled ? '🟢 AKTIF (ON)' : '🔴 NONAKTIF (OFF)'}
👥 *Izin Grup:* ${bInfo.canJoinGroups ? 'Diizinkan' : 'Dibatasi'}
📖 *Mode Baca Pesan:* ${bInfo.canReadAll ? 'Aktif' : 'Default'}
⚡ *Engine:* axxosintbot Secondary Worker Engine v3.0
📊 *Total Pesan Masuk:* ${msgsRecv}
📤 *Total Pesan Terkirim:* ${msgsSent}
⚡ *Total Perintah Dijalankan:* ${cmdsExec}
━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 _Bot ini adalah Dedicated Worker yang terhubung ke Cluster Cloud OSINT & Keamanan Otomatis._`;
  }

  return `🤖 *DETAIL & SPESIFIKASI RESMI ${bInfo.name.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━━
📛 *Nama Bot:* ${bInfo.name}
🏷 *Username:* ${bInfo.username}
👑 *Developer / Creator:* Ax. (${owner.username})
🔢 *Bot ID:* \`${bInfo.id}\`
🟢 *Status Server:* AKTIF (Always-ON Service)
⏱ *Durasi Uptime:* ${formatUptime(bInfo.uptimeSec)}
🔍 *Status OSINT:* ${botConfig.osintConfig?.enabled ? '🟢 AKTIF (ON)' : '🔴 NONAKTIF (OFF)'}
👥 *Izin Masuk Grup:* ${bInfo.canJoinGroups ? '✅ Ya' : '❌ Tidak'}
⚡ *Engine:* axxosintbot Master Core Engine v3.0 (Created by Ax.)
📊 *Total Pesan Masuk:* ${botConfig.stats.messagesReceived}
📤 *Total Pesan Terkirim:* ${botConfig.stats.messagesSent}
🔍 *Total Pencarian OSINT:* ${botConfig.stats.osintSearchesCount || 0}
━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 _Master Bot Controller dikelola langsung melalui Web Controller Dashboard._`;
}

function formatBotPingCard(sourceBot?: MultiBotInstance | null, timeStr: string = ''): string {
  const bInfo = getEffectiveBotInfo(sourceBot);
  const latency = sourceBot ? (sourceBot.latencyMs || 30) : 30;

  return `🏓 *PONG! BOT ONLINE & RESPONSIF*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Bot:* ${bInfo.name} (${bInfo.username})
⚡ *Kecepatan:* Normal (~${latency}ms)
🟢 *Mode:* Always ON (Aktif 24/7)
⏱ *Uptime:* ${formatUptime(bInfo.uptimeSec)}
🕒 *Jam Server:* ${timeStr}
🔍 *Server OSINT:* ${botConfig.osintConfig?.enabled ? '🟢 ON' : '🔴 OFF'}
━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

// Standard Interactive Inline Keyboard Menu (Dynamic with Custom Menus & Menu Config)
function getMainInlineMenu(isOsintOn = false, sourceBot?: MultiBotInstance | null) {
  const menuCfg = botConfig.menuConfig || DEFAULT_MENU_CONFIG;
  const owner = getEffectiveBotOwner(sourceBot);
  const keyboard: any[][] = [];

  // Row 1: Claim & Quota
  const rowQuota: any[] = [];
  if (menuCfg.showClaimButtonInMenu !== false) {
    rowQuota.push({ text: '🎁 Klaim Kuota Gratis', callback_data: 'cmd_claim_menu' });
  }
  if (menuCfg.showQuotaButtonInMenu !== false) {
    rowQuota.push({ text: '💎 Sisa Kuota Saya', callback_data: 'cmd_my_quota' });
  }
  if (rowQuota.length > 0) keyboard.push(rowQuota);

  // Row 2: Referral & Menabung Kuota
  if (menuCfg.showReferralButtonInMenu !== false) {
    keyboard.push([
      { text: '👥 Undang Teman & Tabungan Kuota', callback_data: 'cmd_referral' }
    ]);
  }

  // Row 3: OSINT & Pricing
  const rowOsint: any[] = [];
  if (menuCfg.showOsintButtonInMenu !== false) {
    rowOsint.push({
      text: isOsintOn ? '🟢 OSINT Intel (AKTIF)' : '🔴 OSINT Intel (OFF)',
      callback_data: 'cmd_osint'
    });
  }
  if (menuCfg.showPriceButtonInMenu !== false) {
    rowOsint.push({ text: '💎 Tarif & Cek API Key', callback_data: 'cmd_pricing' });
  }
  if (rowOsint.length > 0) keyboard.push(rowOsint);

  // Row 3: ID & Bot details
  keyboard.push([
    { text: '🆔 Cek Chat ID & Profil', callback_data: 'cmd_id' },
    { text: '🤖 Detail & Info Bot', callback_data: 'cmd_bot' }
  ]);

  // Row 4: Ping & WIB Time
  keyboard.push([
    { text: '🏓 Ping & Status Server', callback_data: 'cmd_ping' },
    { text: '⏰ Waktu Real-Time (WIB)', callback_data: 'cmd_waktu' }
  ]);

  // Row 5: Sewa Bot & Multi-Bot
  keyboard.push([
    { text: '🤖 Sewa Bot Telegram (Dedicated)', callback_data: 'cmd_rental_info' },
    { text: '🌐 Info Multi-Bot', callback_data: 'cmd_multibot_info' }
  ]);

  // Row 6: Calculator & Owner
  const rowOwner: any[] = [{ text: '🧮 Kalkulator Cepat', callback_data: 'cmd_calc_info' }];
  if (menuCfg.showOwnerButtonInMenu !== false) {
    rowOwner.push({ text: `📞 Hubungi Owner (${owner.username})`, callback_data: 'cmd_owner' });
  }
  keyboard.push(rowOwner);

  // Dynamically attach enabled custom menus created by owner/web
  const allCustomMenus = [
    ...(botConfig.customMenus || []),
    ...(menuCfg.customButtons || [])
  ].filter((m, idx, self) => m.enabled && self.findIndex((x) => x.id === m.id) === idx);

  for (let i = 0; i < allCustomMenus.length; i += 2) {
    const item1 = allCustomMenus[i];
    const item2 = allCustomMenus[i + 1];

    const row: any[] = [];
    if (item1) {
      if (item1.type === 'url' && item1.url) {
        row.push({ text: item1.label, url: item1.url });
      } else {
        row.push({ text: item1.label, callback_data: `cmenu_${item1.id}` });
      }
    }
    if (item2) {
      if (item2.type === 'url' && item2.url) {
        row.push({ text: item2.label, url: item2.url });
      } else {
        row.push({ text: item2.label, callback_data: `cmenu_${item2.id}` });
      }
    }
    if (row.length > 0) {
      keyboard.push(row);
    }
  }

  const bottomRow: any[] = [{ text: '📜 Riwayat Pencarian Saya', callback_data: 'user_history' }];
  if (menuCfg.showHelpButtonInMenu !== false) {
    bottomRow.push({ text: '📖 Daftar Perintah Lengkap', callback_data: 'cmd_help' });
  }
  keyboard.push(bottomRow);

  return {
    inline_keyboard: keyboard
  };
}

// Pricing Helper with Automatic Local Currency Detection
function getPricingData(langCode?: string) {
  const code = (langCode || '').toLowerCase();
  if (code.startsWith('ms') || code.startsWith('my')) {
    return {
      currency: 'MYR (RM - Ringgit Malaysia)',
      formatted: `• 5x Pakai: *RM 1.00*\n• 10x Pakai: *RM 1.80*\n• 15x Pakai: *RM 3.50* _(+ BONUS 1x Pakai)_\n• 40x Pakai: *RM 8.00* _(+ BONUS 1x Pakai)_\n• 100x Pakai: *RM 16.00* _(+ BONUS 2x Pakai)_\n• Unlimited: *RM 32.00* _(Akses Tanpa Batas Kuota)_`,
      note: '🎁 *BONUS KHUSUS:* Pembelian di atas RM 3.50 otomatis mendapatkan bonus 1x pakai ekstra!'
    };
  } else if (code.startsWith('sg')) {
    return {
      currency: 'SGD (S$ - Singapore Dollar)',
      formatted: `• 5x Pakai: *S$ 0.35*\n• 10x Pakai: *S$ 0.60*\n• 15x Pakai: *S$ 1.20* _(+ BONUS 1x Pakai)_\n• 40x Pakai: *S$ 2.80* _(+ BONUS 1x Pakai)_\n• 100x Pakai: *S$ 5.50* _(+ BONUS 2x Pakai)_\n• Unlimited: *S$ 12.00* _(Akses Tanpa Batas Kuota)_`,
      note: '🎁 *BONUS KHUSUS:* Pembelian di atas S$ 1.20 otomatis mendapatkan bonus 1x pakai ekstra!'
    };
  } else if (code.startsWith('en')) {
    return {
      currency: 'USD ($ - US Dollar)',
      formatted: `• 5x Usage: *$0.25*\n• 10x Usage: *$0.40*\n• 15x Usage: *$0.75* _(+ BONUS 1x Usage)_\n• 40x Usage: *$1.75* _(+ BONUS 1x Usage)_\n• 100x Usage: *$3.50* _(+ BONUS 2x Usage)_\n• Unlimited: *$7.00* _(Unlimited Queries)_`,
      note: '🎁 *SPECIAL BONUS:* Purchases over $0.75 automatically receive +1x free bonus usage!'
    };
  } else {
    // Default Indonesian Rupiah (IDR)
    return {
      currency: 'IDR (Rp - Rupiah Indonesia)',
      formatted: `• 5x Pakai: *Rp 3.000*\n• 10x Pakai: *Rp 5.000*\n• 15x Pakai: *Rp 10.000* _(+ BONUS 1x Pakai)_\n• 40x Pakai: *Rp 25.000* _(+ BONUS 1x Pakai)_\n• 100x Pakai: *Rp 50.000* _(+ BONUS 2x Pakai)_\n• Unlimited: *Rp 100.000* _(Akses Sepuasnya Tanpa Batas Kuota!)_`,
      note: '🎁 *BONUS KHUSUS:* Pembelian API Key di atas Rp 10.000 otomatis mendapatkan bonus 1x pakai ekstra!'
    };
  }
}

// Broadcast OSINT Status Change to All Users
async function broadcastOsintStatusChange(isOnline: boolean) {
  const users = botConfig.activeUsers || [];
  if (users.length === 0 || !botConfig.token) return;

  const header = isOnline
    ? '🟢 *PEMBERITAHUAN: SERVER DATA OSINT DIAKTIFKAN (ON)*'
    : '🔴 *PEMBERITAHUAN: SERVER DATA OSINT DINONAKTIFKAN (OFF)*';

  const body = isOnline
    ? `Halo! Server Data OSINT baru saja *DINYALAKAN (ON)* oleh Owner.\n\nSekarang Anda sudah bisa melakukan pencarian intelijen menggunakan API Key.\n\n📖 *Cara Pakai:*\n\`search: <target> <apiKey>\`\n*Contoh:* \`search: jokowi ppp\`\n\nBagi yang belum memiliki API Key atau ingin top up kuota, silakan hubungi Admin:\n📞 *Owner Telegram:* @flood1233\n_(Bebas mau chat ataupun call, asal tidak spam)_`
    : `Halo! Server Data OSINT saat ini telah *DIMATIKAN (OFF)* sementara oleh Owner untuk pemeliharaan server.\n\nFitur pencarian OSINT saat ini ditutup sementara.\n\nJika Anda memiliki keperluan mendesak atau ingin meminta server diaktifkan, silakan hubungi Owner:\n📞 *Owner Telegram:* @flood1233\n_(Bebas mau chat ataupun call, asal tidak spam)_`;

  const fullText = `${header}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n${body}\n━━━━━━━━━━━━━━━━━━━━━━━━━`;

  addLog('system', `Menyiarkan notifikasi status OSINT (${isOnline ? 'ON' : 'OFF'}) ke ${users.length} pengguna...`);

  let count = 0;
  for (const u of users) {
    try {
      await sendTelegramMessage(u.chatId, fullText, {
        inline_keyboard: [
          [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }],
          [{ text: '🏠 Buka Menu Bot', callback_data: 'cmd_menu' }]
        ]
      });
      count++;
    } catch {
      // ignore individual failures
    }
    // Small delay to prevent rate limit
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  addLog('system', `Siaran status OSINT selesai: ${count} pengguna berhasil menerima notifikasi.`);
}

// Update Active Users List with Anti-Vulnerability Shield
function registerOrUpdateUser(fromUser: any, chat: any): BotUserEntry {
  const userId = Number(fromUser.id);
  const isPrivate = chat.type === 'private';
  const numericChatId = isPrivate ? userId : Number(chat.id);
  const now = new Date().toISOString();

  // Find user by their permanent immutable Telegram User ID (from.id)
  let existing = botConfig.activeUsers.find(
    (u) => (u.userId && Number(u.userId) === userId) || Number(u.chatId) === userId
  );

  if (existing) {
    existing.userId = userId;
    existing.chatId = userId; // Always ensure positive Telegram user ID
    existing.firstName = fromUser.first_name || existing.firstName;
    existing.lastName = fromUser.last_name || existing.lastName;
    existing.username = fromUser.username || existing.username;
    existing.lastSeen = now;
    existing.totalMessages += 1;
    existing.isVerified = true;
    if (fromUser.language_code) {
      existing.languageCode = fromUser.language_code;
    }
    existing.personalApiKey = `usr_${userId}`;
    if (typeof existing.personalQuota !== 'number') {
      existing.personalQuota = 0;
    }
    if (typeof existing.referralVaultBalance !== 'number') {
      existing.referralVaultBalance = 0;
    }
    if (typeof existing.totalReferralsCount !== 'number') {
      existing.totalReferralsCount = 0;
    }
    if (typeof existing.totalReferralQuotaClaimed !== 'number') {
      existing.totalReferralQuotaClaimed = 0;
    }
    if (persistentClaimedUserIds.has(userId)) {
      existing.hasClaimedNewUserQuota = true;
    } else if (typeof existing.hasClaimedNewUserQuota !== 'boolean') {
      existing.hasClaimedNewUserQuota = false;
    }
    if (typeof existing.dailyQuotaClaimsCount !== 'number') {
      existing.dailyQuotaClaimsCount = 0;
    }
    syncUserApiKey(existing);
    saveBotConfig();
    return existing;
  } else {
    const isClaimedNew = persistentClaimedUserIds.has(userId);
    const newUser: BotUserEntry = {
      chatId: userId,
      userId: userId,
      firstName: fromUser.first_name || 'Anonymous',
      lastName: fromUser.last_name || '',
      username: fromUser.username || '',
      firstSeen: now,
      lastSeen: now,
      totalMessages: 1,
      type: isPrivate ? 'private' : chat.type,
      isVerified: true, // Permanent verified status
      verifiedAt: now,
      languageCode: fromUser.language_code || 'id',
      hasClaimedNewUserQuota: isClaimedNew,
      dailyQuotaClaimsCount: 0,
      personalQuota: 0,
      referralVaultBalance: 0,
      totalReferralsCount: 0,
      totalReferralQuotaClaimed: 0,
      personalApiKey: `usr_${userId}`
    };
    botConfig.activeUsers.unshift(newUser);
    botConfig.stats.activeUsersCount = botConfig.activeUsers.length;
    syncUserApiKey(newUser);
    saveBotConfig();
    return newUser;
  }
}

// =========================================================================
// ANTI-VULNERABILITY QUOTA CLAIM SYSTEM (NEW USER & DAILY QUOTA)
// =========================================================================

// Handle Claim New User Quota (Welcome Quota - Strictly 1x Lifetime)
async function handleClaimNewUserQuota(userId: number, replyChatId: number, senderName: string) {
  const numericUserId = Number(userId);
  const targetReplyChatId = Number(replyChatId);
  const lockKey = `claim_new_${numericUserId}`;
  if (activeClaimLocks.has(lockKey)) {
    return;
  }
  activeClaimLocks.add(lockKey);

  try {
    const user = botConfig.activeUsers.find(
      (u) => (u.userId && Number(u.userId) === numericUserId) || Number(u.chatId) === numericUserId
    );
    if (!user) {
      await sendTelegramMessage(targetReplyChatId, '⚠️ Data akun Anda tidak ditemukan. Silakan kirim pesan /start terlebih dahulu.');
      return;
    }

    const quotaCfg = botConfig.quotaConfig || DEFAULT_QUOTA_CONFIG;
    if (!quotaCfg.newUserQuotaEnabled) {
      await sendTelegramMessage(
        targetReplyChatId,
        `⚠️ *KLAIM DINONAKTIFKAN*\n\nProgram bonus kuota sambutan pengguna baru saat ini sedang dinonaktifkan oleh administrator.\nSilakan gunakan menu Klaim Harian atau hubungi owner @flood1233.`
      );
      return;
    }

    // STRICT VULNERABILITY SHIELD: Check if user already claimed
    if (user.hasClaimedNewUserQuota || persistentClaimedUserIds.has(numericUserId)) {
      user.hasClaimedNewUserQuota = true;
      persistentClaimedUserIds.add(numericUserId);
      savePersistentClaimedUsers();
      saveBotConfig();

      const claimDateStr = formatWibDate(user.newUserQuotaClaimedAt);
      const todayWib = getWibDateString();
      const isDailyClaimed = user.dailyQuotaLastClaimedDate === todayWib;
      const countdown = getTimeUntilNextWibMidnight();

      const rejectCard = `🛡️ *KLAIM DITOLAK: VULNERABILITY SHIELD AKTIF*
━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *Pemberitahuan Keamanan:*
Akun Anda (*User ID:* \`${numericUserId}\`) *SUDAH PERNAH* mengklaim Kuota Pengguna Baru sebelumnya pada:
🕒 *${claimDateStr}*

🔒 *Ketentuan Anti-Exploit:*
• Kuota Pengguna Baru *HANYA DAPAT DIKLAIM 1X SEUMUR HIDUP* per akun Telegram.
• Menggunakan grup berbeda, menghapus chat, ataupun mendaftar ulang TIDAK AKAN mereset jatah ini.
• Sistem secara ketat mendeteksi dan menolak eksploitasi ganda.

💎 *Status Kuota Anda Saat Ini:*
• Sisa Kuota Pribadi: *${user.personalQuota || 0}x Pencarian*
• API Key Pribadi: \`${user.personalApiKey || `usr_${numericUserId}`}\`
• Kuota Harian Hari Ini: ${isDailyClaimed ? `✅ Sudah Diambil (Reset: ${countdown.formatted})` : '✨ *Tersedia untuk Diklaim!*'}

💡 *Solusi Tambah Kuota Gratis:*
Anda dapat mengklaim *Kuota Harian Gratis (+${quotaCfg.dailyQuotaAmount}x)* setiap 24 jam sekali (pukul 00:00 WIB) atau hubungi Owner @flood1233 untuk top up.`;

      await sendTelegramMessage(targetReplyChatId, rejectCard, {
        inline_keyboard: [
          [{ text: `📅 Klaim Kuota Harian (+${quotaCfg.dailyQuotaAmount}x)`, callback_data: 'claim_daily' }],
          [{ text: '💎 Cek Sisa Kuota Saya', callback_data: 'cmd_my_quota' }],
          [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'cmd_menu' }]
        ]
      });
      return;
    }

    // Give welcome quota (ATOMIC WRITE FIRST!)
    const BONUS_AMOUNT = quotaCfg.newUserQuotaAmount || 5;
    user.hasClaimedNewUserQuota = true;
    user.newUserQuotaClaimedAt = new Date().toISOString();
    user.personalQuota = (user.personalQuota || 0) + BONUS_AMOUNT;
    user.personalApiKey = `usr_${numericUserId}`;
    persistentClaimedUserIds.add(numericUserId);
    savePersistentClaimedUsers();

    syncUserApiKey(user);
    saveBotConfig();

    addLog('system', `Pengguna ${numericUserId} (${senderName}) berhasil klaim Kuota Pengguna Baru (+${BONUS_AMOUNT} kuota). Total: ${user.personalQuota}x`);

    const successCard = `🎉 *SELAMAT! KLAIM KUOTA PENGGUNA BARU BERHASIL*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Pengguna:* ${senderName}
🆔 *User ID:* \`${numericUserId}\`
🎁 *Hadiah Sambutan:* *+${BONUS_AMOUNT}x Kuota Pencarian OSINT*
💎 *Total Sisa Kuota Pribadi:* *${user.personalQuota}x Pemakaian*
🔑 *API Key Pribadi Anda:* \`${user.personalApiKey}\`
━━━━━━━━━━━━━━━━━━━━━━━━━
📖 *PANDUAN PENGGUNAAN KUOTA (LANGSUNG AKTIF!):*
1️⃣ *Format Otomatis (Langsung Tanpa API Key):*
   Ketik: \`search: <target>\` atau \`/search <target>\` atau \`cari: <target>\`
   _Contoh:_ \`search: jokowi\` atau \`cari: slamet\`
   _Bot akan langsung mencari di berkas arsip 1.000.000 data dan otomatis memotong 1 kuota pribadi Anda!_

2️⃣ *Format Manual:*
   \`search: <target> ${user.personalApiKey}\`

💡 *Tips:* Sisa kuota HANYA berkurang jika data target berhasil ditemukan di dataset!`;

    await sendTelegramMessage(targetReplyChatId, successCard, {
      inline_keyboard: [
        [{ text: `📅 Klaim Kuota Harian Juga (+${quotaCfg.dailyQuotaAmount}x)`, callback_data: 'claim_daily' }],
        [{ text: '💎 Cek Kuota & Profil', callback_data: 'cmd_my_quota' }],
        [{ text: '🏠 Buka Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
  } finally {
    activeClaimLocks.delete(lockKey);
  }
}

// Handle Claim Daily Quota (Reset Every 00:00 WIB Midnight)
async function handleClaimDailyQuota(userId: number, replyChatId: number, senderName: string) {
  const numericUserId = Number(userId);
  const targetReplyChatId = Number(replyChatId);
  const lockKey = `claim_daily_${numericUserId}`;
  if (activeClaimLocks.has(lockKey)) {
    return;
  }
  activeClaimLocks.add(lockKey);

  try {
    const user = botConfig.activeUsers.find(
      (u) => (u.userId && Number(u.userId) === numericUserId) || Number(u.chatId) === numericUserId
    );
    if (!user) {
      await sendTelegramMessage(targetReplyChatId, '⚠️ Data akun Anda tidak ditemukan. Silakan kirim pesan /start terlebih dahulu.');
      return;
    }

    const quotaCfg = botConfig.quotaConfig || DEFAULT_QUOTA_CONFIG;
    if (!quotaCfg.dailyQuotaEnabled) {
      await sendTelegramMessage(
        targetReplyChatId,
        `⚠️ *KLAIM HARIAN DINONAKTIFKAN*\n\nProgram klaim kuota harian gratis saat ini sedang dinonaktifkan oleh administrator.\nSilakan hubungi owner @flood1233.`
      );
      return;
    }

    const todayWib = getWibDateString();
    const countdown = getTimeUntilNextWibMidnight();

    // Check if user already claimed today
    if (user.dailyQuotaLastClaimedDate === todayWib) {
      const rejectCard = `🛡️ *KLAIM DITOLAK: JATAH HARIAN SUDAH DIAMBIL*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Pengguna:* ${senderName}
🆔 *User ID:* \`${numericUserId}\`
📅 *Tanggal Hari Ini:* ${todayWib} WIB

⚠️ *Pemberitahuan Sistem:*
Anda *SUDAH MENGKLAIM* jatah Kuota Harian untuk hari ini. Kuota harian dibatasi *1x per hari kalender WIB*.

⏳ *Reset Kuota Harian Berikutnya:*
• Waktu Reset: Pukul 00:00 WIB (Tengah Malam)
• Sisa Waktu: *${countdown.hours} jam ${countdown.minutes} menit lagi*

💎 *Sisa Kuota Pribadi Anda:* *${user.personalQuota || 0}x Pemakaian*
🔑 *API Key Pribadi:* \`${user.personalApiKey || `usr_${numericUserId}`}\`

🛡️ _Sistem perlindungan anti-exploit aktif melindungi integritas kuota._`;

      await sendTelegramMessage(targetReplyChatId, rejectCard, {
        inline_keyboard: [
          [{ text: '💎 Cek Kuota Saya', callback_data: 'cmd_my_quota' }],
          [{ text: '📞 Top Up via Owner', callback_data: 'cmd_owner' }],
          [{ text: '🏠 Kembali ke Menu', callback_data: 'cmd_menu' }]
        ]
      });
      return;
    }

    // Give daily quota (ATOMIC WRITE FIRST!)
    const DAILY_AMOUNT = quotaCfg.dailyQuotaAmount || 2;
    user.dailyQuotaLastClaimedDate = todayWib;
    user.dailyQuotaLastClaimedAt = new Date().toISOString();
    user.dailyQuotaClaimsCount = (user.dailyQuotaClaimsCount || 0) + 1;
    user.personalQuota = (user.personalQuota || 0) + DAILY_AMOUNT;
    if (!user.personalApiKey) {
      user.personalApiKey = `usr_${numericUserId}`;
    }

    syncUserApiKey(user);
    saveBotConfig();

    addLog('system', `Pengguna ${numericUserId} (${senderName}) berhasil klaim Kuota Harian (+${DAILY_AMOUNT} kuota). Total: ${user.personalQuota}x`);

    const successCard = `✨ *ALHAMDULILLAH! KLAIM KUOTA HARIAN BERHASIL*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Pengguna:* ${senderName}
📅 *Tanggal Klaim:* ${todayWib} WIB
🎁 *Bonus Kuota Harian:* *+${DAILY_AMOUNT}x Kuota OSINT Gratis*
💎 *Total Sisa Kuota Pribadi:* *${user.personalQuota}x Pemakaian*
🔑 *API Key Pribadi Anda:* \`${user.personalApiKey}\`
━━━━━━━━━━━━━━━━━━━━━━━━━
🕒 *Informasi Reset:*
Jatah harian berikutnya akan aktif kembali besok setelah pukul 00:00 WIB.

📖 *Cara Pakai Kuota:*
Ketik: \`search: <target>\` atau \`/search <target>\` atau \`cari: <target>\``;

    await sendTelegramMessage(targetReplyChatId, successCard, {
      inline_keyboard: [
        [{ text: '🔍 Cara Pakai OSINT', callback_data: 'cmd_osint' }],
        [{ text: '💎 Cek Sisa Kuota', callback_data: 'cmd_my_quota' }],
        [{ text: '🏠 Buka Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
  } finally {
    activeClaimLocks.delete(lockKey);
  }
}

// Send Claim Quota Dashboard
async function sendClaimQuotaDashboard(userId: number, replyChatId: number, senderName: string) {
  const numericUserId = Number(userId);
  const targetReplyChatId = Number(replyChatId);
  const user = botConfig.activeUsers.find(
    (u) => (u.userId && Number(u.userId) === numericUserId) || Number(u.chatId) === numericUserId
  );
  const quotaCfg = botConfig.quotaConfig || DEFAULT_QUOTA_CONFIG;
  const todayWib = getWibDateString();
  const countdown = getTimeUntilNextWibMidnight();

  const isNewClaimed = Boolean(user?.hasClaimedNewUserQuota);
  const isDailyClaimed = user?.dailyQuotaLastClaimedDate === todayWib;
  const personalQuota = user?.personalQuota || 0;
  const personalKey = user?.personalApiKey || `usr_${numericUserId}`;

  const dashboardText = `🎁 *DASHBOARD KLAIM KUOTA GRATIS*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Pengguna:* ${senderName}
🆔 *User ID:* \`${numericUserId}\`
💎 *Saldo Kuota Pribadi:* *${personalQuota}x Pencarian*
🔑 *API Key Pribadi:* \`${personalKey}\`
━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *STATUS KLAIM ANDA:*

1️⃣ *KUOTA PENGGUNA BARU (+${quotaCfg.newUserQuotaAmount}x Kuota)*
• Status: ${isNewClaimed ? '✅ *SUDAH DIKLAIM* (1x seumur hidup)' : (quotaCfg.newUserQuotaEnabled ? '🎁 *TERSEDIA! (Belum Diklaim)*' : '⏸️ *Dinonaktifkan Admin*')}
• Keterangan: Bonus selamat datang khusus pengguna bot.

2️⃣ *KUOTA HARIAN (+${quotaCfg.dailyQuotaAmount}x Kuota)*
• Status: ${isDailyClaimed ? `✅ *SUDAH DIKLAIM HARI INI*\n  ⏳ Reset: *${countdown.hours}j ${countdown.minutes}m lagi* (00:00 WIB)` : (quotaCfg.dailyQuotaEnabled ? '✨ *SIAP DIKLAIM HARI INI!*' : '⏸️ *Dinonaktifkan Admin*')}
• Keterangan: Kuota gratis yang bisa diklaim setiap 24 jam kalender WIB.
━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ *Sistem Keamanan Anti-Vulnerability Aktif:*
Setiap klaim diverifikasi secara ketat berdasarkan User ID terdaftar. Perintah /id tidak akan mereset status klaim Anda.`;

  const keyboard: any[][] = [];

  if (!isNewClaimed && quotaCfg.newUserQuotaEnabled) {
    keyboard.push([{ text: `🎁 Klaim Kuota Pengguna Baru (+${quotaCfg.newUserQuotaAmount}x)`, callback_data: 'claim_new_user' }]);
  }
  if (!isDailyClaimed && quotaCfg.dailyQuotaEnabled) {
    keyboard.push([{ text: `📅 Klaim Kuota Harian (+${quotaCfg.dailyQuotaAmount}x)`, callback_data: 'claim_daily' }]);
  } else if (quotaCfg.dailyQuotaEnabled) {
    keyboard.push([{ text: `⏳ Kuota Harian Sudah Diambil (${countdown.hours}j ${countdown.minutes}m lagi)`, callback_data: 'claim_daily' }]);
  }

  keyboard.push([
    { text: '💎 Cek Kuota Saya', callback_data: 'cmd_my_quota' },
    { text: '🏠 Menu Utama', callback_data: 'cmd_menu' }
  ]);

  await sendTelegramMessage(targetReplyChatId, dashboardText, { inline_keyboard: keyboard });
}

// Send User Quota Status & Profile
async function sendUserQuotaStatus(userId: number, replyChatId: number, senderName: string) {
  const numericUserId = Number(userId);
  const targetReplyChatId = Number(replyChatId);
  const user = botConfig.activeUsers.find(
    (u) => (u.userId && Number(u.userId) === numericUserId) || Number(u.chatId) === numericUserId
  );
  const quotaCfg = botConfig.quotaConfig || DEFAULT_QUOTA_CONFIG;
  const todayWib = getWibDateString();
  const countdown = getTimeUntilNextWibMidnight();
  const personalQuota = user?.personalQuota || 0;
  const personalKey = user?.personalApiKey || `usr_${numericUserId}`;

  const statusCard = `💎 *INFORMASI KUOTA & PROFIL PRIBADI*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Nama Pengguna:* ${senderName}
🆔 *User ID:* \`${numericUserId}\`
🔒 *Status Akun:* ${user?.isVerified ? '✅ *Terverifikasi Resmi*' : '⚠️ *Belum Verifikasi*'}
📅 *Terdaftar Sejak:* ${formatWibDate(user?.firstSeen)}
━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *RINCIAN KUOTA PRIBADI:*
• *Sisa Kuota Aktif:* *${personalQuota}x Pencarian OSINT*
• *💼 Saldo Tabungan Kuota:* *${user?.referralVaultBalance || 0}x Kuota*
• *API Key Pribadi:* \`${personalKey}\`

🎁 *STATUS JATAH KLAIM:*
• *Kuota Pengguna Baru (${quotaCfg.newUserQuotaAmount}x):* ${user?.hasClaimedNewUserQuota ? '✅ Sudah Diklaim (1x seumur hidup)' : '🎁 *Belum Diklaim (Siap Ambil)*'}
• *Kuota Harian (${quotaCfg.dailyQuotaAmount}x):* ${user?.dailyQuotaLastClaimedDate === todayWib ? `✅ Sudah Diklaim (Reset: ${countdown.hours}j ${countdown.minutes}m lagi)` : '✨ *Tersedia Hari Ini!*'}
• *Referral & Tabungan:* ${(user?.referralVaultBalance || 0) > 0 ? `💼 *Ada ${(user?.referralVaultBalance || 0)}x Kuota di Tabungan (Siap Ditarik)*` : '🔗 Bagikan link untuk menambah tabungan'}
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 *Cara Menggunakan Kuota:*
Ketik perintah pencarian langsung:
• \`search: <target>\`
• \`/search <target>\`
• \`cari: <target>\`

Contoh: \`search: jokowi\` atau \`cari: slamet\`
_Kuota HANYA berkurang jika data target ditemukan di dataset!_`;

  const keyboard: any[][] = [
    [
      { text: '🎁 Ambil Kuota Gratis', callback_data: 'cmd_claim_menu' },
      { text: '👥 Tabungan & Referral', callback_data: 'cmd_referral' }
    ],
    [
      { text: '💎 Top Up API Key', callback_data: 'cmd_pricing' },
      { text: '📞 Hubungi Owner (@flood1233)', callback_data: 'cmd_owner' }
    ],
    [
      { text: '🏠 Menu Utama', callback_data: 'cmd_menu' }
    ]
  ];

  await sendTelegramMessage(targetReplyChatId, statusCard, { inline_keyboard: keyboard });
}

// =========================================================================
// REFERRAL & TABUNGAN KUOTA SYSTEM (INVITE & SAVINGS VAULT)
// =========================================================================

// 1. Send Referral & Menabung Dashboard
async function sendReferralDashboard(userId: number, replyChatId: number, senderName: string) {
  const numericUserId = Number(userId);
  const targetReplyChatId = Number(replyChatId);
  const user = botConfig.activeUsers.find(
    (u) => (u.userId && Number(u.userId) === numericUserId) || Number(u.chatId) === numericUserId
  );

  const botUser = currentBotInfo?.username || 'axxosintbot';
  const cleanBot = botUser.replace(/^@/, '');
  const referralLink = `https://t.me/${cleanBot}?start=ref_${numericUserId}`;

  const savedBalance = user?.referralVaultBalance || 0;
  const activeQuota = user?.personalQuota || 0;
  const totalWithdrawn = user?.totalReferralQuotaClaimed || 0;

  const myReferrals = (botConfig.referralRecords || []).filter(
    (r) => Number(r.inviterUserId) === numericUserId && r.status === 'confirmed'
  );
  const totalFriends = myReferrals.length;

  const refConfig = botConfig.referralConfig || DEFAULT_REFERRAL_CONFIG;
  const rewardAmount = refConfig.quotaPerInvite || 1;

  const dashboardText = `👥 *DASHBOARD REFERRAL & TABUNGAN KUOTA*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Pengguna:* ${senderName}
🆔 *User ID Anda:* \`${numericUserId}\`
💼 *Saldo Tabungan Kuota (Tersimpan):* *${savedBalance}x Kuota*
💎 *Saldo Kuota Pencarian Aktif:* *${activeQuota}x Kuota*
━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *STATISTIK UNDANGAN ANDA:*
• *Teman Terkonfirmasi Resmi (/start):* *${totalFriends} orang*
• *Hadiah per Undangan:* *+${rewardAmount} Kuota per Teman*
• *Total Kuota yang Sudah Ditarik:* *${totalWithdrawn}x Kuota*
━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *LINK REFERRAL UNIK ANDA:*
\`${referralLink}\`
_(Sentuh tautan di atas untuk menyalin langsung)_

💰 *TENTANG FITUR MENABUNG KUOTA:*
Setiap teman yang bergabung menggunakan link Anda dan mengirim */start* akan otomatis memberikan +${rewardAmount} kuota ke *Saldo Tabungan* Anda.
Anda bebas menabungkannya atau mencairkannya ke *Saldo Kuota Aktif* kapan saja!

👉 *PILIH OPSI PENARIKAN KUOTA TABUNGAN:*`;

  const keyboard: any[][] = [];

  if (savedBalance > 0) {
    keyboard.push([
      { text: `💰 Tarik Semua (${savedBalance}x Kuota)`, callback_data: 'ref_withdraw_all' }
    ]);

    const partialRow: any[] = [];
    if (savedBalance >= 1) partialRow.push({ text: '1x Kuota', callback_data: 'ref_withdraw_1' });
    if (savedBalance >= 2) partialRow.push({ text: '2x Kuota', callback_data: 'ref_withdraw_2' });
    if (savedBalance >= 5) partialRow.push({ text: '5x Kuota', callback_data: 'ref_withdraw_5' });
    if (partialRow.length > 0) {
      keyboard.push(partialRow);
    }
    keyboard.push([
      { text: '🔢 Tarik Jumlah Kustom (/tarik <jumlah>)', callback_data: 'ref_withdraw_custom' }
    ]);
  } else {
    keyboard.push([
      { text: '💼 Saldo Tabungan Kosong (0x)', callback_data: 'ref_withdraw_custom' }
    ]);
  }

  keyboard.push([
    { text: '🔗 Bagikan Link Undangan', callback_data: 'ref_share_info' },
    { text: `👥 Daftar Teman (${totalFriends})`, callback_data: 'ref_my_friends' }
  ]);

  keyboard.push([
    { text: '💎 Cek Kuota & Profil', callback_data: 'cmd_my_quota' },
    { text: '🏠 Menu Utama', callback_data: 'cmd_menu' }
  ]);

  await sendTelegramMessage(targetReplyChatId, dashboardText, { inline_keyboard: keyboard });
}

// 2. Handle Withdraw Referral Quota (from Savings Vault to Active Search Quota)
async function handleWithdrawReferralQuota(
  userId: number,
  replyChatId: number,
  senderName: string,
  amountToWithdraw?: number | 'all'
) {
  const numericUserId = Number(userId);
  const targetReplyChatId = Number(replyChatId);
  const lockKey = `withdraw_ref_${numericUserId}`;
  if (activeClaimLocks.has(lockKey)) {
    return;
  }
  activeClaimLocks.add(lockKey);

  try {
    const user = botConfig.activeUsers.find(
      (u) => (u.userId && Number(u.userId) === numericUserId) || Number(u.chatId) === numericUserId
    );
    if (!user) {
      await sendTelegramMessage(targetReplyChatId, '⚠️ Akun Anda belum terdaftar. Silakan kirim /start.');
      return;
    }

    const currentSavings = user.referralVaultBalance || 0;
    if (currentSavings <= 0) {
      await sendTelegramMessage(
        targetReplyChatId,
        `⚠️ *SALDO TABUNGAN KUOTA KOSONG (0x)*\n\nAnda belum memiliki saldo tabungan dari hasil undang teman.\n\n🔗 Bagikan link referral Anda untuk mulai mengumpulkan kuota tabungan!`,
        {
          inline_keyboard: [
            [{ text: '👥 Buka Menu Referral & Link', callback_data: 'cmd_referral' }],
            [{ text: '🎁 Ambil Kuota Harian Gratis', callback_data: 'cmd_claim_menu' }],
            [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
          ]
        }
      );
      return;
    }

    let withdrawAmount = 0;
    if (amountToWithdraw === 'all' || !amountToWithdraw) {
      withdrawAmount = currentSavings;
    } else {
      withdrawAmount = Math.floor(Number(amountToWithdraw));
    }

    if (withdrawAmount <= 0) {
      await sendTelegramMessage(
        targetReplyChatId,
        `❌ Jumlah penarikan harus minimal 1 kuota.\n\nContoh penggunaan:\n• \`/tarik 1\`\n• \`/tarik 5\`\n• \`/tarik semua\``
      );
      return;
    }

    if (withdrawAmount > currentSavings) {
      await sendTelegramMessage(
        targetReplyChatId,
        `⚠️ *SALDO TABUNGAN TIDAK CUKUP*\n\nAnda ingin menarik *${withdrawAmount}x kuota*, tetapi saldo tabungan Anda saat ini hanya *${currentSavings}x kuota*.\n\nKetik \`/tarik semua\` atau \`/tarik ${currentSavings}\` untuk menarik seluruh saldo Anda.`
      );
      return;
    }

    // Atomic Balance Transfer
    user.referralVaultBalance = currentSavings - withdrawAmount;
    user.personalQuota = (user.personalQuota || 0) + withdrawAmount;
    user.totalReferralQuotaClaimed = (user.totalReferralQuotaClaimed || 0) + withdrawAmount;
    syncUserApiKey(user);

    // Record Withdraw Transaction Log
    const wibTime = getFormattedWIB();
    const txId = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const txLog: ReferralWithdrawTransaction = {
      id: txId,
      userId: numericUserId,
      userName: senderName,
      amount: withdrawAmount,
      previousBalance: currentSavings,
      newBalance: user.referralVaultBalance,
      newPersonalQuota: user.personalQuota,
      timestamp: new Date().toISOString(),
      formattedWib: wibTime.fullStr
    };

    if (!Array.isArray(botConfig.referralWithdrawLogs)) {
      botConfig.referralWithdrawLogs = [];
    }
    botConfig.referralWithdrawLogs.unshift(txLog);
    if (botConfig.referralWithdrawLogs.length > 200) {
      botConfig.referralWithdrawLogs.pop();
    }

    saveReferralData();
    saveBotConfig();

    addLog(
      'system',
      `Pengguna ${numericUserId} (${senderName}) mencairkan ${withdrawAmount}x kuota tabungan referral. Sisa tabungan: ${user.referralVaultBalance}x, Kuota aktif: ${user.personalQuota}x`
    );

    const successCard = `🎉 *PENARIKAN TABUNGAN KUOTA BERHASIL!*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Pengguna:* ${senderName}
🆔 *User ID:* \`${numericUserId}\`
🕒 *Waktu Transaksi:* ${wibTime.fullStr}
━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Jumlah Kuota Ditarik:* *+${withdrawAmount}x Kuota*
💼 *Sisa Saldo di Tabungan:* *${user.referralVaultBalance}x Kuota*
💎 *Saldo Kuota Pencarian Aktif Baru:* *${user.personalQuota}x Pencarian*
🔑 *API Key Pribadi:* \`${user.personalApiKey}\`
━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ *KUOTA SIAP DIGUNAKAN!*
Anda dapat langsung mencari data intelijen sekarang:
\`search: <target>\` atau \`/search <target>\`

_Contoh:_ \`search: jokowi\` atau \`cari: slamet\``;

    await sendTelegramMessage(targetReplyChatId, successCard, {
      inline_keyboard: [
        [{ text: '🔍 Mulai Cari OSINT', callback_data: 'cmd_osint' }],
        [{ text: '💼 Buka Dashboard Tabungan', callback_data: 'cmd_referral' }],
        [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
  } finally {
    activeClaimLocks.delete(lockKey);
  }
}

// 3. Send List of Friends Referred
async function sendReferralFriendsList(userId: number, replyChatId: number, senderName: string) {
  const numericUserId = Number(userId);
  const myFriends = (botConfig.referralRecords || []).filter(
    (r) => Number(r.inviterUserId) === numericUserId && r.status === 'confirmed'
  );

  if (myFriends.length === 0) {
    await sendTelegramMessage(
      replyChatId,
      `👥 *DAFTAR TEMAN DIUNDANG (0 ORANG)*\n\nAnda belum memiliki teman yang terdaftar melalui link referral Anda.\n\n🔗 Bagikan link Anda sekarang untuk mendapatkan kuota gratis!`,
      {
        inline_keyboard: [
          [{ text: '🔗 Ambil Link Referral Saya', callback_data: 'ref_share_info' }],
          [{ text: '💼 Buka Tabungan Kuota', callback_data: 'cmd_referral' }]
        ]
      }
    );
    return;
  }

  const listStr = myFriends
    .slice(0, 20)
    .map((f, i) => {
      const d = new Date(f.referredAt).toLocaleDateString('id-ID');
      const uTag = f.referredUsername ? `@${f.referredUsername}` : `ID ${f.referredUserId}`;
      return `${i + 1}. *${f.referredName}* (${uTag})\n   • Status: ✅ Terdaftar Resmi | 📅 ${d} | +${f.rewardQuota} Kuota`;
    })
    .join('\n\n');

  const friendsCard = `👥 *DAFTAR TEMAN RESMI TERDAFTAR (${myFriends.length} ORANG)*
━━━━━━━━━━━━━━━━━━━━━━━━━
${listStr}
${myFriends.length > 20 ? `\n_...dan ${myFriends.length - 20} teman lainnya._` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Semua reward kuota otomatis masuk ke Saldo Tabungan Anda._`;

  await sendTelegramMessage(replyChatId, friendsCard, {
    inline_keyboard: [
      [{ text: '💼 Buka Tabungan Kuota', callback_data: 'cmd_referral' }],
      [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
    ]
  });
}

// 4. Send Share Card with Copyable Referral Message
async function sendReferralShareCard(userId: number, replyChatId: number, senderName: string) {
  const botUser = currentBotInfo?.username || 'axxosintbot';
  const cleanBot = botUser.replace(/^@/, '');
  const refLink = `https://t.me/${cleanBot}?start=ref_${userId}`;

  const shareCard = `🔗 *BAGIKAN LINK REFERRAL ANDA*
━━━━━━━━━━━━━━━━━━━━━━━━━
Halo *${senderName}*! Salin pesan undangan di bawah ini dan bagikan ke teman, grup, atau channel Telegram Anda:

\`\`\`
Halo! Gunakan bot intelijen OSINT & profiling otomatis axxosintbot di Telegram. 
Dapatkan kuota pencarian data gratis dengan mendaftar melalui tautan ini:
${refLink}
\`\`\`

🎁 *Hadiah Untuk Anda:*
Setiap teman yang mengklik link dan mengirim */start* akan memberikan Anda *+1 Kuota Tabungan* yang bisa dicairkan kapan saja!`;

  await sendTelegramMessage(replyChatId, shareCard, {
    inline_keyboard: [
      [{ text: '💼 Buka Tabungan Kuota', callback_data: 'cmd_referral' }],
      [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
    ]
  });
}

// =========================================================================
// CONTENT MODERATION ENGINE: AUTO-DELETE ILLEGAL MESSAGES & DETAILED EXPLANATION
// =========================================================================

const MODERATION_GAMBLING_KEYWORDS = [
  'slot', 'sl0t', 'judol', 'judi online', 'judi bola', 'gacor', 'scatter', 'maxwin',
  'pragmatic', 'zeus slot', 'kakek zeus', 'olympus', 'sweet bonanza', 'mahjong ways',
  'bandar togel', 'togel online', 'toto gelap', 'togel sgp', 'togel hk', 'toto macau',
  'casino online', 'live casino', 'sbobet', 'agen judi', 'daftar slot', 'link slot',
  'link gacor', 'situs slot', 'situs judi', 'depo pulsa', 'depo 10k', 'depo 25k', 'depo 50k',
  'wd kilat', 'freebet', 'bocoran slot', 'pola gacor', 'jackpot slot', 'slot88',
  'slot777', 'rtp slot', 'rtp live', 'rolet online', 'baccarat online', 'domino qiu',
  'judi slot', 'agen slot', 'situs gacor', 'menang slot', 'gates of olympus', 'starlight princess',
  'spxslot', 'mposlot', 'hoki slot', 'sensational slot', 'pola slot', 'cheat slot', 'scatter hitam',
  'chip domino', 'chip higgs', 'anti rungkat', 'anti rungkad', 'garansi kekalahan', 'bonus new member',
  'gacor88', 'zeus88', 'mahjong88', 'slot dana', 'pola petir', 'depo receh', 'link alternatif slot'
];

const MODERATION_ADULT_KEYWORDS = [
  'bokep', 'b0kep', 'porn', 'porno', 'pornografi', '18+', 'vcs', 'open bo',
  'bo cod', 'av sub indo', 'video viral bokep', 'desah', 'sange', 'sangean', 'bugil',
  'toket', 'croot', 'crot', 'prostitusi', 'becek', 'mesum', 'seks', 'sex gratis',
  'masturbasi', 'ngentot', 'memek', 'kontol', 'jav sub', 'onlyfans bocor',
  'video mesum', 'doodstream', 'terabox bokep', 'vcs murah', 'pepek', 'ngocok',
  'lonte', 'perek', 'tetek', 'colmek', 'colik', 'hentai', 'bokep viral', 'lendir',
  'pap tt', 'pap bugil', 'pap toket', 'pap memek', 'pap nude', 'bacol', 'bahan coli',
  'cewek sange', 'michat bo', 'bo include', 'cs mesum', 'videy', 'lulustream', 'gofile bokep',
  'dildo', 'kondom', 'blowjob', 'ngocok kontol', 'hisap toket', 'remas toket', 'sex chat',
  'pedofil', 'child porn', 'lolicon', 'shotacon', 'incest', 'ngaceng', 'cairan mani', 'sperma',
  'psk', 'mucikari', 'germo', 'tante girang', 'pelacur', 'sundal', 'jablay', 'kimcil', 'cabe cabean',
  'skandal selebgram', 'kebaya merah', 'chindo viral', 'video syur', 'doodla', 'doodli', 'terabox'
];

const MODERATION_DRUGS_KEYWORDS = [
  'narkoba', 'sabu', 'sabu-sabu', 'ekstasi', 'inex', 'inek', 'ganja',
  'tembakau gorila', 'tembakau sintetis', 'sinte', 'pil koplo', 'tramadol',
  'trihex', 'alprazolam', 'dumolid', 'kokain', 'heroin', 'psikotropika',
  'jual sabu', 'beli ganja', 'bong sabu', 'shabu', 'cimahi sinte', 'obat keras daftar g',
  'narkotika', 'pil anjing', 'methamphetamine', 'amfetamin', 'hexymer', 'riklona',
  'calmlet', 'zypraz', 'putaw', 'bong kaca', 'pahe sabu'
];

const MODERATION_FRAUD_KEYWORDS = [
  'pinjol ilegal', 'pengganda uang', 'pesugihan uang gaib', 'dana kaget palsu',
  'jasa hack saldo dana', 'apk pembobol rekening', 'saldo dana gratis tipu',
  'jual beli rekening', 'rekening penampung', 'jual akun e-wallet bodong', 'arisan bodong',
  'investasi bodong', 'kloning atm', 'jasa gestun ilegal', 'joki pinjol', 'surat tilang apk',
  'undangan pernikahan apk', 'jual uang palsu', 'upal'
];

const MODERATION_WEAPONS_KEYWORDS = [
  'jual senpi', 'senjata api rakitan', 'jual celurit begal', 'bom ikan',
  'bahan peledak rakitan', 'jual pistol rakitan', 'senjata tajam tawuran', 'celurit corbek'
];

interface ModerationCheckResult {
  isBanned: boolean;
  category?: string;
  matchedKeyword?: string;
  explanation?: string;
}

function checkMessageModeration(rawText: string): ModerationCheckResult {
  const cfg = botConfig.moderationConfig || DEFAULT_MODERATION_CONFIG;
  if (!cfg.enabled) {
    return { isBanned: false };
  }

  const text = (rawText || '').trim();
  if (!text) return { isBanned: false };

  const lower = text.toLowerCase();
  // Normalize leetspeak
  const normalized = lower
    .replace(/[0o]/g, 'o')
    .replace(/[1l|!]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a');

  // Collapsed representation to defeat spaced-out evasion (e.g. "s l o t", "b.o.k.e.p", "v-c-s")
  const collapsed = normalized.replace(/[\s\-_.,/\\*#+@!~|]+/g, '');

  // 1. General Whitelist check
  if (Array.isArray(cfg.whitelistKeywords) && cfg.whitelistKeywords.length > 0) {
    for (const wl of cfg.whitelistKeywords) {
      const wClean = wl.trim().toLowerCase();
      if (wClean && (lower.includes(wClean) || normalized.includes(wClean) || collapsed.includes(wClean.replace(/\s+/g, '')))) {
        return { isBanned: false };
      }
    }
  }

  // 2. Cyber & OSINT Special Whitelist:
  // "tetapi yang berbau Cyber mau legal ilegal itu baru gapapa"
  if (cfg.allowCyberAndOsint !== false) {
    const cyberTerms = cfg.cyberWhitelistKeywords || DEFAULT_MODERATION_CONFIG.cyberWhitelistKeywords;
    const hasCyberContext = cyberTerms.some((ct) => {
      const term = ct.toLowerCase().trim();
      return term && (lower.includes(term) || normalized.includes(term));
    });

    if (hasCyberContext) {
      // If the message is talking about Cyber / OSINT / security / pentest / breach / leak,
      // it is EXPLICITLY ALLOWED!
      // Only block if it is explicitly an aggressive commercial slot/porn/drug spam advertisement
      const isBlatantCommercialSpam =
        /(link\s*slot|daftar\s*slot|depo\s*pulsa|open\s*bo|vcs\s*real|jual\s*sabu)/i.test(lower) ||
        /(linkslot|daftarslot|depopulsa|openbo|vcsreal|jualsabu)/i.test(collapsed);
      if (!isBlatantCommercialSpam) {
        return { isBanned: false };
      }
    }
  }

  // 3. Category Checks
  // A. Judi Online & Slot
  if (cfg.blockGamblingSlot !== false) {
    for (const kw of MODERATION_GAMBLING_KEYWORDS) {
      const kwCollapsed = kw.replace(/[\s\-_.]+/g, '');
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[^a-zA-Z0-9])`, 'i');
      if (regex.test(lower) || lower.includes(kw) || normalized.includes(kw) || (kwCollapsed.length >= 4 && collapsed.includes(kwCollapsed))) {
        return {
          isBanned: true,
          category: '🎰 Judi Online / Slot / Kasino / Togel',
          matchedKeyword: kw,
          explanation: 'Pesan mengandung promosi, tautan, atau istilah perjudian online / slot yang dilarang undang-undang serta aturan ruang obrolan.'
        };
      }
    }
  }

  // B. Konten Dewasa & 18+
  if (cfg.blockAdult18Plus !== false) {
    for (const kw of MODERATION_ADULT_KEYWORDS) {
      const kwCollapsed = kw.replace(/[\s\-_.]+/g, '');
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[^a-zA-Z0-9])`, 'i');
      if (regex.test(lower) || lower.includes(kw) || normalized.includes(kw) || (kwCollapsed.length >= 3 && collapsed.includes(kwCollapsed))) {
        return {
          isBanned: true,
          category: '🔞 Konten Dewasa / 18+ / Pornografi / VCS',
          matchedKeyword: kw,
          explanation: 'Pesan mengandung materi pornografi, ketidaksenonohan, VCS, prostitusi, atau materi 18+ terlarang.'
        };
      }
    }
  }

  // C. Narkoba & Zat/Obat Terlarang
  if (cfg.blockDrugs !== false) {
    for (const kw of MODERATION_DRUGS_KEYWORDS) {
      const kwCollapsed = kw.replace(/[\s\-_.]+/g, '');
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[^a-zA-Z0-9])`, 'i');
      if (regex.test(lower) || lower.includes(kw) || normalized.includes(kw) || (kwCollapsed.length >= 4 && collapsed.includes(kwCollapsed))) {
        return {
          isBanned: true,
          category: '💊 Narkoba & Zat / Obat Terlarang',
          matchedKeyword: kw,
          explanation: 'Pesan mengandung indikasi penawaran, jual-beli, atau promosi narkotika dan obat-obatan terlarang.'
        };
      }
    }
  }

  // D. Penipuan Finansial & Phishing
  if (cfg.blockFraudScam !== false) {
    for (const kw of MODERATION_FRAUD_KEYWORDS) {
      const kwCollapsed = kw.replace(/[\s\-_.]+/g, '');
      if (lower.includes(kw) || normalized.includes(kw) || (kwCollapsed.length >= 6 && collapsed.includes(kwCollapsed))) {
        return {
          isBanned: true,
          category: '💳 Penipuan Finansial / Phishing / Scam',
          matchedKeyword: kw,
          explanation: 'Pesan mengandung modus penipuan keuangan, pinjol bodong ilegal, atau tautan phishing perbankan.'
        };
      }
    }
  }

  // E. Senjata & Bahan Peledak
  if (cfg.blockWeaponsExplosives !== false) {
    for (const kw of MODERATION_WEAPONS_KEYWORDS) {
      const kwCollapsed = kw.replace(/[\s\-_.]+/g, '');
      if (lower.includes(kw) || normalized.includes(kw) || (kwCollapsed.length >= 6 && collapsed.includes(kwCollapsed))) {
        return {
          isBanned: true,
          category: '💣 Senjata Ilegal & Bahan Berbahaya',
          matchedKeyword: kw,
          explanation: 'Pesan memuat transaksi senjata api rakitan atau bahan peledak ilegal yang mengancam keselamatan.'
        };
      }
    }
  }

  // F. Custom Banned Keywords
  if (Array.isArray(cfg.customBannedKeywords)) {
    for (const kw of cfg.customBannedKeywords) {
      const cleanKw = kw.trim().toLowerCase();
      const kwCollapsed = cleanKw.replace(/[\s\-_.]+/g, '');
      if (cleanKw && (lower.includes(cleanKw) || normalized.includes(cleanKw) || (kwCollapsed.length >= 3 && collapsed.includes(kwCollapsed)))) {
        return {
          isBanned: true,
          category: '🚫 Kata Kunci Terlarang (Kustom Pengelola)',
          matchedKeyword: kw,
          explanation: 'Pesan memuat kata kunci terlarang khusus yang telah diatur oleh pengelola bot.'
        };
      }
    }
  }

  return { isBanned: false };
}

async function handleBannedMessage(message: any, checkResult: ModerationCheckResult) {
  const chat = message.chat;
  const chatId = chat.id;
  const from = message.from || chat;
  const messageId = message.message_id;
  const senderName = [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || 'Pengguna';
  const usernameTag = from.username ? `@${from.username}` : '-';
  const rawText = (message.text || message.caption || '').trim();
  const isGroup = chat.type === 'group' || chat.type === 'supergroup';
  const wibTime = getFormattedWIB().fullStr;

  // 1. Delete the message via Telegram API
  let deleteSuccess = false;
  let deleteError: string | undefined;

  try {
    const delRes = await callTelegramApi(
      botConfig.token,
      'deleteMessage',
      { chat_id: chatId, message_id: messageId },
      8000
    );
    if (delRes && delRes.ok) {
      deleteSuccess = true;
    } else {
      deleteError = delRes?.description || 'Gagal menghapus pesan (Pastikan bot adalah Admin dengan izin Delete Messages).';
    }
  } catch (err: any) {
    deleteError = err.message;
  }

  addLog(
    'system',
    `[Auto-Moderasi] Pesan dari ${senderName} (${usernameTag}) ${deleteSuccess ? 'berhasil dihapus' : 'gagal dihapus'}. Kategori: ${checkResult.category} | Kata: "${checkResult.matchedKeyword}"`,
    chatId
  );

  // 2. Prepare Detailed Explanation & Copied Original Message
  const safeQuotedMessage = rawText.length > 500 ? rawText.substring(0, 500) + '... (dipersingkat)' : rawText;

  const warningMessage = `🚫 *PESAN OTOMATIS DIHAPUS OLEH SISTEM KEAMANAN*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Pengirim:* ${senderName} (${usernameTag})
🆔 *User ID:* \`${from.id}\`
🕒 *Waktu Tindakan:* ${wibTime}
🏛️ *Ruang Obrolan:* ${chat.title ? `*${chat.title}*` : 'Chat Pribadi'}

⚠️ *DETAIL KESALAHAN & PELANGGARAN:*
• *Kategori Terlarang:* ${checkResult.category}
• *Kata Kunci Terdeteksi:* \`${checkResult.matchedKeyword}\`
• *Keterangan Aturan:* ${checkResult.explanation}

📝 *SALINAN PESAN ASLI PENGIRIM:*
\`\`\`
${safeQuotedMessage}
\`\`\`

🛡️ *KEBIJAKAN KETERTIBAN SISTEM:*
Bot *axxosintbot* menerapkan penyaringan otomatis tanpa kompromi terhadap:
1. 🎰 *Judi Online, Slot Gacor, Kasino & Togel*
2. 🔞 *Konten Dewasa, Bokep, VCS & Prostitusi*
3. 💊 *Narkoba, Psikotropika & Zat/Obat Terlarang*
4. 💳 *Penipuan Finansial, Phishing & Scam Rekening*

ℹ️ *PENGECUALIAN RESMI (CYBER & OSINT):*
Seluruh topik edukasi, investigasi, analisis, dan diskusi seputar *Cyber Security, OSINT, Exploit, Penetration Testing, Kebocoran Data (Data Leak) & Forensik* tetap *100% BEBAS & DIPERBOLEHKAN*.
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Pesan pelanggaran telah dimusnahkan demi kenyamanan dan keamanan bersama._`;

  // 3. Send Explanation Message
  const cfg = botConfig.moderationConfig || DEFAULT_MODERATION_CONFIG;
  if (cfg.sendExplanationMessage !== false) {
    const sentMsg = await sendTelegramMessage(chatId, warningMessage);
    if (sentMsg && sentMsg.message_id && cfg.autoDeleteExplanationSeconds && cfg.autoDeleteExplanationSeconds > 0) {
      setTimeout(async () => {
        try {
          await callTelegramApi(
            botConfig.token,
            'deleteMessage',
            { chat_id: chatId, message_id: sentMsg.message_id },
            5000
          );
        } catch {}
      }, cfg.autoDeleteExplanationSeconds * 1000);
    }
  }

  // 4. Record Incident in Recent Moderation Incidents
  if (!botConfig.moderationConfig) {
    botConfig.moderationConfig = { ...DEFAULT_MODERATION_CONFIG };
  }
  if (!Array.isArray(botConfig.moderationConfig.recentIncidents)) {
    botConfig.moderationConfig.recentIncidents = [];
  }
  const incident: ModerationIncident = {
    id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    chatId: Number(chatId),
    chatTitle: isGroup ? chat.title : undefined,
    userId: Number(from.id),
    userName: senderName,
    usernameTag,
    category: checkResult.category || 'Konten Terlarang',
    matchedKeyword: checkResult.matchedKeyword || '-',
    originalMessage: rawText,
    timestamp: new Date().toISOString(),
    actionTaken: deleteSuccess ? 'deleted_and_warned' : 'delete_failed',
    errorMessage: deleteError
  };
  botConfig.moderationConfig.recentIncidents.unshift(incident);
  if (botConfig.moderationConfig.recentIncidents.length > 60) {
    botConfig.moderationConfig.recentIncidents.pop();
  }
  saveBotConfig();

  // Record in Live Message Traffic Stream as Filtered
  recordMessageTraffic({
    direction: 'incoming',
    chatId,
    chatType: isGroup ? 'group' : 'private',
    chatTitle: isGroup ? chat.title : undefined,
    userId: Number(from.id),
    userName: senderName,
    usernameTag,
    text: rawText,
    status: 'filtered',
    filterReason: `${checkResult.category} (${checkResult.matchedKeyword})`
  });
}

// Handle Incoming Telegram Message
async function handleIncomingMessage(message: any, sourceBot?: MultiBotInstance) {
  if (!message || !message.chat) return;

  const chat = message.chat;
  const from = message.from || chat;

  // 1. Anti-Loop & Anti-Spam: Ignore other automated bots and channel broadcasts
  if (from.is_bot) return;
  if (chat.type === 'channel') return;

  const chatId = chat.id;
  const isGroup = chat.type === 'group' || chat.type === 'supergroup';
  const senderName = [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || 'Pengguna';
  const usernameTag = from.username ? `@${from.username}` : '-';

  // 2. Anti-Spam: Deduplicate Telegram message IDs (prevent re-delivered updates from triggering duplicate replies)
  const msgDedupKey = `${chatId}_${message.message_id}`;
  if (processedMessageIds.has(msgDedupKey)) {
    return;
  }
  processedMessageIds.add(msgDedupKey);
  if (processedMessageIds.size > 3000) {
    const firstKey = processedMessageIds.values().next().value;
    if (firstKey) processedMessageIds.delete(firstKey);
  }

  // 3. Group Handling & Permissions
  if (isGroup) {
    updateKnownGroup(chat);

    // If bot is configured to NOT allow group operation
    if (botConfig.groupConfig && !botConfig.groupConfig.allowGroups) {
      return;
    }

    // Check if group is blacklisted
    if (botConfig.groupConfig?.blockedGroupIds?.includes(Number(chatId))) {
      return;
    }

    // Check if group whitelist is enforced
    if (
      botConfig.groupConfig?.allowedGroupIds &&
      botConfig.groupConfig.allowedGroupIds.length > 0 &&
      !botConfig.groupConfig.allowedGroupIds.includes(Number(chatId))
    ) {
      return;
    }
  }

  const rawText = (message.text || message.caption || '').trim();
  botConfig.stats.messagesReceived += 1;
  const currentUser = registerOrUpdateUser(from, chat);

  // Record into Live Message Traffic Stream
  recordMessageTraffic({
    botId: sourceBot?.id || 'primary',
    botUsername: sourceBot?.botInfo?.username || currentBotInfo?.username || 'axxosintbot',
    botName: sourceBot?.botInfo?.first_name || currentBotInfo?.first_name || 'Bot Utama',
    isPrimaryBot: !sourceBot,
    direction: 'incoming',
    chatId,
    chatType: isGroup ? 'group' : 'private',
    chatTitle: isGroup ? chat.title : undefined,
    userId: Number(from.id),
    userName: senderName,
    usernameTag,
    text: rawText || (message.photo ? '[Foto]' : message.document ? '[Dokumen]' : '[Media]'),
    status: 'delivered'
  });

  // 4. Content Moderation & Auto-Delete Illegal Content (Slots, 18+, Drugs, Scam, etc.)
  if (rawText) {
    const moderationResult = checkMessageModeration(rawText);
    if (moderationResult.isBanned) {
      const shouldDelete =
        (isGroup && botConfig.moderationConfig?.deleteInGroups !== false) ||
        (!isGroup && botConfig.moderationConfig?.deleteInPrivate !== false);

      if (shouldDelete) {
        await handleBannedMessage(message, moderationResult);
        return; // Stop processing: Message deleted & detailed warning sent!
      }
    }
  }

  if (!rawText) {
    if (message.photo || message.document || message.sticker) {
      if (!isGroup) {
        await sendTelegramMessage(
          chatId,
          `📥 Berkas media diterima dari *${senderName}*.\nKetik /id untuk cek Chat ID atau /menu untuk membuka opsi.`
        );
      }
    }
    return;
  }

  // 4. Group Command Normalization & Bot Tag Filtering
  const botUsername = (sourceBot?.botInfo?.username || currentBotInfo?.username || '').toLowerCase();
  let text = rawText;
  let isExplicitMention = false;

  if (text.startsWith('/')) {
    const cmdMatch = text.match(/^\/([a-zA-Z0-9_]+)@([a-zA-Z0-9_]+)/i);
    if (cmdMatch) {
      const targetBot = cmdMatch[2].toLowerCase();
      if (botUsername && targetBot !== botUsername) {
        // Command is targeted at another bot in the group, do NOT respond!
        return;
      }
      text = '/' + cmdMatch[1] + text.substring(cmdMatch[0].length);
    }
  }

  if (botUsername && text.toLowerCase().includes(`@${botUsername}`)) {
    isExplicitMention = true;
    text = text.replace(new RegExp(`@${botUsername}\\b`, 'gi'), '').trim();
  }

  const lowerText = text.toLowerCase();

  // 5. Anti-Flood / Anti-Spam Rate Limiter (Active for both Private & Groups)
  const isCommandLike =
    text.startsWith('/') ||
    lowerText.startsWith('search:') ||
    lowerText.startsWith('search ') ||
    lowerText.startsWith('osint:') ||
    lowerText.startsWith('cari:') ||
    lowerText.startsWith('cari ') ||
    lowerText.startsWith('cek:') ||
    lowerText.startsWith('cek ') ||
    lowerText.startsWith('track:') ||
    lowerText.startsWith('track ') ||
    lowerText.startsWith('api ') ||
    lowerText.startsWith('ax0895') ||
    isExplicitMention;

  const isAntiFloodOn = botConfig.groupConfig?.enableAntiFlood !== false;
  if (isAntiFloodOn) {
    const floodKey = `user_${from.id}`;
    const nowMs = Date.now();
    const cooldownMs = Math.max(1, botConfig.groupConfig?.antiFloodCooldownSeconds || 3) * 1000;
    const lastAction = lastUserActionTimestamp.get(floodKey) || 0;

    // Adaptive Security Burst Defense (Catches automated burst scraping loops)
    if (isCommandLike) {
      const burstCheck = checkAdaptiveSecurityBurst(from.id, chatId, senderName);
      if (burstCheck.isBlocked && burstCheck.message) {
        await sendTelegramMessage(chatId, burstCheck.message);
        return;
      }
    }

    if (nowMs - lastAction < cooldownMs) {
      const lastWarn = floodWarningSentTimestamps.get(floodKey) || 0;
      if (nowMs - lastWarn > 6000) {
        floodWarningSentTimestamps.set(floodKey, nowMs);
        await sendTelegramMessage(
          chatId,
          `⏳ *Anti-Flood & Anti-Spam Protection*\nMohon tunggu *${botConfig.groupConfig?.antiFloodCooldownSeconds || 3} detik* sebelum mengirim pesan atau perintah berikutnya.`
        );
      }
      return;
    }
    lastUserActionTimestamp.set(floodKey, nowMs);
  }

  // 6. Group Admin Restriction Check
  if (isGroup && botConfig.groupConfig?.groupAdminOnly && isCommandLike) {
    const isAdmin = await isTelegramGroupAdmin(botConfig.token, chatId, from.id);
    if (!isAdmin) {
      await sendTelegramMessage(
        chatId,
        `⚠️ *Izin Ditolak:* Perintah bot di grup ini hanya diizinkan untuk Admin / Pemilik Grup.`
      );
      return;
    }
  }

  addLog('incoming', `"${text}"`, chatId, `${senderName} (${usernameTag})`);
  const wibTime = getFormattedWIB();
  const pricing = getPricingData(currentUser.languageCode);

  // Check for Referral Link Parameter (/start ref_12345 or /start 12345)
  let referralInviterId: number | null = null;
  const startMatch = text.match(/^\/start(?:@\w+)?(?:\s+(.*))?$/i);
  if (startMatch && startMatch[1]) {
    const rawPayload = startMatch[1].trim();
    const idMatch = rawPayload.match(/^(?:ref_)?([0-9]{5,15})/i);
    if (idMatch) {
      referralInviterId = Number(idMatch[1]);
    }
  }

  let referredInviterName: string | null = null;
  if (
    referralInviterId &&
    referralInviterId !== Number(from.id) &&
    !currentUser.referredByUserId &&
    botConfig.referralConfig?.enabled !== false
  ) {
    const alreadyReferred = (botConfig.referralRecords || []).some(
      (r) => Number(r.referredUserId) === Number(from.id)
    );

    if (!alreadyReferred) {
      const inviterUser = botConfig.activeUsers.find(
        (u) => Number(u.userId || u.chatId) === referralInviterId
      );

      const inviterName = inviterUser
        ? [inviterUser.firstName, inviterUser.lastName].filter(Boolean).join(' ') || inviterUser.username || `User ${referralInviterId}`
        : `User ${referralInviterId}`;

      referredInviterName = inviterName;
      const rewardQuota = botConfig.referralConfig?.quotaPerInvite || 1;

      currentUser.referredByUserId = referralInviterId;
      currentUser.referredAt = new Date().toISOString();
      currentUser.isVerified = true;
      currentUser.verifiedAt = new Date().toISOString();

      const refRecord: ReferralRecord = {
        id: `ref_${Date.now()}_${from.id}`,
        inviterUserId: referralInviterId,
        inviterUsername: inviterUser?.username,
        inviterName: inviterName,
        referredUserId: Number(from.id),
        referredUsername: from.username,
        referredName: senderName,
        referredAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        status: 'confirmed',
        rewardQuota: rewardQuota
      };

      if (!Array.isArray(botConfig.referralRecords)) {
        botConfig.referralRecords = [];
      }
      botConfig.referralRecords.unshift(refRecord);

      if (inviterUser) {
        inviterUser.referralVaultBalance = (inviterUser.referralVaultBalance || 0) + rewardQuota;
        inviterUser.totalReferralsCount = (inviterUser.totalReferralsCount || 0) + 1;
      }

      saveReferralData();
      saveBotConfig();

      addLog(
        'system',
        `🎉 Referral Resmi Terdaftar: ${senderName} (${from.id}) terdaftar via ${inviterName} (${referralInviterId}). +${rewardQuota} Kuota ditambahkan ke Tabungan inviter.`,
        chatId
      );

      // Real-time Telegram notification to inviter!
      if (botConfig.referralConfig?.notifyInviterOnRegister !== false && inviterUser) {
        const inviterChatId = inviterUser.chatId || inviterUser.userId;
        const inviterNotify = `🎉 *SELAMAT! TEMAN ANDA RESMI TERDAFTAR!*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Teman Baru:* ${senderName} (${usernameTag})
🆔 *User ID Teman:* \`${from.id}\`
🕒 *Waktu Pendaftaran:* ${wibTime.fullStr}
🎁 *Hadiah Referral:* *+${rewardQuota} Kuota OSINT*

💼 *Saldo Tabungan Kuota Anda Sekarang:* *${inviterUser.referralVaultBalance}x Kuota*
*(Tersimpan di Tabungan & Siap Ditarik Kapan Saja)*

💡 _Ketik /tabungan atau /tarik untuk mencairkan saldo tabungan ke kuota pencarian aktif Anda!_`;

        sendTelegramMessage(inviterChatId, inviterNotify, {
          inline_keyboard: [
            [{ text: '💼 Buka Tabungan Kuota', callback_data: 'cmd_referral' }],
            [{ text: '💰 Tarik Semua Kuota', callback_data: 'ref_withdraw_all' }]
          ]
        }).catch(() => {});
      }
    }
  }

  // =========================================================================
  // =========================================================================
  // 1. STRICT SECRET OWNER COMMAND & MULTI-BOT CONTROLS
  // Supports default passkey "ax0895", custom passkey configured on website,
  // bot-specific secret passkeys, and direct admin commands:
  // /addbot, /delbot, /setexpiry, /listbot, /multibot, /addowner, /delowner, /listowner
  // =========================================================================
  const configuredOwnerPasskey = (botConfig.ownerWebsitePasskey || 'ax0895').trim().toLowerCase();
  const botSpecificPasskey = (sourceBot?.secretCode || configuredOwnerPasskey || 'ax0895').trim().toLowerCase();

  const isOwnerSecretTrigger =
    lowerText === 'ax0895' ||
    lowerText.startsWith('ax0895 ') ||
    lowerText === '/ax0895' ||
    lowerText.startsWith('/ax0895 ') ||
    lowerText === configuredOwnerPasskey ||
    lowerText.startsWith(`${configuredOwnerPasskey} `) ||
    lowerText === `/${configuredOwnerPasskey}` ||
    lowerText.startsWith(`/${configuredOwnerPasskey} `) ||
    (botSpecificPasskey && (
      lowerText === botSpecificPasskey ||
      lowerText.startsWith(`${botSpecificPasskey} `) ||
      lowerText === `/${botSpecificPasskey}` ||
      lowerText.startsWith(`/${botSpecificPasskey} `)
    ));

  const isDirectOwnerSlashCmd =
    lowerText.startsWith('/addbot') ||
    lowerText.startsWith('/delbot') ||
    lowerText.startsWith('/hapusbot') ||
    lowerText.startsWith('/setexpiry') ||
    lowerText === '/listbot' ||
    lowerText.startsWith('/listbot ') ||
    lowerText === '/multibot' ||
    lowerText.startsWith('/multibot ') ||
    lowerText.startsWith('/addowner') ||
    lowerText.startsWith('/cloneowner') ||
    lowerText.startsWith('/tambahowner') ||
    lowerText.startsWith('/delowner') ||
    lowerText.startsWith('/hapusowner') ||
    lowerText === '/listowner' ||
    lowerText.startsWith('/listowner ') ||
    lowerText === '/owners';

  if (isOwnerSecretTrigger || isDirectOwnerSlashCmd) {
    // 🛡️ STRICT OWNER SECURITY GATEWAY
    // Only verified Primary Owner, approved Clone Owner, or Master Owner can access!
    const auth = isUserAuthorizedOwner(from, sourceBot);
    const attemptKey = `${from.id}_${sourceBot?.id || 'master'}`;

    if (!auth.authorized) {
      const now = Date.now();
      const existing = unauthorizedOwnerAttempts.get(attemptKey);
      let attemptCount = 1;
      if (existing && now - existing.lastAttempt < 15 * 60 * 1000) {
        attemptCount = existing.count + 1;
      }
      unauthorizedOwnerAttempts.set(attemptKey, { count: attemptCount, lastAttempt: now });

      if (attemptCount < 3) {
        // 🎭 STEALTH MODE (Penyamaran): Pada percobaan ke-1 dan ke-2, jangan langsung keluarkan peringatan!
        // Berikan respon normal seperti menu /start agar orang asing tidak tahu ini kode rahasia owner.
        addLog(
          'system',
          `🎭 [PENYAMARAN OWNER - Percobaan ${attemptCount}/3] Pengguna ${from.id} (@${from.username || '-'}) memicu kode owner, disamarkan sebagai menu /start.`,
          chatId,
          senderName
        );
        const welcomeText = formatBotWelcomeMessage(sourceBot, currentUser, senderName, chatId, referredInviterName);
        await sendTelegramMessage(chatId, welcomeText, getMainInlineMenu(botConfig.osintConfig.enabled, sourceBot));
        return;
      }

      // 🚨 Percobaan ke-3 atau lebih: Tampilkan peringatan keamanan tingkat tinggi!
      addLog(
        'warn',
        `🚨 [AKSES OWNER DITOLAK - Percobaan ${attemptCount}] Pengguna ${from.id} (@${from.username || '-'}) mencoba mengakses menu/perintah owner tanpa hak akses resmi.`,
        chatId,
        senderName
      );
      recordMessageTraffic({
        botId: sourceBot?.id || 'primary',
        chatId,
        userId: from.id,
        userName: senderName,
        usernameTag,
        text,
        status: 'filtered',
        filterReason: 'Akses Owner Ditolak (Unauthorized Owner Attempt)'
      });

      const pendingNotice = auth.isClonePending
        ? `\n⏳ *Catatan:* Permohonan akun Anda untuk menjadi Owner Clone saat ini sedang *MENUNGGU PERSETUJUAN* dari Owner Utama.`
        : `\n💡 _Jika Anda adalah mitra atau penyewa bot ini, hubungi Owner Utama (${auth.ownerDisplay}) untuk meminta konfirmasi persetujuan sebagai Owner Clone._`;

      const bInfo = getEffectiveBotInfo(sourceBot);
      const blockedCard = `⛔ *AKSES DITOLAK: KEAMANAN OWNER TINGKAT TINGGI*
━━━━━━━━━━━━━━━━━━━━━━━━━
Menu rahasia dan perintah kontrol bot ini *DILINDUNGI KHUSUS* hanya untuk Owner Resmi!

🆔 *ID Telegram Anda:* \`${from.id}\`
👤 *Username:* ${usernameTag}
🤖 *Bot:* ${bInfo.username}
🛡️ *Status Hak Akses:* *AKSES DITOLAK (UNAUTHORIZED)*

Akun Anda *TIDAK TERDAFTAR* sebagai Owner Utama maupun Owner Clone yang telah disetujui untuk bot ini.${pendingNotice}
━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, blockedCard, {
        inline_keyboard: [
          [{ text: '📞 Hubungi Owner Resmi', callback_data: 'cmd_owner' }],
          [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'cmd_menu' }]
        ]
      });
      return;
    }

    // Reset attempt count if authorized owner successfully logs in
    unauthorizedOwnerAttempts.delete(attemptKey);

    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    const parts = text.split(/\s+/);
    let subCmd = '';
    let argOffset = 2;

    if (isDirectOwnerSlashCmd) {
      subCmd = parts[0].replace(/^\//, '').toLowerCase();
      argOffset = 1;
    } else {
      subCmd = (parts[1] || '').toLowerCase();
      argOffset = 2;
    }

    // Helper to guard cluster-only commands on rented / secondary bots
    const isMasterClusterCommand = ['ngrok', 'addkey', 'delkey', 'keys', 'test', 'addbot', 'delbot', 'setexpiry', 'bots', 'listbot', 'multibot'].includes(subCmd);
    if (sourceBot && isMasterClusterCommand && auth.role !== 'master_owner') {
      await sendTelegramMessage(
        chatId,
        `⛔ *HAK AKSES MASTER CLUSTER DIPERLUKAN*
━━━━━━━━━━━━━━━━━━━━━━━━━
Perintah manajemen server / klaster global ini khusus untuk Master Admin pada Master Bot.

Untuk mengelola bot sewa Anda (@${sourceBot.botInfo?.username || sourceBot.id}), gunakan perintah yang tersedia di menu \`${botSpecificPasskey}\`.`
      );
      return;
    }

    // Command: on -> Turn ON OSINT or Activate Rented Bot
    if (subCmd === 'on') {
      if (sourceBot) {
        sourceBot.isActive = true;
        saveBotConfig();
        runSingleSecondaryBotWorker(sourceBot).catch(console.error);
        addLog('system', `Owner mengaktifkan bot sewa @${sourceBot.botInfo?.username || sourceBot.id} via Telegram.`);
        await sendTelegramMessage(
          chatId,
          `🟢 *BOT SEWA BERHASIL DIAKTIFKAN (ONLINE)*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 Bot: @${sourceBot.botInfo?.username || sourceBot.id}\nStatus: *Aktif & Siap Melayani Pencarian OSINT*`
        );
      } else {
        botConfig.osintConfig.enabled = true;
        botConfig.osintConfig.lastToggledAt = new Date().toISOString();
        saveBotConfig();
        addLog('system', `Owner mengaktifkan server OSINT via Telegram.`);

        await sendTelegramMessage(chatId, `🟢 *SERVER OSINT BERHASIL DIAKTIFKAN (ON)*\n\nServer Ngrok: \`${botConfig.osintConfig.ngrokUrl}\`\n\nMenyiarkan notifikasi status ON ke seluruh pengguna...`);
        if (botConfig.osintConfig.notifyOnStatusChange) {
          broadcastOsintStatusChange(true).catch(console.error);
        }
      }
      return;
    }

    // Command: off -> Turn OFF OSINT or Pause Rented Bot
    if (subCmd === 'off') {
      if (sourceBot) {
        sourceBot.isActive = false;
        saveBotConfig();
        stopSingleSecondaryBotWorker(sourceBot.id);
        addLog('system', `Owner menonaktifkan bot sewa @${sourceBot.botInfo?.username || sourceBot.id} via Telegram.`);
        await sendTelegramMessage(
          chatId,
          `🔴 *BOT SEWA BERHASIL DINONAKTIFKAN (OFF / PAUSED)*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 Bot: @${sourceBot.botInfo?.username || sourceBot.id}\nStatus: *Dijeda (Tidak merespon pesan sampai diaktifkan kembali)*`
        );
      } else {
        botConfig.osintConfig.enabled = false;
        botConfig.osintConfig.lastToggledAt = new Date().toISOString();
        saveBotConfig();
        addLog('system', `Owner menonaktifkan server OSINT via Telegram.`);

        await sendTelegramMessage(chatId, `🔴 *SERVER OSINT BERHASIL DINONAKTIFKAN (OFF)*\n\nMenyiarkan notifikasi status OFF ke seluruh pengguna...`);
        if (botConfig.osintConfig.notifyOnStatusChange) {
          broadcastOsintStatusChange(false).catch(console.error);
        }
      }
      return;
    }

    // Command: setcode / setpasskey <kode_baru> -> Ganti Kode Rahasia Bot
    if (subCmd === 'setcode' || subCmd === 'setpasskey' || subCmd === 'passkey') {
      const newCode = (parts[argOffset] || '').trim();
      if (!newCode || newCode.length < 2) {
        await sendTelegramMessage(
          chatId,
          `❌ *Format Penggunaan:* \`${botSpecificPasskey} setcode <KODE_BARU>\`\n\n*Contoh:* \`${botSpecificPasskey} setcode 09\``
        );
        return;
      }
      if (sourceBot) {
        sourceBot.secretCode = newCode;
        saveBotConfig();
        addLog('system', `Kode rahasia bot sewa @${sourceBot.botInfo?.username || sourceBot.id} diubah menjadi "${newCode}".`);
        await sendTelegramMessage(
          chatId,
          `✅ *KODE RAHASIA BOT SEWA DIPERBARUI!*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Bot: @${sourceBot.botInfo?.username || sourceBot.id}
🔑 *Kode Rahasia Baru:* \`${newCode}\`

Gunakan \`/${newCode}\` atau \`${newCode}\` untuk membuka menu owner bot Anda.`
        );
      } else {
        botConfig.ownerWebsitePasskey = newCode;
        saveBotConfig();
        addLog('system', `Kode rahasia Master Bot diubah menjadi "${newCode}".`);
        await sendTelegramMessage(
          chatId,
          `✅ *KODE RAHASIA MASTER DIPERBARUI!*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🔑 *Kode Rahasia Master Baru:* \`${newCode}\``
        );
      }
      return;
    }

    // Command: info -> Detail status bot & sewa
    if (subCmd === 'info') {
      if (sourceBot) {
        const expStatus = getRentExpiryStatus(sourceBot.rentExpiryDate);
        const botCloneOwners = sourceBot.secondaryOwners || [];
        const cloneOwnersStr = botCloneOwners.length > 0 ? botCloneOwners.join(', ') : 'Belum ada';
        const pendingClones = (sourceBot.pendingCloneOwners || []).filter((p) => p.status === 'pending');
        const botUsersCount = (botConfig.activeUsers || []).filter((u) => u.originBotId === sourceBot.id || !u.originBotId).length;

        await sendTelegramMessage(
          chatId,
          `📋 *DETAIL STATUS BOT SEWA DEDICATED*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Nama Bot:* ${sourceBot.botInfo?.first_name || 'Bot Sewa'}
🏷 *Username:* @${sourceBot.botInfo?.username || sourceBot.id}
🆔 *Bot ID:* \`${sourceBot.botInfo?.id || sourceBot.id}\`
👑 *Penyewa (Owner Utama):* \`${sourceBot.primaryOwner || auth.ownerDisplay}\`
👥 *Owner Clone:* \`${cloneOwnersStr}\`${pendingClones.length > 0 ? ` (${pendingClones.length} pending)` : ''}
🔑 *Kode Rahasia:* \`${sourceBot.secretCode || 'ax0895'}\`
📅 *Masa Sewa:* ${sourceBot.rentExpiryDate ? `${sourceBot.rentExpiryDate} WIB` : '♾️ Permanen'}
⏳ *Sisa Waktu:* ${expStatus.remainingText}
🟢 *Status Polling:* ${sourceBot.isActive ? '🟢 Online (Aktif)' : '🔴 Offline (Dijeda)'}
⚡ *Latensi Server:* ${sourceBot.latencyMs || 0} ms
👥 *Total Pengguna:* ${botUsersCount} pengguna
📊 *Total Pencarian:* ${sourceBot.stats?.commandsExecuted || 0}x diproses
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Untuk memperpanjang masa sewa atau mengubah konfigurasi bot, silakan hubungi Master Admin._`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `📋 *DETAIL MASTER CLUSTER CONTROLLER*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Master Bot:* @${currentBotInfo?.username || 'Primary'} (ID: \`${currentBotInfo?.id || 'master'}\`)
👑 *Master Owner:* \`${botConfig.osintConfig?.ownerUsername || auth.ownerDisplay}\`
🌐 *Ngrok Server:* \`${botConfig.osintConfig.ngrokUrl}\`
🤖 *Total Bot Secondary:* ${(botConfig.multiBots || []).length} bot
👥 *Total Pengguna Terdaftar:* ${botConfig.activeUsers.length} pengguna
🔑 *Total API Key Global:* ${botConfig.osintConfig.apiKeys.length} key`
        );
      }
      return;
    }

    // Command: ngrok <url> -> Update Ngrok URL (Master Only)
    if (subCmd === 'ngrok') {
      const newUrl = parts.slice(argOffset).join(' ').trim();
      if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
        await sendTelegramMessage(chatId, `❌ *Format Salah!*\n\nContoh: \`${configuredOwnerPasskey} ngrok https://dd60-180-247-62-62.ngrok-free.app\``);
        return;
      }
      botConfig.osintConfig.ngrokUrl = newUrl;
      saveBotConfig();
      addLog('system', `Owner memperbarui Ngrok URL via Telegram ke: ${newUrl}`);
      await sendTelegramMessage(chatId, `✅ *URL NGROK DIPERBARUI!*\n\n🌐 URL Baru: \`${newUrl}\`\nStatus OSINT: ${botConfig.osintConfig.enabled ? '🟢 ON' : '🔴 OFF'}`);
      return;
    }

    // Command: addkey <key> <quota> [notes] -> Add API Key (Master Only)
    if (subCmd === 'addkey') {
      const newKey = parts[argOffset];
      const quotaStr = parts[argOffset + 1];
      const notes = parts.slice(argOffset + 2).join(' ') || 'Dibuat via Telegram Owner';

      if (!newKey || !quotaStr) {
        await sendTelegramMessage(chatId, `❌ *Format Salah!*\n\nContoh:\n• \`${configuredOwnerPasskey} addkey user1 15 Paket 10k\`\n• \`${configuredOwnerPasskey} addkey user2 unlimited Paket 100k\``);
        return;
      }

      const isUnlimited = quotaStr.toLowerCase() === 'unlimited' || quotaStr === '999999';
      const quotaNum = isUnlimited ? 999999 : parseInt(quotaStr, 10) || 5;
      const bonus = isUnlimited ? 0 : quotaNum >= 15 ? 1 : 0;

      const newApiKey: OsintApiKey = {
        id: `key-${Date.now()}`,
        key: newKey,
        ownerNotes: notes,
        tier: isUnlimited ? 'unlimited' : 'limited',
        initialQuota: quotaNum,
        remainingQuota: quotaNum,
        bonusQuota: bonus,
        totalUsed: 0,
        createdAt: new Date().toISOString(),
        enabled: true
      };

      botConfig.osintConfig.apiKeys = botConfig.osintConfig.apiKeys.filter((k) => k.key.toLowerCase() !== newKey.toLowerCase());
      botConfig.osintConfig.apiKeys.unshift(newApiKey);
      saveBotConfig();

      addLog('system', `Owner membuat API Key baru: "${newKey}" (${quotaNum}x + ${bonus} bonus).`);
      await sendTelegramMessage(
        chatId,
        `✅ *API KEY BERHASIL DIBUAT!*\n\n🔑 *Key:* \`${newKey}\`\n📊 *Tipe:* ${isUnlimited ? 'Unlimited' : `${quotaNum}x pakai`}\n🎁 *Bonus Ekstra:* ${bonus}x\n📝 *Catatan:* ${notes}\n\n_Pengguna dapat mengecek kuota dengan mengetik:_ \`api ${newKey}\``
      );
      return;
    }

    // Command: delkey <key> -> Delete API Key (Master Only)
    if (subCmd === 'delkey') {
      const targetKey = parts[argOffset];
      if (!targetKey) {
        await sendTelegramMessage(chatId, `❌ Ketik: \`${configuredOwnerPasskey} delkey <key>\``);
        return;
      }
      const beforeCount = botConfig.osintConfig.apiKeys.length;
      botConfig.osintConfig.apiKeys = botConfig.osintConfig.apiKeys.filter((k) => k.key.toLowerCase() !== targetKey.toLowerCase());
      saveBotConfig();
      if (botConfig.osintConfig.apiKeys.length < beforeCount) {
        await sendTelegramMessage(chatId, `✅ API Key \`${targetKey}\` berhasil dihapus.`);
      } else {
        await sendTelegramMessage(chatId, `⚠️ API Key \`${targetKey}\` tidak ditemukan.`);
      }
      return;
    }

    // Command: keys -> List all keys (Master Only)
    if (subCmd === 'keys') {
      const keys = botConfig.osintConfig.apiKeys;
      if (keys.length === 0) {
        await sendTelegramMessage(chatId, `📭 Belum ada API Key yang tersimpan.`);
        return;
      }
      const listStr = keys
        .map((k, i) => {
          const quota = k.tier === 'unlimited' ? 'Unlimited' : `${k.remainingQuota} sisa (+${k.bonusQuota} bonus)`;
          return `${i + 1}. \`${k.key}\` [${k.enabled ? 'Aktif' : 'Nonaktif'}]\n   • Kuota: ${quota}\n   • Terpakai: ${k.totalUsed}x\n   • Catatan: ${k.ownerNotes}`;
        })
        .join('\n\n');

      await sendTelegramMessage(chatId, `🔑 *DAFTAR API KEY AKTIF (${keys.length}):*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n${listStr}`);
      return;
    }

    // Command: test -> Test ping ngrok (Master Only)
    if (subCmd === 'test') {
      await sendTelegramMessage(chatId, `🔄 Mengetes koneksi ke Ngrok: \`${botConfig.osintConfig.ngrokUrl}\`...`);
      try {
        const testTarget = `${botConfig.osintConfig.ngrokUrl.replace(/\/$/, '')}/api/v1/search?q=ping&apiKey=test`;
        const testRes = await fetch(testTarget, { method: 'GET', headers: { 'User-Agent': 'TelegramBot/1.0' } });
        await sendTelegramMessage(chatId, `✅ *RESPON NGROK OK!*\n\nStatus HTTP: *${testRes.status} ${testRes.statusText}*\nURL: \`${testTarget}\``);
      } catch (err: any) {
        await sendTelegramMessage(chatId, `❌ *NGROK OFFLINE / GAGAL!*\n\nError: \`${err.message}\`\nPastikan tunnel ngrok sedang running.`);
      }
      return;
    }

    // Command: addbot <token> [catatan] [expiry_date] [expiry_time] (Master Only)
    if (subCmd === 'addbot') {
      const targetToken = parts[argOffset];
      const tailArgs = parts.slice(argOffset + 1);

      if (!targetToken) {
        await sendTelegramMessage(
          chatId,
          `❌ *Format Penggunaan addbot:*
\`${configuredOwnerPasskey} addbot <TOKEN> [CATATAN] [TANGGAL/DURASI] [WAKTU]\`
atau \`/addbot <TOKEN> [CATATAN] [TANGGAL] [WAKTU]\`

*Contoh:*
• \`/addbot 78912345:AAHfkj_9823 Sewa_Komunitas 2026-12-31\` (otomatis s/d 23:59 WIB)
• \`/addbot 78912345:AAHfkj_9823 Sewa_VIP 2026-12-31 18:30\` (atur jam kustom)
• \`/addbot 78912345:AAHfkj_9823 Sewa_John 30d\` (otomatis 30 hari ke depan)
• \`/addbot 78912345:AAHfkj_9823 Bot_Utama permanen\` (sewa tanpa batas waktu)`
        );
        return;
      }

      // Smart Date & Time & Notes extractor
      let parsedExpiry: string | undefined = undefined;
      let notes = 'Ditambahkan via Telegram Owner';

      if (tailArgs.length > 0) {
        const last1 = tailArgs[tailArgs.length - 1];
        const last2 = tailArgs.length >= 2 ? tailArgs[tailArgs.length - 2] : null;

        // Case 1: last2 is date, last1 is time (HH:mm)
        if (last2 && /^\d{1,2}[:.]\d{1,2}$/.test(last1) && /^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})$/.test(last2)) {
          parsedExpiry = parseRentExpiryInput(last2, last1);
          notes = tailArgs.slice(0, -2).join(' ') || notes;
        }
        // Case 2: last1 is date or shortcut (30d, 90d, 2026-12-31)
        else if (
          /^(\d+)\s*(?:d|hari|m|bulan|y|tahun)$/i.test(last1) ||
          /^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/.test(last1) ||
          ['permanen', 'permanent', 'lifetime', 'none', '-'].includes(last1.toLowerCase())
        ) {
          parsedExpiry = parseRentExpiryInput(last1); // defaults to 23:59 WIB!
          notes = tailArgs.slice(0, -1).join(' ') || notes;
        } else {
          notes = tailArgs.join(' ');
        }
      }

      await sendTelegramMessage(chatId, `⏳ *MEMVERIFIKASI TOKEN KE TELEGRAM API...*`);
      const val = await verifyTelegramToken(targetToken);
      if (!val.valid || !val.botInfo) {
        await sendTelegramMessage(chatId, `❌ *TOKEN TIDAK VALID:* ${val.errorMessage || 'Unauthorized'}`);
        return;
      }

      const expiryStatus = getRentExpiryStatus(parsedExpiry);
      const newBot: MultiBotInstance = {
        id: `bot_${val.botInfo.id}`,
        token: targetToken,
        maskedToken: maskToken(targetToken),
        isActive: true,
        botInfo: val.botInfo,
        addedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        latencyMs: val.latencyMs,
        notes,
        rentExpiryDate: parsedExpiry,
        primaryOwner: from.username ? `@${from.username}` : String(from.id),
        primaryOwnerChatId: Number(from.id),
        secondaryOwners: [],
        pendingCloneOwners: [],
        secretCode: 'ax0895',
        stats: { messagesReceived: 0, messagesSent: 0, commandsExecuted: 0 }
      };

      if (!Array.isArray(botConfig.multiBots)) botConfig.multiBots = [];
      botConfig.multiBots = botConfig.multiBots.filter((b) => b.token !== targetToken && b.id !== newBot.id);
      botConfig.multiBots.unshift(newBot);
      saveBotConfig();
      runSingleSecondaryBotWorker(newBot).catch(console.error);

      await sendTelegramMessage(
        chatId,
        `✅ *BOT BARU TERHUBUNG KE CLUSTER!*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Nama Bot:* ${val.botInfo.first_name}
🏷 *Username:* @${val.botInfo.username}
🆔 *Bot ID:* \`${val.botInfo.id}\`
⚡ *Latensi Ping:* ${val.latencyMs} ms
📝 *Catatan:* ${notes}
📅 *Masa Sewa:* ${parsedExpiry ? `${parsedExpiry} WIB (${expiryStatus.remainingText})` : '♾️ Permanen'}
🟢 *Status Mesin:* *ONLINE (Always-ON Polling)*
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Bot langsung aktif dan dapat menerima perintah OSINT secara instan._`
      );
      return;
    }

    // Command: setexpiry <id/username> <tanggal/durasi> [waktu] (Master Only)
    if (subCmd === 'setexpiry') {
      const target = (parts[argOffset] || '').toLowerCase().replace(/^@/, '');
      const rawDate = parts[argOffset + 1];
      const rawTime = parts[argOffset + 2];

      if (!target || !rawDate) {
        await sendTelegramMessage(
          chatId,
          `❌ *Format Penggunaan setexpiry:*
\`${configuredOwnerPasskey} setexpiry <ID_ATAU_USERNAME> <TANGGAL/DURASI> [WAKTU]\`
atau \`/setexpiry <ID_ATAU_USERNAME> <TANGGAL/DURASI> [WAKTU]\`

*Contoh:*
• \`/setexpiry @bot_ku 2026-12-31\` (otomatis s/d 23:59 WIB)
• \`/setexpiry @bot_ku 2026-12-31 15:00\` (atur jam kustom)
• \`/setexpiry @bot_ku 30d\` (tambah 30 hari ke depan)
• \`/setexpiry @bot_ku permanen\` (hapus batas sewa)`
        );
        return;
      }

      if (!Array.isArray(botConfig.multiBots)) botConfig.multiBots = [];
      const matched = botConfig.multiBots.find(
        (b) => b.id.toLowerCase() === target || (b.botInfo?.username && b.botInfo.username.toLowerCase() === target)
      );

      if (!matched) {
        await sendTelegramMessage(chatId, `⚠️ Bot "${target}" tidak ditemukan di cluster.`);
        return;
      }

      const newExpiry = parseRentExpiryInput(rawDate, rawTime);
      matched.rentExpiryDate = newExpiry;
      saveBotConfig();

      const expStatus = getRentExpiryStatus(newExpiry);
      await sendTelegramMessage(
        chatId,
        `✅ *MASA SEWA BOT DIPERBARUI!*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Bot:* ${matched.botInfo?.first_name || matched.id} (@${matched.botInfo?.username || '-'})
📅 *Masa Sewa Baru:* ${newExpiry ? `${newExpiry} WIB` : '♾️ Permanen'}
⏳ *Status Sisa:* ${expStatus.remainingText}
━━━━━━━━━━━━━━━━━━━━━━━━━`
      );
      return;
    }

    // Command: delbot <id or username> (Master Only)
    if (subCmd === 'delbot') {
      const target = (parts[argOffset] || '').toLowerCase().replace(/^@/, '');
      if (!target) {
        await sendTelegramMessage(chatId, `❌ Ketik: \`${configuredOwnerPasskey} delbot <id_atau_username_bot>\` atau \`/delbot <username>\``);
        return;
      }
      if (!Array.isArray(botConfig.multiBots)) botConfig.multiBots = [];
      const matched = botConfig.multiBots.find(
        (b) => b.id.toLowerCase() === target || (b.botInfo?.username && b.botInfo.username.toLowerCase() === target)
      );
      if (matched) {
        stopSingleSecondaryBotWorker(matched.id);
        botConfig.multiBots = botConfig.multiBots.filter((b) => b.id !== matched.id);
        saveBotConfig();
        await sendTelegramMessage(chatId, `✅ Bot @${matched.botInfo?.username || matched.id} berhasil dihapus dan dimatikan.`);
      } else {
        await sendTelegramMessage(chatId, `⚠️ Bot "${target}" tidak ditemukan.`);
      }
      return;
    }

    // Command: bots / listbot / multibot (Master Only)
    if (subCmd === 'bots' || subCmd === 'listbot' || subCmd === 'multibot') {
      const bots = botConfig.multiBots || [];
      const listStr = bots
        .map((b, i) => {
          const expStatus = getRentExpiryStatus(b.rentExpiryDate);
          return `${i + 1}. *${b.botInfo?.first_name || 'Bot'}* (@${b.botInfo?.username || 'no_user'}) [${b.isActive ? '🟢 Online' : '🔴 Off'}]
   • ID: \`${b.id}\` | Token: \`${b.maskedToken}\`
   • Owner: \`${b.primaryOwner || '-'}\`
   • Catatan: ${b.notes || '-'}
   • Sewa: ${b.rentExpiryDate ? `Exp: ${b.rentExpiryDate} (${expStatus.remainingText})` : '♾️ Permanen'}`;
        })
        .join('\n\n');

      await sendTelegramMessage(
        chatId,
        `🌐 *DAFTAR MULTI-BOT CLUSTER (${bots.length} Secondary):*
━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *Master Bot:* @${currentBotInfo?.username || 'Primary'} (${botConfig.isActive ? '🟢 ON' : '🔴 OFF'})

${listStr || '_Belum ada secondary bot terdaftar di cluster._'}`
      );
      return;
    }

    // Command: addowner / cloneowner / tambahowner <@username or ID>
    if (subCmd === 'addowner' || subCmd === 'cloneowner' || subCmd === 'tambahowner') {
      const targetOwner = parts.slice(argOffset).join(' ').trim();
      if (!targetOwner) {
        await sendTelegramMessage(
          chatId,
          `❌ *Format Penggunaan:* \`/addowner <@username_atau_ID>\`\n\n*Contoh:* \`/addowner @partner_cyber\``
        );
        return;
      }

      const botTarget = sourceBot || null;
      if (!botTarget) {
        if (!Array.isArray(botConfig.coOwners)) botConfig.coOwners = [];
        if (!botConfig.coOwners.includes(targetOwner)) {
          botConfig.coOwners.push(targetOwner);
          saveBotConfig();
        }
        await sendTelegramMessage(
          chatId,
          `✅ *CO-OWNER MASTER RESMI DITAMBAHKAN!*\n\nAkun \`${targetOwner}\` kini resmi menjadi Co-Owner untuk Master Bot.`
        );
        return;
      }

      // If the sender is Primary Owner of this rented bot or Master Owner, they can approve directly!
      if (auth.role === 'primary_owner' || auth.role === 'master_owner') {
        if (!Array.isArray(botTarget.secondaryOwners)) botTarget.secondaryOwners = [];
        if (!botTarget.secondaryOwners.includes(targetOwner)) {
          botTarget.secondaryOwners.push(targetOwner);
        }
        if (Array.isArray(botTarget.pendingCloneOwners)) {
          botTarget.pendingCloneOwners = botTarget.pendingCloneOwners.filter(
            (p) => p.ownerIdentifier.toLowerCase() !== targetOwner.toLowerCase()
          );
        }
        saveBotConfig();
        await sendTelegramMessage(
          chatId,
          `✅ *OWNER CLONE RESMI DISETUJUI & AKTIF!*
━━━━━━━━━━━━━━━━━━━━━━━━━
Akun: \`${targetOwner}\`
Bot: @${botTarget.botInfo?.username || botTarget.id}
Status: *Resmi Aktif*

Akun di atas kini dapat menggunakan seluruh menu rahasia dan kontrol operasional bot ini.`
        );
        return;
      } else {
        // Needs confirmation from Primary Owner!
        const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        if (!Array.isArray(botTarget.pendingCloneOwners)) botTarget.pendingCloneOwners = [];
        const reqItem: CloneOwnerRequest = {
          id: reqId,
          ownerIdentifier: targetOwner,
          requestedAt: new Date().toISOString(),
          status: 'pending'
        };
        botTarget.pendingCloneOwners.push(reqItem);
        saveBotConfig();

        await notifyPrimaryOwnerForCloneApproval(botTarget, reqItem);

        await sendTelegramMessage(
          chatId,
          `⏳ *PERMINTAAN DIKIRIM KE OWNER UTAMA*\n━━━━━━━━━━━━━━━━━━━━━━━━━\nPengajuan \`${targetOwner}\` sebagai Owner Clone telah dikirimkan ke Owner Utama (${botTarget.primaryOwner}) untuk konfirmasi persetujuan.`
        );
        return;
      }
    }

    // Command: delowner / hapusowner <@username or ID>
    if (subCmd === 'delowner' || subCmd === 'hapusowner') {
      const targetOwner = (parts[argOffset] || '').trim();
      if (!targetOwner) {
        await sendTelegramMessage(chatId, `❌ Ketik: \`/delowner <@username_atau_ID>\``);
        return;
      }

      const botTarget = sourceBot || null;
      if (!botTarget) {
        botConfig.coOwners = (botConfig.coOwners || []).filter(
          (o) => o.toLowerCase().replace(/^@/, '') !== targetOwner.toLowerCase().replace(/^@/, '')
        );
        saveBotConfig();
        await sendTelegramMessage(chatId, `✅ Akun \`${targetOwner}\` berhasil dihapus dari daftar Co-Owner Master Bot.`);
        return;
      }

      botTarget.secondaryOwners = (botTarget.secondaryOwners || []).filter(
        (o) => o.toLowerCase().replace(/^@/, '') !== targetOwner.toLowerCase().replace(/^@/, '')
      );
      if (Array.isArray(botTarget.pendingCloneOwners)) {
        botTarget.pendingCloneOwners = botTarget.pendingCloneOwners.filter(
          (p) => p.ownerIdentifier.toLowerCase().replace(/^@/, '') !== targetOwner.toLowerCase().replace(/^@/, '')
        );
      }
      saveBotConfig();
      await sendTelegramMessage(
        chatId,
        `✅ Akun \`${targetOwner}\` telah dihapus dari daftar Owner Clone bot @${botTarget.botInfo?.username || botTarget.id}. Hak akses dicabut.`
      );
      return;
    }

    // Command: listowner / owners
    if (subCmd === 'listowner' || subCmd === 'owners') {
      const botTarget = sourceBot || null;
      if (botTarget) {
        const primaryDisplay = botTarget.primaryOwner || auth.ownerDisplay || 'Belum diatur';
        const coOwners = botTarget.secondaryOwners || [];
        const pending = (botTarget.pendingCloneOwners || []).filter((p) => p.status === 'pending');

        const listCo = coOwners.length > 0 ? coOwners.map((o, i) => `${i + 1}. \`${o}\` (🟢 Disetujui)`).join('\n') : '_Belum ada Owner Clone._';
        const listPen = pending.length > 0 ? pending.map((p, i) => `${i + 1}. \`${p.ownerIdentifier}\` (⏳ Menunggu Konfirmasi)`).join('\n') : '_Tidak ada antrian persetujuan._';

        await sendTelegramMessage(
          chatId,
          `👥 *DAFTAR OWNER BOT SEWA RESMI*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Bot:* @${botTarget.botInfo?.username || botTarget.id}
👑 *Owner Utama (Penyewa):* \`${primaryDisplay}\`

🛡️ *Owner Clone Resmi (${coOwners.length}):*
${listCo}

⏳ *Permintaan Konfirmasi (${pending.length}):*
${listPen}
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Owner Utama dapat menambah owner via \`/addowner <@user>\` atau hapus via \`/delowner <@user>\`._`
        );
        return;
      } else {
        const primaryDisplay = botConfig.osintConfig?.ownerUsername || auth.ownerDisplay || 'Master Owner';
        const coOwners = botConfig.coOwners || [];
        const pending = (botConfig.pendingCoOwners || []).filter((p) => p.status === 'pending');

        const listCo = coOwners.length > 0 ? coOwners.map((o, i) => `${i + 1}. \`${o}\` (🟢 Disetujui)`).join('\n') : '_Belum ada Co-Owner Master._';
        const listPen = pending.length > 0 ? pending.map((p, i) => `${i + 1}. \`${p.ownerIdentifier}\` (⏳ Menunggu Konfirmasi)`).join('\n') : '_Tidak ada antrian persetujuan._';

        await sendTelegramMessage(
          chatId,
          `👥 *DAFTAR MASTER OWNER & CO-OWNERS*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Master Bot:* @${currentBotInfo?.username || 'Primary Bot'}
👑 *Master Owner:* \`${primaryDisplay}\`

🛡️ *Co-Owners Master (${coOwners.length}):*
${listCo}

⏳ *Permintaan Konfirmasi (${pending.length}):*
${listPen}
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Master Owner dapat menambah co-owner via \`/addowner <@user>\` atau hapus via \`/delowner <@user>\`._`
        );
        return;
      }
    }

    // =========================================================================
    // DEFAULT: SHOW DIFFERENTIATED SECRET OWNER MENU DASHBOARD
    // Case A: Rented Bot / Dedicated Worker (sourceBot exists)
    // Case B: Master Cluster Controller (!sourceBot)
    // =========================================================================

    if (sourceBot) {
      // 🤖 MENU OWNER BOT SEWA (DEDICATED WORKER)
      const expStatus = getRentExpiryStatus(sourceBot.rentExpiryDate);
      const botCloneOwners = sourceBot.secondaryOwners || [];
      const cloneOwnersStr = botCloneOwners.length > 0 ? botCloneOwners.join(', ') : 'Belum ada';
      const pendingClones = (sourceBot.pendingCloneOwners || []).filter((p) => p.status === 'pending');
      const botUsersCount = (botConfig.activeUsers || []).filter((u) => u.originBotId === sourceBot.id || !u.originBotId).length;

      const sewaCard = `👑 *MENU OWNER BOT SEWA (${botSpecificPasskey})*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Target Bot:* @${sourceBot.botInfo?.username || sourceBot.id} (Dedicated Bot Sewa)
👑 *Owner Utama (Penyewa):* \`${sourceBot.primaryOwner || auth.ownerDisplay}\`
👥 *Owner Clone Bot Ini:* \`${cloneOwnersStr}\`${pendingClones.length > 0 ? `\n⏳ *Menunggu Persetujuan:* ${pendingClones.length} akun` : ''}
🔑 *Kode Rahasia Bot:* \`${botSpecificPasskey}\`
📅 *Masa Sewa:* ${sourceBot.rentExpiryDate ? `${sourceBot.rentExpiryDate} WIB (${expStatus.remainingText})` : '♾️ Permanen'}
━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 *Status Operasional:* ${sourceBot.isActive ? '🟢 *ONLINE (AKTIF)*' : '🔴 *OFF (DIJEDA)*'}
⚡ *Latensi Mesin:* *${sourceBot.latencyMs || 0} ms*
👥 *Total Pengguna Bot:* *${botUsersCount} pengguna terdaftar*
📊 *Total Query Diproses:* *${sourceBot.stats?.commandsExecuted || 0}x pencarian*
━━━━━━━━━━━━━━━━━━━━━━━━━
📖 *Perintah Khusus Pemilik Bot Sewa:*
• \`${botSpecificPasskey} on\` / \`off\` - Kontrol aktif / jeda bot sewa Anda
• \`/addowner <@user>\` - Tambah Owner Clone baru untuk bot Anda
• \`/delowner <@user>\` - Hapus Owner Clone dari bot Anda
• \`/listowner\` - Cek seluruh owner & clone resmi bot ini
• \`${botSpecificPasskey} setcode <kode_baru>\` - Ubah kode rahasia bot ini
• \`${botSpecificPasskey} info\` - Rincian status masa sewa & statistik bot
• \`/menu\` - Buka menu pencarian OSINT
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Butuh bantuan teknis atau perpanjangan sewa? Silakan hubungi Master Admin._`;

      await sendTelegramMessage(chatId, sewaCard, {
        inline_keyboard: [
          [
            { text: sourceBot.isActive ? '🔴 Jeda Bot (Pause)' : '🟢 Aktifkan Bot (Online)', callback_data: sourceBot.isActive ? 'ax_sewa_off' : 'ax_sewa_on' },
            { text: '👥 Kelola Clone Owner', callback_data: 'cmd_list_owners' }
          ],
          [
            { text: '📋 Info Masa Sewa', callback_data: 'cmd_sewa_info' },
            { text: '🏠 Buka Menu Utama', callback_data: 'cmd_menu' }
          ]
        ]
      });
      return;
    }

    // 🌐 MENU RAHASIA MASTER OWNER (MASTER CLUSTER CONTROLLER)
    const totalKeys = botConfig.osintConfig.apiKeys.length;
    const totalMenus = (botConfig.customMenus || []).length;
    const totalMulti = (botConfig.multiBots || []).length;
    const isOsintOn = botConfig.osintConfig.enabled;
    const masterOwnerDisplay = botConfig.osintConfig?.ownerUsername || auth.ownerDisplay || 'Belum diatur';
    const masterCoOwners = botConfig.coOwners || [];
    const cloneOwnersStr = masterCoOwners.length > 0 ? masterCoOwners.join(', ') : 'Belum ada';
    const pendingClones = (botConfig.pendingCoOwners || []).filter((p) => p.status === 'pending');

    const masterCard = `👑 *MENU RAHASIA MASTER OWNER (${botSpecificPasskey})*
━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 *Mode Operasi:* 🛡️ *MASTER CLUSTER CONTROLLER*
🤖 *Master Bot:* @${currentBotInfo?.username || 'Primary'} (ID: \`${currentBotInfo?.id || 'master'}\`)
👑 *Master Owner:* \`${masterOwnerDisplay}\`
👥 *Co-Owners Master:* \`${cloneOwnersStr}\`${pendingClones.length > 0 ? `\n⏳ *Menunggu Persetujuan:* ${pendingClones.length} akun` : ''}
🔑 *Kode Rahasia Master:* \`${botSpecificPasskey}\`
━━━━━━━━━━━━━━━━━━━━━━━━━
Status Fitur OSINT: ${isOsintOn ? '🟢 *AKTIF (ON)*' : '🔴 *NONAKTIF (OFF)*'}
🌐 Ngrok URL: \`${botConfig.osintConfig.ngrokUrl}\`
🤖 Total Multi-Bot Cluster: *1 Master + ${totalMulti} Secondary Worker*
🔑 Total API Key Global: *${totalKeys} key*
🗂️ Menu Tambahan: *${totalMenus} menu*
👥 Total Seluruh Pengguna: *${botConfig.activeUsers.length} pengguna*
🔍 Total Pencarian OSINT: *${botConfig.stats.osintSearchesCount || 0}x*
━━━━━━━━━━━━━━━━━━━━━━━━━
📖 *Perintah Master Owner Lengkap:*
• \`${botSpecificPasskey} on\` / \`off\` - Kontrol status OSINT Global
• \`/addbot <token> [catatan] [expiry]\` - Tambah bot sewa ke cluster
• \`/setexpiry <id/user> <tgl> [jam]\` - Atur masa sewa bot
• \`/delbot <id/user>\` - Hapus & matikan bot sewa
• \`/listbot\` atau \`/multibot\` - Pantau seluruh bot cluster
• \`/addowner <@user>\` - Tambah Co-Owner Master
• \`/delowner <@user>\` - Hapus Co-Owner Master
• \`/listowner\` - Cek seluruh Co-Owner Master
• \`${botSpecificPasskey} ngrok <url>\` - Ganti URL server Ngrok
• \`${botSpecificPasskey} addkey <key> <kuota> [notes]\` - Tambah API Key
• \`${botSpecificPasskey} delkey <key>\` - Hapus API Key
• \`${botSpecificPasskey} keys\` - Cek daftar API Key
• \`${botSpecificPasskey} setcode <kode_baru>\` - Ganti kode rahasia Master
• \`${botSpecificPasskey} test\` - Tes koneksi Ngrok Server`;

    await sendTelegramMessage(chatId, masterCard, {
      inline_keyboard: [
        [
          { text: isOsintOn ? '🔴 Matikan OSINT (OFF)' : '🟢 Aktifkan OSINT (ON)', callback_data: isOsintOn ? 'ax_off' : 'ax_on' },
          { text: '🔑 Cek Daftar Key', callback_data: 'ax_keys' }
        ],
        [
          { text: '👥 Kelola Owner (/listowner)', callback_data: 'cmd_list_owners' },
          { text: '🤖 Kelola Multi-Bot', callback_data: 'cmd_list_bots' }
        ],
        [
          { text: '🌐 Tes Ping Ngrok', callback_data: 'ax_test' },
          { text: '🏠 Buka Menu Utama', callback_data: 'cmd_menu' }
        ]
      ]
    });
    return;
  }

  // =========================================================================
  // 2. MANDATORY VERIFICATION GATE: /id
  // If user is NOT verified yet, they MUST send /id to unlock features!
  // =========================================================================
  if (!currentUser.isVerified) {
    // If the message is /id, verify the user immediately!
    if (['/id', '/myid', '/chatid'].includes(lowerText)) {
      currentUser.isVerified = true;
      currentUser.verifiedAt = new Date().toISOString();
      syncUserApiKey(currentUser);
      saveBotConfig();

      addLog('system', `Pengguna ${chatId} (${senderName}) berhasil diverifikasi via /id.`);

      const verifiedCard = `✅ *AKUN BERHASIL TERVERIFIKASI RESMI!*
━━━━━━━━━━━━━━━━━━━━━━━━━
Terima kasih, *${senderName}*! Akun Telegram Anda telah terverifikasi secara resmi di sistem bot.

🆔 *Chat ID:* \`${chatId}\`
👤 *Nama Lengkap:* ${senderName}
🏷 *Username:* ${usernameTag}
🕒 *Waktu Verifikasi:* ${wibTime.fullStr}
━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 *HADIAH SAMBUTAN PENGGUNA BARU:*
Sebagai akun terverifikasi baru, Anda berhak mengklaim *+5x Kuota Pencarian OSINT Gratis* (1x seumur hidup)!

👉 *Ketik:* \`/claim\` atau klik tombol di bawah untuk mengambil kuota gratis Anda sekarang!`;

      await sendTelegramMessage(chatId, verifiedCard, {
        inline_keyboard: [
          [{ text: '🎁 Ambil Kuota Pengguna Baru (+5x)', callback_data: 'claim_new_user' }],
          [{ text: '🏠 Buka Menu Utama', callback_data: 'cmd_menu' }]
        ]
      });
      return;
    }

    // If the message is /start or /menu, give explicit instruction to send /id
    if (lowerText === '/start' || lowerText.startsWith('/start ') || lowerText === '/menu') {
      const verificationPrompt = `👋 *Halo ${senderName}! Selamat datang di Telegram Bot.*

🔒 *STATUS: WAJIB VERIFIKASI AWAL*
━━━━━━━━━━━━━━━━━━━━━━━━━
Untuk keamanan dan mengaktifkan seluruh fitur bot, Anda *WAJIB* mengirim pesan */id* terlebih dahulu agar akun terverifikasi di sistem kami.

👉 *Silakan kirim perintah:* \`/id\`
Atau sentuh tombol di bawah ini untuk verifikasi langsung.
━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, verificationPrompt, {
        inline_keyboard: [
          [{ text: '🆔 Verifikasi Akun Sekarang (/id)', callback_data: 'verify_id' }]
        ]
      });
      return;
    }

    // For any other messages while unverified, block and remind user to send /id
    const unverifiedNotice = `⚠️ *AKUN BELUM TERVERIFIKASI*
━━━━━━━━━━━━━━━━━━━━━━━━━
Sebelum dapat menggunakan fitur atau menu bot, Anda *WAJIB* mengirim pesan: \`/id\`

Ketik \`/id\` sekarang untuk menyelesaikan verifikasi awal akun Anda.`;

    await sendTelegramMessage(chatId, unverifiedNotice, {
      inline_keyboard: [
        [{ text: '🆔 Verifikasi Akun Sekarang (/id)', callback_data: 'verify_id' }]
      ]
    });
    return;
  }

  // =========================================================================
  // 3. VERIFIED USERS: COMMANDS & OSINT
  // =========================================================================

  // Command: /start or /menu
  if (lowerText === '/start' || lowerText.startsWith('/start ') || lowerText === '/menu') {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    const personalizedWelcome = formatBotWelcomeMessage(
      sourceBot,
      currentUser,
      senderName,
      chatId,
      referredInviterName
    );

    await sendTelegramMessage(chatId, personalizedWelcome, getMainInlineMenu(botConfig.osintConfig.enabled, sourceBot));
    return;
  }

  // Command: /referral, /invite, /tabungan, /menabung, /undang
  if (['/referral', '/invite', '/tabungan', '/menabung', '/undang', 'referral', 'invite', 'tabungan', 'menabung', 'undang'].includes(lowerText)) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();
    await sendReferralDashboard(from.id, Number(chatId), senderName);
    return;
  }

  // Command: /tarik or /withdraw
  if (
    lowerText === '/tarik' ||
    lowerText.startsWith('/tarik ') ||
    lowerText === '/withdraw' ||
    lowerText.startsWith('/withdraw ') ||
    lowerText === 'tarik'
  ) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();
    const parts = text.split(/\s+/);
    const amountStr = (parts[1] || '').toLowerCase();
    if (amountStr === 'semua' || amountStr === 'all' || amountStr === 'max') {
      await handleWithdrawReferralQuota(from.id, Number(chatId), senderName, 'all');
    } else if (/^\d+$/.test(amountStr)) {
      await handleWithdrawReferralQuota(from.id, Number(chatId), senderName, parseInt(amountStr, 10));
    } else {
      await handleWithdrawReferralQuota(from.id, Number(chatId), senderName, undefined);
    }
    return;
  }

  // Command: /sewabot, /sewa, /daftarsewa (BOT RENTAL INFO FOR ALL USERS)
  if (['/sewabot', '/sewa', '/daftarsewa', 'sewabot', 'sewa'].includes(lowerText)) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    const rentalCard = `🤖 *LAYANAN SEWA BOT TELEGRAM PRIBADI (DEDICATED BOT)*
━━━━━━━━━━━━━━━━━━━━━━━━━
Mau punya bot intelijen OSINT canggih dengan nama, username, avatar, dan identitas komunitas Anda sendiri?

✨ *KEUNGGULAN SEWA BOT DEDICATED:*
✅ *Bot Telegram Milik Anda Sendiri* (Bebas tentukan username & profil di @BotFather)
✅ *Akses Penuh Database OSINT & NIK* 1 Juta+ arsip kebocoran data
✅ *Online 24/7 Always-ON* (Server hosting cepat tanpa perlu sewa VPS pribadi)
✅ *Sistem Kuota Gratis & Manajemen Tabungan Referral* otomatis
✅ *Bebas Atur Menu & Watermark* brand komunitas Anda
✅ *Fitur Keamanan Anti-Spam & Moderasi Grup* bawaan

━━━━━━━━━━━━━━━━━━━━━━━━━
💎 *PILIHAN PAKET SEWA BOT:*
1️⃣ *PAKET STARTER (30 HARI / 1 BULAN)*
   • Harga: *Rp 50.000* ($3.50)
   • 1 Dedicated Bot Aktif 24/7 Full Database OSINT

2️⃣ *PAKET PRO VIP (90 HARI / 3 BULAN) [TERPOPULER!]*
   • Harga: *Rp 125.000* ($8.50)
   • Bebas pasang Watermark, Jalur Proxy Prioritas, Admin Unlimited

3️⃣ *PAKET LIFETIME / PERMANEN (SEKALI BAYAR)*
   • Harga: *Rp 250.000* (Sekali Bayar Aktif Selamanya)
   • Tanpa biaya bulanan lagi + Update dataset otomatis

━━━━━━━━━━━━━━━━━━━━━━━━━
🛒 *CARA MEMESAN & AKTIVASI:*
1. Buat bot baru di @BotFather lalu salin token HTTP API Anda.
2. Kirimkan token dan bukti pemesanan ke Admin:
👤 *Owner Telegram:* @flood1233
_(Bebas mau chat ataupun call, asal tidak spam)_
3. Bot Anda langsung aktif dan online seketika!`;

    await sendTelegramMessage(chatId, rentalCard, {
      inline_keyboard: [
        [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }],
        [{ text: '💎 Daftar Harga API Key', callback_data: 'cmd_pricing' }],
        [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  }

  // Command: /id, /myid, /chatid (CHECK CHAT ID - SAFE & NEVER RESETS STATUS)
  if (['/id', '/myid', '/chatid'].includes(lowerText)) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    const todayWib = getWibDateString();
    const countdown = getTimeUntilNextWibMidnight();
    const firstSeenFormatted = formatWibDate(currentUser.firstSeen);

    const idCard = `📋 *DETAIL INFORMASI CHAT ID & PROFIL AKUN*
━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 *Chat ID:* \`${chatId}\`
👤 *Nama Lengkap:* ${senderName}
🏷 *Username:* ${usernameTag}
💬 *Tipe Obrolan:* ${chat.type.toUpperCase()}
🔢 *Message ID:* \`${message.message_id}\`
🕒 *Waktu Sistem:* ${wibTime.fullStr}
🔒 *Status Akun:* ✅ *Terverifikasi Resmi* (Terdaftar sejak: ${firstSeenFormatted})
━━━━━━━━━━━━━━━━━━━━━━━━━
💎 *STATUS KUOTA PRIBADI ANDA:*
• *Sisa Kuota Aktif:* *${currentUser.personalQuota || 0}x Pencarian*
• *API Key Pribadi:* \`${currentUser.personalApiKey || `usr_${chatId}`}\`

🎁 *STATUS JATAH KLAIM:*
• *Kuota Pengguna Baru (5x):* ${currentUser.hasClaimedNewUserQuota ? '✅ Sudah Diklaim (1x seumur hidup)' : '🎁 *Belum Diklaim (Siap Diambil)*'}
• *Kuota Harian (2x):* ${currentUser.dailyQuotaLastClaimedDate === todayWib ? `✅ Sudah Diklaim (Reset: ${countdown.formatted} lagi)` : '✨ *Tersedia Hari Ini (Bisa Diklaim)*'}
━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ _Catatan: Akun Anda tersimpan permanen. Menjalankan perintah /id tidak akan mereset status, profil, ataupun kuota Anda._`;

    await sendTelegramMessage(chatId, idCard, {
      inline_keyboard: [
        [
          { text: '🎁 Menu Klaim Kuota', callback_data: 'cmd_claim_menu' },
          { text: '💎 Cek Saldo Kuota', callback_data: 'cmd_my_quota' }
        ],
        [
          { text: '🔄 Muat Ulang ID', callback_data: 'cmd_id' },
          { text: '🏠 Buka Menu Utama', callback_data: 'cmd_menu' }
        ]
      ]
    });
    return;
  }

  // Command: /claim, /klaim, /bonus (CLAIM DASHBOARD)
  if (['/claim', '/klaim', '/bonus', 'claim', 'klaim'].includes(lowerText)) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();
    await sendClaimQuotaDashboard(from.id, Number(chatId), senderName);
    return;
  }

  // Command: /claim_new, /klaim_baru (DIRECT CLAIM NEW USER QUOTA)
  if (['/claim_new', '/claimnew', '/klaim_baru', '/klaimbaru'].includes(lowerText)) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();
    await handleClaimNewUserQuota(from.id, Number(chatId), senderName);
    return;
  }

  // Command: /claim_daily, /claimdaily, /klaim_harian, /klaimharian, /daily (DIRECT CLAIM DAILY QUOTA)
  if (['/claim_daily', '/claimdaily', '/klaim_harian', '/klaimharian', '/daily', 'daily'].includes(lowerText)) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();
    await handleClaimDailyQuota(from.id, Number(chatId), senderName);
    return;
  }

  // Command: /kuota, /quota, /myquota, /saldo (CHECK USER'S PERSONAL QUOTA)
  if (['/kuota', '/quota', '/myquota', '/saldo', 'kuota', 'quota'].includes(lowerText)) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();
    await sendUserQuotaStatus(from.id, Number(chatId), senderName);
    return;
  }

  // Command: /osint (OSINT STATUS & USAGE)
  if (lowerText === '/osint' || lowerText === 'osint') {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    const isOsintOn = botConfig.osintConfig.enabled;

    if (!isOsintOn) {
      // OSINT is OFF
      const offCard = `🔴 *STATUS SERVER DATA OSINT: NONAKTIF (OFF)*
━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *Mohon maaf, Server Data OSINT saat ini belum diaktifkan oleh Owner.*

Fitur pencarian intelijen tidak dapat digunakan selama server masih dalam keadaan nonaktif.

📞 *CARA MENGAKTIFKAN:*
Jika Anda ingin menggunakan fitur ini, Anda harus menghubungi Owner Bot untuk mengaktifkan data/server OSINT:
👤 *Owner Telegram:* @flood1233
_(Bebas mau chat ataupun call, asal tidak spam)_
━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, offCard, {
        inline_keyboard: [
          [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }],
          [{ text: '💎 Lihat Tarif Harga API Key', callback_data: 'cmd_pricing' }],
          [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'cmd_menu' }]
        ]
      });
      return;
    }

    // OSINT is ON
    const onCard = `🟢 *STATUS SERVER DATA OSINT: AKTIF (ON)*
━━━━━━━━━━━━━━━━━━━━━━━━━
Server Data OSINT saat ini *SEDANG AKTIF* dan siap melayani pencarian intelijen!

Untuk menggunakan fitur ini, Anda memerlukan *API Key* resmi.

📖 *CARA MENGGUNAKAN OSINT:*
Kirim pesan dengan format:
\`search: <target> <apiKey>\`

*Contoh:*
\`search: jokowi ppp\`
_(jokowi = target pencarian, ppp = API Key Anda)_

🔍 *CEK SISA KUOTA API KEY:*
Ketik: \`api <apiKey>\`
*Contoh:* \`api ppp\`

💎 *TARIF HARGA API KEY (${pricing.currency}):*
${pricing.formatted}

${pricing.note}

🛒 *PEMBELIAN & TOP UP API KEY:*
Hubungi langsung Owner:
👤 *Owner Telegram:* @flood1233
_(Bebas mau chat ataupun call, asal tidak spam)_
━━━━━━━━━━━━━━━━━━━━━━━━━`;

    await sendTelegramMessage(chatId, onCard, {
      inline_keyboard: [
        [{ text: '💎 Cek Kuota API Key', callback_data: 'cmd_pricing' }],
        [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }],
        [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  }

  // Command: /pricing, /harga, /tarif (PRICE & API KEY PROMOTION)
  if (['/pricing', '/harga', '/tarif'].includes(lowerText)) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    const priceCard = `💎 *DAFTAR HARGA & PROMOSI API KEY OSINT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Mata Uang Terdeteksi: *${pricing.currency}*

${pricing.formatted}

${pricing.note}

💡 *Ketentuan & Keunggulan:*
• Pengerjaan query real-time langsung ke server intelijen
• Format pencarian: \`search: <target> <apiKey>\`
• Cek kuota kapan saja dengan: \`api <apiKey>\`

📞 *Pemesanan & Aktivasi API Key:*
👤 *Owner Telegram:* @flood1233
_(Bebas mau chat ataupun call, asal tidak spam)_
━━━━━━━━━━━━━━━━━━━━━━━━━`;

    await sendTelegramMessage(chatId, priceCard, {
      inline_keyboard: [
        [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }],
        [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  }

  // Command: api <apiKey> (CHECK API KEY QUOTA & STATUS)
  if (lowerText === 'api' || lowerText.startsWith('api ') || lowerText === '/api' || lowerText.startsWith('/api ')) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    const parts = text.split(/\s+/);
    const queriedKey = parts[1];

    if (!queriedKey) {
      await sendTelegramMessage(
        chatId,
        `ℹ️ *Format Pengecekan API Key:*\n\nKetik: \`api <apiKey>\`\n*Contoh:* \`api ppp\`\n\nUntuk membeli API Key baru, hubungi Owner: @flood1233`,
        {
          inline_keyboard: [
            [{ text: '💎 Daftar Harga API Key', callback_data: 'cmd_pricing' }],
            [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }]
          ]
        }
      );
      return;
    }

    const foundKey = botConfig.osintConfig.apiKeys.find(
      (k) => k.key.toLowerCase() === queriedKey.toLowerCase()
    );

    if (!foundKey) {
      await sendTelegramMessage(
        chatId,
        `❌ *API KEY TIDAK DITEMUKAN*\n\nKey \`${queriedKey}\` tidak terdaftar di sistem server OSINT.\n\nPastikan penulisan key sudah benar, atau hubungi Owner untuk membuat/membeli API Key:\n👤 *Owner Telegram:* @flood1233`,
        {
          inline_keyboard: [
            [{ text: '💎 Lihat Harga API Key', callback_data: 'cmd_pricing' }],
            [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }]
          ]
        }
      );
      return;
    }

    const quotaInfo =
      foundKey.tier === 'unlimited'
        ? '♾️ *Unlimited (Akses Tanpa Batas Kuota)*'
        : `*${foundKey.remainingQuota}x* ${foundKey.bonusQuota > 0 ? `_(+ BONUS ${foundKey.bonusQuota}x)_` : ''}`;

    const keyCard = `🔑 *DETAIL & STATUS API KEY OSINT*
━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 *API Key:* \`${foundKey.key}\`
🟢 *Status:* ${foundKey.enabled ? 'AKTIF' : 'NONAKTIF / DITANGGUHKAN'}
📊 *Paket:* ${foundKey.tier === 'unlimited' ? 'Unlimited VIP' : 'Limited Quota'}
📦 *Sisa Kuota:* ${quotaInfo}
📈 *Total Pemakaian:* ${foundKey.totalUsed}x
📝 *Catatan:* ${foundKey.ownerNotes || '-'}
🕒 *Terakhir Digunakan:* ${foundKey.lastUsedAt ? new Date(foundKey.lastUsedAt).toLocaleString('id-ID') : 'Belum pernah'}
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 *Cara Pakai:* \`search: <target> ${foundKey.key}\`
*Contoh:* \`search: jokowi ${foundKey.key}\`

📞 *Top Up Kuota:* @flood1233`;

    await sendTelegramMessage(chatId, keyCard, {
      inline_keyboard: [
        [{ text: '🔍 Cara Pakai OSINT', callback_data: 'cmd_osint' }],
        [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }],
        [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  }

  // Command: /history or /riwayat (ISOLATED PER CHAT ID)
  if (['/history', '/riwayat', 'history', 'riwayat'].includes(lowerText)) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();
    await handleUserHistoryCommand(Number(chatId), senderName);
    return;
  }

  // Command: search: <target> <apiKey>, /search, /cari, etc.
  const searchPrefixes = [
    'search:', '/search', 'osint:', 'cari:', '/cari', 'cek:', '/cek', 'track:', '/track'
  ];
  const isSearchCommand =
    searchPrefixes.some((p) => lowerText.startsWith(p)) ||
    lowerText.startsWith('search ') ||
    lowerText.startsWith('cari ') ||
    lowerText.startsWith('cek ') ||
    lowerText.startsWith('track ');

  if (isSearchCommand) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    // Parse target and apiKey
    let rawQuery = '';
    if (lowerText.startsWith('search:')) {
      rawQuery = text.substring(7).trim();
    } else if (lowerText.startsWith('/search')) {
      rawQuery = text.substring(7).trim();
    } else if (lowerText.startsWith('search ')) {
      rawQuery = text.substring(7).trim();
    } else if (lowerText.startsWith('osint:')) {
      rawQuery = text.substring(6).trim();
    } else if (lowerText.startsWith('cari:')) {
      rawQuery = text.substring(5).trim();
    } else if (lowerText.startsWith('/cari')) {
      rawQuery = text.substring(5).trim();
    } else if (lowerText.startsWith('cari ')) {
      rawQuery = text.substring(5).trim();
    } else if (lowerText.startsWith('cek:')) {
      rawQuery = text.substring(4).trim();
    } else if (lowerText.startsWith('/cek')) {
      rawQuery = text.substring(4).trim();
    } else if (lowerText.startsWith('cek ')) {
      rawQuery = text.substring(4).trim();
    } else if (lowerText.startsWith('track:')) {
      rawQuery = text.substring(6).trim();
    } else if (lowerText.startsWith('/track')) {
      rawQuery = text.substring(6).trim();
    } else if (lowerText.startsWith('track ')) {
      rawQuery = text.substring(6).trim();
    }

    if (rawQuery.startsWith(':')) {
      rawQuery = rawQuery.substring(1).trim();
    }

    const queryParts = rawQuery.split(/\s+/).filter(Boolean);

    if (queryParts.length === 0) {
      await sendTelegramMessage(
        chatId,
        `⚠️ *Format Perintah Kosong!*\n\n📖 *Cara Pakai:*\n• Menggunakan Kuota Pribadi: \`search: <target>\` atau \`/search <target>\`\n• Menggunakan API Key Khusus: \`search: <target> <apiKey>\`\n\n*Contoh:* \`search: jokowi\` atau \`cari: slamet\``,
        {
          inline_keyboard: [
            [{ text: '🎁 Klaim Kuota Gratis', callback_data: 'cmd_claim_menu' }],
            [{ text: '💎 Cek Sisa Kuota', callback_data: 'cmd_my_quota' }]
          ]
        }
      );
      return;
    }

    let target = '';
    let apiKey = '';

    // Check if the last part is explicitly a known API Key
    const lastToken = queryParts[queryParts.length - 1];
    const isLastTokenKey = botConfig.osintConfig.apiKeys.some(
      (k) => k.key.toLowerCase() === lastToken.toLowerCase()
    );

    const userPersonalKey = currentUser.personalApiKey || `usr_${currentUser.userId || chatId}`;

    if (queryParts.length >= 2 && isLastTokenKey) {
      apiKey = lastToken;
      target = queryParts.slice(0, queryParts.length - 1).join(' ');
    } else if (currentUser.personalQuota && currentUser.personalQuota > 0) {
      // User has personal quota, auto-use their personal API key!
      apiKey = userPersonalKey;
      target = queryParts.join(' ');
    } else {
      // User typed target without valid key and without remaining personal quota
      target = queryParts.join(' ');
      await sendTelegramMessage(
        chatId,
        `⚠️ *KUOTA PRIBADI ANDA: 0x PEMAKAIAN*\n\nAnda belum memiliki sisa kuota pribadi untuk mencari target: \`${target}\`.\n\n🎁 *Solusi Gratis:* Anda dapat mengklaim kuota gratis di menu klaim!\n• Pengguna Baru: *+${botConfig.quotaConfig?.newUserQuotaAmount || 5}x Kuota Gratis*\n• Kuota Harian: *+${botConfig.quotaConfig?.dailyQuotaAmount || 2}x Kuota Gratis per Hari*\n\nAtau gunakan API key khusus: \`search: ${target} <apiKey>\``,
        {
          inline_keyboard: [
            [{ text: '🎁 Ambil Kuota Gratis Sekarang', callback_data: 'cmd_claim_menu' }],
            [{ text: '💎 Daftar Harga & Top Up', callback_data: 'cmd_pricing' }],
            [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }]
          ]
        }
      );
      return;
    }

    const isUsingPersonalQuota =
      apiKey.toLowerCase() === userPersonalKey.toLowerCase() ||
      apiKey.startsWith('usr_');

    // 1. Check if OSINT external feature is required
    // NOTE: Personal quota users searching local dataset.txt are ALWAYS allowed without needing external server to be toggled ON!
    if (!isUsingPersonalQuota && !botConfig.osintConfig.enabled) {
      await sendTelegramMessage(
        chatId,
        `🔴 *SERVER DATA OSINT NONAKTIF (OFF)*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ Mohon maaf, Server Data OSINT saat ini *belum diaktifkan oleh Owner*.\n\nJika ingin menggunakan fitur ini, Anda harus menghubungi Owner Bot untuk mengaktifkan data OSINT nya:\n👤 *Owner Telegram:* @flood1233\n_(Bebas mau chat ataupun call, asal tidak spam)_`,
        {
          inline_keyboard: [
            [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }],
            [{ text: '🔄 Cek Status Server', callback_data: 'cmd_osint' }]
          ]
        }
      );
      return;
    }

    // 2. Validate API Key (Auto-sync personal user key if needed)
    let matchedKey = botConfig.osintConfig.apiKeys.find(
      (k) => k.key.toLowerCase() === apiKey.toLowerCase()
    );

    if (!matchedKey && isUsingPersonalQuota) {
      syncUserApiKey(currentUser);
      matchedKey = botConfig.osintConfig.apiKeys.find(
        (k) => k.key.toLowerCase() === apiKey.toLowerCase()
      );
    }

    if (!matchedKey || !matchedKey.enabled) {
      await sendTelegramMessage(
        chatId,
        `❌ *API KEY TIDAK VALID ATAU NONAKTIF*\n\nKey \`${apiKey}\` tidak dapat digunakan. Syarat menggunakan OSINT harus memiliki API Key resmi dari Owner.\n\n📞 Hubungi Owner untuk membeli atau meminta API Key:\n👤 *Owner Telegram:* @flood1233`,
        {
          inline_keyboard: [
            [{ text: '💎 Daftar Harga API Key', callback_data: 'cmd_pricing' }],
            [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }]
          ]
        }
      );
      return;
    }

    // 3. Check remaining quota
    const totalRemaining = matchedKey.remainingQuota + matchedKey.bonusQuota;
    if (matchedKey.tier === 'limited' && totalRemaining <= 0) {
      await sendTelegramMessage(
        chatId,
        `⚠️ *KUOTA API KEY TELAH HABIS (0x)*\n\nAPI Key \`${apiKey}\` sudah habis terpakai (${matchedKey.totalUsed}x pemakaian).\n\nSilakan hubungi Owner untuk top up kuota atau klaim kuota gratis:\n👤 *Owner Telegram:* @flood1233`,
        {
          inline_keyboard: [
            [{ text: '🎁 Klaim Kuota Gratis', callback_data: 'cmd_claim_menu' }],
            [{ text: '💎 Top Up Kuota API Key', callback_data: 'cmd_pricing' }],
            [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }]
          ]
        }
      );
      return;
    }

    // 4. Send typing indicator in header (Never spam 2x messages in 1 command)
    await sendTelegramChatAction(chatId, 'typing');

    // 5. Query Sanitization, Normalization, Spike Detection & Hot Caching
    const norm = sanitizeAndNormalizeQuery(target);
    if (!norm.isValid) {
      await sendTelegramMessage(chatId, `⚠️ *Pencarian Ditolak:* ${norm.reason}`);
      return;
    }
    const cleanTarget = norm.clean;
    recordSearchAndDetectSpike(chatId, senderName, cleanTarget);

    const engineMode = botConfig.osintConfig.searchEngineMode || 'smart_dataset';
    let localResult: any = null;

    const cacheKey = cleanTarget.toLowerCase();
    const cached = hotSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < SEARCH_CACHE_TTL_MS) {
      localResult = cached.result;
    } else if (engineMode !== 'ngrok_only') {
      try {
        localResult = await smartSearchDatasets(cleanTarget, 500);
        if (localResult) {
          hotSearchCache.set(cacheKey, { result: localResult, cachedAt: Date.now() });
          if (hotSearchCache.size > 250) {
            const firstK = hotSearchCache.keys().next().value;
            if (firstK) hotSearchCache.delete(firstK);
          }
        }
      } catch (e: any) {
        addLog('error', `Error scanning local datasets: ${e.message}`, chatId);
      }
    }

    if (localResult && localResult.totalMatches > 0) {
      // Data found directly in dataset.txt or uploaded dataset files!
      const cost = botConfig.quotaConfig?.quotaCostPerSearch || 1;
      if (matchedKey.tier === 'limited') {
        if (matchedKey.remainingQuota >= cost) {
          matchedKey.remainingQuota -= cost;
        } else if (matchedKey.remainingQuota > 0) {
          matchedKey.remainingQuota = 0;
        } else if (matchedKey.bonusQuota > 0) {
          matchedKey.bonusQuota = Math.max(0, matchedKey.bonusQuota - cost);
        }
      }
      matchedKey.totalUsed += 1;
      matchedKey.lastUsedAt = new Date().toISOString();
      if (
        (currentUser.personalApiKey && matchedKey.key.toLowerCase() === currentUser.personalApiKey.toLowerCase()) ||
        matchedKey.key.toLowerCase() === `usr_${currentUser.userId}`.toLowerCase() ||
        matchedKey.key.toLowerCase() === `usr_${currentUser.chatId}`.toLowerCase() ||
        isUsingPersonalQuota
      ) {
        currentUser.personalQuota = matchedKey.remainingQuota;
        const targetUser = botConfig.activeUsers.find(
          (u) => (u.userId && Number(u.userId) === Number(currentUser.userId)) || Number(u.chatId) === Number(currentUser.userId)
        );
        if (targetUser) {
          targetUser.personalQuota = matchedKey.remainingQuota;
        }
      }
      botConfig.stats.osintSearchesCount = (botConfig.stats.osintSearchesCount || 0) + 1;
      saveBotConfig();

      const newRemaining =
        matchedKey.tier === 'unlimited'
          ? '♾️ Unlimited'
          : `${matchedKey.remainingQuota}x ${matchedKey.bonusQuota > 0 ? `(+${matchedKey.bonusQuota} bonus)` : ''}`;

      const totalMatches = localResult.totalMatches;
      const searchId = `srch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (!Array.isArray(botConfig.searchHistories)) {
        botConfig.searchHistories = [];
      }
      const historyItem: OsintSearchHistoryItem = {
        id: searchId,
        chatId: Number(chatId),
        userName: senderName,
        usernameTag: usernameTag,
        target,
        apiKey,
        totalMatches,
        timestamp: new Date().toISOString(),
        formattedWib: wibTime.fullStr,
        rawResult: localResult.rawTextOutput
      };
      botConfig.searchHistories.unshift(historyItem);
      if (botConfig.searchHistories.length > 300) {
        botConfig.searchHistories = botConfig.searchHistories.slice(0, 300);
      }
      saveSearchItemToDisk(historyItem);
      saveBotConfig();

      addLog(
        'outgoing',
        `Hasil OSINT dataset ditemukan (${totalMatches} data) untuk ${senderName} (Chat: ${chatId}) dalam ${localResult.searchDurationMs}ms`,
        chatId
      );

      const { messageText, replyMarkup } = formatOsintPresentation(
        target,
        apiKey,
        totalMatches,
        newRemaining,
        wibTime,
        localResult.rawTextOutput,
        searchId
      );

      await sendTelegramMessage(chatId, messageText, replyMarkup);
      return;
    }

    // If local dataset has 0 matches:
    // Check if user has configured Ngrok fallback mode (hybrid or ngrok_only)
    if ((engineMode === 'hybrid' || engineMode === 'ngrok_only') && botConfig.osintConfig.ngrokUrl && !botConfig.osintConfig.ngrokUrl.includes('xxxx')) {
      const ngrokBase = botConfig.osintConfig.ngrokUrl.replace(/\/$/, '');
      const searchUrl = `${ngrokBase}/api/v1/search?q=${encodeURIComponent(target)}&apiKey=${encodeURIComponent(apiKey)}&key=${encodeURIComponent(apiKey)}`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const osintRes = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'TelegramBot-OSINT-Client/2.0',
            'ngrok-skip-browser-warning': 'true',
            'X-API-Key': apiKey,
            'Authorization': `Bearer ${apiKey}`
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (osintRes.ok) {
          const cost = botConfig.quotaConfig?.quotaCostPerSearch || 1;
          if (matchedKey.tier === 'limited') {
            if (matchedKey.remainingQuota >= cost) {
              matchedKey.remainingQuota -= cost;
            } else if (matchedKey.remainingQuota > 0) {
              matchedKey.remainingQuota = 0;
            } else if (matchedKey.bonusQuota > 0) {
              matchedKey.bonusQuota = Math.max(0, matchedKey.bonusQuota - cost);
            }
          }
          matchedKey.totalUsed += 1;
          matchedKey.lastUsedAt = new Date().toISOString();
          if (
            (currentUser.personalApiKey && matchedKey.key.toLowerCase() === currentUser.personalApiKey.toLowerCase()) ||
            matchedKey.key.toLowerCase() === `usr_${currentUser.userId}`.toLowerCase() ||
            matchedKey.key.toLowerCase() === `usr_${currentUser.chatId}`.toLowerCase() ||
            isUsingPersonalQuota
          ) {
            currentUser.personalQuota = matchedKey.remainingQuota;
            const targetUser = botConfig.activeUsers.find(
              (u) => (u.userId && Number(u.userId) === Number(currentUser.userId)) || Number(u.chatId) === Number(currentUser.userId)
            );
            if (targetUser) {
              targetUser.personalQuota = matchedKey.remainingQuota;
            }
          }
          botConfig.stats.osintSearchesCount = (botConfig.stats.osintSearchesCount || 0) + 1;
          saveBotConfig();

          const newRemaining =
            matchedKey.tier === 'unlimited'
              ? '♾️ Unlimited'
              : `${matchedKey.remainingQuota}x ${matchedKey.bonusQuota > 0 ? `(+${matchedKey.bonusQuota} bonus)` : ''}`;

          const contentType = osintRes.headers.get('content-type') || '';
          let resultText = '';
          let jsonData: any = null;

          if (contentType.includes('application/json')) {
            jsonData = await osintRes.json();
            resultText = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
          } else {
            resultText = await osintRes.text();
          }

          let totalMatches = 0;
          try {
            const parsedObj = typeof jsonData === 'object' && jsonData !== null ? jsonData : JSON.parse(resultText);
            if (typeof parsedObj.totalMatches === 'number') {
              totalMatches = parsedObj.totalMatches;
            } else if (Array.isArray(parsedObj.results)) {
              totalMatches = parsedObj.results.length;
            } else if (Array.isArray(parsedObj)) {
              totalMatches = parsedObj.length;
            } else if (typeof parsedObj.count === 'number') {
              totalMatches = parsedObj.count;
            } else if (parsedObj && Object.keys(parsedObj).length > 0) {
              totalMatches = 1;
            }
          } catch {
            const lines = resultText.split('\n').filter((l) => l.trim().length > 0);
            totalMatches = lines.length > 0 ? lines.length : 1;
          }

          const searchId = `srch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          if (!Array.isArray(botConfig.searchHistories)) {
            botConfig.searchHistories = [];
          }
          const historyItem: OsintSearchHistoryItem = {
            id: searchId,
            chatId: Number(chatId),
            userName: senderName,
            usernameTag: usernameTag,
            target,
            apiKey,
            totalMatches,
            timestamp: new Date().toISOString(),
            formattedWib: wibTime.fullStr,
            rawResult: resultText
          };
          botConfig.searchHistories.unshift(historyItem);
          if (botConfig.searchHistories.length > 300) {
            botConfig.searchHistories = botConfig.searchHistories.slice(0, 300);
          }
          saveSearchItemToDisk(historyItem);
          saveBotConfig();

          const { messageText, replyMarkup } = formatOsintPresentation(
            target,
            apiKey,
            totalMatches,
            newRemaining,
            wibTime,
            resultText,
            searchId
          );

          await sendTelegramMessage(chatId, messageText, replyMarkup);
          return;
        } else {
          // Server returned error (e.g. 403)
          const errText = await osintRes.text().catch(() => '');
          let cleanExplanation = '';
          try {
            const errJson = JSON.parse(errText);
            cleanExplanation = errJson.message || errJson.error || '';
          } catch {
            cleanExplanation = errText.replace(/<[^>]*>?/gm, '').trim();
          }

          if (!cleanExplanation) {
            cleanExplanation =
              osintRes.status === 403
                ? `API Key '${apiKey}' belum terdaftar di backend server.`
                : `Server backend merespon HTTP ${osintRes.status}.`;
          }

          const currentRemaining =
            matchedKey.tier === 'unlimited'
              ? '♾️ Unlimited'
              : `${matchedKey.remainingQuota}x ${matchedKey.bonusQuota > 0 ? `(+${matchedKey.bonusQuota} bonus)` : ''}`;

          const failureCard =
            engineMode === 'ngrok_only'
              ? `ℹ️ *SERVER NGROK MERESPON ${osintRes.status}*
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *Target:* \`${target}\`
🔑 *API Key:* \`${apiKey}\`
🌐 *Server Ngrok:* ${cleanExplanation}
━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ *Status Kuota:* Kuota Anda *TIDAK DIPOTONG* (Sisa: *${currentRemaining}*).
💡 *Solusi:* Pastikan format query dan API key di backend Ngrok telah sesuai, atau gunakan mode *File Dataset (dataset.txt)* di Panel untuk pencarian instan lokal.`
              : `ℹ️ *TIDAK DITEMUKAN DI DATASET & SERVER MERESPON ${osintRes.status}*
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *Target:* \`${target}\`
🔑 *API Key:* \`${apiKey}\`
📁 *Dataset Lokal:* Tidak ditemukan data di dataset.txt
🌐 *Server Ngrok:* ${cleanExplanation}
━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ *Status Kuota:* Kuota Anda *TIDAK DIPOTONG* (Sisa: *${currentRemaining}*).
💡 *Solusi:* Anda bisa mengunggah file dataset berisi target ini via Web Dashboard pada tab *File Dataset (dataset.txt)* agar dapat langsung dicari tanpa server eksternal!`;

          addLog('error', `OSINT Search (${engineMode}): HTTP ${osintRes.status}: ${cleanExplanation}`, chatId);
          await sendTelegramMessage(chatId, failureCard);
          return;
        }
      } catch (fetchErr: any) {
        addLog('error', `Koneksi Ngrok gagal (${engineMode}): ${fetchErr.message}`);
        if (engineMode === 'ngrok_only') {
          const currentRemaining =
            matchedKey.tier === 'unlimited'
              ? '♾️ Unlimited'
              : `${matchedKey.remainingQuota}x ${matchedKey.bonusQuota > 0 ? `(+${matchedKey.bonusQuota} bonus)` : ''}`;
          await sendTelegramMessage(
            chatId,
            `❌ *SERVER NGROK TIDAK DAPAT DIAKSES*\n\n🎯 *Target:* \`${target}\`\n🌐 *URL Ngrok:* \`${botConfig.osintConfig.ngrokUrl}\`\n⚠️ *Keterangan:* ${fetchErr.message || 'Koneksi timeout/offline'}\n\n🛡️ Kuota Anda *TIDAK DIPOTONG* (Sisa: *${currentRemaining}*).\n💡 *Solusi:* Pastikan tunnel Ngrok aktif, atau ubah mode ke *File Dataset (dataset.txt)* di Panel agar pencarian langsung dari arsip lokal tanpa server eksternal!`
          );
          return;
        }
      }
    }

    // Default: Smart Dataset Mode (Target not found in dataset.txt or any dataset files)
    const currentRemaining =
      matchedKey.tier === 'unlimited'
        ? '♾️ Unlimited'
        : `${matchedKey.remainingQuota}x ${matchedKey.bonusQuota > 0 ? `(+${matchedKey.bonusQuota} bonus)` : ''}`;

    const notFoundCard = `ℹ️ *DATA TIDAK DITEMUKAN*
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *Target:* \`${target}\`
🔑 *API Key:* \`${apiKey}\`
📁 *Sumber Data:* \`dataset.txt\` & Arsip Dataset Pintar
━━━━━━━━━━━━━━━━━━━━━━━━━
Sistem pintar telah memindai seluruh file dataset aktif (\`dataset.txt\`), namun data untuk target \`${target}\` tidak ditemukan.

🛡️ *Status Kuota:*
Kuota Anda *TIDAK DIPOTONG* (Sisa kuota: *${currentRemaining}*).

💡 *Tips:*
Anda dapat menambahkan atau mengunggah data baru kapan saja melalui *Web Controller* di tab *File Dataset (dataset.txt)*. Data yang diunggah akan langsung bisa dicari secara otomatis!`;

    addLog('system', `Pencarian target "${target}" selesai (0 match di dataset lokal). Kuota tidak dipotong.`, chatId);
    await sendTelegramMessage(chatId, notFoundCard, {
      inline_keyboard: [
        [{ text: '💎 Cek Sisa Kuota', callback_data: `api_${apiKey}` }],
        [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  }

  // Command: /owner, /kontak, /admin
  if (['/owner', '/kontak', '/admin'].includes(lowerText)) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    const owner = getEffectiveBotOwner(sourceBot);
    const bInfo = getEffectiveBotInfo(sourceBot);

    const ownerCard = `📞 *KONTAK RESMI OWNER & ADMIN BOT*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Target Bot:* ${bInfo.name} (${bInfo.username})
👤 *Owner Utama:* ${owner.username}
💬 *Layanan Resmi:*
• Mengaktifkan / Menyalakan Server Data OSINT
• Pembelian & Top Up Kuota API Key
• Paket Hemat & Paket Unlimited Tanpa Batas
• Bantuan Teknis & Sewa Bot Telegram

💡 _Bebas mau dengan chat ataupun call, asal tidak spam!_
━━━━━━━━━━━━━━━━━━━━━━━━━`;

    await sendTelegramMessage(chatId, ownerCard, {
      inline_keyboard: [
        [{ text: `📞 Buka Chat Owner (${owner.username})`, url: owner.url }],
        [{ text: '💎 Daftar Harga API Key', callback_data: 'cmd_pricing' }],
        [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  }

  // Command: /bot, /detail, /info, /about (DETAIL BOT)
  if (['/bot', '/detail', '/info', '/about'].includes(lowerText)) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    const botCard = formatBotDetailCard(sourceBot);

    await sendTelegramMessage(chatId, botCard, {
      inline_keyboard: [
        [{ text: '🆔 Cek ID Saya', callback_data: 'cmd_id' }],
        [{ text: '🏠 Kembali ke Menu', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  }

  // Command: /ping
  if (lowerText === '/ping') {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    const pingText = formatBotPingCard(sourceBot, wibTime.timeStr);
    await sendTelegramMessage(chatId, pingText);
    return;
  }

  // Command: /waktu or /time
  if (lowerText === '/waktu' || lowerText === '/time') {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    const now = new Date();
    const wibStr = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', timeStyle: 'medium', dateStyle: 'full' }).format(now);
    const witaStr = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', timeStyle: 'medium' }).format(now);
    const witStr = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jayapura', timeStyle: 'medium' }).format(now);

    const timeText = `⏰ *INFORMASI WAKTU REAL-TIME*
━━━━━━━━━━━━━━━━━━━━━━━━━
🇮🇩 *Zona Waktu Indonesia:*
• *WIB (Jakarta):* ${wibStr} WIB
• *WITA (Bali/Makassar):* ${witaStr} WITA
• *WIT (Jayapura):* ${witStr} WIT
━━━━━━━━━━━━━━━━━━━━━━━━━`;

    await sendTelegramMessage(chatId, timeText);
    return;
  }

  // Command: /help or /bantuan
  if (lowerText === '/help' || lowerText === '/bantuan') {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();

    const owner = getEffectiveBotOwner(sourceBot);
    let customCmdList = '';
    if (botConfig.customCommands && botConfig.customCommands.length > 0) {
      const activeCustom = botConfig.customCommands.filter((c) => c.enabled);
      if (activeCustom.length > 0) {
        customCmdList = '\n\n*Perintah Kustom Web:*\n' + activeCustom.map((c) => `• /${c.command} - ${c.description}`).join('\n');
      }
    }

    const helpText = `📖 *PANDUAN & DAFTAR PERINTAH BOT*
━━━━━━━━━━━━━━━━━━━━━━━━━
*Perintah Utama:*
• /start atau /menu - Membuka menu interaktif
• /id - Cek Chat ID & status verifikasi akun
• /osint - Cek status & petunjuk intelijen OSINT
• /harga - Daftar harga & promo kuota API Key
• api <apiKey> - Cek sisa kuota API Key (Contoh: api ppp)
• search: <target> <key> - Cari data intelijen OSINT
• /bot - Detail lengkap spesifikasi bot
• /ping - Tes latency & status respon bot
• /waktu - Jam real-time WIB/WITA/WIT
• /owner - Hubungi owner resmi (${owner.username})
• /calc <rumus> - Kalkulator cepat (contoh: /calc 5000*3+250)
• /echo <teks> - Mengulang pesan yang dikirim${customCmdList}

💡 _Semua fitur aktif otomatis selama bot ON di Web Dashboard._`;

    await sendTelegramMessage(chatId, helpText, getMainInlineMenu(botConfig.osintConfig.enabled, sourceBot));
    return;
  }

  // Command: /echo <teks>
  if (lowerText.startsWith('/echo ')) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();
    const echoContent = text.substring(6).trim();
    await sendTelegramMessage(chatId, `📢 *Gema Pesan (Echo):*\n\n${echoContent}`);
    return;
  }

  // Command: /calc <expression>
  if (lowerText.startsWith('/calc ')) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();
    const expr = text.substring(6).trim();
    try {
      if (/^[0-9+\-*/().\s^%]+$/.test(expr)) {
        // Safe evaluation
        // eslint-disable-next-line no-new-func
        const result = Function(`'use strict'; return (${expr})`)();
        await sendTelegramMessage(chatId, `🧮 *Hasil Perhitungan:*\n\`${expr}\` = *${result}*`);
      } else {
        await sendTelegramMessage(chatId, '⚠️ Rumus hanya boleh berisi angka dan operator (+, -, *, /, %).');
      }
    } catch {
      await sendTelegramMessage(chatId, '❌ Format perhitungan salah. Contoh: `/calc 1500 * 3 + 250`');
    }
    return;
  }

  // Check Custom Commands
  if (text.startsWith('/')) {
    const cmdName = text.substring(1).split(' ')[0].toLowerCase();
    const customMatch = botConfig.customCommands.find(
      (c) => c.enabled && c.command.toLowerCase() === cmdName
    );
    if (customMatch) {
      botConfig.stats.commandsExecuted += 1;
      saveBotConfig();
      await sendTelegramMessage(chatId, customMatch.replyText);
      return;
    }
  }

  // Check Keyword Auto-Replies
  for (const rule of botConfig.autoReplies) {
    if (!rule.enabled) continue;
    const trigger = rule.triggerKeyword.toLowerCase().trim();
    let isMatch = false;

    if (rule.matchType === 'exact') {
      isMatch = lowerText === trigger;
    } else {
      isMatch = lowerText.includes(trigger);
    }

    if (isMatch) {
      await sendTelegramMessage(chatId, rule.replyText);
      return;
    }
  }

  // SILENT FALLBACK IN GROUPS (Prevents bot spamming on casual member messages!)
  if (isGroup) {
    if (isExplicitMention) {
      await sendTelegramMessage(
        chatId,
        `👋 Halo *${senderName}*! Saya Bot Intelligence siap digunakan di grup ini.\n\n` +
        `Gunakan perintah resmi:\n` +
        `• /menu - Menu Interaktif\n` +
        `• /id - Cek Chat ID Grup & Profil\n` +
        `• /osint - Status Server Intelijen\n` +
        `• \`search: <target> <apiKey>\` - Cari Data Intelijen\n` +
        `• /ping - Tes Kecepatan Bot`
      );
    }
    // Silent in group: Do NOT send default reply on ordinary member conversations!
    return;
  }

  // Intelligent Direct Query Search (Private chat auto-detection)
  const looksLikeQuery =
    !isGroup &&
    rawText.length >= 3 &&
    rawText.length <= 60 &&
    !rawText.includes('\n') &&
    !rawText.startsWith('/') &&
    currentUser.personalQuota &&
    currentUser.personalQuota > 0;

  if (looksLikeQuery) {
    botConfig.stats.commandsExecuted += 1;
    saveBotConfig();
    const norm = sanitizeAndNormalizeQuery(rawText);
    if (!norm.isValid) {
      await sendTelegramMessage(chatId, `⚠️ *Pencarian Ditolak:* ${norm.reason}`);
      return;
    }
    const queryTarget = norm.clean;
    recordSearchAndDetectSpike(chatId, senderName, queryTarget);

    const cost = botConfig.quotaConfig?.quotaCostPerSearch || 1;

    // Send typing indicator so Telegram displays "typing..." in header without sending duplicate message
    await sendTelegramChatAction(chatId, 'typing');

    let localResult: any = null;
    const cacheKey = queryTarget.toLowerCase();
    const cached = hotSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < SEARCH_CACHE_TTL_MS) {
      localResult = cached.result;
    } else {
      try {
        localResult = await smartSearchDatasets(queryTarget, 500);
        if (localResult) {
          hotSearchCache.set(cacheKey, { result: localResult, cachedAt: Date.now() });
          if (hotSearchCache.size > 250) {
            const firstK = hotSearchCache.keys().next().value;
            if (firstK) hotSearchCache.delete(firstK);
          }
        }
      } catch (e: any) {
        addLog('error', `Error scanning local datasets: ${e.message}`, chatId);
      }
    }

    if (localResult && localResult.totalMatches > 0) {
      currentUser.personalQuota = Math.max(0, currentUser.personalQuota - cost);
      syncUserApiKey(currentUser);
      botConfig.stats.osintSearchesCount = (botConfig.stats.osintSearchesCount || 0) + 1;
      saveBotConfig();

      const newRemaining = `${currentUser.personalQuota}x`;
      const totalMatches = localResult.totalMatches;
      const searchId = `srch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (!Array.isArray(botConfig.searchHistories)) {
        botConfig.searchHistories = [];
      }
      const historyItem: OsintSearchHistoryItem = {
        id: searchId,
        chatId: Number(chatId),
        userName: senderName,
        usernameTag: usernameTag,
        target: queryTarget,
        apiKey: currentUser.personalApiKey || `usr_${from.id}`,
        totalMatches,
        timestamp: new Date().toISOString(),
        formattedWib: wibTime.fullStr,
        rawResult: localResult.rawTextOutput
      };
      botConfig.searchHistories.unshift(historyItem);
      if (botConfig.searchHistories.length > 300) {
        botConfig.searchHistories = botConfig.searchHistories.slice(0, 300);
      }
      saveSearchItemToDisk(historyItem);
      saveBotConfig();

      const { messageText, replyMarkup } = formatOsintPresentation(
        queryTarget,
        currentUser.personalApiKey || `usr_${from.id}`,
        totalMatches,
        newRemaining,
        wibTime,
        localResult.rawTextOutput,
        searchId
      );

      await sendTelegramMessage(chatId, messageText, replyMarkup);
      return;
    } else {
      const notFoundCard = `ℹ️ *DATA TIDAK DITEMUKAN*
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *Target:* \`${queryTarget}\`
📁 *Sumber Data:* \`dataset.txt\` & Arsip Dataset Pintar
━━━━━━━━━━━━━━━━━━━━━━━━━
Sistem telah memindai seluruh file dataset aktif, namun data untuk target \`${queryTarget}\` belum ditemukan.

🛡️ *Status Kuota:*
Kuota Anda *TIDAK DIPOTONG* (Sisa kuota: *${currentUser.personalQuota}x*).

💡 *Format Pencarian Resmi:*
\`search: <target>\` atau \`/search <target>\``;

      await sendTelegramMessage(chatId, notFoundCard, {
        inline_keyboard: [
          [{ text: '💎 Cek Saldo Kuota', callback_data: 'cmd_my_quota' }],
          [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
        ]
      });
      return;
    }
  }

  // Default fallback response for private chat only
  const defaultReply = `Halo *${senderName}*! Pesan kamu telah diterima oleh server bot.
Ketik /id untuk melihat Chat ID, ketik /osint untuk fitur intelijen, atau ketik /menu untuk membuka menu lengkap.`;

  await sendTelegramMessage(chatId, defaultReply, getMainInlineMenu(botConfig.osintConfig.enabled));
}

// Safely answer Telegram callback query to clear button spinner, with graceful error/abort handling
async function safeAnswerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false, timeoutMs = 8000) {
  if (!botConfig.token || !callbackQueryId) return;
  try {
    const payload: Record<string, any> = { callback_query_id: callbackQueryId };
    if (text) {
      payload.text = text;
      payload.show_alert = showAlert;
    }
    await callTelegramApi(botConfig.token, 'answerCallbackQuery', payload, timeoutMs);
  } catch (_err: any) {
    // Gracefully handle aborts, network timeouts, or expired query errors
    // Telegram callback queries expire after a few seconds or when network is congested.
    // Suppress console.error since this is a non-fatal, background acknowledgement.
  }
}

// Handle Telegram Callback Query (Inline Button Click)
async function handleCallbackQuery(cbQuery: any, sourceBot?: MultiBotInstance) {
  if (!cbQuery || !cbQuery.message) return;

  const data = cbQuery.data;
  const message = cbQuery.message;
  const chatId = message.chat.id;
  const from = cbQuery.from;
  const senderName = [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || 'Pengguna';
  const usernameTag = from.username ? `@${from.username}` : '-';

  addLog('callback', `Tombol ditekan: "${data}"`, chatId, `${senderName} (${usernameTag})`);

  // Anti-Spam debounce on callback queries (1.2s cooldown per user)
  const cbKey = `cb_${from.id}`;
  const nowCb = Date.now();
  const lastCb = lastUserActionTimestamp.get(cbKey) || 0;
  if (nowCb - lastCb < 1200) {
    safeAnswerCallbackQuery(cbQuery.id, '⏳ Mohon tunggu sebentar...', false, 4000);
    return;
  }
  lastUserActionTimestamp.set(cbKey, nowCb);

  // Acknowledge the callback query immediately to clear Telegram's loading spinner without blocking
  safeAnswerCallbackQuery(cbQuery.id);

  const wibTime = getFormattedWIB();
  const pricing = getPricingData(from.language_code);

  // Verification button handler (Anti-re-registration)
  if (data === 'verify_id') {
    const user = botConfig.activeUsers.find((u) => Number(u.chatId) === Number(chatId));
    if (user && user.isVerified) {
      // User is already verified! Never re-verify or reset
      const alreadyVerifiedCard = `ℹ️ *AKUN ANDA SUDAH TERVERIFIKASI RESMI!*
━━━━━━━━━━━━━━━━━━━━━━━━━
Halo, *${senderName}*! Akun Anda sebelumnya telah terverifikasi di sistem kami sejak:
🕒 *${formatWibDate(user.verifiedAt || user.firstSeen)}*

🆔 *Chat ID:* \`${chatId}\`
💎 *Sisa Kuota Pribadi:* *${user.personalQuota || 0}x Pencarian*
🔑 *API Key Pribadi:* \`${user.personalApiKey || `usr_${chatId}`}\`

💡 _Status akun Anda tetap aman dan tidak pernah direset. Anda dapat langsung menggunakan semua fitur bot atau mengklaim kuota gratis di bawah._`;

      await sendTelegramMessage(chatId, alreadyVerifiedCard, {
        inline_keyboard: [
          [{ text: '🎁 Menu Klaim Kuota', callback_data: 'cmd_claim_menu' }],
          [{ text: '💎 Cek Kuota Saya', callback_data: 'cmd_my_quota' }],
          [{ text: '🏠 Buka Menu Utama', callback_data: 'cmd_menu' }]
        ]
      });
      return;
    }

    if (user) {
      user.isVerified = true;
      user.verifiedAt = new Date().toISOString();
      syncUserApiKey(user);
      saveBotConfig();
    }

    const verifiedCard = `✅ *AKUN BERHASIL TERVERIFIKASI RESMI!*
━━━━━━━━━━━━━━━━━━━━━━━━━
Terima kasih, *${senderName}*! Akun Telegram Anda telah terverifikasi secara resmi.

🆔 *Chat ID:* \`${chatId}\`
👤 *Nama Lengkap:* ${senderName}
🏷 *Username:* ${usernameTag}
🕒 *Waktu Verifikasi:* ${wibTime.fullStr}
━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 *HADIAH SAMBUTAN PENGGUNA BARU:*
Sebagai pengguna terverifikasi, Anda berhak mengklaim *+5x Kuota Pencarian OSINT Gratis* (1x seumur hidup)!

👉 *Klik tombol di bawah untuk mengambil kuota gratis Anda:*`;

    await sendTelegramMessage(chatId, verifiedCard, {
      inline_keyboard: [
        [{ text: '🎁 Ambil Kuota Pengguna Baru (+5x)', callback_data: 'claim_new_user' }],
        [{ text: '🏠 Buka Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  }

  // Claim Quota Dashboard Callback
  if (data === 'cmd_claim_menu') {
    await sendClaimQuotaDashboard(from.id, chatId, senderName);
    return;
  }

  // My Quota & Profile Callback
  if (data === 'cmd_my_quota') {
    await sendUserQuotaStatus(from.id, chatId, senderName);
    return;
  }

  // Referral & Savings Dashboard Callbacks
  if (data === 'cmd_referral' || data === 'ref_dashboard') {
    await sendReferralDashboard(from.id, chatId, senderName);
    return;
  }

  if (data === 'ref_withdraw_all') {
    await handleWithdrawReferralQuota(from.id, chatId, senderName, 'all');
    return;
  }

  if (data === 'ref_withdraw_1') {
    await handleWithdrawReferralQuota(from.id, chatId, senderName, 1);
    return;
  }

  if (data === 'ref_withdraw_2') {
    await handleWithdrawReferralQuota(from.id, chatId, senderName, 2);
    return;
  }

  if (data === 'ref_withdraw_5') {
    await handleWithdrawReferralQuota(from.id, chatId, senderName, 5);
    return;
  }

  if (data === 'ref_withdraw_custom') {
    const user = botConfig.activeUsers.find((u) => Number(u.userId || u.chatId) === Number(from.id));
    const currentVault = user?.referralVaultBalance || 0;
    await sendTelegramMessage(
      chatId,
      `🔢 *TARIK KUOTA TABUNGAN DENGAN JUMLAH KUSTOM*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n💼 Saldo Tabungan Anda saat ini: *${currentVault}x Kuota*\n\n👉 *Ketik perintah:* \`/tarik <jumlah>\`\n\n*Contoh:*\n• \`/tarik 1\` (Tarik 1 kuota)\n• \`/tarik 3\` (Tarik 3 kuota)\n• \`/tarik 10\` (Tarik 10 kuota)\n• \`/tarik semua\` (Tarik seluruh saldo tabungan)\n\nKuota yang ditarik akan langsung masuk ke Saldo Kuota Pencarian Aktif Anda dan siap dipakai untuk perintah \`search:\`!`,
      {
        inline_keyboard: [
          [{ text: '💰 Tarik Semua Sekarang', callback_data: 'ref_withdraw_all' }],
          [{ text: '💼 Kembali ke Dashboard Tabungan', callback_data: 'cmd_referral' }]
        ]
      }
    );
    return;
  }

  if (data === 'ref_share_info') {
    await sendReferralShareCard(from.id, chatId, senderName);
    return;
  }

  if (data === 'ref_my_friends') {
    await sendReferralFriendsList(from.id, chatId, senderName);
    return;
  }

  // Claim New User Quota Action Callback
  if (data === 'claim_new_user') {
    await handleClaimNewUserQuota(from.id, chatId, senderName);
    return;
  }

  // Claim Daily Quota Action Callback
  if (data === 'claim_daily') {
    await handleClaimDailyQuota(from.id, chatId, senderName);
    return;
  }

  // OSINT Menu Callback
  if (data === 'cmd_osint') {
    const isOsintOn = botConfig.osintConfig.enabled;
    if (!isOsintOn) {
      const offCard = `🔴 *STATUS SERVER DATA OSINT: NONAKTIF (OFF)*
━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *Mohon maaf, Server Data OSINT saat ini belum diaktifkan oleh Owner.*

Fitur pencarian intelijen tidak dapat digunakan selama server masih dalam keadaan nonaktif.

📞 *CARA MENGAKTIFKAN:*
Jika Anda ingin menggunakan fitur ini, Anda harus menghubungi Owner Bot untuk mengaktifkan data/server OSINT:
👤 *Owner Telegram:* @flood1233
_(Bebas mau chat ataupun call, asal tidak spam)_
━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, offCard, {
        inline_keyboard: [
          [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }],
          [{ text: '💎 Lihat Tarif Harga API Key', callback_data: 'cmd_pricing' }],
          [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'cmd_menu' }]
        ]
      });
    } else {
      const onCard = `🟢 *STATUS SERVER DATA OSINT: AKTIF (ON)*
━━━━━━━━━━━━━━━━━━━━━━━━━
Server Data OSINT saat ini *SEDANG AKTIF* dan siap digunakan!

📖 *CARA MENGGUNAKAN OSINT:*
Kirim pesan dengan format:
\`search: <target> <apiKey>\`

*Contoh:* \`search: jokowi ppp\`

🔍 *CEK SISA KUOTA API KEY:*
Ketik: \`api <apiKey>\` (Contoh: \`api ppp\`)

💎 *TARIF HARGA API KEY (${pricing.currency}):*
${pricing.formatted}

${pricing.note}

🛒 *PEMBELIAN & TOP UP API KEY:*
👤 *Owner Telegram:* @flood1233
_(Bebas mau chat ataupun call, asal tidak spam)_
━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, onCard, {
        inline_keyboard: [
          [{ text: '💎 Cek Kuota API Key', callback_data: 'cmd_pricing' }],
          [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }],
          [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'cmd_menu' }]
        ]
      });
    }
    return;
  }

  // Pricing Callback
  if (data === 'cmd_pricing') {
    const priceCard = `💎 *DAFTAR HARGA API KEY & SEWA BOT TELEGRAM*
━━━━━━━━━━━━━━━━━━━━━━━━━
Mata Uang Terdeteksi: *${pricing.currency}*

🔑 *1. PAKET API KEY OSINT:*
${pricing.formatted}

${pricing.note}

━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *2. SEWA BOT TELEGRAM PRIBADI (DEDICATED):*
• *Paket 1 Bulan:* *Rp 50.000* _(Dedicated Bot + Full OSINT)_
• *Paket 3 Bulan (VIP):* *Rp 125.000* _(Prioritas + Custom Menu + Unlimited Admin)_
• *Paket Lifetime:* *Rp 250.000* _(Sekali Bayar Aktif Selamanya)_

💡 _Bot sewa akan memakai username & profil Anda sendiri, berjalan 24/7 tanpa perlu sewa VPS pribadi._

📞 *Pemesanan & Top Up Langsung:* @flood1233
━━━━━━━━━━━━━━━━━━━━━━━━━`;

    await sendTelegramMessage(chatId, priceCard, {
      inline_keyboard: [
        [{ text: '🤖 Detail Paket Sewa Bot', callback_data: 'cmd_rental_info' }],
        [{ text: '📞 Hubungi Owner @flood1233', url: 'https://t.me/flood1233' }],
        [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  }

  // Sewa Bot Rental Info Callback
  if (data === 'cmd_rental_info') {
    const rentalCard = `🤖 *LAYANAN SEWA BOT TELEGRAM PRIBADI (DEDICATED BOT)*
━━━━━━━━━━━━━━━━━━━━━━━━━
Mau punya bot intelijen OSINT canggih dengan nama, username, avatar, dan identitas komunitas Anda sendiri?

✨ *KEUNGGULAN SEWA BOT DEDICATED:*
✅ *Bot Telegram Milik Anda Sendiri* (Bebas tentukan username & profil di @BotFather)
✅ *Akses Penuh Database OSINT & NIK* 1 Juta+ arsip kebocoran data
✅ *Online 24/7 Always-ON* (Server hosting cepat tanpa perlu sewa VPS pribadi)
✅ *Sistem Kuota Gratis & Manajemen Tabungan Referral* otomatis
✅ *Bebas Atur Menu & Watermark* brand komunitas Anda
✅ *Fitur Keamanan Anti-Spam & Moderasi Grup* bawaan

━━━━━━━━━━━━━━━━━━━━━━━━━
💎 *PILIHAN PAKET SEWA BOT:*
1️⃣ *PAKET STARTER (30 HARI / 1 BULAN)*
   • Harga: *Rp 50.000* ($3.50)
   • 1 Dedicated Bot Aktif 24/7 Full Database OSINT

2️⃣ *PAKET PRO VIP (90 HARI / 3 BULAN) [TERPOPULER!]*
   • Harga: *Rp 125.000* ($8.50)
   • Bebas pasang Watermark, Jalur Proxy Prioritas, Admin Unlimited

3️⃣ *PAKET LIFETIME / PERMANEN (SEKALI BAYAR)*
   • Harga: *Rp 250.000* (Sekali Bayar Aktif Selamanya)
   • Tanpa biaya bulanan lagi + Update dataset otomatis

━━━━━━━━━━━━━━━━━━━━━━━━━
🛒 *CARA MEMESAN & AKTIVASI:*
1. Buat bot baru di @BotFather lalu salin token HTTP API Anda.
2. Kirimkan token dan bukti pemesanan ke Admin:
👤 *Owner Telegram:* @flood1233
_(Bebas mau chat ataupun call, asal tidak spam)_
3. Bot Anda langsung aktif dan online seketika!`;

    await sendTelegramMessage(chatId, rentalCard, {
      inline_keyboard: [
        [{ text: '📞 Pesan ke Owner @flood1233', url: 'https://t.me/flood1233' }],
        [{ text: '💎 Daftar Harga API Key', callback_data: 'cmd_pricing' }],
        [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  }

  // Multi-Bot Info & List Callback
  if (data === 'cmd_multibot_info' || data === 'cmd_list_bots') {
    const bots = botConfig.multiBots || [];
    const masterOwner = getEffectiveBotOwner(null);
    const listStr = bots
      .map((b, i) => {
        const u = b.botInfo?.username ? `@${b.botInfo.username}` : `ID: ${b.id}`;
        const st = b.isActive ? '🟢 Online' : '🔴 Paused';
        const notesStr = b.notes ? `\n   • Info: ${b.notes}` : '';
        const rentedStr = b.rentedBy || b.primaryOwner ? `\n   • Penyewa: ${b.rentedBy || b.primaryOwner}` : '';
        return `${i + 1}. *${b.botInfo?.first_name || 'Bot'}* (${u})\n   • Status: ${st} | ID: \`${b.id}\`${notesStr}${rentedStr}`;
      })
      .join('\n\n');

    const multiCard = `🌐 *STATUS MULTI-BOT CLUSTER*
━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *MASTER BOT:* @${currentBotInfo?.username || 'Primary'} (${botConfig.isActive ? '🟢 ONLINE' : '🔴 OFFLINE'})

🤖 *SECONDARY WORKER BOTS (${bots.length}):*
${listStr || '_Belum ada secondary bot. Owner dapat mengetik /addbot <token> untuk menambah._'}
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Semua bot terhubung ke database OSINT, kuota, dan sistem referral yang sama._`;

    await sendTelegramMessage(chatId, multiCard, {
      inline_keyboard: [
        [{ text: '🤖 Info Paket Sewa Bot', callback_data: 'cmd_rental_info' }],
        [{ text: `📞 Hubungi Master Owner (${masterOwner.username})`, url: masterOwner.url }],
        [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  }

  // Owner Callback
  if (data === 'cmd_owner') {
    const owner = getEffectiveBotOwner(sourceBot);
    const bInfo = getEffectiveBotInfo(sourceBot);

    const ownerCard = `📞 *KONTAK RESMI OWNER & ADMIN BOT*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Target Bot:* ${bInfo.name} (${bInfo.username})
👤 *Owner Utama:* ${owner.username}
💬 *Layanan Resmi:*
• Mengaktifkan Server Data OSINT
• Pembelian & Top Up Kuota API Key
• Paket Hemat & Unlimited
• Bantuan Teknis & Sewa Bot

💡 _Bebas mau dengan chat ataupun call, asal tidak spam!_
━━━━━━━━━━━━━━━━━━━━━━━━━`;

    await sendTelegramMessage(chatId, ownerCard, {
      inline_keyboard: [
        [{ text: `📞 Buka Chat Owner (${owner.username})`, url: owner.url }],
        [{ text: '💎 Daftar Harga API Key', callback_data: 'cmd_pricing' }],
        [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  }

  // Calculator info callback
  if (data === 'cmd_calc_info') {
    await sendTelegramMessage(
      chatId,
      `🧮 *FITUR KALKULATOR CEPAT BOT*\n\nKetik perintah dengan format:\n\`/calc <rumus>\`\n\n*Contoh:* \`/calc 2500 * 4 + 1500\`\n• Mendukung perkalian (*), pembagian (/), penambahan (+), pengurangan (-), dan pangkat (^).`
    );
    return;
  }

  // 🛡️ STRICT OWNER SECURITY FOR ALL AX_ AND OWNER CALLBACKS
  if (
    data.startsWith('ax_') ||
    data === 'cmd_list_owners' ||
    data === 'cmd_list_bots' ||
    data === 'cmd_sewa_info' ||
    data.startsWith('approve_clone_') ||
    data.startsWith('reject_clone_')
  ) {
    const auth = isUserAuthorizedOwner(from, sourceBot);
    if (!auth.authorized) {
      addLog(
        'warn',
        `🚨 [CALLBACK OWNER DITOLAK] Pengguna ${from.id} (@${from.username || '-'}) mencoba menekan tombol owner '${data}' tanpa izin.`,
        chatId,
        senderName
      );
      safeAnswerCallbackQuery(cbQuery.id, '⛔ AKSES DITOLAK! Anda bukan Owner resmi bot ini.', true);
      await sendTelegramMessage(
        chatId,
        `⛔ *AKSES DITOLAK: KEAMANAN OWNER TINGKAT TINGGI*\n━━━━━━━━━━━━━━━━━━━━━━━━━\nTombol atau menu khusus ini hanya boleh dieksekusi oleh Owner Resmi yang terdaftar.`
      );
      return;
    }
  }

  // Sewa Bot Status Toggle Callbacks
  if (data === 'ax_sewa_on') {
    if (sourceBot) {
      sourceBot.isActive = true;
      saveBotConfig();
      runSingleSecondaryBotWorker(sourceBot).catch(console.error);
      safeAnswerCallbackQuery(cbQuery.id, '🟢 Bot Sewa diaktifkan.', true);
      await sendTelegramMessage(chatId, `🟢 *BOT SEWA DIAKTIFKAN (ONLINE)*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 Bot: @${sourceBot.botInfo?.username || sourceBot.id}\nStatus: *Aktif & Beroperasi*`);
    }
    return;
  }

  if (data === 'ax_sewa_off') {
    if (sourceBot) {
      sourceBot.isActive = false;
      saveBotConfig();
      stopSingleSecondaryBotWorker(sourceBot.id);
      safeAnswerCallbackQuery(cbQuery.id, '🔴 Bot Sewa dijeda.', true);
      await sendTelegramMessage(chatId, `🔴 *BOT SEWA DINONAKTIFKAN (PAUSED)*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 Bot: @${sourceBot.botInfo?.username || sourceBot.id}\nStatus: *Dijeda*`);
    }
    return;
  }

  if (data === 'cmd_sewa_info') {
    if (sourceBot) {
      const expStatus = getRentExpiryStatus(sourceBot.rentExpiryDate);
      const botUsersCount = (botConfig.activeUsers || []).filter((u) => u.originBotId === sourceBot.id || !u.originBotId).length;
      await sendTelegramMessage(
        chatId,
        `📋 *DETAIL STATUS BOT SEWA DEDICATED*
━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Bot:* @${sourceBot.botInfo?.username || sourceBot.id}
👑 *Penyewa:* \`${sourceBot.primaryOwner || 'Owner Bot'}\`
📅 *Masa Sewa:* ${sourceBot.rentExpiryDate ? `${sourceBot.rentExpiryDate} WIB` : '♾️ Permanen'}
⏳ *Sisa Waktu:* ${expStatus.remainingText}
🟢 *Status Polling:* ${sourceBot.isActive ? '🟢 Online (Aktif)' : '🔴 Offline (Dijeda)'}
⚡ *Latensi:* ${sourceBot.latencyMs || 0} ms
👥 *Pengguna Terdaftar:* ${botUsersCount} pengguna
📊 *Pencarian Diproses:* ${sourceBot.stats?.commandsExecuted || 0}x`
      );
    }
    return;
  }

  // Handle Telegram Clone Approval by Primary Owner
  if (data.startsWith('approve_clone_')) {
    const rawPayload = data.replace('approve_clone_', '');
    const lastReqIdx = rawPayload.lastIndexOf('_req_');
    const targetBotId = lastReqIdx !== -1 ? rawPayload.substring(0, lastReqIdx) : rawPayload;
    const targetReqId = lastReqIdx !== -1 ? rawPayload.substring(lastReqIdx + 1) : '';

    const botTarget = (botConfig.multiBots || []).find((b) => b.id === targetBotId) || sourceBot;
    if (botTarget && targetReqId) {
      if (!Array.isArray(botTarget.secondaryOwners)) botTarget.secondaryOwners = [];
      if (!Array.isArray(botTarget.pendingCloneOwners)) botTarget.pendingCloneOwners = [];
      const reqItem = botTarget.pendingCloneOwners.find((p) => p.id === targetReqId);
      if (reqItem) {
        reqItem.status = 'approved';
        reqItem.resolvedAt = new Date().toISOString();
        reqItem.resolvedBy = from.username ? `@${from.username}` : String(from.id);
        if (!botTarget.secondaryOwners.includes(reqItem.ownerIdentifier)) {
          botTarget.secondaryOwners.push(reqItem.ownerIdentifier);
        }
        saveBotConfig();
        safeAnswerCallbackQuery(cbQuery.id, `✅ Disetujui! ${reqItem.ownerIdentifier} sekarang resmi menjadi Owner Clone.`, true);
        await sendTelegramMessage(
          chatId,
          `✅ *PERMINTAAN CLONE OWNER DISETUJUI!*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 *Bot:* @${botTarget.botInfo?.username || botTarget.id}\n👤 *Akun Disetujui:* \`${reqItem.ownerIdentifier}\`\n🕒 *Waktu:* ${wibTime.fullStr}\n\nAkun tersebut kini resmi terdaftar sebagai Owner Clone dan memiliki izin penuh untuk membuka menu owner bot ini.`
        );
        addLog('system', `Clone Owner disetujui via Telegram oleh ${from.id}: ${reqItem.ownerIdentifier} (@${botTarget.botInfo?.username || botTarget.id})`);
        return;
      }
    }
    safeAnswerCallbackQuery(cbQuery.id, 'Permintaan tidak ditemukan atau telah diproses sebelumnya.', true);
    return;
  }

  // Handle Telegram Clone Rejection by Primary Owner
  if (data.startsWith('reject_clone_')) {
    const rawPayload = data.replace('reject_clone_', '');
    const lastReqIdx = rawPayload.lastIndexOf('_req_');
    const targetBotId = lastReqIdx !== -1 ? rawPayload.substring(0, lastReqIdx) : rawPayload;
    const targetReqId = lastReqIdx !== -1 ? rawPayload.substring(lastReqIdx + 1) : '';

    const botTarget = (botConfig.multiBots || []).find((b) => b.id === targetBotId) || sourceBot;
    if (botTarget && targetReqId) {
      if (!Array.isArray(botTarget.pendingCloneOwners)) botTarget.pendingCloneOwners = [];
      const reqItem = botTarget.pendingCloneOwners.find((p) => p.id === targetReqId);
      if (reqItem) {
        reqItem.status = 'rejected';
        reqItem.resolvedAt = new Date().toISOString();
        reqItem.resolvedBy = from.username ? `@${from.username}` : String(from.id);
        saveBotConfig();
        safeAnswerCallbackQuery(cbQuery.id, `❌ Permintaan ditolak. Akun tidak diizinkan.`, true);
        await sendTelegramMessage(
          chatId,
          `❌ *PERMINTAAN CLONE OWNER DITOLAK*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 *Bot:* @${botTarget.botInfo?.username || botTarget.id}\n👤 *Akun Ditolak:* \`${reqItem.ownerIdentifier}\`\n🕒 *Waktu:* ${wibTime.fullStr}\n\nAkun tersebut *TIDAK DIBERIKAN AKSES* ke menu owner bot ini.`
        );
        addLog('system', `Clone Owner ditolak via Telegram oleh ${from.id}: ${reqItem.ownerIdentifier} (@${botTarget.botInfo?.username || botTarget.id})`);
        return;
      }
    }
    safeAnswerCallbackQuery(cbQuery.id, 'Permintaan tidak ditemukan atau telah diproses.', true);
    return;
  }

  // Secret Owner Callbacks
  if (data === 'ax_on') {
    botConfig.osintConfig.enabled = true;
    botConfig.osintConfig.lastToggledAt = new Date().toISOString();
    saveBotConfig();
    await sendTelegramMessage(chatId, `🟢 *SERVER OSINT DIAKTIFKAN (ON)*\n\nMenyiarkan ke seluruh pengguna...`);
    if (botConfig.osintConfig.notifyOnStatusChange) {
      broadcastOsintStatusChange(true).catch(console.error);
    }
    return;
  }

  if (data === 'ax_off') {
    botConfig.osintConfig.enabled = false;
    botConfig.osintConfig.lastToggledAt = new Date().toISOString();
    saveBotConfig();
    await sendTelegramMessage(chatId, `🔴 *SERVER OSINT DINONAKTIFKAN (OFF)*\n\nMenyiarkan ke seluruh pengguna...`);
    if (botConfig.osintConfig.notifyOnStatusChange) {
      broadcastOsintStatusChange(false).catch(console.error);
    }
    return;
  }

  if (data === 'ax_keys') {
    const keys = botConfig.osintConfig.apiKeys;
    const listStr = keys
      .map((k, i) => `${i + 1}. \`${k.key}\` - ${k.tier === 'unlimited' ? 'Unlimited' : `${k.remainingQuota}x (+${k.bonusQuota} bonus)`} (Pakai: ${k.totalUsed}x)`)
      .join('\n');
    await sendTelegramMessage(chatId, `🔑 *DAFTAR API KEY (${keys.length}):*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n${listStr || 'Kosong'}`);
    return;
  }

  if (data === 'ax_test') {
    try {
      const testTarget = `${botConfig.osintConfig.ngrokUrl.replace(/\/$/, '')}/api/v1/search?q=ping&apiKey=test`;
      const testRes = await fetch(testTarget, { method: 'GET' });
      await sendTelegramMessage(chatId, `✅ *RESPON NGROK OK:* HTTP ${testRes.status}`);
    } catch (err: any) {
      await sendTelegramMessage(chatId, `❌ *NGROK OFFLINE:* ${err.message}`);
    }
    return;
  }

  if (data === 'ax_menus') {
    const menus = botConfig.customMenus || [];
    const listStr = menus
      .map((m, i) => `${i + 1}. *${m.label}* [ID: \`${m.id}\`] (${m.enabled ? 'Aktif' : 'Nonaktif'})`)
      .join('\n');
    await sendTelegramMessage(chatId, `🗂️ *DAFTAR MENU KUSTOM TAMBAHAN:*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n${listStr || 'Belum ada menu kustom.'}`);
    return;
  }

  // Handle Custom Dynamic Menu Button Clicks
  if (data.startsWith('cmenu_')) {
    const menuId = data.replace('cmenu_', '');
    const matched = (botConfig.customMenus || []).find((m) => m.id === menuId);
    if (matched) {
      const reply = matched.responseText || `📌 *${matched.label}*`;
      await sendTelegramMessage(chatId, reply, {
        inline_keyboard: [
          [{ text: '🏠 Kembali ke Menu Utama', callback_data: 'cmd_menu' }]
        ]
      });
      return;
    }
  }

  if (data === 'cmd_id') {
    const user = botConfig.activeUsers.find((u) => Number(u.chatId) === Number(chatId));
    const todayWib = getWibDateString();
    const countdown = getTimeUntilNextWibMidnight();
    const firstSeenFormatted = formatWibDate(user?.firstSeen);

    const idCard = `📋 *DETAIL INFORMASI CHAT ID & PROFIL AKUN*
━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 *Chat ID:* \`${chatId}\`
👤 *Nama Lengkap:* ${senderName}
🏷 *Username:* ${usernameTag}
💬 *Tipe Obrolan:* ${message.chat.type.toUpperCase()}
🕒 *Waktu Sistem:* ${wibTime.fullStr}
🔒 *Status Akun:* ${user?.isVerified ? '✅ *Terverifikasi Resmi*' : '⚠️ *Belum Verifikasi*'} (Terdaftar sejak: ${firstSeenFormatted})
━━━━━━━━━━━━━━━━━━━━━━━━━
💎 *STATUS KUOTA PRIBADI ANDA:*
• *Sisa Kuota Aktif:* *${user?.personalQuota || 0}x Pencarian*
• *API Key Pribadi:* \`${user?.personalApiKey || `usr_${chatId}`}\`

🎁 *STATUS JATAH KLAIM:*
• *Kuota Pengguna Baru (5x):* ${user?.hasClaimedNewUserQuota ? '✅ Sudah Diklaim (1x seumur hidup)' : '🎁 *Belum Diklaim (Siap Diambil)*'}
• *Kuota Harian (2x):* ${user?.dailyQuotaLastClaimedDate === todayWib ? `✅ Sudah Diklaim (Reset: ${countdown.formatted} lagi)` : '✨ *Tersedia Hari Ini (Bisa Diklaim)*'}
━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ _Data akun Anda tersimpan permanen & aman._`;

    await sendTelegramMessage(chatId, idCard, {
      inline_keyboard: [
        [
          { text: '🎁 Menu Klaim Kuota', callback_data: 'cmd_claim_menu' },
          { text: '💎 Cek Saldo Kuota', callback_data: 'cmd_my_quota' }
        ],
        [
          { text: '🔄 Muat Ulang ID', callback_data: 'cmd_id' },
          { text: '🏠 Buka Menu Utama', callback_data: 'cmd_menu' }
        ]
      ]
    });
    return;
  } else if (data === 'cmd_bot') {
    const botCard = formatBotDetailCard(sourceBot);

    await sendTelegramMessage(chatId, botCard, {
      inline_keyboard: [
        [{ text: '🆔 Cek ID Saya', callback_data: 'cmd_id' }],
        [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
      ]
    });
    return;
  } else if (data === 'cmd_ping') {
    const pingText = formatBotPingCard(sourceBot, wibTime.timeStr);
    await sendTelegramMessage(chatId, pingText);
    return;
  } else if (data === 'cmd_waktu') {
    const now = new Date();
    const wibStr = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', timeStyle: 'medium', dateStyle: 'full' }).format(now);
    await sendTelegramMessage(chatId, `⏰ *Waktu Indonesia Barat (WIB):*\n\n${wibStr} WIB`);
    return;
  } else if (data === 'cmd_help' || data === 'cmd_menu') {
    const user = botConfig.activeUsers.find((u) => Number(u.chatId) === Number(chatId));
    const welcome = formatBotWelcomeMessage(sourceBot, user, senderName, chatId);
    await sendTelegramMessage(chatId, welcome, getMainInlineMenu(botConfig.osintConfig.enabled, sourceBot));
    return;
  }

  // Callback: Download Result as .TXT document
  if (data.startsWith('dl_txt_')) {
    const searchId = data.replace('dl_txt_', '');
    const lockKey = `dl_${chatId}`;
    if (activeDownloads.has(lockKey)) {
      safeAnswerCallbackQuery(cbQuery.id, '⏳ Berkas sedang dikirim ke chat Anda, mohon tunggu sebentar...', false, 4000);
      return;
    }
    activeDownloads.add(lockKey);

    try {
      const item = findSearchHistoryItem(searchId, chatId);
      if (!item) {
        await sendTelegramMessage(
          chatId,
          '⚠️ *Data pencarian ini tidak ditemukan atau sudah kadaluarsa.*\n\nData sesi pencarian telah diperbarui atau server baru direstart.\nSilakan lakukan pencarian ulang dengan format:\n`search: <target> <apiKey>`'
        );
        return;
      }

      await sendTelegramChatAction(chatId, 'upload_document');
      const txtContent = generateTxtReport(item);
      const safeTarget = (item.target || 'target').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      const filename = `osint_${safeTarget}_${item.id || Date.now()}.txt`;

      await sendTelegramMessage(chatId, `⏳ *Menyiapkan & mengirim berkas .TXT lengkap (${item.totalMatches} Data - Target: ${item.target})...*`);

      const sent = await sendTelegramDocument(
        chatId,
        txtContent,
        filename,
        `📄 Berkas Lengkap OSINT: ${item.target}\n• Total: ${item.totalMatches} Data\n• API Key: ${item.apiKey}\n• Waktu: ${item.formattedWib || '-'}`
      );

      if (!sent) {
        await sendTelegramMessage(
          chatId,
          `⚠️ *Gagal mengirim berkas dokumen ke Telegram.*\nKoneksi jaringan Telegram sedang sibuk atau data terlalu besar. Anda dapat mencoba lagi atau melihat pratinjau di menu riwayat.`
        );
      }
    } finally {
      setTimeout(() => activeDownloads.delete(lockKey), 2500);
    }
    return;
  }

  // Callback: Download Result as .JSON document
  if (data.startsWith('dl_json_')) {
    const searchId = data.replace('dl_json_', '');
    const lockKey = `dl_${chatId}`;
    if (activeDownloads.has(lockKey)) {
      safeAnswerCallbackQuery(cbQuery.id, '⏳ Berkas sedang dikirim ke chat Anda, mohon tunggu sebentar...', false, 4000);
      return;
    }
    activeDownloads.add(lockKey);

    try {
      const item = findSearchHistoryItem(searchId, chatId);
      if (!item) {
        await sendTelegramMessage(
          chatId,
          '⚠️ *Data pencarian ini tidak ditemukan atau sudah kadaluarsa.*\n\nData sesi pencarian telah diperbarui atau server baru direstart.\nSilakan lakukan pencarian ulang dengan format:\n`search: <target> <apiKey>`'
        );
        return;
      }

      await sendTelegramChatAction(chatId, 'upload_document');
      const safeTarget = (item.target || 'target').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      const filename = `osint_${safeTarget}_${item.id || Date.now()}.json`;

      await sendTelegramMessage(chatId, `⏳ *Menyiapkan & mengirim berkas .JSON lengkap (${item.totalMatches} Data - Target: ${item.target})...*`);

      const sent = await sendTelegramDocument(
        chatId,
        item.rawResult,
        filename,
        `📦 Berkas Raw JSON OSINT: ${item.target}\n• Total: ${item.totalMatches} Data\n• API Key: ${item.apiKey}\n• Waktu: ${item.formattedWib || '-'}`
      );

      if (!sent) {
        await sendTelegramMessage(
          chatId,
          `⚠️ *Gagal mengirim berkas dokumen ke Telegram.*\nKoneksi jaringan Telegram sedang sibuk. Anda dapat mencoba kembali beberapa saat lagi.`
        );
      }
    } finally {
      setTimeout(() => activeDownloads.delete(lockKey), 2500);
    }
    return;
  }

  // Callback: Copy All Output (Full text, with crash warning if > 50)
  if (data.startsWith('copy_all_')) {
    const searchId = data.replace('copy_all_', '');
    const item = findSearchHistoryItem(searchId, chatId);
    if (!item) {
      await sendTelegramMessage(chatId, '⚠️ Data pencarian ini tidak ditemukan atau sudah dibersihkan.');
      return;
    }

    const chunkSize = 3500;
    const fullText = item.rawResult || '';
    const totalChunks = Math.ceil(fullText.length / chunkSize);

    if (item.totalMatches > 50 || totalChunks > 3) {
      await sendTelegramMessage(
        chatId,
        `⚠️ *PERINGATAN UKURAN DATA BESAR (${item.totalMatches} Data / ${totalChunks} Bagian):*\nMenampilkan ratusan baris data langsung ke chat dapat menyebabkan Telegram mobile Anda freeze, lag, atau terkena limit pesan.\n\n📦 *Sangat disarankan langsung mengunduh berkas lengkap di bawah ini (100% utuh & lancar tanpa batas):*`,
        {
          inline_keyboard: [
            [{ text: '📥 Download File .TXT (Sangat Direkomendasikan)', callback_data: `dl_txt_${item.id}` }],
            [{ text: '📥 Download File .JSON', callback_data: `dl_json_${item.id}` }],
            [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
          ]
        }
      );
      return;
    }

    // Send complete text in chunks without truncation
    for (let i = 0; i < totalChunks; i++) {
      const chunk = fullText.substring(i * chunkSize, (i + 1) * chunkSize);
      await sendTelegramMessage(
        chatId,
        `📋 *BAGIAN ${i + 1}/${totalChunks} (Target: ${item.target}) - Salin Teks Utuh:*
\`\`\`
${chunk}
\`\`\``
      );
    }
    return;
  }

  // Callback: User History (Isolated by Chat ID)
  if (data === 'user_history') {
    await handleUserHistoryCommand(Number(chatId), senderName);
    return;
  }

  // Callback: View Specific History Item
  if (data.startsWith('view_hist_')) {
    const searchId = data.replace('view_hist_', '');
    const item = findSearchHistoryItem(searchId, chatId);
    if (!item) {
      await sendTelegramMessage(chatId, '⚠️ Catatan riwayat ini tidak ditemukan atau sudah kadaluarsa.');
      return;
    }

    const { messageText, replyMarkup } = formatOsintPresentation(
      item.target,
      item.apiKey,
      item.totalMatches,
      'Sesuai Key',
      { fullStr: item.formattedWib },
      item.rawResult,
      item.id
    );

    await sendTelegramMessage(chatId, `📂 *Membuka Kembali Dari Riwayat Pribadi:*\n\n` + messageText, replyMarkup);
    return;
  }

  // Callback: Confirm Clear My History
  if (data === 'confirm_clear_my_hist') {
    await sendTelegramMessage(
      chatId,
      `⚠️ *KONFIRMASI PENGHAPUSAN RIWAYAT PRIBADI*
━━━━━━━━━━━━━━━━━━━━━━━━━
Apakah Anda yakin ingin menghapus seluruh riwayat pencarian OSINT untuk akun Chat ID \`${chatId}\`?

_Tindakan ini hanya menghapus riwayat milik Anda sendiri dan tidak mempengaruhi pengguna lain._`,
      {
        inline_keyboard: [
          [
            { text: '🗑️ Ya, Hapus Riwayat Saya', callback_data: 'do_clear_my_hist' },
            { text: '❌ Batal', callback_data: 'user_history' }
          ]
        ]
      }
    );
    return;
  }

  // Callback: Do Clear My History
  if (data === 'do_clear_my_hist') {
    if (Array.isArray(botConfig.searchHistories)) {
      const initialLen = botConfig.searchHistories.length;
      botConfig.searchHistories = botConfig.searchHistories.filter((h) => h.chatId !== Number(chatId));
      const deletedCount = initialLen - botConfig.searchHistories.length;
      saveBotConfig();
      await sendTelegramMessage(
        chatId,
        `✅ *BERHASIL DIHAPUS!*\nSebanyak *${deletedCount} catatan riwayat pencarian* milik Chat ID \`${chatId}\` telah dibersihkan.`,
        {
          inline_keyboard: [[{ text: '🏠 Kembali ke Menu', callback_data: 'cmd_menu' }]]
        }
      );
    }
    return;
  }
}

// Continuous Long-Polling Worker (Runs as long as bot is ACTIVE / ON)
async function runTelegramPollingLoop() {
  if (isPollingRunning) return;
  isPollingRunning = true;
  pollingAbortController = new AbortController();

  console.log('[Telegram Polling] Starting continuous polling loop (ALWAYS ON)...');
  addLog('system', 'Service polling Telegram dimulai. Bot status: AKTIF (Always-ON).');

  while (botConfig.isActive) {
    if (!botConfig.token) {
      lastError = 'Token belum dikonfigurasi.';
      addLog('error', 'Polling berhenti: Token Telegram belum diisi.');
      botConfig.isActive = false;
      saveBotConfig();
      break;
    }

    try {
      lastPollingTimestamp = new Date().toISOString();
      const url = `https://api.telegram.org/bot${botConfig.token}/getUpdates?offset=${pollingOffset}&timeout=15&allowed_updates=["message","callback_query"]`;

      const response = await fetch(url, {
        signal: pollingAbortController?.signal
      });

      if (!botConfig.isActive) break;

      if (!response.ok) {
        const errorBody = await response.text();
        lastError = `Telegram API Error (${response.status}): ${errorBody}`;
        addLog('error', `Gagal polling Telegram API (${response.status}). Menunggu retry...`);
        // Wait 4 seconds before retry on HTTP errors
        await new Promise((resolve) => setTimeout(resolve, 4000));
        continue;
      }

      const data = await response.json();

      if (!data.ok) {
        lastError = data.description || 'Error getUpdates';
        addLog('error', `Telegram getUpdates Error: ${data.description}`);
        if (data.error_code === 401) {
          // Token invalid or revoked
          addLog('error', 'Token bot tidak valid atau telah dicabut oleh BotFather! Mematikan polling otomatis.');
          botConfig.isActive = false;
          saveBotConfig();
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      lastError = null;
      const updates = data.result || [];

      for (const update of updates) {
        if (!botConfig.isActive) break;

        // Advance offset
        if (update.update_id >= pollingOffset) {
          pollingOffset = update.update_id + 1;
          botConfig.lastPollingOffset = pollingOffset;
        }

        // Deduplication shield: prevent duplicate processing of the same Telegram update
        if (processedUpdateIds.has(update.update_id)) {
          continue;
        }
        processedUpdateIds.add(update.update_id);
        if (processedUpdateIds.size > 1000) {
          const first = processedUpdateIds.values().next().value;
          if (first !== undefined) processedUpdateIds.delete(first);
        }

        if (update.message) {
          await handleIncomingMessage(update.message);
        } else if (update.callback_query) {
          await handleCallbackQuery(update.callback_query);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || !botConfig.isActive) {
        console.log('[Telegram Polling] Polling aborted cleanly.');
        break;
      }
      lastError = err.message;
      addLog('error', `Koneksi polling terganggu: ${err.message}. Mencoba kembali dalam 3 detik...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  isPollingRunning = false;
  console.log('[Telegram Polling] Polling loop stopped.');
  addLog('system', 'Service polling Telegram dinonaktifkan (Status: OFF).');
}

// Secondary Bot Polling Worker Loop (Independent per secondary bot instance)
async function runSingleSecondaryBotWorker(botItem: MultiBotInstance) {
  if (activeSecondaryBotWorkers.has(botItem.id)) {
    const existing = activeSecondaryBotWorkers.get(botItem.id);
    if (existing?.isRunning) return;
  }

  const abortController = new AbortController();
  const workerState = {
    abortController,
    isRunning: true,
    offset: 0
  };
  activeSecondaryBotWorkers.set(botItem.id, workerState);

  console.log(`[Multi-Bot Worker] Starting polling worker for @${botItem.botInfo?.username || botItem.id}...`);
  addLog('system', `Multi-Bot Worker dimulai untuk @${botItem.botInfo?.username || botItem.id} (Status: AKTIF).`);

  while (botItem.isActive && workerState.isRunning) {
    try {
      botItem.lastPollingAt = new Date().toISOString();
      const url = `https://api.telegram.org/bot${botItem.token}/getUpdates?offset=${workerState.offset}&timeout=15&allowed_updates=["message","callback_query"]`;

      const response = await fetch(url, {
        signal: abortController.signal
      });

      if (!botItem.isActive || !workerState.isRunning) break;

      if (!response.ok) {
        const errorBody = await response.text();
        botItem.lastError = `HTTP ${response.status}: ${errorBody}`;
        await new Promise((resolve) => setTimeout(resolve, 4000));
        continue;
      }

      const data = await response.json();

      if (!data.ok) {
        botItem.lastError = data.description || 'Error getUpdates';
        if (data.error_code === 401) {
          botItem.isActive = false;
          saveBotConfig();
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      botItem.lastError = null;
      const updates = data.result || [];

      for (const update of updates) {
        if (!botItem.isActive || !workerState.isRunning) break;

        if (update.update_id >= workerState.offset) {
          workerState.offset = update.update_id + 1;
        }

        const dedupKey = `bot_${botItem.id}_${update.update_id}`;
        if (processedUpdateIds.has(dedupKey as any)) continue;
        processedUpdateIds.add(dedupKey as any);

        activeBotContextToken = botItem.token;
        activeBotContextInfo = botItem.botInfo;

        if (update.message) {
          if (!botItem.stats) botItem.stats = { messagesReceived: 0, messagesSent: 0, commandsExecuted: 0 };
          botItem.stats.messagesReceived += 1;
          await handleIncomingMessage(update.message, botItem);
        } else if (update.callback_query) {
          await handleCallbackQuery(update.callback_query, botItem);
        }

        activeBotContextToken = null;
        activeBotContextInfo = null;
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || !botItem.isActive || !workerState.isRunning) {
        break;
      }
      botItem.lastError = err.message;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  workerState.isRunning = false;
  activeSecondaryBotWorkers.delete(botItem.id);
  console.log(`[Multi-Bot Worker] Worker stopped for @${botItem.botInfo?.username || botItem.id}.`);
}

function stopSingleSecondaryBotWorker(botId: string) {
  const worker = activeSecondaryBotWorkers.get(botId);
  if (worker) {
    worker.isRunning = false;
    try {
      worker.abortController.abort();
    } catch {}
    activeSecondaryBotWorkers.delete(botId);
  }
}

function syncAllSecondaryBotWorkers() {
  if (!Array.isArray(botConfig.multiBots)) {
    botConfig.multiBots = [];
  }
  for (const bot of botConfig.multiBots) {
    if (bot.isActive) {
      runSingleSecondaryBotWorker(bot).catch((err) => {
        console.error(`[Multi-Bot Worker] Error on bot ${bot.id}:`, err);
      });
    } else {
      stopSingleSecondaryBotWorker(bot.id);
    }
  }
}

// Start Bot Engine
async function startBotEngine(): Promise<{ success: boolean; message: string; botInfo?: TelegramBotInfo }> {
  if (!botConfig.token) {
    return { success: false, message: 'Token Telegram belum diisi. Silakan masukkan token terlebih dahulu.' };
  }

  // Validate token with Telegram getMe
  const validation = await verifyTelegramToken(botConfig.token);
  if (!validation.valid || !validation.botInfo) {
    lastError = validation.errorMessage || 'Token tidak valid';
    return {
      success: false,
      message: `Token tidak valid: ${validation.errorMessage || 'Unauthorized'}`
    };
  }

  currentBotInfo = validation.botInfo;
  botConfig.isActive = true;
  if (!botStartedAt) {
    botStartedAt = Date.now();
  }
  lastError = null;
  saveBotConfig();

  // Trigger continuous background loop
  runTelegramPollingLoop().catch((err) => {
    console.error('[Telegram Polling] Unhandled loop error:', err);
  });

  // Also sync all secondary worker bots in cluster
  syncAllSecondaryBotWorkers();

  return {
    success: true,
    message: `Bot @${validation.botInfo.username} berhasil diaktifkan dan akan selalu aktif!`,
    botInfo: validation.botInfo
  };
}

// Stop Bot Engine
function stopBotEngine(): { success: boolean; message: string } {
  botConfig.isActive = false;
  botStartedAt = null;
  saveBotConfig();

  if (pollingAbortController) {
    try {
      pollingAbortController.abort();
    } catch (e) {
      // ignore
    }
    pollingAbortController = null;
  }

  return {
    success: true,
    message: 'Bot Telegram telah dimatikan (Status: OFF).'
  };
}

// Initialize config on server start
loadBotConfig();
// Automatically start secondary bot workers if any active
setTimeout(() => {
  if (botConfig.isActive) {
    syncAllSecondaryBotWorkers();
  }
}, 1000);

// Setup Express App
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS and preflight handling
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // Health Endpoint
  app.get('/api/health', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({
      status: 'ok',
      service: 'Telegram Bot Automation Controller',
      botActive: botConfig.isActive,
      botUsername: currentBotInfo?.username || null,
      timestamp: new Date().toISOString()
    });
  });

  // Get Complete Bot Status
  app.get('/api/bot/status', async (req, res) => {
    try {
      const uptimeSec = botStartedAt && botConfig.isActive ? Math.floor((Date.now() - botStartedAt) / 1000) : 0;

      const response: BotStatusState = {
        isActive: Boolean(botConfig.isActive),
        token: botConfig.token || '',
        maskedToken: maskToken(botConfig.token),
        isTokenValid: Boolean(currentBotInfo),
        botInfo: currentBotInfo,
        lastError,
        uptimeSeconds: uptimeSec,
        startedAt: botStartedAt ? new Date(botStartedAt).toISOString() : null,
        stats: botConfig.stats || {
          messagesReceived: 0,
          messagesSent: 0,
          commandsExecuted: 0,
          activeUsersCount: 0
        },
        recentLogs: (recentLogs || []).slice(0, 80),
        activeUsers: botConfig.activeUsers || [], // FIX: Return all active users without 50 truncate limit!
        customCommands: botConfig.customCommands || [],
        autoReplies: botConfig.autoReplies || [],
        customMenus: botConfig.customMenus || [],
        welcomeMessage: botConfig.welcomeMessage || DEFAULT_WELCOME_MESSAGE,
        lastPollingAt: lastPollingTimestamp || undefined,
        osintConfig: botConfig.osintConfig,
        searchHistories: botConfig.searchHistories || [],
        githubSync: botConfig.githubSync || DEFAULT_GITHUB_SYNC,
        groupConfig: botConfig.groupConfig || DEFAULT_GROUP_CONFIG,
        quotaConfig: botConfig.quotaConfig || DEFAULT_QUOTA_CONFIG,
        menuConfig: botConfig.menuConfig || DEFAULT_MENU_CONFIG,
        moderationConfig: botConfig.moderationConfig || DEFAULT_MODERATION_CONFIG,
        spikeAlerts: recentSpikeAlerts,
        referralConfig: botConfig.referralConfig || DEFAULT_REFERRAL_CONFIG,
        referralAccounts: getAllReferralAccounts(),
        referralRecords: botConfig.referralRecords || [],
        referralWithdrawLogs: botConfig.referralWithdrawLogs || [],
        multiBots: botConfig.multiBots || [],
        rentalPlans: botConfig.rentalPlans || DEFAULT_RENTAL_PLANS,
        quotaPackages: botConfig.quotaPackages || DEFAULT_QUOTA_PACKAGES,
        messageLogs: (messageTrafficLogs || []).slice(0, 150),
        ownerWebsitePasskey: botConfig.ownerWebsitePasskey || 'ax0895'
      };

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.json(response);
    } catch (err: any) {
      console.error('Error in /api/bot/status handler:', err);
      return res.status(500).json({
        isActive: false,
        token: '',
        maskedToken: '',
        isTokenValid: false,
        botInfo: null,
        lastError: err?.message || 'Internal status error',
        uptimeSeconds: 0,
        startedAt: null,
        stats: { messagesReceived: 0, messagesSent: 0, commandsExecuted: 0, activeUsersCount: 0 },
        recentLogs: [],
        activeUsers: [],
        customCommands: [],
        autoReplies: [],
        customMenus: [],
        welcomeMessage: '',
        osintConfig: DEFAULT_OSINT_CONFIG
      });
    }
  });

  // Get Suspicious Search Spike Alerts
  app.get('/api/bot/spike-alerts', (req, res) => {
    res.json({
      success: true,
      alerts: recentSpikeAlerts,
      totalEventsLastMinute: recentSearchEvents.length
    });
  });

  // Clear Spike Alerts
  app.delete('/api/bot/spike-alerts', (req, res) => {
    recentSpikeAlerts = [];
    res.json({
      success: true,
      message: 'Riwayat alert lonjakan pencarian berhasil dibersihkan.'
    });
  });

  // Verify Token with Real Telegram API
  app.post(['/api/bot/verify-token', '/api/multibot/verify-token'], async (req, res) => {
    const { token = '' } = req.body;
    const result = await verifyTelegramToken(token);
    res.json(result);
  });

  // Update Token
  app.post('/api/bot/update-token', async (req, res) => {
    const { token = '' } = req.body;
    const trimmed = (token || '').trim();

    if (!trimmed) {
      return res.status(400).json({
        success: false,
        message: 'Token Telegram tidak boleh kosong.'
      });
    }

    // Always verify before saving!
    const validation = await verifyTelegramToken(trimmed);
    if (!validation.valid || !validation.botInfo) {
      return res.status(400).json({
        success: false,
        message: validation.errorMessage || 'Token tidak valid menurut Telegram API.',
        details: validation
      });
    }

    const wasActive = botConfig.isActive;
    if (wasActive) {
      stopBotEngine();
    }

    botConfig.token = trimmed;
    currentBotInfo = validation.botInfo;
    saveBotConfig();

    addLog('system', `Token bot diperbarui ke @${validation.botInfo.username}`);

    if (wasActive) {
      await startBotEngine();
    }

    res.json({
      success: true,
      message: `Token berhasil disimpan! Terverifikasi milik @${validation.botInfo.username}.`,
      botInfo: validation.botInfo,
      latencyMs: validation.latencyMs
    });
  });

  // Toggle Bot ON/OFF
  app.post('/api/bot/toggle', async (req, res) => {
    const { active } = req.body;

    if (active) {
      const result = await startBotEngine();
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }
      return res.json({
        success: true,
        isActive: true,
        message: result.message,
        botInfo: result.botInfo
      });
    } else {
      const result = stopBotEngine();
      return res.json({
        success: true,
        isActive: false,
        message: result.message
      });
    }
  });

  // Send Direct Message to a specific Chat ID from Web
  app.post('/api/bot/send-message', async (req, res) => {
    const { chatId, text, parseMode = 'Markdown' } = req.body;

    if (!chatId || !text) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID dan pesan wajib diisi.'
      });
    }

    if (!botConfig.token) {
      return res.status(400).json({
        success: false,
        message: 'Bot token belum dikonfigurasi.'
      });
    }

    try {
      const payload: any = {
        chat_id: chatId,
        text,
        parse_mode: parseMode
      };
      const response = await callTelegramApi(botConfig.token, 'sendMessage', payload, 10000);

      if (response && response.ok) {
        botConfig.stats.messagesSent += 1;
        saveBotConfig();
        addLog('outgoing', `[Direct Web] Pesan ke ${chatId}: "${text.substring(0, 60)}"`, chatId);

        return res.json({
          success: true,
          message: `Pesan berhasil terkirim ke Chat ID ${chatId}!`,
          result: response.result
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Telegram Error: ${response?.description || 'Gagal mengirim pesan'}`
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Terjadi kesalahan pengiriman: ${err.message}`
      });
    }
  });

  // Broadcast Message to All Known Active Users
  app.post('/api/bot/broadcast', async (req, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Pesan broadcast tidak boleh kosong.'
      });
    }

    if (!botConfig.token) {
      return res.status(400).json({
        success: false,
        message: 'Bot token belum dikonfigurasi.'
      });
    }

    const users = botConfig.activeUsers || [];
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Belum ada pengguna yang pernah berinteraksi dengan bot untuk dikirimkan broadcast.'
      });
    }

    let successCount = 0;
    let failCount = 0;

    for (const u of users) {
      try {
        const payload = {
          chat_id: u.chatId,
          text: `📢 *PENGUMUMAN DARI CONTROLLER*\n\n${text}`,
          parse_mode: 'Markdown'
        };
        const response = await callTelegramApi(botConfig.token, 'sendMessage', payload, 5000);
        if (response && response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
      // Small pause to respect Telegram rate limits
      await new Promise((r) => setTimeout(r, 80));
    }

    botConfig.stats.messagesSent += successCount;
    saveBotConfig();

    addLog('outgoing', `Broadcast terkirim: ${successCount} berhasil, ${failCount} gagal.`);

    res.json({
      success: true,
      totalUsers: users.length,
      successCount,
      failCount,
      message: `Broadcast selesai: ${successCount} pengguna menerima pesan.`
    });
  });

  // Save Custom Commands
  app.post('/api/bot/custom-commands', (req, res) => {
    const { customCommands } = req.body;
    if (!Array.isArray(customCommands)) {
      return res.status(400).json({ success: false, message: 'Format custom commands harus berupa array.' });
    }
    botConfig.customCommands = customCommands;
    saveBotConfig();
    addLog('system', `Daftar perintah kustom diperbarui (${customCommands.length} perintah).`);
    res.json({ success: true, customCommands: botConfig.customCommands });
  });

  // Save Auto Replies
  app.post('/api/bot/auto-replies', (req, res) => {
    const { autoReplies } = req.body;
    if (!Array.isArray(autoReplies)) {
      return res.status(400).json({ success: false, message: 'Format auto replies harus berupa array.' });
    }
    botConfig.autoReplies = autoReplies;
    saveBotConfig();
    addLog('system', `Aturan balasan otomatis diperbarui (${autoReplies.length} aturan).`);
    res.json({ success: true, autoReplies: botConfig.autoReplies });
  });

  // Save Welcome Message
  app.post('/api/bot/welcome-message', (req, res) => {
    const { welcomeMessage } = req.body;
    if (typeof welcomeMessage !== 'string') {
      return res.status(400).json({ success: false, message: 'Welcome message harus berupa teks string.' });
    }
    botConfig.welcomeMessage = welcomeMessage;
    saveBotConfig();
    addLog('system', 'Pesan selamat datang /start diperbarui.');
    res.json({ success: true, welcomeMessage: botConfig.welcomeMessage });
  });

  // Clear Logs
  app.post('/api/bot/clear-logs', (req, res) => {
    recentLogs = [];
    addLog('system', 'Log aktivitas dibersihkan.');
    res.json({ success: true });
  });

  // Reset Stats
  app.post('/api/bot/reset-stats', (req, res) => {
    botConfig.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      commandsExecuted: 0,
      activeUsersCount: botConfig.activeUsers.length,
      osintSearchesCount: 0
    };
    saveBotConfig();
    res.json({ success: true, stats: botConfig.stats });
  });

  // OSINT: Toggle Feature ON/OFF from Web
  app.post('/api/bot/osint/toggle', async (req, res) => {
    const { enabled, broadcast = true } = req.body;
    botConfig.osintConfig.enabled = Boolean(enabled);
    botConfig.osintConfig.lastToggledAt = new Date().toISOString();
    saveBotConfig();
    addLog('system', `Status server OSINT diubah via Web Dashboard ke: ${botConfig.osintConfig.enabled ? 'ON' : 'OFF'}`);

    if (broadcast && botConfig.osintConfig.notifyOnStatusChange) {
      broadcastOsintStatusChange(botConfig.osintConfig.enabled).catch(console.error);
    }

    res.json({
      success: true,
      enabled: botConfig.osintConfig.enabled,
      osintConfig: botConfig.osintConfig,
      message: `Server OSINT berhasil ${botConfig.osintConfig.enabled ? 'DIAKTIFKAN (ON)' : 'DINONAKTIFKAN (OFF)'}.`
    });
  });

  // OSINT: Update Config (Ngrok URL, Owner Username, Broadcast notify)
  app.post('/api/bot/osint/config', (req, res) => {
    const { ngrokUrl, ownerUsername, notifyOnStatusChange } = req.body;
    if (typeof ngrokUrl === 'string' && ngrokUrl.trim()) {
      botConfig.osintConfig.ngrokUrl = ngrokUrl.trim();
    }
    if (typeof ownerUsername === 'string' && ownerUsername.trim()) {
      botConfig.osintConfig.ownerUsername = ownerUsername.trim();
    }
    if (typeof notifyOnStatusChange === 'boolean') {
      botConfig.osintConfig.notifyOnStatusChange = notifyOnStatusChange;
    }
    saveBotConfig();
    addLog('system', `Konfigurasi server OSINT diperbarui via Web.`);
    res.json({ success: true, osintConfig: botConfig.osintConfig, message: 'Konfigurasi OSINT berhasil disimpan.' });
  });

  // OSINT: Manage API Keys (Add, Update, Delete)
  app.post('/api/bot/osint/api-keys', (req, res) => {
    const { apiKeys } = req.body;
    if (!Array.isArray(apiKeys)) {
      return res.status(400).json({ success: false, message: 'Format apiKeys harus array.' });
    }
    botConfig.osintConfig.apiKeys = apiKeys;
    saveBotConfig();
    addLog('system', `Daftar API Key OSINT diperbarui via Web (${apiKeys.length} keys).`);
    res.json({ success: true, apiKeys: botConfig.osintConfig.apiKeys, message: 'Daftar API Key berhasil disimpan.' });
  });

  // OSINT: Test Connection to Ngrok
  app.post('/api/bot/osint/test-ngrok', async (req, res) => {
    const { url } = req.body;
    const targetUrl = (url || botConfig.osintConfig.ngrokUrl).replace(/\/$/, '');
    const testEndpoint = `${targetUrl}/api/v1/search?q=ping&apiKey=test`;

    try {
      const start = Date.now();
      const testRes = await fetch(testEndpoint, {
        method: 'GET',
        headers: { 'User-Agent': 'TelegramBotController/2.0' }
      });
      const latency = Date.now() - start;
      res.json({
        success: true,
        status: testRes.status,
        statusText: testRes.statusText,
        latencyMs: latency,
        message: `Koneksi ke Ngrok berhasil! (HTTP ${testRes.status} ${testRes.statusText})`
      });
    } catch (err: any) {
      res.json({
        success: false,
        message: `Gagal tersambung ke tunnel Ngrok: ${err.message}`
      });
    }
  });

  // Custom Menus: Save Dynamic Menus from Web
  app.post('/api/bot/custom-menus', (req, res) => {
    const { customMenus } = req.body;
    if (!Array.isArray(customMenus)) {
      return res.status(400).json({ success: false, message: 'Format customMenus harus array.' });
    }
    botConfig.customMenus = customMenus;
    saveBotConfig();
    addLog('system', `Menu kustom Telegram diperbarui via Web (${customMenus.length} menu).`);
    res.json({ success: true, customMenus: botConfig.customMenus, message: 'Menu kustom berhasil diperbarui.' });
  });

  // User Verification: Toggle User Verification Status from Web
  app.post('/api/bot/users/verify', (req, res) => {
    const { chatId, isVerified } = req.body;
    const user = botConfig.activeUsers.find((u) => Number(u.chatId) === Number(chatId));
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }
    user.isVerified = Boolean(isVerified);
    if (user.isVerified) {
      user.verifiedAt = new Date().toISOString();
      syncUserApiKey(user);
    }
    saveBotConfig();
    addLog('system', `Status verifikasi pengguna ${chatId} (${user.firstName}) diubah ke: ${user.isVerified ? 'Terverifikasi' : 'Belum'}`);
    res.json({ success: true, user, message: `Status pengguna berhasil diperbarui.` });
  });

  // User Quota Management: Gift or Update Quota
  app.post('/api/bot/users/quota', (req, res) => {
    const { chatId, personalQuota, hasClaimedNewUserQuota, resetDailyClaim } = req.body;
    const user = botConfig.activeUsers.find((u) => Number(u.chatId) === Number(chatId));
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    if (typeof personalQuota === 'number') {
      user.personalQuota = Math.max(0, personalQuota);
    }
    if (typeof hasClaimedNewUserQuota === 'boolean') {
      user.hasClaimedNewUserQuota = hasClaimedNewUserQuota;
    }
    if (resetDailyClaim) {
      user.dailyQuotaLastClaimedDate = undefined;
    }

    syncUserApiKey(user);
    saveBotConfig();
    addLog('system', `Kuota pengguna ${chatId} (${user.firstName}) diperbarui via Web: Sisa Kuota ${user.personalQuota}x`);
    res.json({ success: true, user, message: 'Kuota pengguna berhasil disimpan.' });
  });

  // Gift Quota to User with optional Telegram Notification
  app.post('/api/bot/users/gift-quota', async (req, res) => {
    const { chatId, amount = 5, notifyUser = true, notes = 'Hadiah dari Admin' } = req.body;
    const user = botConfig.activeUsers.find((u) => Number(u.chatId) === Number(chatId));
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    user.personalQuota = (user.personalQuota || 0) + Number(amount);
    syncUserApiKey(user);
    saveBotConfig();

    addLog('system', `Admin memberikan hadiah +${amount} kuota ke pengguna ${chatId} (${user.firstName}).`);

    if (notifyUser && botConfig.token) {
      const giftMessage = `🎁 *ANDA MENDAPATKAN BONUS KUOTA DARI ADMIN!*
━━━━━━━━━━━━━━━━━━━━━━━━━
Halo *${user.firstName}*! Admin Web Controller baru saja menambahkan kuota ke akun Anda:

➕ *Bonus Kuota:* *+${amount}x Pencarian OSINT*
💎 *Total Sisa Kuota Pribadi:* *${user.personalQuota}x Pemakaian*
📝 *Catatan:* ${notes}
🔑 *API Key Anda:* \`${user.personalApiKey || `usr_${chatId}`}\`
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Gunakan perintah \`search: <target>\` untuk mencari intelijen._`;

      try {
        await sendTelegramMessage(chatId, giftMessage, {
          inline_keyboard: [
            [{ text: '💎 Cek Saldo Kuota', callback_data: 'cmd_my_quota' }],
            [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
          ]
        });
      } catch (e: any) {
        console.error('Failed to notify user of gifted quota:', e.message);
      }
    }

    res.json({
      success: true,
      user,
      message: `Berhasil menambahkan +${amount} kuota ke ${user.firstName} (${chatId}).`
    });
  });

  // OSINT: Get Search History (Optional filter by chatId)
  app.get('/api/bot/osint/history', (req, res) => {
    const { chatId } = req.query;
    let histories = botConfig.searchHistories || [];
    if (chatId) {
      histories = histories.filter((h) => h.chatId === Number(chatId));
    }
    res.json({
      success: true,
      total: histories.length,
      histories
    });
  });

  // OSINT: Delete Single Search History Item
  app.delete('/api/bot/osint/history/:id', (req, res) => {
    const { id } = req.params;
    const initialLen = (botConfig.searchHistories || []).length;
    botConfig.searchHistories = (botConfig.searchHistories || []).filter((h) => h.id !== id);
    const deletedCount = initialLen - botConfig.searchHistories.length;
    saveBotConfig();
    addLog('system', `Riwayat pencarian OSINT #${id} dihapus via Web.`);
    res.json({ success: true, deletedCount, message: 'Riwayat pencarian berhasil dihapus.' });
  });

  // OSINT: Clear Search History (Optionally per chatId or All)
  app.post('/api/bot/osint/history/clear', (req, res) => {
    const { chatId } = req.body;
    if (chatId) {
      botConfig.searchHistories = (botConfig.searchHistories || []).filter((h) => h.chatId !== Number(chatId));
      addLog('system', `Riwayat pencarian OSINT untuk Chat ID ${chatId} dibersihkan.`);
    } else {
      botConfig.searchHistories = [];
      addLog('system', `Seluruh riwayat pencarian OSINT dibersihkan via Web.`);
    }
    saveBotConfig();
    res.json({ success: true, message: 'Riwayat pencarian berhasil dibersihkan.' });
  });

  // OSINT: Direct File Download Route (.txt or .json)
  app.get('/api/bot/osint/download/:id', (req, res) => {
    const { id } = req.params;
    const format = ((req.query.format as string) || 'txt').toLowerCase();
    const item = (botConfig.searchHistories || []).find((h) => h.id === id);

    if (!item) {
      return res.status(404).send('Data pencarian tidak ditemukan atau sudah dibersihkan.');
    }

    const sanitizedTarget = item.target.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="osint_${sanitizedTarget}_${item.id}.json"`);
      return res.send(item.rawResult);
    } else {
      const txtContent = generateTxtReport(item);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="osint_${sanitizedTarget}_${item.id}.txt"`);
      return res.send(txtContent);
    }
  });

  // ==========================================
  // DATASET MANAGEMENT API (Smart & Unlimited Size)
  // ==========================================

  // 1. Get all dataset files list
  app.get('/api/datasets', async (req, res) => {
    try {
      const files = await getAllDatasetFiles();
      res.json({ success: true, files });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal memuat daftar file: ${err.message}` });
    }
  });

  // 2. Upload dataset file (no file size limit)
  app.post('/api/datasets/upload', (req, res) => {
    datasetUpload.single('file')(req as any, res as any, async (err: any) => {
      if (err) {
        console.error('Multer upload error:', err);
        return res.status(400).json({ success: false, message: `Gagal upload: ${err.message}` });
      }

      try {
        if (!req.file) {
          return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
        }

        const setAsDefault = req.body.setAsDefault === 'true' || req.body.setAsDefault === true;
        const uploadedPath = req.file.path;
        const originalName = path.basename(req.file.originalname || 'dataset.txt');

        if (setAsDefault || originalName.toLowerCase() === 'dataset.txt') {
          // Also copy/replace data/dataset.txt
          fs.copyFileSync(uploadedPath, DEFAULT_DATASET_FILE);
        }

        addLog('system', `File dataset diunggah: ${originalName} (${(req.file.size / 1024).toFixed(1)} KB)`);

        const files = await getAllDatasetFiles();
        res.json({
          success: true,
          message: `File ${originalName} berhasil diunggah! Sistem pintar otomatis siap menggunakannya untuk pencarian intelijen.`,
          file: req.file,
          files
        });
      } catch (uploadErr: any) {
        res.status(500).json({ success: false, message: `Gagal memproses file unggahan: ${uploadErr.message}` });
      }
    });
  });

  // 3. Create / Add new dataset file directly
  app.post('/api/datasets/create', async (req, res) => {
    try {
      const { filename, content } = req.body;
      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ success: false, message: 'Nama file wajib diisi.' });
      }

      const baseName = sanitizeDatasetFilename(filename);
      await writeDatasetContent(baseName, content || '');
      addLog('system', `File dataset baru dibuat: ${baseName}`);

      const files = await getAllDatasetFiles();
      res.json({
        success: true,
        message: `File dataset ${baseName} berhasil dibuat dan siap dicari!`,
        files
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal membuat file: ${err.message}` });
    }
  });

  // 4. Read file content (for Edit / View mode)
  app.get('/api/datasets/content', async (req, res) => {
    try {
      const filename = sanitizeDatasetFilename((req.query.filename as string) || 'dataset.txt');
      const maxLines = req.query.maxLines ? parseInt(req.query.maxLines as string, 10) : undefined;
      const data = await readDatasetContent(filename, maxLines);
      res.json({ success: true, ...data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal membaca isi file: ${err.message}` });
    }
  });

  // 5. Save edited file content
  app.put('/api/datasets/content', async (req, res) => {
    try {
      const { filename, content } = req.body;
      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ success: false, message: 'Nama file tidak valid.' });
      }

      const baseName = sanitizeDatasetFilename(filename);
      await writeDatasetContent(baseName, content || '');
      addLog('system', `File dataset diperbarui: ${baseName}`);

      const files = await getAllDatasetFiles();
      res.json({
        success: true,
        message: `Perubahan pada ${baseName} berhasil disimpan!`,
        files
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal menyimpan file: ${err.message}` });
    }
  });

  // 6. Delete dataset file
  app.delete('/api/datasets/:filename', async (req, res) => {
    try {
      const rawParam = req.params.filename ? decodeURIComponent(req.params.filename) : 'dataset.txt';
      const filename = sanitizeDatasetFilename(rawParam);
      const result = await deleteDatasetFile(filename);
      addLog('system', `File dataset dihapus/dibersihkan: ${filename}`);
      const files = await getAllDatasetFiles();
      res.json({
        success: true,
        message: result.message || `File ${filename} berhasil dihapus.`,
        files
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal menghapus file: ${err.message}` });
    }
  });

  // 7. Download dataset file
  app.get('/api/datasets/download/:filename', (req, res) => {
    try {
      const rawParam = req.params.filename ? decodeURIComponent(req.params.filename) : 'dataset.txt';
      const sanitized = sanitizeDatasetFilename(rawParam);
      const filePath = sanitized.toLowerCase() === 'dataset.txt'
        ? DEFAULT_DATASET_FILE
        : path.join(DATASETS_DIR, sanitized);

      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File dataset tidak ditemukan.');
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitized}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (err: any) {
      res.status(500).send(`Gagal mendownload file: ${err.message}`);
    }
  });

  // 8. Test Smart Search on Datasets (Live Web Tester)
  app.post('/api/datasets/search', async (req, res) => {
    try {
      const { query, limit } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ success: false, message: 'Query target pencarian wajib diisi.' });
      }

      const result = await smartSearchDatasets(query.trim(), limit ? parseInt(limit, 10) : 100);
      res.json({
        success: true,
        result
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Error saat memproses pencarian: ${err.message}` });
    }
  });

  // 9. Update OSINT Search Mode (smart_dataset | hybrid | ngrok_only)
  app.post('/api/bot/osint/mode', (req, res) => {
    const { mode } = req.body;
    if (mode && ['smart_dataset', 'hybrid', 'ngrok_only'].includes(mode)) {
      botConfig.osintConfig.searchEngineMode = mode;
      saveBotConfig();
      addLog('system', `Mode mesin pencarian OSINT diubah ke: ${mode}`);
      res.json({ success: true, mode, message: `Mode pencarian berhasil diubah ke ${mode}` });
    } else {
      res.status(400).json({ success: false, message: 'Mode tidak valid. Pilihan: smart_dataset, hybrid, ngrok_only.' });
    }
  });

  // =========================================================================
  // GITHUB DATASET SYNC & TEST ENDPOINTS
  // =========================================================================

  // 10. Get GitHub Dataset Config
  app.get('/api/datasets/github/config', (req, res) => {
    res.json({
      success: true,
      config: botConfig.githubSync || DEFAULT_GITHUB_SYNC
    });
  });

  // 11. Update GitHub Dataset Config
  app.post('/api/datasets/github/config', (req, res) => {
    try {
      const incoming = req.body;
      botConfig.githubSync = {
        ...DEFAULT_GITHUB_SYNC,
        ...(botConfig.githubSync || {}),
        ...incoming
      };
      saveBotConfig();
      res.json({
        success: true,
        message: 'Konfigurasi sinkronisasi GitHub berhasil disimpan.',
        config: botConfig.githubSync
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal menyimpan konfigurasi: ${err.message}` });
    }
  });

  // 12. Test GitHub Dataset URL before downloading
  app.post('/api/datasets/github/test', async (req, res) => {
    try {
      const { url, githubToken } = req.body;
      const targetUrl = (url || botConfig.githubSync?.url || '').trim();

      if (!targetUrl) {
        return res.status(400).json({ success: false, message: 'URL GitHub dataset wajib diisi.' });
      }

      const testResult = await testGithubDataset(targetUrl, githubToken || botConfig.githubSync?.githubToken);

      // Update state
      if (!botConfig.githubSync) {
        botConfig.githubSync = { ...DEFAULT_GITHUB_SYNC };
      }
      botConfig.githubSync.url = targetUrl;
      botConfig.githubSync.rawUrl = testResult.rawUrl;
      botConfig.githubSync.lastTestedAt = new Date().toISOString();
      botConfig.githubSync.lastTestStatus = testResult.success ? 'success' : 'error';
      botConfig.githubSync.lastTestMessage = testResult.message;
      botConfig.githubSync.lastTestSizeFormatted = testResult.sizeFormatted;
      botConfig.githubSync.lastTestLinesPreview = testResult.previewLines;
      saveBotConfig();

      addLog('system', `Uji koneksi dataset GitHub: ${testResult.success ? 'BERHASIL' : 'GAGAL'} (${targetUrl})`);

      res.json({
        success: testResult.success,
        result: testResult
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal menguji GitHub dataset: ${err.message}` });
    }
  });

  // 13. Sync / Download dataset from GitHub
  app.post('/api/datasets/github/sync', async (req, res) => {
    try {
      const { url, targetFilename, replacePrimary, githubToken } = req.body;
      const syncUrl = (url || botConfig.githubSync?.url || 'https://github.com/THEOYS123/track-call/blob/main/data/dataset.txt').trim();
      const filename = (targetFilename || botConfig.githubSync?.targetFilename || 'dataset.txt').trim();
      const isPrimary = replacePrimary !== undefined ? Boolean(replacePrimary) : (botConfig.githubSync?.replacePrimary ?? true);
      const token = githubToken || botConfig.githubSync?.githubToken;

      addLog('system', `Memulai sinkronisasi dataset dari GitHub: ${syncUrl} -> ${filename}`);

      const syncResult = await syncGithubDataset(syncUrl, filename, isPrimary, token);

      // Update state
      if (!botConfig.githubSync) {
        botConfig.githubSync = { ...DEFAULT_GITHUB_SYNC };
      }
      botConfig.githubSync.url = syncUrl;
      botConfig.githubSync.targetFilename = filename;
      botConfig.githubSync.replacePrimary = isPrimary;
      botConfig.githubSync.lastSyncedAt = new Date().toISOString();
      botConfig.githubSync.lastSyncStatus = 'success';
      botConfig.githubSync.lastSyncMessage = syncResult.message;
      botConfig.githubSync.lastSyncedBytes = syncResult.downloadedBytes;
      saveBotConfig();

      addLog('system', `Sinkronisasi GitHub selesai: ${syncResult.message}`);

      const files = await getAllDatasetFiles();
      res.json({
        success: true,
        message: syncResult.message,
        fileInfo: syncResult.fileInfo,
        files,
        githubSync: botConfig.githubSync
      });
    } catch (err: any) {
      if (botConfig.githubSync) {
        botConfig.githubSync.lastSyncStatus = 'error';
        botConfig.githubSync.lastSyncMessage = err.message;
        saveBotConfig();
      }
      addLog('error', `Gagal sinkronisasi dataset GitHub: ${err.message}`);
      res.status(500).json({ success: false, message: `Gagal sinkronisasi GitHub: ${err.message}` });
    }
  });

  // =========================================================================
  // TELEGRAM GROUP & ANTI-SPAM SETTINGS API
  // =========================================================================

  // 14. Get Group Config
  app.get('/api/groups/config', (req, res) => {
    res.json({
      success: true,
      config: botConfig.groupConfig || DEFAULT_GROUP_CONFIG
    });
  });

  // 15. Update Group Config
  app.post('/api/groups/config', (req, res) => {
    try {
      const incoming = req.body;
      botConfig.groupConfig = {
        ...DEFAULT_GROUP_CONFIG,
        ...(botConfig.groupConfig || {}),
        ...incoming,
        knownGroups: Array.isArray(incoming.knownGroups)
          ? incoming.knownGroups
          : (botConfig.groupConfig?.knownGroups || [])
      };
      saveBotConfig();
      addLog('system', `Pengaturan grup Telegram & anti-spam diperbarui.`);
      res.json({
        success: true,
        message: 'Pengaturan grup berhasil disimpan!',
        config: botConfig.groupConfig
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal menyimpan konfigurasi grup: ${err.message}` });
    }
  });

  // 16. Toggle Group Feature (Allow Groups / Silent Fallback / Admin Only / Anti Flood)
  app.post('/api/groups/toggle', (req, res) => {
    try {
      const { setting, value } = req.body;
      if (!botConfig.groupConfig) {
        botConfig.groupConfig = { ...DEFAULT_GROUP_CONFIG };
      }

      if (setting in botConfig.groupConfig) {
        (botConfig.groupConfig as any)[setting] = Boolean(value);
        saveBotConfig();
        addLog('system', `Pengaturan grup ${setting} diubah menjadi: ${value}`);
        return res.json({ success: true, config: botConfig.groupConfig });
      }
      res.status(400).json({ success: false, message: 'Setting tidak valid.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 17. Block / Unblock Group ID
  app.post('/api/groups/block', (req, res) => {
    try {
      const { groupId, blocked } = req.body;
      const numId = Number(groupId);
      if (!numId) {
        return res.status(400).json({ success: false, message: 'Group ID tidak valid.' });
      }

      if (!botConfig.groupConfig) {
        botConfig.groupConfig = { ...DEFAULT_GROUP_CONFIG };
      }
      if (!Array.isArray(botConfig.groupConfig.blockedGroupIds)) {
        botConfig.groupConfig.blockedGroupIds = [];
      }

      if (blocked) {
        if (!botConfig.groupConfig.blockedGroupIds.includes(numId)) {
          botConfig.groupConfig.blockedGroupIds.push(numId);
        }
      } else {
        botConfig.groupConfig.blockedGroupIds = botConfig.groupConfig.blockedGroupIds.filter((id) => id !== numId);
      }

      // Update in knownGroups
      const matched = botConfig.groupConfig.knownGroups?.find((g) => g.id === numId);
      if (matched) {
        matched.status = blocked ? 'blocked' : 'active';
      }

      saveBotConfig();
      addLog('system', `Status blokir grup ID ${numId}: ${blocked ? 'DIBLOKIR' : 'DIIZINKAN'}`);

      res.json({
        success: true,
        message: `Grup ${numId} berhasil ${blocked ? 'diblokir' : 'diaktifkan kembali'}.`,
        config: botConfig.groupConfig
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 18. Whitelist / Remove from Whitelist Group ID
  app.post('/api/groups/whitelist', (req, res) => {
    try {
      const { groupId, whitelist } = req.body;
      const numId = Number(groupId);
      if (!numId) {
        return res.status(400).json({ success: false, message: 'Group ID tidak valid.' });
      }

      if (!botConfig.groupConfig) {
        botConfig.groupConfig = { ...DEFAULT_GROUP_CONFIG };
      }
      if (!Array.isArray(botConfig.groupConfig.allowedGroupIds)) {
        botConfig.groupConfig.allowedGroupIds = [];
      }

      if (whitelist) {
        if (!botConfig.groupConfig.allowedGroupIds.includes(numId)) {
          botConfig.groupConfig.allowedGroupIds.push(numId);
        }
      } else {
        botConfig.groupConfig.allowedGroupIds = botConfig.groupConfig.allowedGroupIds.filter((id) => id !== numId);
      }

      saveBotConfig();
      addLog('system', `Whitelist grup ID ${numId}: ${whitelist ? 'DITAMBAHKAN' : 'DIHAPUS'}`);

      res.json({
        success: true,
        message: `Grup ${numId} ${whitelist ? 'ditambahkan ke' : 'dihapus dari'} whitelist.`,
        config: botConfig.groupConfig
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 19. Remove known group from list
  app.delete('/api/groups/:groupId', (req, res) => {
    try {
      const numId = Number(req.params.groupId);
      if (botConfig.groupConfig && Array.isArray(botConfig.groupConfig.knownGroups)) {
        botConfig.groupConfig.knownGroups = botConfig.groupConfig.knownGroups.filter((g) => g.id !== numId);
        saveBotConfig();
      }
      res.json({ success: true, message: 'Grup dihapus dari daftar.', config: botConfig.groupConfig });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // =========================================================================
  // BOT QUOTA & CLAIM CONFIGURATION API
  // =========================================================================
  app.get('/api/bot/quota-config', (req, res) => {
    res.json({
      success: true,
      config: botConfig.quotaConfig || DEFAULT_QUOTA_CONFIG
    });
  });

  app.post('/api/bot/quota-config', (req, res) => {
    try {
      const incoming = req.body;
      botConfig.quotaConfig = {
        ...DEFAULT_QUOTA_CONFIG,
        ...(botConfig.quotaConfig || {}),
        ...incoming
      };
      saveBotConfig();
      addLog('system', `Konfigurasi kuota & klaim bot diperbarui.`);
      res.json({
        success: true,
        message: 'Pengaturan kuota & klaim berhasil disimpan!',
        config: botConfig.quotaConfig
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal menyimpan konfigurasi kuota: ${err.message}` });
    }
  });

  // Admin reset quota claim flags for a user
  app.post('/api/bot/quota/reset-claims', (req, res) => {
    try {
      const { userId, resetNewUser, resetDaily } = req.body;
      const numId = Number(userId);
      const user = botConfig.activeUsers.find(
        (u) => (u.userId && Number(u.userId) === numId) || Number(u.chatId) === numId
      );
      if (!user) {
        return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      }
      if (resetNewUser) {
        user.hasClaimedNewUserQuota = false;
        user.newUserQuotaClaimedAt = undefined;
      }
      if (resetDaily) {
        user.dailyQuotaLastClaimedDate = undefined;
        user.dailyQuotaLastClaimedAt = undefined;
      }
      saveBotConfig();
      addLog('system', `Status klaim kuota pengguna ${numId} direset oleh Admin.`);
      res.json({ success: true, message: `Status klaim untuk ${user.firstName} berhasil direset.`, user });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // =========================================================================
  // BOT MENU CONFIGURATION API
  // =========================================================================
  app.get('/api/bot/menu-config', (req, res) => {
    res.json({
      success: true,
      config: botConfig.menuConfig || DEFAULT_MENU_CONFIG
    });
  });

  app.post('/api/bot/menu-config', (req, res) => {
    try {
      const incoming = req.body;
      botConfig.menuConfig = {
        ...DEFAULT_MENU_CONFIG,
        ...(botConfig.menuConfig || {}),
        ...incoming,
        customButtons: Array.isArray(incoming.customButtons)
          ? incoming.customButtons
          : (botConfig.menuConfig?.customButtons || [])
      };
      saveBotConfig();
      addLog('system', `Konfigurasi tampilan menu bot diperbarui.`);
      res.json({
        success: true,
        message: 'Pengaturan menu bot berhasil disimpan!',
        config: botConfig.menuConfig
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal menyimpan konfigurasi menu: ${err.message}` });
    }
  });

  // =========================================================================
  // CONTENT MODERATION & AUTO-DELETE CONFIGURATION API
  // =========================================================================
  app.get('/api/moderation/config', (req, res) => {
    res.json({
      success: true,
      config: botConfig.moderationConfig || DEFAULT_MODERATION_CONFIG
    });
  });

  app.post('/api/moderation/config', (req, res) => {
    try {
      const incoming = req.body;
      botConfig.moderationConfig = {
        ...DEFAULT_MODERATION_CONFIG,
        ...(botConfig.moderationConfig || {}),
        ...incoming,
        cyberWhitelistKeywords: Array.isArray(incoming.cyberWhitelistKeywords)
          ? incoming.cyberWhitelistKeywords
          : (botConfig.moderationConfig?.cyberWhitelistKeywords || DEFAULT_MODERATION_CONFIG.cyberWhitelistKeywords),
        customBannedKeywords: Array.isArray(incoming.customBannedKeywords)
          ? incoming.customBannedKeywords
          : (botConfig.moderationConfig?.customBannedKeywords || []),
        whitelistKeywords: Array.isArray(incoming.whitelistKeywords)
          ? incoming.whitelistKeywords
          : (botConfig.moderationConfig?.whitelistKeywords || []),
        recentIncidents: Array.isArray(botConfig.moderationConfig?.recentIncidents)
          ? botConfig.moderationConfig.recentIncidents
          : []
      };
      saveBotConfig();
      addLog('system', `Pengaturan sistem moderasi konten & auto-delete diperbarui.`);
      res.json({
        success: true,
        message: 'Pengaturan moderasi & auto-delete berhasil disimpan!',
        config: botConfig.moderationConfig
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal menyimpan konfigurasi moderasi: ${err.message}` });
    }
  });

  // Test moderation rule with sample message text
  app.post('/api/moderation/test', (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ success: false, message: 'Teks pesan uji coba wajib diisi.' });
      }
      const result = checkMessageModeration(text);
      res.json({
        success: true,
        text,
        result
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Clear moderation incident history
  app.post('/api/moderation/clear-incidents', (req, res) => {
    try {
      if (botConfig.moderationConfig) {
        botConfig.moderationConfig.recentIncidents = [];
        saveBotConfig();
      }
      res.json({
        success: true,
        message: 'Riwayat insiden pesan terlarang berhasil dibersihkan.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ==========================================
  // REFERRAL & TABUNGAN KUOTA MANAGEMENT API
  // ==========================================

  // 1. Get all referral data (config, leaderboard accounts, records, withdrawLogs)
  app.get('/api/bot/referral/data', (req, res) => {
    try {
      const accounts = getAllReferralAccounts();
      res.json({
        success: true,
        config: botConfig.referralConfig || DEFAULT_REFERRAL_CONFIG,
        accounts,
        records: botConfig.referralRecords || [],
        withdrawLogs: botConfig.referralWithdrawLogs || []
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal memuat data referral: ${err.message}` });
    }
  });

  // 2. Update Referral Configuration
  app.post('/api/bot/referral/config', (req, res) => {
    try {
      const { enabled, quotaPerInvite, allowInstantWithdraw, minWithdrawAmount, notifyInviterOnRegister } = req.body;
      const current = botConfig.referralConfig || DEFAULT_REFERRAL_CONFIG;

      botConfig.referralConfig = {
        enabled: typeof enabled === 'boolean' ? enabled : current.enabled,
        quotaPerInvite: typeof quotaPerInvite === 'number' ? Math.max(1, quotaPerInvite) : current.quotaPerInvite,
        allowInstantWithdraw: typeof allowInstantWithdraw === 'boolean' ? allowInstantWithdraw : current.allowInstantWithdraw,
        minWithdrawAmount: typeof minWithdrawAmount === 'number' ? Math.max(1, minWithdrawAmount) : current.minWithdrawAmount,
        notifyInviterOnRegister: typeof notifyInviterOnRegister === 'boolean' ? notifyInviterOnRegister : current.notifyInviterOnRegister
      };

      saveReferralData();
      saveBotConfig();
      addLog('system', `Konfigurasi sistem referral & tabungan kuota diperbarui via Web.`);

      res.json({
        success: true,
        config: botConfig.referralConfig,
        message: 'Pengaturan program referral berhasil disimpan!'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal menyimpan konfigurasi: ${err.message}` });
    }
  });

  // 3. Adjust User Quota Vault / Savings Balance Manually
  app.post('/api/bot/referral/adjust-vault', async (req, res) => {
    try {
      const { userId, amount = 1, actionType = 'add_savings', notifyUser = true } = req.body;
      const numericUserId = Number(userId);
      const user = botConfig.activeUsers.find((u) => Number(u.userId || u.chatId) === numericUserId);

      if (!user) {
        return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      }

      const numAmount = Math.max(1, Number(amount) || 1);
      const prevVault = user.referralVaultBalance || 0;

      if (actionType === 'add_savings') {
        user.referralVaultBalance = prevVault + numAmount;
        saveBotConfig();
        saveReferralData();
        addLog('system', `Admin menambahkan +${numAmount} kuota ke Tabungan ${user.firstName} (ID: ${numericUserId}). Total tabungan: ${user.referralVaultBalance}x`);

        if (notifyUser && botConfig.token) {
          const wibTime = getFormattedWIB();
          const notifyMsg = `🎁 *ADMIN MENAMBAHKAN KUOTA KE TABUNGAN ANDA!*
━━━━━━━━━━━━━━━━━━━━━━━━━
Halo *${user.firstName}*! Admin Web Controller baru saja menambahkan saldo ke Tabungan Kuota Anda:

➕ *Tambahan Saldo:* *+${numAmount}x Kuota*
💼 *Total Saldo Tabungan Anda:* *${user.referralVaultBalance}x Kuota*
🕒 *Waktu:* ${wibTime.fullStr}
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Ketik /tabungan atau /tarik untuk mencairkan saldo tabungan ke kuota pencarian aktif Anda._`;

          sendTelegramMessage(user.chatId || numericUserId, notifyMsg, {
            inline_keyboard: [
              [{ text: '💼 Buka Tabungan Kuota', callback_data: 'cmd_referral' }],
              [{ text: '💰 Tarik Semua Kuota', callback_data: 'ref_withdraw_all' }]
            ]
          }).catch(() => {});
        }

        return res.json({
          success: true,
          user,
          message: `Berhasil menambahkan +${numAmount} kuota ke tabungan ${user.firstName}.`
        });
      } else if (actionType === 'withdraw_to_quota') {
        if (numAmount > prevVault) {
          return res.status(400).json({ success: false, message: `Saldo tabungan pengguna (${prevVault}x) tidak mencukupi untuk menarik ${numAmount}x kuota.` });
        }
        user.referralVaultBalance = prevVault - numAmount;
        user.personalQuota = (user.personalQuota || 0) + numAmount;
        user.totalReferralQuotaClaimed = (user.totalReferralQuotaClaimed || 0) + numAmount;
        syncUserApiKey(user);
        saveBotConfig();
        saveReferralData();

        addLog('system', `Admin mencairkan ${numAmount}x kuota tabungan milik ${user.firstName} (ID: ${numericUserId}) ke kuota aktif.`);

        if (notifyUser && botConfig.token) {
          const wibTime = getFormattedWIB();
          const notifyMsg = `💰 *TABUNGAN KUOTA TELAH DICAIRKAN OLEH ADMIN!*
━━━━━━━━━━━━━━━━━━━━━━━━━
Halo *${user.firstName}*! Kuota tabungan Anda berhasil dicairkan ke Saldo Kuota Aktif:

💰 *Kuota Ditarik:* *+${numAmount}x Kuota*
💼 *Sisa Tabungan:* *${user.referralVaultBalance}x Kuota*
💎 *Saldo Kuota Pencarian Aktif Baru:* *${user.personalQuota}x Pencarian*
🕒 *Waktu:* ${wibTime.fullStr}
━━━━━━━━━━━━━━━━━━━━━━━━━
💡 _Anda dapat langsung mencari intelijen dengan format: \`search: <target>\`_`;

          sendTelegramMessage(user.chatId || numericUserId, notifyMsg, {
            inline_keyboard: [
              [{ text: '💎 Cek Kuota Saya', callback_data: 'cmd_my_quota' }],
              [{ text: '🏠 Menu Utama', callback_data: 'cmd_menu' }]
            ]
          }).catch(() => {});
        }

        return res.json({
          success: true,
          user,
          message: `Berhasil mencairkan ${numAmount} kuota tabungan ke kuota aktif ${user.firstName}.`
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Error adjust vault: ${err.message}` });
    }
  });

  // 4. Reset User Referral Data
  app.post('/api/bot/referral/reset-user', (req, res) => {
    try {
      const { userId } = req.body;
      const numericUserId = Number(userId);
      const user = botConfig.activeUsers.find((u) => Number(u.userId || u.chatId) === numericUserId);

      if (user) {
        user.referralVaultBalance = 0;
        user.totalReferralsCount = 0;
        user.totalReferralQuotaClaimed = 0;
      }

      botConfig.referralRecords = (botConfig.referralRecords || []).filter((r) => Number(r.inviterUserId) !== numericUserId);
      saveReferralData();
      saveBotConfig();

      addLog('system', `Data referral & tabungan kuota user ${numericUserId} direset via Web.`);

      res.json({
        success: true,
        message: `Data referral user ${numericUserId} berhasil direset.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal reset: ${err.message}` });
    }
  });

  // ==========================================
  // MULTI-BOT CLUSTER & RENTAL PLANS API
  // ==========================================

  // 1. Get Multi-Bot Cluster List
  app.get('/api/multibot/list', (req, res) => {
    try {
      res.json({
        success: true,
        primaryBot: {
          token: botConfig.token ? maskToken(botConfig.token) : '',
          isActive: botConfig.isActive,
          botInfo: currentBotInfo,
          isPrimary: true
        },
        multiBots: botConfig.multiBots || [],
        rentalPlans: botConfig.rentalPlans || DEFAULT_RENTAL_PLANS
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2. Add New Bot to Multi-Bot Cluster (Protected by Multi-Layer Owner Auth)
  app.post('/api/multibot/add', requireOwnerAuthMiddleware, async (req, res) => {
    try {
      const { token, notes, rentedBy, rentExpiryDate, primaryOwner, secondaryOwners, secretCode } = req.body;
      const trimmedToken = (token || '').trim();
      const trimmedPrimaryOwner = (primaryOwner || '').trim();

      if (!trimmedToken) {
        return res.status(400).json({ success: false, message: 'Token Telegram wajib diisi.' });
      }

      if (!trimmedPrimaryOwner) {
        return res.status(400).json({
          success: false,
          message: 'Akun Owner Utama wajib diisi (@username atau Telegram Chat ID) demi keamanan menu owner!'
        });
      }

      // Check if duplicate of primary
      if (trimmedToken === botConfig.token) {
        return res.status(400).json({ success: false, message: 'Token ini sudah digunakan sebagai Master Bot.' });
      }

      // Validate with real Telegram API
      const val = await verifyTelegramToken(trimmedToken);
      if (!val.valid || !val.botInfo) {
        return res.status(400).json({
          success: false,
          message: val.errorMessage || 'Token tidak valid menurut Telegram API.'
        });
      }

      const botId = `bot_${val.botInfo.id}`;
      const normalizedExpiry = parseRentExpiryInput(rentExpiryDate);

      // Determine primaryOwnerChatId if numeric or match activeUsers
      let primaryOwnerChatId: number | null = null;
      const numericTarget = Number(trimmedPrimaryOwner.replace(/^@/, ''));
      if (!isNaN(numericTarget) && numericTarget > 0) {
        primaryOwnerChatId = numericTarget;
      } else {
        const cleanUn = trimmedPrimaryOwner.toLowerCase().replace(/^@/, '');
        const matched = (botConfig.activeUsers || []).find(
          (u) => (u.username || '').toLowerCase().replace(/^@/, '') === cleanUn
        );
        if (matched && matched.chatId) {
          primaryOwnerChatId = Number(matched.chatId);
        }
      }

      // Parse any secondary / clone owners requested at setup
      const pendingCloneOwners: CloneOwnerRequest[] = [];
      const parsedSecondaryOwners: string[] = [];

      if (Array.isArray(secondaryOwners)) {
        for (const item of secondaryOwners) {
          const clean = String(item || '').trim();
          if (clean && !parsedSecondaryOwners.includes(clean)) {
            pendingCloneOwners.push({
              id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              ownerIdentifier: clean,
              requestedAt: new Date().toISOString(),
              status: 'pending'
            });
          }
        }
      } else if (typeof secondaryOwners === 'string' && secondaryOwners.trim()) {
        const parts = secondaryOwners.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
        for (const clean of parts) {
          pendingCloneOwners.push({
            id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            ownerIdentifier: clean,
            requestedAt: new Date().toISOString(),
            status: 'pending'
          });
        }
      }

      const newBot: MultiBotInstance = {
        id: botId,
        token: trimmedToken,
        maskedToken: maskToken(trimmedToken),
        isActive: true,
        botInfo: val.botInfo,
        addedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        latencyMs: val.latencyMs,
        notes: (notes || '').trim() || undefined,
        rentedBy: (rentedBy || '').trim() || undefined,
        rentExpiryDate: normalizedExpiry,
        primaryOwner: trimmedPrimaryOwner,
        primaryOwnerChatId,
        secondaryOwners: parsedSecondaryOwners,
        pendingCloneOwners,
        secretCode: (secretCode || '').trim() || 'ax0895',
        stats: { messagesReceived: 0, messagesSent: 0, commandsExecuted: 0 }
      };

      if (!Array.isArray(botConfig.multiBots)) {
        botConfig.multiBots = [];
      }

      // Replace if already existed
      botConfig.multiBots = botConfig.multiBots.filter((b) => b.token !== trimmedToken && b.id !== botId);
      botConfig.multiBots.unshift(newBot);
      saveBotConfig();

      // Start background polling loop for this bot
      runSingleSecondaryBotWorker(newBot).catch((err) => {
        console.error(`[Multi-Bot Worker] Startup error for ${botId}:`, err);
      });

      // Dispatch notifications for pending clone owner approvals if any
      if (pendingCloneOwners.length > 0) {
        for (const reqItem of pendingCloneOwners) {
          notifyPrimaryOwnerForCloneApproval(newBot, reqItem).catch((err) => {
            console.warn(`[Clone Approval] Notification error:`, err);
          });
        }
      }

      addLog(
        'system',
        `Bot baru ditambahkan ke Cluster: @${val.botInfo.username} (Owner Utama: ${trimmedPrimaryOwner}, Kode: ${newBot.secretCode})`
      );

      res.json({
        success: true,
        bot: newBot,
        multiBots: botConfig.multiBots,
        message: `Bot @${val.botInfo.username} berhasil disambungkan dengan Owner Utama ${trimmedPrimaryOwner}! Menu owner telah diamankan.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal menambahkan bot: ${err.message}` });
    }
  });

  // 3. Toggle Bot Instance ON / PAUSE
  app.post('/api/multibot/toggle', requireOwnerAuthMiddleware, async (req, res) => {
    try {
      const { botId, active } = req.body;
      if (!botId) {
        return res.status(400).json({ success: false, message: 'ID Bot wajib diisi.' });
      }

      const bot = (botConfig.multiBots || []).find((b) => b.id === botId);
      if (!bot) {
        return res.status(404).json({ success: false, message: 'Bot tidak ditemukan di cluster.' });
      }

      bot.isActive = Boolean(active);
      saveBotConfig();

      if (bot.isActive) {
        runSingleSecondaryBotWorker(bot).catch(console.error);
        addLog('system', `Multi-Bot @${bot.botInfo?.username || bot.id} diaktifkan.`);
      } else {
        stopSingleSecondaryBotWorker(bot.id);
        addLog('system', `Multi-Bot @${bot.botInfo?.username || bot.id} dipause.`);
      }

      res.json({
        success: true,
        bot,
        multiBots: botConfig.multiBots,
        message: `Bot @${bot.botInfo?.username || bot.id} berhasil ${bot.isActive ? 'diaktifkan' : 'dipause'}.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 3b. Update / Edit Bot Instance
  app.post('/api/multibot/update', requireOwnerAuthMiddleware, async (req, res) => {
    try {
      const {
        botId,
        token,
        notes,
        rentedBy,
        rentExpiryDate,
        isActive,
        primaryOwner,
        secretCode,
        secondaryOwners,
        newCloneOwner,
        approveCloneRequestId,
        rejectCloneRequestId,
        deleteCloneOwner
      } = req.body;

      if (!botId) {
        return res.status(400).json({ success: false, message: 'ID Bot wajib diisi.' });
      }

      if (!Array.isArray(botConfig.multiBots)) {
        botConfig.multiBots = [];
      }

      const bot = botConfig.multiBots.find((b) => b.id === botId);
      if (!bot) {
        return res.status(404).json({ success: false, message: 'Bot tidak ditemukan di cluster.' });
      }

      const trimmedToken = (token || '').trim();
      let tokenChanged = false;

      if (trimmedToken && trimmedToken !== bot.token) {
        tokenChanged = true;
        const val = await verifyTelegramToken(trimmedToken);
        if (!val.valid || !val.botInfo) {
          return res.status(400).json({
            success: false,
            message: val.errorMessage || 'Token baru tidak valid menurut Telegram API.'
          });
        }
        bot.token = trimmedToken;
        bot.maskedToken = maskToken(trimmedToken);
        bot.botInfo = val.botInfo;
        bot.latencyMs = val.latencyMs;
      }

      if (notes !== undefined) bot.notes = (notes || '').trim() || undefined;
      if (rentedBy !== undefined) bot.rentedBy = (rentedBy || '').trim() || undefined;
      if (rentExpiryDate !== undefined) bot.rentExpiryDate = parseRentExpiryInput(rentExpiryDate);
      if (isActive !== undefined) bot.isActive = Boolean(isActive);

      // Update Secret Code for Owner Menu
      if (secretCode !== undefined) {
        const sc = (secretCode || '').trim();
        bot.secretCode = sc || 'ax0895';
      }

      // Update Primary Owner
      if (primaryOwner !== undefined && primaryOwner.trim()) {
        const trimmedPo = primaryOwner.trim();
        bot.primaryOwner = trimmedPo;
        const numPo = Number(trimmedPo.replace(/^@/, ''));
        if (!isNaN(numPo) && numPo > 0) {
          bot.primaryOwnerChatId = numPo;
        } else {
          const cleanUn = trimmedPo.toLowerCase().replace(/^@/, '');
          const matched = (botConfig.activeUsers || []).find(
            (u) => (u.username || '').toLowerCase().replace(/^@/, '') === cleanUn
          );
          if (matched && matched.chatId) {
            bot.primaryOwnerChatId = Number(matched.chatId);
          }
        }
      }

      // Ensure lists initialized
      if (!Array.isArray(bot.secondaryOwners)) bot.secondaryOwners = [];
      if (!Array.isArray(bot.pendingCloneOwners)) bot.pendingCloneOwners = [];

      // Replace secondaryOwners list if passed as array
      if (Array.isArray(secondaryOwners)) {
        bot.secondaryOwners = secondaryOwners.map((s) => String(s || '').trim()).filter(Boolean);
      }

      // Add new clone owner request (with push notification to primary owner)
      if (newCloneOwner && typeof newCloneOwner === 'string' && newCloneOwner.trim()) {
        const cleanOwner = newCloneOwner.trim();
        const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const reqItem: CloneOwnerRequest = {
          id: reqId,
          ownerIdentifier: cleanOwner,
          requestedAt: new Date().toISOString(),
          status: 'pending'
        };
        bot.pendingCloneOwners.push(reqItem);

        // Send confirmation notification to primary owner Telegram
        notifyPrimaryOwnerForCloneApproval(bot, reqItem).catch((err) => {
          console.warn(`[Clone Approval] Notification error:`, err);
        });
        addLog('system', `Permintaan Clone Owner diajukan untuk @${bot.botInfo?.username || bot.id}: ${cleanOwner}`);
      }

      // Approve pending clone request from UI
      if (approveCloneRequestId) {
        const reqItem = bot.pendingCloneOwners.find((p) => p.id === approveCloneRequestId);
        if (reqItem) {
          reqItem.status = 'approved';
          reqItem.resolvedAt = new Date().toISOString();
          reqItem.resolvedBy = 'Web Dashboard';
          if (!bot.secondaryOwners.includes(reqItem.ownerIdentifier)) {
            bot.secondaryOwners.push(reqItem.ownerIdentifier);
          }
          addLog('system', `Clone Owner disetujui untuk @${bot.botInfo?.username || bot.id}: ${reqItem.ownerIdentifier}`);
        }
      }

      // Reject pending clone request from UI
      if (rejectCloneRequestId) {
        const reqItem = bot.pendingCloneOwners.find((p) => p.id === rejectCloneRequestId);
        if (reqItem) {
          reqItem.status = 'rejected';
          reqItem.resolvedAt = new Date().toISOString();
          reqItem.resolvedBy = 'Web Dashboard';
          addLog('system', `Clone Owner ditolak untuk @${bot.botInfo?.username || bot.id}: ${reqItem.ownerIdentifier}`);
        }
      }

      // Delete an existing approved clone owner
      if (deleteCloneOwner) {
        const cleanDel = String(deleteCloneOwner).toLowerCase().replace(/^@/, '').trim();
        bot.secondaryOwners = bot.secondaryOwners.filter(
          (o) => o.toLowerCase().replace(/^@/, '').trim() !== cleanDel
        );
        bot.pendingCloneOwners = bot.pendingCloneOwners.filter(
          (p) => p.ownerIdentifier.toLowerCase().replace(/^@/, '').trim() !== cleanDel
        );
        addLog('system', `Owner Clone dihapus dari @${bot.botInfo?.username || bot.id}: ${deleteCloneOwner}`);
      }

      saveBotConfig();

      if (tokenChanged || bot.isActive) {
        stopSingleSecondaryBotWorker(bot.id);
        if (bot.isActive) {
          runSingleSecondaryBotWorker(bot).catch(console.error);
        }
      } else if (!bot.isActive) {
        stopSingleSecondaryBotWorker(bot.id);
      }

      addLog('system', `Pengaturan Multi-Bot @${bot.botInfo?.username || bot.id} berhasil diperbarui.`);

      res.json({
        success: true,
        bot,
        multiBots: botConfig.multiBots,
        message: `Pengaturan bot @${bot.botInfo?.username || bot.id} (Owner: ${bot.primaryOwner}, Kode: ${bot.secretCode}) berhasil diperbarui!`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal memperbarui bot: ${err.message}` });
    }
  });

  // 4. Delete Bot Instance (Protected by Owner Auth)
  app.post('/api/multibot/delete', requireOwnerAuthMiddleware, (req, res) => {
    try {
      const { botId } = req.body;
      if (!botId) {
        return res.status(400).json({ success: false, message: 'ID Bot wajib diisi.' });
      }

      stopSingleSecondaryBotWorker(botId);
      const initialCount = (botConfig.multiBots || []).length;
      botConfig.multiBots = (botConfig.multiBots || []).filter((b) => b.id !== botId);
      saveBotConfig();

      addLog('system', `Bot #${botId} dihapus dari cluster.`);

      res.json({
        success: true,
        deleted: initialCount > (botConfig.multiBots || []).length,
        multiBots: botConfig.multiBots,
        message: 'Bot berhasil dihapus dari cluster.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 5. Test Ping / Latency for a specific Bot (Protected by Owner Auth)
  app.post('/api/multibot/test-ping', requireOwnerAuthMiddleware, async (req, res) => {
    try {
      const { botId } = req.body;
      const bot = (botConfig.multiBots || []).find((b) => b.id === botId);
      const token = bot ? bot.token : botId;

      if (!token) {
        return res.status(400).json({ success: false, message: 'Bot token tidak ditemukan.' });
      }

      const val = await verifyTelegramToken(token);
      if (bot && val.latencyMs !== undefined) {
        bot.latencyMs = val.latencyMs;
        saveBotConfig();
      }

      res.json({
        success: val.valid,
        latencyMs: val.latencyMs,
        botInfo: val.botInfo,
        message: val.valid ? `Ping sukses: ${val.latencyMs} ms` : `Ping gagal: ${val.errorMessage}`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 6. Get & Save Rental Plans
  app.get('/api/multibot/rental-plans', (req, res) => {
    res.json({
      success: true,
      plans: botConfig.rentalPlans || DEFAULT_RENTAL_PLANS
    });
  });

  app.post('/api/multibot/rental-plans', requireOwnerAuthMiddleware, (req, res) => {
    try {
      const { plans } = req.body;
      if (!Array.isArray(plans)) {
        return res.status(400).json({ success: false, message: 'Format plans harus array.' });
      }
      botConfig.rentalPlans = plans;
      saveBotConfig();
      addLog('system', `Daftar paket sewa bot diperbarui via Web.`);
      res.json({
        success: true,
        plans: botConfig.rentalPlans,
        message: 'Paket sewa bot berhasil disimpan.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ==========================================
  // FULL PROJECT SOURCE ZIP & NETLIFY DIST DOWNLOAD API
  // Downloads 100% complete, working project archive
  // ==========================================
  app.get(['/api/download/full-source-zip', '/downloads/axxosintbot-source.zip'], (req, res) => {
    try {
      const filename = `axxosintbot-full-source-${new Date().toISOString().slice(0, 10)}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');

      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      archive.on('error', (err) => {
        console.error('Error generating source zip:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: `Gagal kompresi zip: ${err.message}` });
        }
      });

      archive.pipe(res);

      // Pack entire project workspace files
      archive.glob('**/*', {
        cwd: process.cwd(),
        ignore: [
          'node_modules/**',
          '.git/**',
          'dist/**',
          '.cache/**',
          'coverage/**',
          '*.log',
          'project.zip',
          'axxosintbot-source.zip',
          'public/downloads/**'
        ],
        dot: true
      });

      // Append comprehensive Indonesian deployment guide
      const deployGuide = `# AXXOSINTBOT - PANDUAN LENGKAP HOSTING SENDIRI & NETLIFY

File zip ini berisi 100% SELURUH kode sumber aplikasi axxosintbot tanpa ada yang terpotong.
Anda dapat menjalankannya di VPS Linux Anda sendiri, Docker, ataupun di Netlify.

---

## 🖥️ METODE 1: HOSTING DI SERVER / VPS LINUX SENDIRI (REKOMENDASI TERBAIK)
Cocok untuk: Ubuntu 20.04/22.04/24.04, Debian, CentOS, AlmaLinux, Arch, atau Docker VPS.
Persyaratan: Node.js 18 atau 20 ke atas (disertai npm).

### Langkah-langkah Cepat:
1. Upload & Ekstrak file zip ini di VPS:
   \`\`\`bash
   unzip axxosintbot-full-source-*.zip -d axxosintbot
   cd axxosintbot
   \`\`\`

2. Install dependency proyek:
   \`\`\`bash
   npm install
   \`\`\`

3. Build aplikasi frontend & backend bundle:
   \`\`\`bash
   npm run build
   \`\`\`

4. Jalankan server secara permanen 24/7 menggunakan PM2:
   \`\`\`bash
   # Install PM2 jika belum ada
   npm install -g pm2

   # Jalankan bot & website dashboard
   pm2 start "npm run dev" --name "axxosintbot"

   # Simpan agar otomatis hidup saat VPS reboot
   pm2 save
   pm2 startup
   \`\`\`

5. Selesai! Buka browser Anda:
   http://IP_VPS_ANDA:3000

---

## 🌐 METODE 2: DEPLOY DI NETLIFY (FRONTEND CLOUD)
Cocok jika Anda ingin tampilan website aktif di Netlify Cloud secara gratis.

### Langkah-langkah:
1. Di komputer lokal Anda, jalankan \`npm install && npm run build\`.
2. Folder \`dist/\` yang dihasilkan sudah otomatis memiliki file \`_redirects\` untuk SPA routing.
3. Buka https://app.netlify.com/drop di browser Anda.
4. Drag-and-drop folder \`dist/\` ke halaman Netlify Drop tersebut.
5. Website langsung aktif online dengan domain gratis .netlify.app!
6. Buka menu "Panduan Netlify / .ZIP" di website dan hubungkan URL backend VPS Anda.

---

## 👑 KATA KUNCI OWNER & AKSES ADMIN
- Kata Kunci Default: ax0895 (bisa diubah di menu Owner Access Website)
- Perintah Telegram Tambah Bot: /addbot <token> [catatan] [tanggal_sewa] [jam]
- Perintah Telegram Atur Masa Sewa: /setexpiry <id/username> <tanggal> [jam]
- Perintah Telegram Hapus Bot: /delbot <id/username>
- Perintah Telegram List Bot: /listbot atau /multibot
- Kontrol OSINT: ax0895 on / ax0895 off
`;

      archive.append(deployGuide, { name: 'PANDUAN_HOSTING_SENDIRI_DAN_NETLIFY.txt' });
      archive.finalize();
    } catch (err: any) {
      console.error('Error initiating zip download:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: err.message });
      }
    }
  });

  app.get(['/api/download/netlify-dist-zip', '/downloads/axxosintbot-netlify-dist.zip'], (req, res) => {
    try {
      const filename = `axxosintbot-netlify-dist-${new Date().toISOString().slice(0, 10)}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');

      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      archive.on('error', (err) => {
        console.error('Error generating netlify dist zip:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: `Gagal kompresi dist: ${err.message}` });
        }
      });

      archive.pipe(res);

      const distDir = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distDir)) {
        archive.directory(distDir, false);
      } else {
        // If dist folder not built yet, bundle essential frontend source & public files
        archive.glob('**/*', {
          cwd: process.cwd(),
          ignore: ['node_modules/**', '.git/**', '*.zip']
        });
      }

      archive.append('/*    /index.html   200\n', { name: '_redirects' });
      archive.finalize();
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: err.message });
      }
    }
  });

  // ==========================================
  // LIVE MESSAGE TRAFFIC & REPLIES API
  // ==========================================
  app.get('/api/traffic/logs', (req, res) => {
    res.json({
      success: true,
      logs: messageTrafficLogs || []
    });
  });

  app.post('/api/traffic/clear', (req, res) => {
    messageTrafficLogs = [];
    addLog('system', 'Riwayat pemantau lalu lintas pesan dibersihkan oleh Admin.');
    res.json({ success: true, message: 'Riwayat lalu lintas pesan berhasil dibersihkan.' });
  });

  app.post('/api/traffic/reply', async (req, res) => {
    try {
      const { botId, chatId, text } = req.body;
      if (!chatId || !text) {
        return res.status(400).json({ success: false, message: 'Chat ID dan teks pesan wajib diisi.' });
      }

      let tokenToUse = botConfig.token;
      let senderUsername = currentBotInfo?.username || 'axxosintbot';
      let senderName = currentBotInfo?.first_name || 'Master Bot';

      if (botId && botId !== 'primary') {
        const matchedBot = (botConfig.multiBots || []).find((b) => b.id === botId);
        if (matchedBot && matchedBot.token) {
          tokenToUse = matchedBot.token;
          senderUsername = matchedBot.botInfo?.username || senderUsername;
          senderName = matchedBot.botInfo?.first_name || senderName;
        }
      }

      const result = await sendTelegramMessage(chatId, text, undefined, 'Markdown', tokenToUse);
      if (result) {
        res.json({ success: true, message: 'Pesan balasan berhasil dikirim!' });
      } else {
        res.status(500).json({ success: false, message: 'Gagal mengirim pesan melalui Telegram API.' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Error kirim: ${err.message}` });
    }
  });

  // ==========================================
  // OWNER ACCESS PASSKEY & SECURITY API
  // ==========================================
  app.post('/api/owner/verify-passkey', (req, res) => {
    try {
      const { passkey } = req.body;
      const expected = botConfig.ownerWebsitePasskey || 'ax0895';
      const isValid = (passkey || '').trim().toLowerCase() === expected.trim().toLowerCase();
      res.json({
        success: isValid,
        message: isValid ? 'Kata kunci owner valid.' : 'Kata kunci salah.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Verify whether a given Telegram chat_id or username is an authorized Primary or Clone Owner
  app.post('/api/owner/check-authorization', (req, res) => {
    try {
      const { chatId, username } = req.body;
      const auth = checkCallerIsAuthorizedOwner(req);
      const isDirectOwner = isUserAuthorizedOwner({ id: chatId || req.body.chat_id || 0, username: username || req.body.username });

      res.json({
        success: auth.authorized || isDirectOwner.authorized,
        authorized: auth.authorized || isDirectOwner.authorized,
        role: auth.role || isDirectOwner.role,
        ownerDisplay: isDirectOwner.ownerDisplay,
        details: auth.details
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/owner/update-passkey', requireOwnerAuthMiddleware, (req, res) => {
    try {
      const { oldPasskey, newPasskey } = req.body;
      const expected = botConfig.ownerWebsitePasskey || 'ax0895';
      if ((oldPasskey || '').trim().toLowerCase() !== expected.trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Kata kunci lama tidak cocok.' });
      }
      if (!newPasskey || newPasskey.trim().length < 4) {
        return res.status(400).json({ success: false, message: 'Kata kunci baru minimal 4 karakter.' });
      }

      botConfig.ownerWebsitePasskey = newPasskey.trim();
      saveBotConfig();
      addLog('system', 'Kata kunci akses Owner pada Website berhasil diperbarui.');

      res.json({
        success: true,
        message: 'Kata kunci akses Owner berhasil disimpan!'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ==========================================
  // ADVANCED BROADCAST (GROUPS & SUPERGROUPS)
  // ==========================================
  app.post('/api/broadcast/send', async (req, res) => {
    try {
      const { target, botId, text, customTargetIds, pinMessage } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ success: false, message: 'Isi teks broadcast tidak boleh kosong.' });
      }

      // Collect target chat IDs
      let targetChatIds: (string | number)[] = [];

      if (target === 'groups') {
        const groups = botConfig.groupConfig?.knownGroups || [];
        targetChatIds = groups.map((g) => g.id);
      } else if (target === 'all') {
        const groupIds = (botConfig.groupConfig?.knownGroups || []).map((g) => g.id);
        const userIds = (botConfig.activeUsers || []).map((u) => u.chatId);
        targetChatIds = Array.from(new Set([...groupIds, ...userIds]));
      } else if (target === 'custom') {
        const raw = String(customTargetIds || '');
        targetChatIds = raw
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => (isNaN(Number(s)) ? s : Number(s)));
      }

      if (targetChatIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada target tujuan broadcast yang ditemukan.' });
      }

      // Available active bots for cluster distribution
      const availableBots: { token: string; botInfo: any; id: string }[] = [];
      if (botConfig.isActive && botConfig.token) {
        availableBots.push({ token: botConfig.token, botInfo: currentBotInfo, id: 'primary' });
      }
      for (const b of botConfig.multiBots || []) {
        if (b.isActive && b.token) {
          availableBots.push({ token: b.token, botInfo: b.botInfo, id: b.id });
        }
      }

      if (availableBots.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada bot yang sedang aktif untuk mengirim broadcast.' });
      }

      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < targetChatIds.length; i++) {
        const cId = targetChatIds[i];
        let botToUse = availableBots[0];

        if (botId === 'all_cluster') {
          // Round-robin distribution across cluster nodes
          botToUse = availableBots[i % availableBots.length];
        } else if (botId && botId !== 'primary') {
          const matched = availableBots.find((b) => b.id === botId);
          if (matched) botToUse = matched;
        }

        try {
          const sent = await sendTelegramMessage(cId, text.trim(), undefined, 'Markdown', botToUse.token);
          if (sent && sent.message_id) {
            successCount++;
            if (pinMessage && Number(cId) < 0) {
              callTelegramApi(botToUse.token, 'pinChatMessage', {
                chat_id: cId,
                message_id: sent.message_id,
                disable_notification: false
              }).catch(() => {});
            }
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }

        // Small throttle to stay within Telegram rate-limits
        if (targetChatIds.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      addLog('system', `Broadcast selesai disiarkan: ${successCount} berhasil, ${failedCount} gagal dari total ${targetChatIds.length} target.`);

      res.json({
        success: true,
        total: targetChatIds.length,
        successCount,
        failedCount,
        message: `Broadcast selesai! ${successCount} terkirim, ${failedCount} gagal.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Error broadcast: ${err.message}` });
    }
  });

  // ==========================================
  // PRICING & RENTAL/QUOTA MASTER SAVE API
  // ==========================================
  app.post('/api/pricing/save-all', (req, res) => {
    try {
      const { rentalPlans, quotaPackages, quotaConfig, referralConfig } = req.body;

      if (Array.isArray(rentalPlans)) {
        botConfig.rentalPlans = rentalPlans;
      }
      if (Array.isArray(quotaPackages)) {
        botConfig.quotaPackages = quotaPackages;
      }
      if (quotaConfig) {
        botConfig.quotaConfig = { ...DEFAULT_QUOTA_CONFIG, ...quotaConfig };
      }
      if (referralConfig) {
        botConfig.referralConfig = { ...DEFAULT_REFERRAL_CONFIG, ...referralConfig };
        saveReferralData();
      }

      saveBotConfig();
      addLog('system', 'Seluruh pengaturan harga sewa bot dan paket kuota OSINT berhasil disimpan & diperbarui.');

      res.json({
        success: true,
        message: 'Pengaturan harga & kuota berhasil disimpan dan langsung aktif di Telegram!',
        config: {
          rentalPlans: botConfig.rentalPlans,
          quotaPackages: botConfig.quotaPackages,
          quotaConfig: botConfig.quotaConfig,
          referralConfig: botConfig.referralConfig
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Gagal simpan harga: ${err.message}` });
    }
  });

  // ==========================================
  // MODERATION AUTO-LOAD STRICT KEYWORDS API
  // ==========================================
  app.post('/api/moderation/auto-load-strict', (req, res) => {
    try {
      if (!botConfig.moderationConfig) {
        botConfig.moderationConfig = { ...DEFAULT_MODERATION_CONFIG };
      }

      const existingSet = new Set(botConfig.moderationConfig.customBannedKeywords || []);
      let added = 0;
      DEFAULT_STRICT_BANNED_KEYWORDS.forEach((kw) => {
        if (!existingSet.has(kw)) {
          existingSet.add(kw);
          added++;
        }
      });

      botConfig.moderationConfig.customBannedKeywords = Array.from(existingSet);
      saveBotConfig();
      addLog('system', `Kamus kata kunci moderasi super ketat dimuat: +${added} kata baru ditambahkan.`);

      res.json({
        success: true,
        addedCount: added,
        totalCount: existingSet.size,
        customBannedKeywords: botConfig.moderationConfig.customBannedKeywords,
        message: `Berhasil memuat ${added} kata kunci terlarang ketat.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Strict JSON 404 Handler for all API routes (Prevents HTML index.html fallback for broken/misspelled API calls)
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `API endpoint ${req.method} ${req.originalUrl} tidak ditemukan di server.`
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Telegram Bot Controller server running on http://localhost:${PORT}`);

    // If bot was previously active when server restarted, automatically resume it!
    if (botConfig.isActive && botConfig.token) {
      console.log('[Telegram Bot] Checking saved master bot token state...');
      verifyTelegramToken(botConfig.token)
        .then((res) => {
          if (res.valid && res.botInfo) {
            currentBotInfo = res.botInfo;
            botStartedAt = Date.now();
            console.log(`[Telegram Bot] Master bot @${res.botInfo.username} online and active.`);
            runTelegramPollingLoop().catch((loopErr) => {
              console.log('[Telegram Polling] Polling loop startup info:', loopErr?.message || loopErr);
            });
          } else {
            console.log('[Telegram Bot] Master bot token is inactive or standby. Set your bot token in Settings to activate.');
            botConfig.isActive = false;
            saveBotConfig();
          }
        })
        .catch((err) => {
          console.log('[Telegram Bot] Master bot startup verification:', err?.message || err);
        });
    }

    // Auto-resume all active secondary bots in cluster!
    if (Array.isArray(botConfig.multiBots)) {
      for (const bot of botConfig.multiBots) {
        if (bot.isActive && bot.token) {
          verifyTelegramToken(bot.token)
            .then((res) => {
              if (res.valid && res.botInfo) {
                bot.botInfo = res.botInfo;
                console.log(`[Multi-Bot Worker] Secondary worker @${bot.botInfo?.username || bot.id} online.`);
                runSingleSecondaryBotWorker(bot).catch((err) => {
                  console.log(`[Multi-Bot Worker] Worker notice for ${bot.id}:`, err?.message || err);
                });
              } else {
                bot.isActive = false;
                saveBotConfig();
              }
            })
            .catch(() => {});
        }
      }
    }
  });
}

startServer();
