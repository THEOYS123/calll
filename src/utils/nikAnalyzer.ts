import { NIKAnalysisResult } from '../types';

const PROVINCES: Record<string, string> = {
  '11': 'Aceh',
  '12': 'Sumatera Utara',
  '13': 'Sumatera Barat',
  '14': 'Riau',
  '15': 'Jambi',
  '16': 'Sumatera Selatan',
  '17': 'Bengkulu',
  '18': 'Lampung',
  '19': 'Kepulauan Bangka Belitung',
  '21': 'Kepulauan Riau',
  '31': 'DKI Jakarta',
  '32': 'Jawa Barat',
  '33': 'Jawa Tengah',
  '34': 'DI Yogyakarta',
  '35': 'Jawa Timur',
  '36': 'Banten',
  '51': 'Bali',
  '52': 'Nusa Tenggara Barat',
  '53': 'Nusa Tenggara Timur',
  '61': 'Kalimantan Barat',
  '62': 'Kalimantan Tengah',
  '63': 'Kalimantan Selatan',
  '64': 'Kalimantan Timur',
  '65': 'Kalimantan Utara',
  '71': 'Sulawesi Utara',
  '72': 'Sulawesi Tengah',
  '73': 'Sulawesi Selatan',
  '74': 'Sulawesi Tenggara',
  '75': 'Gorontalo',
  '76': 'Sulawesi Barat',
  '81': 'Maluku',
  '82': 'Maluku Utara',
  '91': 'Papua Barat',
  '92': 'Papua Barat Daya',
  '93': 'Papua Selatan',
  '94': 'Papua',
  '95': 'Papua Tengah',
  '96': 'Papua Pegunungan'
};

