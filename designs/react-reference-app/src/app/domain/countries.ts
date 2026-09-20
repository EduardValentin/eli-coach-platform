export type Country = { name: string; diallingCode: string };

export const COUNTRIES: readonly Country[] = [
  { name: 'Romania', diallingCode: '+40' },
  { name: 'Austria', diallingCode: '+43' },
  { name: 'Belgium', diallingCode: '+32' },
  { name: 'Bulgaria', diallingCode: '+359' },
  { name: 'Czechia', diallingCode: '+420' },
  { name: 'Denmark', diallingCode: '+45' },
  { name: 'France', diallingCode: '+33' },
  { name: 'Germany', diallingCode: '+49' },
  { name: 'Greece', diallingCode: '+30' },
  { name: 'Hungary', diallingCode: '+36' },
  { name: 'Ireland', diallingCode: '+353' },
  { name: 'Italy', diallingCode: '+39' },
  { name: 'Moldova', diallingCode: '+373' },
  { name: 'Netherlands', diallingCode: '+31' },
  { name: 'Poland', diallingCode: '+48' },
  { name: 'Portugal', diallingCode: '+351' },
  { name: 'Spain', diallingCode: '+34' },
  { name: 'Sweden', diallingCode: '+46' },
  { name: 'Switzerland', diallingCode: '+41' },
  { name: 'United Kingdom', diallingCode: '+44' },
  { name: 'United States', diallingCode: '+1' },
];

export function diallingCodeFor(countryName: string): string {
  return (
    COUNTRIES.find((country) => country.name === countryName)?.diallingCode ??
    COUNTRIES[0].diallingCode
  );
}
