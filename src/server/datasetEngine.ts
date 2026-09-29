import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { DatasetFileInfo, DatasetSearchResult, GithubTestResult } from '../types';
import { extractLocationFromNik } from '../utils/nikAnalyzer';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const DEFAULT_DATASET_FILE = path.join(DATA_DIR, 'dataset.txt');
export const DATASETS_DIR = path.join(DATA_DIR, 'datasets');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DATASETS_DIR)) {
  fs.mkdirSync(DATASETS_DIR, { recursive: true });
}

// Format bytes into readable string
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Count lines in a file efficiently with streaming
export async function countLines(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) return resolve(0);
    let count = 0;
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    });
    rl.on('line', () => {
      count++;
    });
    rl.on('close', () => {
      resolve(count);
    });
    rl.on('error', () => {
      resolve(count);
    });
  });
}

// Get all dataset files in data/ and data/datasets/
export async function getAllDatasetFiles(): Promise<DatasetFileInfo[]> {
  const result: DatasetFileInfo[] = [];
  const processedNames = new Set<string>();

  // Ensure directories exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATASETS_DIR)) {
    fs.mkdirSync(DATASETS_DIR, { recursive: true });
  }

  // 1. Primary dataset.txt in data/
  if (fs.existsSync(DEFAULT_DATASET_FILE)) {
    try {
      const stats = fs.statSync(DEFAULT_DATASET_FILE);
      const lines = await countLines(DEFAULT_DATASET_FILE);
      result.push({
        name: 'dataset.txt',
        filename: 'dataset.txt',
        path: DEFAULT_DATASET_FILE,
        sizeBytes: stats.size,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        linesCount: lines,
        lineCount: lines,
        lastModified: stats.mtime.toISOString(),
        isDefaultDataset: true,
        isDefault: true
      });
      processedNames.add('dataset.txt');
    } catch (e) {
      console.error('Error reading default dataset.txt stats:', e);
    }
  }

  // 2. Scan data/datasets directory
  if (fs.existsSync(DATASETS_DIR)) {
    try {
      const files = fs.readdirSync(DATASETS_DIR);
      for (const file of files) {
        // Skip hidden files or already processed default dataset.txt
        if (file.startsWith('.') || (file === 'dataset.txt' && processedNames.has('dataset.txt'))) {
          continue;
        }
        const fullPath = path.join(DATASETS_DIR, file);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            const lines = await countLines(fullPath);
            const isDef = file.toLowerCase() === 'dataset.txt';
            result.push({
              name: file,
              filename: file,
              path: fullPath,
              sizeBytes: stats.size,
              size: stats.size,
              sizeFormatted: formatBytes(stats.size),
              linesCount: lines,
              lineCount: lines,
              lastModified: stats.mtime.toISOString(),
              isDefaultDataset: isDef,
              isDefault: isDef
            });
            processedNames.add(file);
          }
        } catch (fileErr) {
          console.error(`Error reading dataset file ${file}:`, fileErr);
        }
      }
    } catch (dirErr) {
      console.error('Error scanning datasets directory:', dirErr);
    }
  }

  // 3. Scan other txt/csv files in data/ (excluding config and system files)
  const systemFiles = new Set([
    'bot_config.json',
    'codes.json',
    'secret_codes.json',
    'visitors.txt',
    'visitor_count.txt'
  ]);

  try {
    const rootDataFiles = fs.readdirSync(DATA_DIR);
    for (const file of rootDataFiles) {
      if (
        systemFiles.has(file) ||
        processedNames.has(file) ||
        file.startsWith('.') ||
        file === 'datasets'
      ) {
        continue;
      }
      const fullPath = path.join(DATA_DIR, file);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isFile() && (file.endsWith('.txt') || file.endsWith('.csv') || file.endsWith('.json') || file.endsWith('.tsv') || file.endsWith('.log'))) {
          const lines = await countLines(fullPath);
          const isDef = file.toLowerCase() === 'dataset.txt';
          result.push({
            name: file,
            filename: file,
            path: fullPath,
            sizeBytes: stats.size,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            linesCount: lines,
            lineCount: lines,
            lastModified: stats.mtime.toISOString(),
            isDefaultDataset: isDef,
            isDefault: isDef
          });
          processedNames.add(file);
        }
      } catch {}
    }
  } catch {}

  // Sort default dataset.txt to the top, then alphabetically
  result.sort((a, b) => {
    if (a.isDefaultDataset) return -1;
    if (b.isDefaultDataset) return 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

// Sanitize dataset filename safely against path traversal and weird prefixes
export function sanitizeDatasetFilename(raw: string): string {
  if (!raw) return 'dataset.txt';
  const clean = raw.replace(/\\/g, '/');
  let base = path.basename(clean);
  base = base.replace(/^[\/\._]+/, '');
  base = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!base) base = 'dataset.txt';
  if (!path.extname(base)) {
    base = `${base}.txt`;
  }
  return base;
}

// Read text content of a dataset file (supports head reading for large files)
export async function readDatasetContent(
  filename: string,
  maxLines = 5000
): Promise<{ filename: string; content: string; totalLines: number; isTruncated: boolean; sizeBytes: number }> {
  const baseName = sanitizeDatasetFilename(filename);
  let targetPath = path.join(DATASETS_DIR, baseName);
  if (!fs.existsSync(targetPath)) {
    targetPath = path.join(DATA_DIR, baseName);
  }
  if (!fs.existsSync(targetPath) && baseName.toLowerCase() === 'dataset.txt') {
    targetPath = DEFAULT_DATASET_FILE;
  }

  if (!fs.existsSync(targetPath)) {
    throw new Error(`File dataset '${baseName}' tidak ditemukan di sistem.`);
  }

  const stats = fs.statSync(targetPath);
  const lines: string[] = [];
  let totalLines = 0;
  let isTruncated = false;

  const rl = readline.createInterface({
    input: fs.createReadStream(targetPath, { encoding: 'utf8' }),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    totalLines++;
    if (lines.length < maxLines) {
      lines.push(line);
    } else {
      isTruncated = true;
    }
  }

  return {
    filename: baseName,
    content: lines.join('\n'),
    totalLines,
    isTruncated,
    sizeBytes: stats.size
  };
}

const FORBIDDEN_DATASET_NAMES = new Set([
  'bot_config.json',
  'codes.json',
  'secret_codes.json',
  'visitors.txt',
  'visitor_count.txt',
  'package.json',
  'tsconfig.json',
  'server.ts'
]);

export function isForbiddenDatasetName(filename: string): boolean {
  const lower = path.basename(filename).toLowerCase();
  return FORBIDDEN_DATASET_NAMES.has(lower);
}

// Write/Edit dataset file content
export async function writeDatasetContent(
  filename: string,
  content: string
): Promise<{ success: boolean; sizeBytes: number; linesCount: number; path: string }> {
  if (!fs.existsSync(DATASETS_DIR)) {
    fs.mkdirSync(DATASETS_DIR, { recursive: true });
  }

  const baseName = sanitizeDatasetFilename(filename);

  if (isForbiddenDatasetName(baseName)) {
    throw new Error(`Nama berkas '${baseName}' adalah berkas sistem internal dan tidak dapat diubah sebagai dataset.`);
  }

  let targetPath = path.join(DATASETS_DIR, baseName);

  if (baseName.toLowerCase() === 'dataset.txt') {
    targetPath = DEFAULT_DATASET_FILE;
    // Also save in DATASETS_DIR for redundancy
    try {
      fs.writeFileSync(path.join(DATASETS_DIR, 'dataset.txt'), content, 'utf8');
    } catch {}
  }

  fs.writeFileSync(targetPath, content, 'utf8');
  const stats = fs.statSync(targetPath);
  const lines = await countLines(targetPath);

  return {
    success: true,
    sizeBytes: stats.size,
    linesCount: lines,
    path: targetPath
  };
}

// Delete dataset file
export async function deleteDatasetFile(filename: string): Promise<{ success: boolean; message: string }> {
  const baseName = sanitizeDatasetFilename(filename);

  if (isForbiddenDatasetName(baseName)) {
    throw new Error(`Nama berkas '${baseName}' adalah berkas sistem dan tidak dapat dihapus.`);
  }

  let deletedAny = false;

  const path1 = path.join(DATASETS_DIR, baseName);
  if (fs.existsSync(path1)) {
    if (baseName.toLowerCase() === 'dataset.txt') {
      fs.writeFileSync(
        path1,
        `# OSINT INTEL DATABASE ARCHIVE - INDONESIA DATASET\n# FORMAT: NIK|FULL_NAME|BIRTH_DATE|GENDER|AGE|CITY|PROVINCE|ADDRESS|PHONE|EMAIL|OCCUPATION|THREAT_LEVEL|SOURCE_DATASET|LAST_ACTIVITY|NOTES\n`,
        'utf8'
      );
    } else {
      fs.unlinkSync(path1);
    }
    deletedAny = true;
  }

  // Handle primary data/dataset.txt
  if (baseName.toLowerCase() === 'dataset.txt') {
    const path2 = DEFAULT_DATASET_FILE;
    if (fs.existsSync(path2)) {
      fs.writeFileSync(
        path2,
        `# OSINT INTEL DATABASE ARCHIVE - INDONESIA DATASET\n# FORMAT: NIK|FULL_NAME|BIRTH_DATE|GENDER|AGE|CITY|PROVINCE|ADDRESS|PHONE|EMAIL|OCCUPATION|THREAT_LEVEL|SOURCE_DATASET|LAST_ACTIVITY|NOTES\n`,
        'utf8'
      );
      deletedAny = true;
    }
  }

  if (!deletedAny) {
    throw new Error(`File '${baseName}' tidak ditemukan.`);
  }

  return {
    success: true,
    message: baseName.toLowerCase() === 'dataset.txt' ? 'Isi dataset.txt telah dikosongkan.' : `File ${baseName} berhasil dihapus.`
  };
}

// Parse a dataset line into structured object
export function parseDatasetLine(line: string, formatHeader?: string[]): Record<string, string> {
  const cleanLine = line.trim();
  const fields: Record<string, string> = {};

  // 1. Try JSON parsing
  if (cleanLine.startsWith('{') && cleanLine.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleanLine);
      for (const [k, v] of Object.entries(parsed)) {
        fields[k] = String(v ?? '');
      }
      return fields;
    } catch {}
  }

  // 2. Try pipe delimiter (Format standard OSINT)
  if (cleanLine.includes('|')) {
    const parts = cleanLine.split('|').map((s) => s.trim());
    if (formatHeader && formatHeader.length > 0) {
      formatHeader.forEach((hdr, idx) => {
        if (parts[idx] !== undefined) {
          fields[hdr] = parts[idx];
        }
      });
    } else {
      // Default Indonesia OSINT order
      const defaultCols = [
        'nik',
        'fullName',
        'birthDate',
        'gender',
        'age',
        'city',
        'province',
        'address',
        'phone',
        'email',
        'occupation',
        'threatLevel',
        'sourceDataset',
        'lastActivity',
        'notes'
      ];
      parts.forEach((val, idx) => {
        const key = defaultCols[idx] || `col_${idx + 1}`;
        fields[key] = val;
      });
    }
    return fields;
  }

  // 3. Try CSV delimiter
  if (cleanLine.includes(',')) {
    const parts = cleanLine.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    if (formatHeader && formatHeader.length > 0) {
      formatHeader.forEach((hdr, idx) => {
        if (parts[idx] !== undefined) {
          fields[hdr] = parts[idx];
        }
      });
    } else {
      parts.forEach((val, idx) => {
        fields[`col_${idx + 1}`] = val;
      });
    }
    return fields;
  }

  // 4. Try Tab delimiter
  if (cleanLine.includes('\t')) {
    const parts = cleanLine.split('\t').map((s) => s.trim());
    parts.forEach((val, idx) => {
      fields[`col_${idx + 1}`] = val;
    });
    return fields;
  }

  // 5. Try colon (e.g. email:password or key:value)
  if (cleanLine.includes(':')) {
    const parts = cleanLine.split(':').map((s) => s.trim());
    if (parts.length === 2) {
      fields['username_or_email'] = parts[0];
      fields['password_or_data'] = parts[1];
    } else {
      parts.forEach((val, idx) => {
        fields[`part_${idx + 1}`] = val;
      });
    }
    return fields;
  }

  // Fallback raw line
  fields['raw'] = cleanLine;
  return fields;
}

