import { IdentityRecord } from '../types';

/**
 * Parses /data/dataset.txt content into IdentityRecord[]
 */
export function parseDatasetFileContent(content: string): IdentityRecord[] {
  const lines = content.split('\n');
  const records: IdentityRecord[] = [];

  let idx = 1;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // FORMAT: NIK|FULL_NAME|BIRTH_DATE|GENDER|AGE|CITY|PROVINCE|ADDRESS|PHONE|EMAIL|OCCUPATION|THREAT_LEVEL|SOURCE_DATASET|LAST_ACTIVITY|NOTES
    const parts = trimmed.split('|');
    if (parts.length >= 11) {
      const nik = (parts[0] || '').trim();
      const fullName = (parts[1] || '').trim();
      const birthDate = (parts[2] || '').trim();
      const gender = ((parts[3] || '').trim().toLowerCase() === 'female' ? 'female' : 'male') as 'male' | 'female';
      const age = parseInt((parts[4] || '20').trim(), 10) || 20;
      const city = (parts[5] || '').trim();
      const province = (parts[6] || '').trim();
      const address = (parts[7] || '').trim();
      const phone = (parts[8] || '').trim();
      const email = (parts[9] || '').trim();
      const occupation = (parts[10] || '').trim();
      const threatLevel = (parts[11] || 'Low').trim() as any;
      const sourceDataset = (parts[12] || 'Local Leak Archive').trim();
      const lastKnownActivity = (parts[13] || 'Aktivitas OSINT terpantau').trim();
      const notes = (parts[14] || '').trim();

      const birthYear = parseInt(birthDate.slice(0, 4), 10) || (2026 - age);
      const id = `INTEL-ID-${String(idx).padStart(3, '0')}`;

      records.push({
        id,
        fullName,
        nik,
        gender,
        age,
        birthDate,
        birthYear,
        city,
        province,
        address,
        phone,
        email,
        occupation,
        threatLevel: (['Low', 'Medium', 'High', 'Critical', 'Informational'].includes(threatLevel) ? threatLevel : 'Low'),
        sourceDataset,
        lastKnownActivity,
        searchCount: 0, // MUST start at 0: only increments in real-time when searched!
        notes
      });
      idx++;
    }
  }

  return records;
}