const REGENCIES: Record<string, string> = {
  // DKI Jakarta
  '3171': 'Kota Administrasi Jakarta Pusat',
  '3172': 'Kota Administrasi Jakarta Utara',
  '3173': 'Kota Administrasi Jakarta Barat',
  '3174': 'Kota Administrasi Jakarta Selatan',
  '3175': 'Kota Administrasi Jakarta Timur',
  '3101': 'Kabupaten Administrasi Kepulauan Seribu',
  
  // Jawa Barat
  '3201': 'Kabupaten Bogor',
  '3202': 'Kabupaten Sukabumi',
  '3203': 'Kabupaten Cianjur',
  '3204': 'Kabupaten Bandung',
  '3205': 'Kabupaten Garut',
  '3206': 'Kabupaten Tasikmalaya',
  '3207': 'Kabupaten Ciamis',
  '3208': 'Kabupaten Kuningan',
  '3209': 'Kabupaten Cirebon',
  '3210': 'Kabupaten Majalengka',
  '3211': 'Kabupaten Sumedang',
  '3212': 'Kabupaten Indramayu',
  '3213': 'Kabupaten Subang',
  '3214': 'Kabupaten Purwakarta',
  '3215': 'Kabupaten Karawang',
  '3216': 'Kabupaten Bekasi',
  '3217': 'Kabupaten Bandung Barat',
  '3218': 'Kabupaten Pangandaran',
  '3271': 'Kota Bogor',
  '3272': 'Kota Sukabumi',
  '3273': 'Kota Bandung',
  '3274': 'Kota Cirebon',
  '3275': 'Kota Bekasi',
  '3276': 'Kota Depok',
  '3277': 'Kota Cimahi',
  '3278': 'Kota Tasikmalaya',
  '3279': 'Kota Banjar',
  
  // Banten
  '3601': 'Kabupaten Pandeglang',
  '3602': 'Kabupaten Lebak',
  '3603': 'Kabupaten Tangerang',
  '3604': 'Kabupaten Serang',
  '3671': 'Kota Tangerang',
  '3672': 'Kota Cilegon',
  '3673': 'Kota Serang',
  '3674': 'Kota Tangerang Selatan',

  // Jawa Tengah
  '3301': 'Kabupaten Cilacap',
  '3302': 'Kabupaten Banyumas',
  '3303': 'Kabupaten Purbalingga',
  '3304': 'Kabupaten Banjarnegara',
  '3305': 'Kabupaten Kebumen',
  '3306': 'Kabupaten Purworejo',
  '3307': 'Kabupaten Wonosobo',
  '3308': 'Kabupaten Magelang',
  '3309': 'Kabupaten Boyolali',
  '3310': 'Kabupaten Klaten',
  '3311': 'Kabupaten Sukoharjo',
  '3312': 'Kabupaten Wonogiri',
  '3313': 'Kabupaten Karanganyar',
  '3314': 'Kabupaten Sragen',
  '3315': 'Kabupaten Grobogan',
  '3316': 'Kabupaten Blora',
  '3317': 'Kabupaten Rembang',
  '3318': 'Kabupaten Pati',
  '3319': 'Kabupaten Kudus',
  '3320': 'Kabupaten Jepara',
  '3321': 'Kabupaten Demak',
  '3322': 'Kabupaten Semarang',
  '3323': 'Kabupaten Temanggung',
  '3324': 'Kabupaten Kendal',
  '3325': 'Kabupaten Batang',
  '3326': 'Kabupaten Pekalongan',
  '3327': 'Kabupaten Pemalang',
  '3328': 'Kabupaten Tegal',
  '3329': 'Kabupaten Brebes',
  '3371': 'Kota Magelang',
  '3372': 'Kota Surakarta (Solo)',
  '3373': 'Kota Salatiga',
  '3374': 'Kota Semarang',
  '3375': 'Kota Pekalongan',
  '3376': 'Kota Tegal',

  // DI Yogyakarta
  '3401': 'Kabupaten Kulon Progo',
  '3402': 'Kabupaten Bantul',
  '3403': 'Kabupaten Gunungkidul',
  '3404': 'Kabupaten Sleman',
  '3471': 'Kota Yogyakarta',

  // Jawa Timur
  '3501': 'Kabupaten Pacitan',
  '3502': 'Kabupaten Ponorogo',
  '3503': 'Kabupaten Trenggalek',
  '3504': 'Kabupaten Tulungagung',
  '3505': 'Kabupaten Blitar',
  '3506': 'Kabupaten Kediri',
  '3507': 'Kabupaten Malang',
  '3508': 'Kabupaten Lumajang',
  '3509': 'Kabupaten Jember',
  '3510': 'Kabupaten Banyuwangi',
  '3511': 'Kabupaten Bondowoso',
  '3512': 'Kabupaten Situbondo',
  '3513': 'Kabupaten Probolinggo',
  '3514': 'Kabupaten Pasuruan',
  '3515': 'Kabupaten Sidoarjo',
  '3516': 'Kabupaten Mojokerto',
  '3517': 'Kabupaten Jombang',
  '3518': 'Kabupaten Nganjuk',
  '3519': 'Kabupaten Madiun',
  '3520': 'Kabupaten Magetan',
  '3521': 'Kabupaten Ngawi',
  '3522': 'Kabupaten Bojonegoro',
  '3523': 'Kabupaten Tuban',
  '3524': 'Kabupaten Lamongan',
  '3525': 'Kabupaten Gresik',
  '3526': 'Kabupaten Bangkalan',
  '3527': 'Kabupaten Sampang',
  '3528': 'Kabupaten Pamekasan',
  '3529': 'Kabupaten Sumenep',
  '3571': 'Kota Kediri',
  '3572': 'Kota Blitar',
  '3573': 'Kota Malang',
  '3574': 'Kota Probolinggo',
  '3575': 'Kota Pasuruan',
  '3576': 'Kota Mojokerto',
  '3577': 'Kota Madiun',
  '3578': 'Kota Surabaya',
  '3579': 'Kota Batu',

  // Sumatera Utara
  '1201': 'Kabupaten Nias',
  '1202': 'Kabupaten Mandailing Natal',
  '1203': 'Kabupaten Tapanuli Selatan',
  '1204': 'Kabupaten Tapanuli Tengah',
  '1205': 'Kabupaten Tapanuli Utara',
  '1206': 'Kabupaten Toba Samosir',
  '1207': 'Kabupaten Labuhanbatu',
  '1208': 'Kabupaten Asahan',
  '1209': 'Kabupaten Simalungun',
  '1210': 'Kabupaten Dairi',
  '1211': 'Kabupaten Karo',
  '1212': 'Kabupaten Deli Serdang',
  '1213': 'Kabupaten Langkat',
  '1271': 'Kota Medan',
  '1272': 'Kota Pematangsiantar',
  '1273': 'Kota Sibolga',
  '1274': 'Kota Tanjungbalai',
  '1275': 'Kota Binjai',
  '1276': 'Kota Tebing Tinggi',
  '1277': 'Kota Padang Sidempuan',
  '1278': 'Kota Gunungsitoli',

  // Sumatera Barat
  '1371': 'Kota Padang',
  '1375': 'Kota Bukittinggi',

  // Riau & Kepri
  '1471': 'Kota Pekanbaru',
  '1472': 'Kota Dumai',
  '2171': 'Kota Batam',
  '2172': 'Kota Tanjung Pinang',

  // Sumatera Selatan & Lampung
  '1671': 'Kota Palembang',
  '1871': 'Kota Bandar Lampung',

  // Bali & Nusa Tenggara
  '5171': 'Kota Denpasar',
  '5103': 'Kabupaten Badung',
  '5104': 'Kabupaten Gianyar',
  '5271': 'Kota Mataram',
  '5371': 'Kota Kupang',

  // Kalimantan
  '6171': 'Kota Pontianak',
  '6271': 'Kota Palangka Raya',
  '6371': 'Kota Banjarmasin',
  '6471': 'Kota Balikpapan',
  '6472': 'Kota Samarinda',

  // Sulawesi
  '7171': 'Kota Manado',
  '7271': 'Kota Palu',
  '7371': 'Kota Makassar'
};

