import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

export type Country = { code: string; name: string };

const POPULAR_CODES = ["AE", "GB", "US", "RU", "IN", "CN", "DE", "FR", "ES", "IT", "TR", "SA", "EG", "JP", "AU"];

const allNames = countries.getNames("en", { select: "official" });

const popular: Country[] = POPULAR_CODES
  .filter(code => allNames[code])
  .map(code => ({ code, name: allNames[code] }));

const rest: Country[] = Object.entries(allNames)
  .filter(([code]) => !POPULAR_CODES.includes(code))
  .map(([code, name]) => ({ code, name: name as string }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const COUNTRIES: Country[] = [
  ...popular,
  { code: "---", name: "──────────" },
  ...rest,
];

export function getCountryName(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.name || code;
}

export function isValidCountryCode(code: string): boolean {
  return COUNTRIES.some(c => c.code === code && c.code !== "---");
}
