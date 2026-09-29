import { PhoneAnalysisResult } from '../types';

export function analyzeIndonesianPhone(rawPhone: string): PhoneAnalysisResult {
  if (!rawPhone) {
    return {
      valid: false,
      rawPhone: '',
      formattedInternational: '',
      formattedLocal: '',
      carrier: 'Unknown',
      prefix: '',
      type: 'Cellular'
    };
  }

  // Remove non-digit chars, except maybe leading plus
  let digits = rawPhone.replace(/\D/g, '');

  // Normalize 62 to 08 or vice-versa
  let national = digits;
  if (digits.startsWith('62')) {
    national = '0' + digits.substring(2);
  } else if (!digits.startsWith('0') && digits.length >= 9) {
    national = '0' + digits;
  }

  const intl = national.startsWith('0') ? '+62 ' + national.substring(1) : '+62 ' + national;

  // Prefix check
  const prefix4 = national.substring(0, 4);

  let carrier: 'Telkomsel' | 'Indosat Ooredoo' | 'XL Axiata' | 'Tri (3)' | 'Smartfren' | 'Unknown' = 'Unknown';

  const tselPrefixes = ['0811', '0812', '0813', '0821', '0822', '0823', '0851', '0852', '0853'];
  const isatPrefixes = ['0814', '0815', '0816', '0855', '0856', '0857', '0858'];
  const xlPrefixes = ['0817', '0818', '0819', '0859', '0877', '0878', '0831', '0832', '0833', '0838'];
  const triPrefixes = ['0895', '0896', '0897', '0898', '0899'];
  const smartPrefixes = ['0881', '0882', '0883', '0884', '0885', '0886', '0887', '0888', '0889'];

  if (tselPrefixes.includes(prefix4)) {
    carrier = 'Telkomsel';
  } else if (isatPrefixes.includes(prefix4)) {
    carrier = 'Indosat Ooredoo';
  } else if (xlPrefixes.includes(prefix4)) {
    carrier = 'XL Axiata';
  } else if (triPrefixes.includes(prefix4)) {
    carrier = 'Tri (3)';
  } else if (smartPrefixes.includes(prefix4)) {
    carrier = 'Smartfren';
  }

  const valid = national.length >= 10 && national.length <= 14 && national.startsWith('08');

  // Format local as 0812-3456-7890
  let formattedLocal = national;
  if (national.length >= 10) {
    formattedLocal = `${national.substring(0, 4)}-${national.substring(4, 8)}-${national.substring(8)}`;
  }

  return {
    valid,
    rawPhone,
    formattedInternational: intl,
    formattedLocal,
    carrier,
    prefix: prefix4,
    type: 'Cellular'
  };
}
