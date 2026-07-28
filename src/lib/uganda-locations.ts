/**
 * Ugandan districts, cities, and well-known Kampala-area towns, each mapped to
 * its region.
 *
 * Why a curated list rather than geocoder results for the city and region
 * fields: the listing filter matches city exactly, so free-typed values
 * fragment the data — "Kampala", "kampala city", and "Kla" become three
 * different filters that each match a handful of schools. Constraining entry to
 * known places keeps the filter meaningful, and lets the region fill itself in
 * once a city is chosen.
 *
 * The street address still uses the geocoder, since that genuinely needs to be
 * free-form.
 */

export const UGANDA_REGIONS = [
  'Central Region',
  'Eastern Region',
  'Northern Region',
  'Western Region',
] as const;

export type UgandaRegion = (typeof UGANDA_REGIONS)[number];

export interface UgandaPlace {
  name: string;
  region: UgandaRegion;
}

const CENTRAL = [
  // Districts
  'Buikwe', 'Bukomansimbi', 'Butambala', 'Buvuma', 'Gomba', 'Kalangala', 'Kalungu',
  'Kampala', 'Kassanda', 'Kayunga', 'Kiboga', 'Kyankwanzi', 'Kyotera', 'Luwero',
  'Lwengo', 'Lyantonde', 'Masaka', 'Mityana', 'Mpigi', 'Mubende', 'Mukono',
  'Nakaseke', 'Nakasongola', 'Rakai', 'Sembabule', 'Wakiso',
  // Towns and suburbs people commonly give as their school's location
  'Entebbe', 'Nansana', 'Kira', 'Ntinda', 'Naalya', 'Bweyogerere', 'Seeta',
  'Namugongo', 'Kyaliwajjala', 'Kawempe', 'Makindye', 'Nakawa', 'Rubaga',
  'Bugolobi', 'Muyenga', 'Kololo', 'Naguru', 'Kansanga', 'Munyonyo', 'Gayaza',
  'Matugga', 'Kajjansi', 'Kisubi', 'Bwebajja', 'Nateete', 'Mengo', 'Kibuli',
  'Luzira', 'Kireka', 'Najjera', 'Kasangati', 'Buloba', 'Nsangi',
];

const EASTERN = [
  'Amuria', 'Budaka', 'Bududa', 'Bugiri', 'Bugweri', 'Bukedea', 'Bukwo',
  'Bulambuli', 'Busia', 'Butaleja', 'Butebo', 'Buyende', 'Iganga', 'Jinja',
  'Kaberamaido', 'Kalaki', 'Kaliro', 'Kamuli', 'Kapchorwa', 'Kapelebyong',
  'Katakwi', 'Kibuku', 'Kumi', 'Kween', 'Luuka', 'Manafwa', 'Mayuge', 'Mbale',
  'Namayingo', 'Namisindwa', 'Namutumba', 'Ngora', 'Pallisa', 'Serere',
  'Sironko', 'Soroti', 'Tororo', 'Njeru', 'Busembatia',
];

const NORTHERN = [
  'Abim', 'Adjumani', 'Agago', 'Alebtong', 'Amolatar', 'Amudat', 'Amuru', 'Apac',
  'Arua', 'Dokolo', 'Gulu', 'Kaabong', 'Karenga', 'Kitgum', 'Koboko', 'Kole',
  'Kotido', 'Kwania', 'Lamwo', 'Lira', 'Madi-Okollo', 'Maracha', 'Moroto',
  'Moyo', 'Nabilatuk', 'Nakapiripirit', 'Napak', 'Nebbi', 'Nwoya', 'Obongi',
  'Omoro', 'Otuke', 'Oyam', 'Pader', 'Pakwach', 'Terego', 'Yumbe', 'Zombo',
];

const WESTERN = [
  'Buhweju', 'Buliisa', 'Bundibugyo', 'Bunyangabu', 'Bushenyi', 'Fort Portal',
  'Hoima', 'Ibanda', 'Isingiro', 'Kabale', 'Kabarole', 'Kagadi', 'Kakumiro',
  'Kamwenge', 'Kanungu', 'Kasese', 'Kazo', 'Kibaale', 'Kikuube', 'Kiruhura',
  'Kiryandongo', 'Kisoro', 'Kitagwenda', 'Kyegegwa', 'Kyenjojo', 'Masindi',
  'Mbarara', 'Mitooma', 'Ntoroko', 'Ntungamo', 'Rubanda', 'Rubirizi', 'Rukiga',
  'Rukungiri', 'Rwampara', 'Sheema',
];

export const UGANDA_PLACES: UgandaPlace[] = [
  ...CENTRAL.map(name => ({ name, region: 'Central Region' as const })),
  ...EASTERN.map(name => ({ name, region: 'Eastern Region' as const })),
  ...NORTHERN.map(name => ({ name, region: 'Northern Region' as const })),
  ...WESTERN.map(name => ({ name, region: 'Western Region' as const })),
].sort((a, b) => a.name.localeCompare(b.name));

const BY_LOWER_NAME = new Map(UGANDA_PLACES.map(place => [place.name.toLowerCase(), place]));

/** Region for a place name, or null when it isn't one we know. */
export function regionForPlace(name: string): UgandaRegion | null {
  return BY_LOWER_NAME.get(name.trim().toLowerCase())?.region ?? null;
}

/**
 * Ranked place suggestions.
 *
 * Prefix matches come first — someone typing "kam" wants Kampala above
 * Bukomansimbi, even though both contain the substring.
 */
export function suggestPlaces(query: string, limit = 8): UgandaPlace[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const prefix: UgandaPlace[] = [];
  const contains: UgandaPlace[] = [];

  for (const place of UGANDA_PLACES) {
    const name = place.name.toLowerCase();
    if (name.startsWith(q)) prefix.push(place);
    else if (name.includes(q)) contains.push(place);

    if (prefix.length >= limit) break;
  }

  return [...prefix, ...contains].slice(0, limit);
}

/** Region suggestions, so the region field behaves like the others. */
export function suggestRegions(query: string): UgandaRegion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...UGANDA_REGIONS];
  return UGANDA_REGIONS.filter(region => region.toLowerCase().includes(q));
}
