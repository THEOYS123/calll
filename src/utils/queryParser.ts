import { IdentityRecord, ParsedQuery, SearchMatchResult } from '../types';

const KNOWN_GENDERS: Record<string, 'male' | 'female'> = {
  male: 'male',
  pria: 'male',
  lakilaki: 'male',
  laki: 'male',
  cowok: 'male',
  ikhwan: 'male',
  m: 'male',
  l: 'male',
  female: 'female',
  wanita: 'female',
  perempuan: 'female',
  cewek: 'female',
  akhwat: 'female',
  f: 'female',
  p: 'female'
};

const KNOWN_CITIES = [
  'jakarta',
  'karawang',
  'bandung',
  'surabaya',
  'semarang',
  'medan',
  'yogyakarta',
  'jogja',
  'bekasi',
  'bogor',
  'depok',
  'tangerang',
  'denpasar',
  'bali',
  'makassar',
  'palembang',
  'malang',
  'solo',
  'surakarta',
  'cirebon',
  'tasikmalaya',
  'sukabumi',
  'cianjur',
  'serang',
  'banten',
  'pekanbaru',
  'batam',
  'lampung',
  'padang'
];

export function parseSearchQuery(query: string): ParsedQuery {
  const raw = query.trim();
  if (!raw) {
    return {
      raw: '',
      nameKeywords: [],
      rawTokens: []
    };
  }

  // Split by comma first if commas are present, else by whitespace
  let tokens: string[] = [];
  if (raw.includes(',')) {
    tokens = raw
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  } else {
    tokens = raw
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  let age: number | undefined;
  let gender: 'male' | 'female' | undefined;
  let city: string | undefined;
  let birthYear: number | undefined;
  let nik: string | undefined;
  let phone: string | undefined;
  let email: string | undefined;
  const nameKeywords: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase().replace(/[^a-z0-9@._-]/g, '');
    const cleanDigits = token.replace(/\D/g, '');

    // Check if Email
    if (token.includes('@') && token.includes('.')) {
      email = token.toLowerCase();
      continue;
    }

    // Check if 16-digit NIK
    if (cleanDigits.length === 16) {
      nik = cleanDigits;
      continue;
    }

    // Check if Indonesian Phone Number (starts with 08, 628, +628)
    if (
      (cleanDigits.startsWith('08') || cleanDigits.startsWith('628')) &&
      cleanDigits.length >= 10 &&
      cleanDigits.length <= 14
    ) {
      phone = cleanDigits;
      continue;
    }

    // Check if 4-digit Year (1920 - 2026)
    if (/^(19\d\d|20[0-2]\d)$/.test(cleanDigits)) {
      birthYear = parseInt(cleanDigits, 10);
      continue;
    }

    // Check if 1-2 digit Age (1 - 99)
    if (/^\d{1,2}$/.test(cleanDigits)) {
      const parsedAge = parseInt(cleanDigits, 10);
      if (parsedAge > 0 && parsedAge < 110) {
        age = parsedAge;
        continue;
      }
    }

    // Check Gender
    const genderMatch = KNOWN_GENDERS[lower];
    if (genderMatch) {
      gender = genderMatch;
      continue;
    }

    // Check City
    const matchedCity = KNOWN_CITIES.find(
      (c) => lower === c || lower.includes(c) || c.includes(lower)
    );
    if (matchedCity) {
      city = matchedCity;
      continue;
    }

    // Otherwise, treat as Name / keyword
    if (token.length > 0) {
      nameKeywords.push(token);
    }
  }

  return {
    raw,
    nameKeywords,
    age,
    gender,
    city,
    birthYear,
    nik,
    phone,
    email,
    rawTokens: tokens
  };
}