export function analyzeNIK(rawNik: string): NIKAnalysisResult {
  const clean = rawNik.replace(/\D/g, '');
  if (clean.length !== 16) {
    return {
      valid: false,
      nik: rawNik,
      provinceCode: '',
      provinceName: 'Format Tidak Valid (Wajib 16 digit)',
      regencyCode: '',
      regencyName: 'Tidak Diketahui',
      districtCode: '',
      birthDate: '-',
      gender: 'male',
      age: 0,
      sequenceNumber: '',
      formatCorrect: false,
      rawDetails: 'NIK tidak memenuhi standar 16 digit Kementerian Dalam Negeri RI'
    };
  }

  const provCode = clean.substring(0, 2);
  const regCode = clean.substring(0, 4);
  const distCode = clean.substring(4, 6);
  const rawDayStr = clean.substring(6, 8);
  const rawMonthStr = clean.substring(8, 10);
  const rawYearStr = clean.substring(10, 12);
  const seqNumber = clean.substring(12, 16);

  const rawDay = parseInt(rawDayStr, 10);
  const rawMonth = parseInt(rawMonthStr, 10);
  let birthYearShort = parseInt(rawYearStr, 10);

  // Female check: day + 40
  let isFemale = false;
  let actualDay = rawDay;
  if (rawDay > 40) {
    isFemale = true;
    actualDay = rawDay - 40;
  }

  // Calculate century: short year > 26 is 19xx, <= 26 is 20xx (considering current year ~2026)
  const fullYear = birthYearShort > 26 ? 1900 + birthYearShort : 2000 + birthYearShort;
  const currentYear = new Date().getFullYear();
  const calculatedAge = currentYear - fullYear;

  const paddedDay = actualDay.toString().padStart(2, '0');
  const paddedMonth = rawMonth.toString().padStart(2, '0');
  const formattedBirthDate = `${fullYear}-${paddedMonth}-${paddedDay}`;

  const provinceName = PROVINCES[provCode] || `Provinsi ID-${provCode}`;
  const regencyName = REGENCIES[regCode] || `Kab/Kota ID-${regCode}`;

  return {
    valid: true,
    nik: clean,
    provinceCode: provCode,
    provinceName,
    regencyCode: regCode,
    regencyName,
    districtCode: distCode,
    birthDate: formattedBirthDate,
    gender: isFemale ? 'female' : 'male',
    age: Math.max(0, calculatedAge),
    sequenceNumber: seqNumber,
    formatCorrect: true,
    rawDetails: `${provinceName} -> ${regencyName}, Lahir ${paddedDay}/${paddedMonth}/${fullYear}, Jenis Kelamin: ${isFemale ? 'Perempuan' : 'Laki-laki'}`
  };
}

/**
 * Extract human-readable location from Indonesian NIK (16 digits).
 * Returns `${regencyName}, ${provinceName}` if available.
 * If NIK is empty, invalid, or cannot be analyzed, returns '(-)' as requested.
 */
export function extractLocationFromNik(rawNik?: string): string {
  if (!rawNik) return '(-)';
  const clean = rawNik.replace(/\D/g, '');
  if (clean.length !== 16) return '(-)';
  const analysis = analyzeNIK(clean);
  if (!analysis.valid) return '(-)';

  const reg = analysis.regencyName;
  const prov = analysis.provinceName;

  if (reg && prov && !reg.includes('Tidak Diketahui') && !prov.includes('Tidak Valid')) {
    return `${reg}, ${prov}`;
  }
  if (prov && !prov.includes('Tidak Valid')) {
    return prov;
  }
  return '(-)';
}