export interface SmartSearchResultRecord {
  fileName: string;
  lineNumber: number;
  rawText: string;
  parsedFields: Record<string, string>;
  record: {
    fullName?: string;
    nik?: string;
    phone?: string;
    email?: string;
    city?: string;
    province?: string;
    address?: string;
    birthDate?: string;
    age?: number | string;
    gender?: string;
    occupation?: string;
    threatLevel?: string;
    sourceDataset?: string;
    notes?: string;
    [key: string]: any;
  };
}

export interface SmartSearchResult {
  query: string;
  totalMatches: number;
  searchDurationMs: number;
  filesSearched: string[];
  scannedFiles?: string[];
  records: SmartSearchResultRecord[];
  matches?: any[];
  results?: any[];
  rawTextOutput: string;
  jsonOutput: any;
}

// Smart Search: Automatically searches dataset.txt and all available dataset files
export async function smartSearchDatasets(
  query: string,
  maxResults = 500
): Promise<SmartSearchResult> {
  const startTime = Date.now();
  const trimmedQuery = (query || '').trim();
  if (!trimmedQuery) {
    return {
      query: '',
      totalMatches: 0,
      searchDurationMs: 0,
      filesSearched: [],
      records: [],
      rawTextOutput: '[]',
      jsonOutput: { results: [], totalMatches: 0, count: 0 }
    };
  }

  const queryTokens = trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const datasetFiles = await getAllDatasetFiles();
  const filesSearched: string[] = [];
  const records: SmartSearchResultRecord[] = [];
  let totalMatches = 0;

  for (const fileInfo of datasetFiles) {
    if (!fs.existsSync(fileInfo.path)) continue;
    filesSearched.push(fileInfo.name);

    let formatHeader: string[] | undefined;

    const rl = readline.createInterface({
      input: fs.createReadStream(fileInfo.path, { encoding: 'utf8' }),
      crlfDelay: Infinity
    });

    let lineNumber = 0;

    for await (const line of rl) {
      lineNumber++;
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Extract format header if present in comments (e.g. # FORMAT: NIK|FULL_NAME|...)
      if (trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
        const upper = trimmedLine.toUpperCase();
        if (upper.includes('FORMAT:')) {
          const headerPart = trimmedLine.split(/FORMAT:\s*/i)[1];
          if (headerPart) {
            const sep = headerPart.includes('|') ? '|' : headerPart.includes(',') ? ',' : headerPart.includes('\t') ? '\t' : null;
            if (sep) {
              formatHeader = headerPart.split(sep).map((h) => h.trim().toLowerCase());
            }
          }
        }
        continue;
      }

      // Detect first-row column headers (e.g. "nik,phone,name,email,birthdate")
      if (lineNumber === 1) {
        const lowerHeader = trimmedLine.toLowerCase();
        if (
          (lowerHeader.includes('nik') || lowerHeader.includes('nama') || lowerHeader.includes('name') || lowerHeader.includes('phone')) &&
          (lowerHeader.includes(',') || lowerHeader.includes('|') || lowerHeader.includes('\t'))
        ) {
          const sep = lowerHeader.includes('|') ? '|' : lowerHeader.includes(',') ? ',' : '\t';
          formatHeader = lowerHeader.split(sep).map((h) => h.trim().replace(/^["']|["']$/g, ''));
          continue;
        }
      }

      const lowerLine = trimmedLine.toLowerCase();

      // Check if line matches ALL tokens (e.g. "asep jakarta" -> both "asep" and "jakarta" must be in the line)
      const matchesAll = queryTokens.every((t) => lowerLine.includes(t));

      if (matchesAll) {
        totalMatches++;

        if (records.length < maxResults) {
          const parsed = parseDatasetLine(trimmedLine, formatHeader);

          // Build normalized record object
          const recordObj: any = {
            fullName: parsed.name || parsed.fullName || parsed.fullname || parsed.full_name || parsed.nama || parsed.col_2 || '',
            nik: parsed.nik || parsed.col_1 || '',
            phone: parsed.phone || parsed.telepon || parsed.hp || parsed.nohp || parsed.no_hp || parsed.col_9 || '',
            email: parsed.email || parsed.surel || parsed.col_10 || '',
            city: parsed.city || parsed.kota || parsed.col_6 || '',
            province: parsed.province || parsed.provinsi || parsed.col_7 || '',
            address: parsed.address || parsed.alamat || parsed.col_8 || '',
            birthDate: parsed.birthdate || parsed.birthDate || parsed.birth_date || parsed.tgl_lahir || parsed.col_3 || '',
            age: parsed.age || parsed.usia || parsed.umur || parsed.col_5 || '',
            gender: parsed.gender || parsed.jenis_kelamin || parsed.col_4 || '',
            occupation: parsed.occupation || parsed.pekerjaan || parsed.jabatan || parsed.col_11 || '',
            threatLevel: parsed.threatLevel || parsed.threatlevel || parsed.threat_level || parsed.threat || parsed.col_12 || 'Informational',
            sourceDataset: parsed.sourceDataset || parsed.sourcedataset || parsed.source_dataset || parsed.sumber || fileInfo.name,
            lastActivity: parsed.lastActivity || parsed.lastactivity || parsed.last_activity || parsed.col_14 || '',
            notes: parsed.notes || parsed.catatan || parsed.keterangan || parsed.col_15 || ''
          };

          // Extract human-readable location derived from NIK (or '(-)' if not available)
          let derivedNikLocation = '(-)';
          const cleanNik = (recordObj.nik || '').replace(/\D/g, '');
          if (cleanNik.length === 16) {
            const loc = extractLocationFromNik(cleanNik);
            if (loc && loc !== '(-)') derivedNikLocation = loc;
          } else {
            // Check if any 16-digit Indonesian NIK exists in the raw line
            const match16 = trimmedLine.match(/\b([1-9][0-9]{15})\b/);
            if (match16) {
              const loc = extractLocationFromNik(match16[1]);
              if (loc && loc !== '(-)') {
                derivedNikLocation = loc;
                if (!recordObj.nik) recordObj.nik = match16[1];
              }
            }
          }
          recordObj.nikLocation = derivedNikLocation;

          // If fullName is blank, try finding any name-like field or first text field
          if (!recordObj.fullName && !recordObj.nik) {
            recordObj.fullName = trimmedLine.substring(0, 40);
          }

          records.push({
            fileName: fileInfo.name,
            lineNumber,
            rawText: trimmedLine,
            parsedFields: parsed,
            record: recordObj
          });
        }
      }
    }
  }

  const durationMs = Date.now() - startTime;

  const formattedResults = records.map((r, idx) => ({
    index: idx + 1,
    fileName: r.fileName,
    sourceFile: r.fileName,
    lineNumber: r.lineNumber,
    record: r.record,
    precisionScore: 98,
    predictionType: 'Exact Match',
    matchedTags: queryTokens,
    raw: r.rawText,
    rawLine: r.rawText,
    rawText: r.rawText
  }));

  // Build JSON formatted output compatible with existing formatting
  const jsonOutput = {
    success: true,
    target: trimmedQuery,
    totalMatches,
    count: records.length,
    searchDurationMs: durationMs,
    filesSearched,
    results: formattedResults
  };

  const rawTextOutput = JSON.stringify(jsonOutput, null, 2);

  return {
    query: trimmedQuery,
    totalMatches,
    searchDurationMs: durationMs,
    filesSearched,
    scannedFiles: filesSearched,
    records,
    matches: records,
    results: formattedResults,
    rawTextOutput,
    jsonOutput
  };
}

// =========================================================================
// GITHUB DATASET SYNC & VALIDATION ENGINE
// =========================================================================

export function parseGithubUrl(raw: string): {
  rawUrl: string;
  originalUrl: string;
  owner?: string;
  repo?: string;
  branch?: string;
  path?: string;
} {
  let u = (raw || '').trim();
  const originalUrl = u;
  if (!u) return { rawUrl: '', originalUrl: '' };

  if (!u.startsWith('http://') && !u.startsWith('https://')) {
    u = 'https://' + u;
  }

  try {
    const urlObj = new URL(u);
    if (urlObj.hostname === 'github.com') {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      // Format: /:owner/:repo/blob/:branch/:filepath...
      // or: /:owner/:repo/raw/:branch/:filepath...
      if (parts.length >= 4 && (parts[2] === 'blob' || parts[2] === 'raw')) {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[3];
        const filePath = parts.slice(4).join('/');
        return {
          rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`,
          originalUrl,
          owner,
          repo,
          branch,
          path: filePath
        };
      }
      // If directly /:owner/:repo/:filepath without blob/raw (assume main or master)
      if (parts.length >= 3) {
        const owner = parts[0];
        const repo = parts[1];
        const filePath = parts.slice(2).join('/');
        return {
          rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`,
          originalUrl,
          owner,
          repo,
          branch: 'main',
          path: filePath
        };
      }
    } else if (urlObj.hostname === 'raw.githubusercontent.com') {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      return {
        rawUrl: u,
        originalUrl,
        owner: parts[0],
        repo: parts[1],
        branch: parts[2],
        path: parts.slice(3).join('/')
      };
    }
  } catch {
    // fallback
  }

  return { rawUrl: u, originalUrl };
}

// Test and inspect GitHub dataset without downloading entire multi-megabyte file
export async function testGithubDataset(
  url: string,
  githubToken?: string
): Promise<GithubTestResult> {
  const parsed = parseGithubUrl(url);
  if (!parsed.rawUrl) {
    return {
      success: false,
      message: 'URL GitHub tidak boleh kosong.',
      rawUrl: '',
      originalUrl: url
    };
  }

  const startTime = Date.now();
  const headers: Record<string, string> = {
    'User-Agent': 'AI-Studio-Dataset-Fetcher/2.0',
    'Accept': 'text/plain, text/csv, */*'
  };

  if (githubToken && githubToken.trim()) {
    headers['Authorization'] = githubToken.startsWith('Bearer ') || githubToken.startsWith('token ')
      ? githubToken.trim()
      : `token ${githubToken.trim()}`;
  }

  try {
    // 1. Fetch first 16KB of file using Range request for instant preview & latency check
    const rangeHeaders = { ...headers, Range: 'bytes=0-16384' };
    const res = await fetch(parsed.rawUrl, {
      method: 'GET',
      headers: rangeHeaders,
      signal: AbortSignal.timeout(10000)
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok && res.status !== 206) {
      return {
        success: false,
        message: `GitHub merespon HTTP ${res.status} (${res.statusText}). Pastikan URL publik atau token akses valid.`,
        rawUrl: parsed.rawUrl,
        originalUrl: url,
        statusCode: res.status,
        latencyMs
      };
    }

    // Determine total size from headers
    let sizeBytes = 0;
    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      // Content-Range: bytes 0-16384/58581107
      const match = contentRange.match(/\/(\d+)$/);
      if (match && match[1]) {
        sizeBytes = parseInt(match[1], 10);
      }
    }

    if (!sizeBytes) {
      const cl = res.headers.get('content-length');
      if (cl) sizeBytes = parseInt(cl, 10);
    }

    const previewChunk = await res.text();
    const lines = previewChunk.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const previewLines = lines.slice(0, 10);

    // Analyze first line for columns
    let detectedColumns: string[] = [];
    let sampleParsed: Record<string, string> | null = null;
    let lineCountEstimate: number | undefined;

    if (lines.length > 0) {
      const headerOrFirst = lines[0];
      if (headerOrFirst.includes(',')) {
        detectedColumns = headerOrFirst.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      } else if (headerOrFirst.includes('|')) {
        detectedColumns = headerOrFirst.split('|').map((c) => c.trim());
      } else if (headerOrFirst.includes('\t')) {
        detectedColumns = headerOrFirst.split('\t').map((c) => c.trim());
      }

      const sampleLine = lines.length > 1 ? lines[1] : lines[0];
      sampleParsed = parseDatasetLine(sampleLine);

      if (sizeBytes > 0 && previewChunk.length > 0) {
        const avgLineBytes = previewChunk.length / lines.length;
        if (avgLineBytes > 0) {
          lineCountEstimate = Math.round(sizeBytes / avgLineBytes);
        }
      }
    }

    return {
      success: true,
      message: `Koneksi ke GitHub repository berhasil terverifikasi (${latencyMs}ms)!`,
      rawUrl: parsed.rawUrl,
      originalUrl: url,
      statusCode: res.status,
      sizeBytes,
      sizeFormatted: formatBytes(sizeBytes),
      latencyMs,
      lineCountEstimate,
      previewLines,
      detectedColumns,
      sampleParsed
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi GitHub: ${err.message || 'Koneksi timeout/error'}`,
      rawUrl: parsed.rawUrl,
      originalUrl: url,
      latencyMs: Date.now() - startTime
    };
  }
}

// Download/Sync dataset from GitHub and save into data/ (or dataset.txt)
export async function syncGithubDataset(
  url: string,
  targetFilename = 'dataset.txt',
  replacePrimary = true,
  githubToken?: string
): Promise<{
  success: boolean;
  message: string;
  fileInfo?: DatasetFileInfo;
  downloadedBytes?: number;
  linesCount?: number;
}> {
  const parsed = parseGithubUrl(url);
  if (!parsed.rawUrl) {
    throw new Error('URL GitHub tidak valid.');
  }

  const sanitized = sanitizeDatasetFilename(targetFilename || 'dataset.txt');
  if (isForbiddenDatasetName(sanitized)) {
    throw new Error(`Nama berkas '${sanitized}' dilarang karena merupakan berkas konfigurasi sistem.`);
  }

  const isPrimary = replacePrimary || sanitized.toLowerCase() === 'dataset.txt';
  const finalDest = isPrimary ? DEFAULT_DATASET_FILE : path.join(DATASETS_DIR, sanitized);
  const tempDest = path.join(DATA_DIR, `.tmp_sync_${Date.now()}_${sanitized}`);

  const headers: Record<string, string> = {
    'User-Agent': 'AI-Studio-Dataset-Fetcher/2.0',
    'Accept': 'text/plain, text/csv, application/octet-stream, */*'
  };

  if (githubToken && githubToken.trim()) {
    headers['Authorization'] = githubToken.startsWith('Bearer ') || githubToken.startsWith('token ')
      ? githubToken.trim()
      : `token ${githubToken.trim()}`;
  }

  const res = await fetch(parsed.rawUrl, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(60000) // 60 seconds for large files
  });

  if (!res.ok || !res.body) {
    throw new Error(`Gagal mengunduh berkas dari GitHub (HTTP ${res.status}: ${res.statusText})`);
  }

  try {
    // Use Node stream pipeline to write file safely without overflowing memory
    const nodeReadable = Readable.fromWeb(res.body as any);
    const writeStream = fs.createWriteStream(tempDest);
    await pipeline(nodeReadable, writeStream);

    // Atomically replace target destination
    if (fs.existsSync(finalDest)) {
      try {
        fs.unlinkSync(finalDest);
      } catch {
        // ignore
      }
    }
    fs.renameSync(tempDest, finalDest);

    // If primary, mirror to data/datasets/dataset.txt as well for unified lookup
    if (isPrimary) {
      const mirror = path.join(DATASETS_DIR, 'dataset.txt');
      try {
        fs.copyFileSync(finalDest, mirror);
      } catch {
        // ignore
      }
    }

    const stats = fs.statSync(finalDest);
    const linesCount = await countLines(finalDest);

    const fileInfo: DatasetFileInfo = {
      name: isPrimary ? 'dataset.txt' : sanitized,
      filename: isPrimary ? 'dataset.txt' : sanitized,
      path: finalDest,
      sizeBytes: stats.size,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      linesCount,
      lineCount: linesCount,
      lastModified: stats.mtime.toISOString(),
      isDefaultDataset: isPrimary,
      isDefault: isPrimary
    };

    return {
      success: true,
      message: `Dataset dari GitHub berhasil disinkronkan ke '${fileInfo.name}' (${fileInfo.sizeFormatted}, ${linesCount.toLocaleString()} baris)!`,
      fileInfo,
      downloadedBytes: stats.size,
      linesCount
    };
  } catch (err: any) {
    if (fs.existsSync(tempDest)) {
      try {
        fs.unlinkSync(tempDest);
      } catch {
        // ignore
      }
    }
    throw new Error(`Gagal menyimpan dataset: ${err.message}`);
  }
}