export function evaluateRecordsMatch(
  records: IdentityRecord[],
  query: string
): SearchMatchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const parsed = parseSearchQuery(trimmed);
  const queryLower = trimmed.toLowerCase();

  const results: SearchMatchResult[] = [];

  for (const record of records) {
    const matchedCriteria: SearchMatchResult['matchedCriteria'] = {};
    const matchedTags: string[] = [];
    let score = 0;
    let totalCriteriaTested = 0;
    let criteriaPassed = 0;

    // Check Name Keywords
    if (parsed.nameKeywords.length > 0) {
      totalCriteriaTested += 2;
      const recNameLower = record.fullName.toLowerCase();
      let nameMatchesAll = true;
      let nameMatchesAny = false;

      for (const kw of parsed.nameKeywords) {
        const kwLower = kw.toLowerCase();
        if (recNameLower.includes(kwLower)) {
          nameMatchesAny = true;
        } else {
          nameMatchesAll = false;
        }
      }

      if (nameMatchesAll) {
        matchedCriteria.name = true;
        matchedTags.push(`Nama: ${record.fullName}`);
        score += 35;
        criteriaPassed += 2;
      } else if (nameMatchesAny) {
        matchedCriteria.name = true;
        matchedTags.push(`Nama Parsial: ${record.fullName}`);
        score += 20;
        criteriaPassed += 1;
      }
    }

    // Check Age
    if (parsed.age !== undefined) {
      totalCriteriaTested += 1;
      if (record.age === parsed.age) {
        matchedCriteria.age = true;
        matchedTags.push(`Usia: ${record.age} Thn`);
        score += 20;
        criteriaPassed += 1;
      } else if (Math.abs(record.age - parsed.age) <= 1) {
        // Close age prediction (birthday boundary)
        matchedCriteria.age = true;
        matchedTags.push(`Usia Prediksi ±1: ${record.age} Thn`);
        score += 10;
        criteriaPassed += 0.5;
      }
    }

    // Check Gender
    if (parsed.gender !== undefined) {
      totalCriteriaTested += 1;
      if (record.gender === parsed.gender) {
        matchedCriteria.gender = true;
        matchedTags.push(record.gender === 'male' ? 'Laki-laki (Pria)' : 'Perempuan (Wanita)');
        score += 15;
        criteriaPassed += 1;
      }
    }

    // Check City
    if (parsed.city !== undefined) {
      totalCriteriaTested += 1;
      const recCityLower = record.city.toLowerCase();
      const recProvLower = record.province.toLowerCase();
      const recAddrLower = record.address.toLowerCase();

      if (
        recCityLower.includes(parsed.city) ||
        recProvLower.includes(parsed.city) ||
        recAddrLower.includes(parsed.city)
      ) {
        matchedCriteria.city = true;
        matchedTags.push(`Lokasi: ${record.city}`);
        score += 20;
        criteriaPassed += 1;
      }
    }

    // Check Birth Year
    if (parsed.birthYear !== undefined) {
      totalCriteriaTested += 1;
      if (record.birthYear === parsed.birthYear) {
        matchedCriteria.birthYear = true;
        matchedTags.push(`Tahun Lahir: ${record.birthYear}`);
        score += 25;
        criteriaPassed += 1;
      }
    }

    // Check NIK
    if (parsed.nik !== undefined) {
      totalCriteriaTested += 2;
      if (record.nik === parsed.nik) {
        matchedCriteria.nik = true;
        matchedTags.push(`NIK Cocok: ${record.nik}`);
        score += 50;
        criteriaPassed += 2;
      } else if (record.nik.includes(parsed.nik)) {
        matchedCriteria.nik = true;
        matchedTags.push(`NIK Substring Cocok`);
        score += 30;
        criteriaPassed += 1;
      }
    }

    // Check Phone
    if (parsed.phone !== undefined) {
      totalCriteriaTested += 2;
      const recPhoneDigits = record.phone.replace(/\D/g, '');
      if (recPhoneDigits.includes(parsed.phone) || parsed.phone.includes(recPhoneDigits)) {
        matchedCriteria.phone = true;
        matchedTags.push(`No. HP Cocok: ${record.phone}`);
        score += 40;
        criteriaPassed += 2;
      }
    }

    // Check Email
    if (parsed.email !== undefined) {
      totalCriteriaTested += 2;
      if (record.email.toLowerCase().includes(parsed.email)) {
        matchedCriteria.email = true;
        matchedTags.push(`Email: ${record.email}`);
        score += 40;
        criteriaPassed += 2;
      }
    }

    // Global substring fallback check for raw query if no specific criteria matched yet
    const fullTextHaystack = `${record.fullName} ${record.nik} ${record.phone} ${record.email} ${record.city} ${record.province} ${record.address} ${record.occupation} ${record.notes || ''}`.toLowerCase();

    if (totalCriteriaTested === 0 || criteriaPassed === 0) {
      if (fullTextHaystack.includes(queryLower)) {
        matchedCriteria.fuzzy = true;
        matchedTags.push('Korelasi Teks Bebas');
        score += 30;
        criteriaPassed += 1;
      } else {
        // Test individual tokens
        const matchingTokens = parsed.rawTokens.filter((t) =>
          fullTextHaystack.includes(t.toLowerCase())
        );
        if (matchingTokens.length > 0) {
          matchedCriteria.fuzzy = true;
          matchedTags.push(`Korelasi Token: ${matchingTokens.join(', ')}`);
          score += 15 * matchingTokens.length;
          criteriaPassed += matchingTokens.length * 0.5;
        }
      }
    }

    // User directive: "SEMUA DATA DI TAMPILKAN SELURUHNYA kalau ada yang berhubungan dengan data search"
    // So if ANY criteria passed or score > 0, we include it!
    if (criteriaPassed > 0 || score > 0) {
      // Calculate normalized precision percentage (15% to 100%)
      let finalPrecision = Math.min(100, Math.max(25, Math.round((score / Math.max(score, 80)) * 100)));
      if (criteriaPassed >= totalCriteriaTested && totalCriteriaTested >= 2) {
        finalPrecision = 100;
      }

      let predictionType: SearchMatchResult['predictionType'] = 'Predictive Match';
      if (finalPrecision === 100) {
        predictionType = 'Exact Match';
      } else if (finalPrecision >= 80) {
        predictionType = 'High Precision';
      } else if (finalPrecision >= 50) {
        predictionType = 'Correlated Link';
      }

      results.push({
        record,
        precisionScore: finalPrecision,
        matchedCriteria,
        matchedTags,
        predictionType
      });
    }
  }

  // Sort by highest precision score first, then by searchCount / popularity
  results.sort((a, b) => {
    if (b.precisionScore !== a.precisionScore) {
      return b.precisionScore - a.precisionScore;
    }
    return b.record.searchCount - a.record.searchCount;
  });

  return results;
}
