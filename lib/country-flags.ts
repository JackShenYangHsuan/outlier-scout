/** Map messy country strings → flag emoji. Returns "" if unknown. */

const ISO2: Record<string, string> = {
  // Full names
  "algeria": "DZ", "antarctica": "AQ", "argentina": "AR", "armenia": "AM",
  "australia": "AU", "austria": "AT", "azerbaijan": "AZ", "bangladesh": "BD",
  "belarus": "BY", "belgium": "BE", "bosnia and herzegovina": "BA",
  "bosnien und herzegowina": "BA", "brazil": "BR", "bulgaria": "BG",
  "cameroon": "CM", "canada": "CA", "chile": "CL", "china": "CN",
  "colombia": "CO", "costa rica": "CR", "croatia": "HR", "cyprus": "CY",
  "czech republic": "CZ", "denmark": "DK", "egypt": "EG", "el salvador": "SV",
  "estonia": "EE", "finland": "FI", "france": "FR", "georgia": "GE",
  "germany": "DE", "greece": "GR", "hong kong": "HK", "hungary": "HU",
  "india": "IN", "indonesia": "ID", "iran": "IR",
  "iran, islamic republic of": "IR", "islamic republic of iran": "IR",
  "ireland": "IE", "israel": "IL", "italy": "IT", "japan": "JP",
  "jordan": "JO", "kazakhstan": "KZ", "kyrgyzstan": "KG", "latvia": "LV",
  "lebanon": "LB", "lithuania": "LT", "macau": "MO", "malaysia": "MY",
  "mexico": "MX", "mongolia": "MN", "montenegro": "ME", "morocco": "MA",
  "nepal": "NP", "netherlands": "NL", "new zealand": "NZ", "niue": "NU",
  "north macedonia": "MK", "norway": "NO", "pakistan": "PK", "panama": "PA",
  "peru": "PE", "philippines": "PH", "poland": "PL", "portugal": "PT",
  "republic of korea": "KR", "republic of moldova": "MD", "romania": "RO",
  "russia": "RU", "russian federation": "RU", "rwanda": "RW",
  "saudi arabia": "SA", "serbia": "RS", "singapore": "SG", "slovakia": "SK",
  "slovenia": "SI", "south africa": "ZA", "south korea": "KR", "spain": "ES",
  "sweden": "SE", "switzerland": "CH", "syria": "SY", "taiwan": "TW",
  "tajikistan": "TJ", "thailand": "TH", "trinidad and tobago": "TT",
  "tunisia": "TN", "turkey": "TR", "türkiye": "TR", "turkmenistan": "TM",
  "ukraine": "UA", "united arab emirates": "AE", "united kingdom": "UK",
  "united states": "US", "united states of america": "US", "uruguay": "UY",
  "uzbekistan": "UZ", "venezuela": "VE", "viet nam": "VN", "vietnam": "VN",
  "democratic people's republic of korea": "KP",
  "people's republic of china": "CN",
  "moldova, republic of": "MD", "moldau republikmoldau": "MD",
  "puerto ricopuerto rico": "PR",

  // IOC / 3-letter sport codes
  "ALG": "DZ", "AND": "AD", "ARG": "AR", "ARM": "AM", "AUS": "AU",
  "AUT": "AT", "AZE": "AZ", "BAN": "BD", "BDI": "BI", "BEL": "BE",
  "BIH": "BA", "BLR": "BY", "BOL": "BO", "BRA": "BR", "BUL": "BG",
  "CAN": "CA", "CHI": "CL", "CHN": "CN", "COL": "CO", "CRO": "HR",
  "CUB": "CU", "CYP": "CY", "CZE": "CZ", "DEN": "DK", "ECU": "EC",
  "EGY": "EG", "ENG": "GB", "ESP": "ES", "EST": "EE", "FAI": "FO",
  "FID": "FJ", "FIN": "FI", "FRA": "FR", "GEO": "GE", "GER": "DE",
  "GRE": "GR", "HUN": "HU", "INA": "ID", "IND": "IN", "IRI": "IR",
  "IRL": "IE", "ISL": "IS", "ISR": "IL", "ITA": "IT", "JPN": "JP",
  "KAZ": "KZ", "KOR": "KR", "KOS": "XK", "LTU": "LT", "MAD": "MG",
  "MAR": "MA", "MAS": "MY", "MDA": "MD", "MEX": "MX", "MGL": "MN",
  "MKD": "MK", "MNE": "ME", "NED": "NL", "NOR": "NO", "NZL": "NZ",
  "PAR": "PY", "PER": "PE", "PHI": "PH", "POL": "PL", "POR": "PT",
  "ROU": "RO", "RUS": "RU", "SCO": "GB", "SGP": "SG", "SLO": "SI",
  "SRB": "RS", "SRI": "LK", "SUI": "CH", "SVK": "SK", "SWE": "SE",
  "THA": "TH", "TJK": "TJ", "TKM": "TM", "TPE": "TW", "TUR": "TR",
  "UKR": "UA", "USA": "US", "UZB": "UZ", "VEN": "VE", "VIE": "VN",

  // ISO 2-letter (already correct, just map to themselves)
  "US": "US", "UK": "GB", "GB": "GB", "CA": "CA", "AU": "AU", "DE": "DE",
  "FR": "FR", "IT": "IT", "ES": "ES", "JP": "JP", "CN": "CN", "IN": "IN",
  "BR": "BR", "RU": "RU", "KR": "KR", "NL": "NL", "SE": "SE", "NO": "NO",
  "DK": "DK", "FI": "FI", "PL": "PL", "AT": "AT", "CH": "CH", "BE": "BE",
  "IE": "IE", "IL": "IL", "SG": "SG", "HK": "HK", "TW": "TW", "MY": "MY",
  "TH": "TH", "PH": "PH", "ID": "ID", "MX": "MX", "AR": "AR", "CO": "CO",
  "CL": "CL", "PE": "PE", "EG": "EG", "ZA": "ZA", "SA": "SA", "AE": "AE",
  "TR": "TR", "UA": "UA", "RO": "RO", "HU": "HU", "CZ": "CZ", "SK": "SK",
  "HR": "HR", "RS": "RS", "BG": "BG", "SI": "SI", "EE": "EE", "LV": "LV",
  "LT": "LT", "GE": "GE", "AM": "AM", "KZ": "KZ", "KG": "KG", "BY": "BY",
  "MD": "MD", "MK": "MK", "BA": "BA", "PK": "PK", "BD": "BD", "LB": "LB",
  "JO": "JO", "MO": "MO", "BO": "BO", "PA": "PA", "PT": "PT", "IS": "IS",
  "MN": "MN", "KW": "KW", "QA": "QA", "BH": "BH", "OM": "OM",

  // ISO 3-letter
  "ARE": "AE",
};

function toFlag(iso2: string): string {
  // UK is not a real ISO code, map to GB for flag
  const code = iso2 === "UK" ? "GB" : iso2;
  if (code.length !== 2) return "";
  return String.fromCodePoint(
    0x1f1e6 + code.charCodeAt(0) - 65,
    0x1f1e6 + code.charCodeAt(1) - 65
  );
}

export function countryFlag(raw: string): string {
  if (!raw) return "";
  // Handle dual countries like "Brazil/USA" — use first
  const primary = raw.split("/")[0].trim();
  // Try exact match first (case-sensitive for codes)
  const exact = ISO2[primary];
  if (exact) return toFlag(exact);
  // Try lowercase for full names
  const lower = ISO2[primary.toLowerCase()];
  if (lower) return toFlag(lower);
  // Try uppercase for 2/3-letter codes
  const upper = ISO2[primary.toUpperCase()];
  if (upper) return toFlag(upper);
  return "";
}
