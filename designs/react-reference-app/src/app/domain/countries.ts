export type Country = { name: string; isoCode: string; diallingCode: string };

export const COUNTRIES: readonly Country[] = [
  { name: 'Romania', isoCode: 'RO', diallingCode: '+40' },
  { name: 'Austria', isoCode: 'AT', diallingCode: '+43' },
  { name: 'Belgium', isoCode: 'BE', diallingCode: '+32' },
  { name: 'Bulgaria', isoCode: 'BG', diallingCode: '+359' },
  { name: 'Czechia', isoCode: 'CZ', diallingCode: '+420' },
  { name: 'Denmark', isoCode: 'DK', diallingCode: '+45' },
  { name: 'France', isoCode: 'FR', diallingCode: '+33' },
  { name: 'Germany', isoCode: 'DE', diallingCode: '+49' },
  { name: 'Greece', isoCode: 'GR', diallingCode: '+30' },
  { name: 'Hungary', isoCode: 'HU', diallingCode: '+36' },
  { name: 'Ireland', isoCode: 'IE', diallingCode: '+353' },
  { name: 'Italy', isoCode: 'IT', diallingCode: '+39' },
  { name: 'Moldova', isoCode: 'MD', diallingCode: '+373' },
  { name: 'Netherlands', isoCode: 'NL', diallingCode: '+31' },
  { name: 'Poland', isoCode: 'PL', diallingCode: '+48' },
  { name: 'Portugal', isoCode: 'PT', diallingCode: '+351' },
  { name: 'Spain', isoCode: 'ES', diallingCode: '+34' },
  { name: 'Sweden', isoCode: 'SE', diallingCode: '+46' },
  { name: 'Switzerland', isoCode: 'CH', diallingCode: '+41' },
  { name: 'United Kingdom', isoCode: 'GB', diallingCode: '+44' },
  { name: 'United States', isoCode: 'US', diallingCode: '+1' },
];

export function diallingCodeFor(countryName: string): string {
  return (
    COUNTRIES.find((country) => country.name === countryName)?.diallingCode ??
    COUNTRIES[0].diallingCode
  );
}
