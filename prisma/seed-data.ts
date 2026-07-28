/**
 * Seed fixtures, kept separate from the seed script so they can be validated
 * without a database connection (see src/lib/__tests__/seed-data.test.ts).
 *
 * Only two entries name real institutions — City Parents School and Sir Apollo
 * Kaggwa Schools. Everything else is invented, so the directory can be shown at
 * a realistic size without attaching made-up fees, ratings, or reviews to
 * schools that actually exist.
 *
 * Contact details throughout use the reserved +256 700 000 0XX range and
 * .demo.ug addresses, so a sample enquiry can never reach a real admissions
 * office. Fees and ratings are illustrative.
 */

export interface SeedSchool {
  id: string;
  name: string;
  types: string[];
  category: string;
  gender: string;
  city: string;
  region: string;
  address: string;
  latitude: number;
  longitude: number;
  shortDescription: string;
  description: string;
  dayMin: number;
  dayMax: number;
  facilities: string[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  owned?: boolean;
  status?: string;
}

export interface SeedReview {
  schoolId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
}

export const seedSchools: SeedSchool[] = [
  {
    // Real school. The demo school-owner account manages this one so the
    // dashboard has a populated listing to show.
    id: 'sch-1',
    name: 'City Parents School',
    types: ['kindergarten', 'primary'],
    category: 'mixed',
    gender: 'mixed',
    city: 'Kampala',
    region: 'Central Region',
    address: 'Buganda Road, Kampala',
    latitude: 0.3220,
    longitude: 32.5770,
    shortDescription: 'Long-established Kampala school covering nursery through upper primary.',
    description:
      "City Parents School is one of Kampala's long-established primary schools, taking children from nursery through to Primary Seven. The school combines the national curriculum with a broad co-curricular programme covering music, dance, drama, debate, and sport, and offers both day and boarding places in the upper classes.",
    dayMin: 1200000,
    dayMax: 2200000,
    facilities: ['Library', 'Science Laboratory', 'Computer Lab', 'Sports Field', 'Swimming Pool', 'Dining Hall', 'Boarding Facilities', 'Clinic', 'School Bus', 'Security'],
    rating: 4.6,
    reviewCount: 3,
    isVerified: true,
    isFeatured: true,
    isPremium: true,
    owned: true,
  },
  {
    // Real school.
    id: 'sch-2',
    name: 'Sir Apollo Kaggwa Schools',
    types: ['kindergarten', 'primary', 'secondary_oa'],
    category: 'mixed',
    gender: 'mixed',
    city: 'Kampala',
    region: 'Central Region',
    address: 'Mengo, Kampala',
    latitude: 0.3010,
    longitude: 32.5560,
    shortDescription: 'Multi-campus group running nursery, primary, and O & A level secondary.',
    description:
      'Sir Apollo Kaggwa Schools is a multi-campus group offering an unbroken path from nursery through primary to O and A level. Each campus runs the Ugandan national curriculum with a sciences and ICT emphasis, and day and boarding options are available at most levels.',
    dayMin: 1000000,
    dayMax: 2400000,
    facilities: ['Library', 'Science Laboratory', 'Computer Lab', 'Sports Field', 'Dining Hall', 'Boarding Facilities', 'Music Room', 'Art Room', 'Clinic', 'School Bus', 'Security', 'Wi-Fi'],
    rating: 4.5,
    reviewCount: 2,
    isVerified: true,
    isFeatured: true,
    isPremium: true,
    owned: true,
  },
  {
    id: 'sch-3',
    name: 'Bright Future Academy',
    types: ['primary'],
    category: 'day',
    gender: 'mixed',
    city: 'Ntinda',
    region: 'Central Region',
    address: 'Ntinda Ring Road, Kampala',
    latitude: 0.3540,
    longitude: 32.6150,
    shortDescription: 'Day primary school focused on literacy, numeracy, and small classes.',
    description:
      'Bright Future Academy is a day primary school in Ntinda offering the Ugandan national curriculum from Primary One to Primary Seven. Class sizes are kept small so teachers can track each pupil closely, with daily reading and numeracy support alongside music, art, and sport.',
    dayMin: 800000,
    dayMax: 1500000,
    facilities: ['Library', 'Computer Lab', 'Sports Field', 'Playground', 'Dining Hall', 'School Bus', 'Security', 'Wi-Fi'],
    rating: 4.7,
    reviewCount: 2,
    isVerified: true,
    isFeatured: true,
    isPremium: true,
  },
  {
    id: 'sch-4',
    name: 'Victoria Shores High School',
    types: ['secondary_oa'],
    category: 'boarding',
    gender: 'girls_only',
    city: 'Entebbe',
    region: 'Central Region',
    address: 'Kigungu Road, Entebbe',
    latitude: 0.0512,
    longitude: 32.4637,
    shortDescription: 'Girls-only boarding secondary school offering O and A level.',
    description:
      'Victoria Shores High School is a girls-only boarding secondary school near the lakeshore in Entebbe, offering both O and A level. Sciences and humanities streams run at A level, supported by laboratories, a library, and a full co-curricular timetable.',
    dayMin: 1800000,
    dayMax: 2800000,
    facilities: ['Library', 'Science Laboratory', 'Computer Lab', 'Sports Field', 'Dining Hall', 'Boarding Facilities', 'Music Room', 'Clinic', 'Chapel / Prayer Room', 'Security'],
    rating: 4.8,
    reviewCount: 2,
    isVerified: true,
    isFeatured: true,
    isPremium: false,
  },
  {
    id: 'sch-5',
    name: 'Nile Valley Secondary School',
    types: ['secondary_oa'],
    category: 'mixed',
    gender: 'mixed',
    city: 'Jinja',
    region: 'Eastern Region',
    address: 'Main Street, Jinja',
    latitude: 0.4244,
    longitude: 33.2041,
    shortDescription: 'O and A level secondary school with day and boarding sections.',
    description:
      'Nile Valley Secondary School offers O and A level under the Ugandan national curriculum, with both day and boarding sections. The school runs a sciences stream at A level and maintains laboratories, a computer room, and extensive sports grounds.',
    dayMin: 900000,
    dayMax: 1800000,
    facilities: ['Library', 'Science Laboratory', 'Computer Lab', 'Sports Field', 'Dining Hall', 'Boarding Facilities', 'Clinic', 'Security'],
    rating: 4.3,
    reviewCount: 1,
    isVerified: true,
    isFeatured: false,
    isPremium: false,
  },
  {
    id: 'sch-6',
    name: 'Rwenzori View Academy',
    types: ['primary', 'secondary_o'],
    category: 'mixed',
    gender: 'mixed',
    city: 'Kasese',
    region: 'Western Region',
    address: 'Rukoki, Kasese',
    latitude: 0.1833,
    longitude: 30.0833,
    shortDescription: 'Primary and O level under the Rwenzori foothills, day and boarding.',
    description:
      'Rwenzori View Academy runs primary and lower secondary sections in Kasese, offering day and boarding places. The school follows the national curriculum with additional emphasis on agriculture and environmental science, reflecting its setting near the Rwenzori foothills.',
    dayMin: 600000,
    dayMax: 1300000,
    facilities: ['Library', 'Science Laboratory', 'Computer Lab', 'Sports Field', 'Dining Hall', 'Boarding Facilities', 'Playground', 'Security'],
    rating: 4.2,
    reviewCount: 1,
    isVerified: true,
    isFeatured: false,
    isPremium: true,
  },
  {
    id: 'sch-7',
    name: 'Northern Star College',
    types: ['secondary_o'],
    category: 'mixed',
    gender: 'mixed',
    city: 'Gulu',
    region: 'Northern Region',
    address: 'Laroo Division, Gulu',
    latitude: 2.7746,
    longitude: 32.2990,
    shortDescription: 'O level secondary school serving Gulu, day and boarding.',
    description:
      'Northern Star College offers O level under the Ugandan national curriculum, with day and boarding sections serving Gulu and the surrounding districts. Facilities include science laboratories, a computer room, and a library.',
    dayMin: 700000,
    dayMax: 1300000,
    facilities: ['Library', 'Science Laboratory', 'Computer Lab', 'Sports Field', 'Dining Hall', 'Boarding Facilities', 'Security'],
    rating: 4.1,
    reviewCount: 0,
    isVerified: false,
    isFeatured: false,
    isPremium: false,
  },
  {
    id: 'sch-8',
    name: 'Pearl Heights International School',
    types: ['kindergarten', 'primary', 'secondary_o'],
    category: 'mixed',
    gender: 'mixed',
    city: 'Naalya',
    region: 'Central Region',
    address: 'Naalya Estate, Wakiso',
    latitude: 0.3702,
    longitude: 32.6330,
    shortDescription: 'Nursery to O level with an international curriculum option.',
    description:
      'Pearl Heights International School runs nursery, primary, and lower secondary sections, offering both the Ugandan national curriculum and an international stream. Day and boarding places are available, and the campus includes a pool, ICT suites, and dedicated art and music rooms.',
    dayMin: 1600000,
    dayMax: 3000000,
    facilities: ['Library', 'Science Laboratory', 'Computer Lab', 'Sports Field', 'Swimming Pool', 'Dining Hall', 'Boarding Facilities', 'Music Room', 'Art Room', 'Playground', 'Clinic', 'School Bus', 'Wi-Fi', 'Security'],
    rating: 4.6,
    reviewCount: 1,
    isVerified: true,
    isFeatured: true,
    isPremium: false,
  },
  {
    id: 'sch-9',
    name: 'Sunrise Daycare & Nursery',
    types: ['daycare', 'kindergarten'],
    category: 'day',
    gender: 'mixed',
    city: 'Kira',
    region: 'Central Region',
    address: 'Kira Town, Wakiso',
    latitude: 0.3900,
    longitude: 32.6400,
    shortDescription: 'Daycare and nursery for children from six months to five years.',
    description:
      'Sunrise takes children from six months through to nursery age, with a play-led programme, structured nap and meal times, and a low child-to-carer ratio. Parents receive a short daily report covering meals, sleep, and activities.',
    dayMin: 300000,
    dayMax: 600000,
    facilities: ['Playground', 'Dining Hall', 'Clinic', 'Security', 'School Bus'],
    rating: 4.5,
    reviewCount: 0,
    isVerified: false,
    isFeatured: false,
    isPremium: false,
    // Left pending so the admin moderation queue has something in it.
    status: 'pending',
  },
  {
    id: 'sch-10',
    name: 'Greenvale Junior School',
    types: ['primary'],
    category: 'day',
    gender: 'mixed',
    city: 'Mukono',
    region: 'Central Region',
    address: 'Seeta, Mukono',
    latitude: 0.3667,
    longitude: 32.7333,
    shortDescription: 'Day primary school following the national curriculum.',
    description:
      'Greenvale Junior School is a day primary school in Mukono District running the Ugandan national curriculum from Primary One to Primary Seven, with a focus on core literacy and numeracy alongside sport and music.',
    dayMin: 450000,
    dayMax: 900000,
    facilities: ['Library', 'Computer Lab', 'Sports Field', 'Playground', 'Security'],
    rating: 4.2,
    reviewCount: 0,
    isVerified: true,
    isFeatured: false,
    isPremium: false,
  },
  {
    id: 'sch-11',
    name: 'Highland Crest University',
    types: ['university'],
    category: 'mixed',
    gender: 'mixed',
    city: 'Kabale',
    region: 'Western Region',
    address: 'Makanga Hill, Kabale',
    latitude: -1.2411,
    longitude: 29.9899,
    shortDescription: 'Private university offering undergraduate and postgraduate degrees.',
    description:
      'Highland Crest University offers undergraduate and postgraduate programmes across business, education, social sciences, and health sciences, with halls of residence, libraries, and laboratories on a hillside campus in Kabale.',
    dayMin: 1800000,
    dayMax: 3600000,
    facilities: ['Library', 'Computer Lab', 'Sports Field', 'Dining Hall', 'Boarding Facilities', 'Clinic', 'Wi-Fi', 'Security'],
    rating: 4.4,
    reviewCount: 1,
    isVerified: true,
    isFeatured: false,
    isPremium: false,
  },
  {
    id: 'sch-12',
    name: 'Savannah Institute of Technology',
    types: ['tertiary'],
    category: 'day',
    gender: 'mixed',
    city: 'Mbarara',
    region: 'Western Region',
    address: 'High Street, Mbarara',
    latitude: -0.6072,
    longitude: 30.6545,
    shortDescription: 'Tertiary institute offering diplomas and certificates in technical fields.',
    description:
      'Savannah Institute of Technology offers diploma and certificate programmes in ICT, electrical engineering, business administration, and hospitality, with workshops, computer laboratories, and industry placement support.',
    dayMin: 900000,
    dayMax: 2000000,
    facilities: ['Library', 'Computer Lab', 'Sports Field', 'Dining Hall', 'Wi-Fi', 'Security'],
    rating: 4.0,
    reviewCount: 0,
    isVerified: true,
    isFeatured: false,
    isPremium: false,
  },
  {
    id: 'sch-13',
    name: "Lakeside Girls' Academy",
    types: ['secondary_oa'],
    category: 'boarding',
    gender: 'girls_only',
    city: 'Masaka',
    region: 'Central Region',
    address: 'Nyendo, Masaka',
    latitude: -0.3333,
    longitude: 31.7333,
    shortDescription: 'Girls-only boarding school offering O and A level.',
    description:
      "Lakeside Girls' Academy is a girls-only boarding secondary school in Masaka offering O and A level. The school runs sciences and arts streams at A level and maintains a house system, laboratories, and a full sports programme.",
    dayMin: 1400000,
    dayMax: 2300000,
    facilities: ['Library', 'Science Laboratory', 'Computer Lab', 'Sports Field', 'Dining Hall', 'Boarding Facilities', 'Music Room', 'Clinic', 'Chapel / Prayer Room', 'Security'],
    rating: 4.5,
    reviewCount: 0,
    isVerified: true,
    isFeatured: false,
    isPremium: false,
  },
];

/**
 * Counts here must match reviewCount on the matching school, or a listing
 * advertises an aggregate rating with nothing behind it — the profile page emits
 * AggregateRating JSON-LD straight from those numbers.
 */
export const seedReviews: SeedReview[] = [
  {
    schoolId: 'sch-1',
    userId: 'u1',
    userName: 'Sarah Namukasa',
    rating: 5,
    title: 'Broad co-curricular programme',
    content: 'What stood out for us was how much goes on outside lessons — music, debate, and sport are all taken seriously rather than treated as an afterthought.',
  },
  {
    schoolId: 'sch-1',
    userId: 'u4',
    userName: 'Peter Kato',
    rating: 4,
    title: 'Well organised, large classes',
    content: 'Admissions were straightforward and the school is well run. Classes are on the larger side, so ask about the teacher-to-pupil ratio for the year you are joining.',
  },
  {
    schoolId: 'sch-1',
    userId: 'u3',
    userName: 'Mary Achieng',
    rating: 5,
    title: 'Our two have settled well',
    content: 'Both children moved up from nursery without any disruption. Communication with parents is regular and the staff are easy to reach.',
  },
  {
    schoolId: 'sch-2',
    userId: 'u2',
    userName: 'James Okello',
    rating: 5,
    title: 'Useful not having to switch schools',
    content: 'Being able to go from nursery through to A level in one group has saved us two admission cycles. The sciences stream at A level has been the strongest part for our son.',
  },
  {
    schoolId: 'sch-2',
    userId: 'u1',
    userName: 'Sarah Namukasa',
    rating: 4,
    title: 'Consistent across campuses',
    content: 'We looked at two of the campuses and the standard was similar at both. Worth visiting the specific one your child would attend.',
  },
  {
    schoolId: 'sch-3',
    userId: 'u2',
    userName: 'James Okello',
    rating: 4,
    title: 'Good teaching, fees add up',
    content: 'The teaching is solid and our daughter is happy to go each morning. Fees are on the higher side once transport and lunch are included, so budget for the full amount.',
  },
  {
    schoolId: 'sch-3',
    userId: 'u3',
    userName: 'Mary Achieng',
    rating: 5,
    title: 'Caring staff and reliable transport',
    content: 'The staff are patient with the younger classes and the school bus has been dependable on our route.',
  },
  {
    schoolId: 'sch-4',
    userId: 'u3',
    userName: 'Mary Achieng',
    rating: 5,
    title: 'Excellent boarding experience',
    content: 'Our daughter settled quickly. The house system gives the girls real responsibility and the academic support in the sciences has been excellent.',
  },
  {
    schoolId: 'sch-4',
    userId: 'u1',
    userName: 'Sarah Namukasa',
    rating: 5,
    title: 'Strong all round',
    content: 'Academics are demanding but well supported, and there is plenty beyond the classroom. Visiting days are well organised.',
  },
  {
    schoolId: 'sch-5',
    userId: 'u4',
    userName: 'Peter Kato',
    rating: 4,
    title: 'Solid sciences at A level',
    content: 'The laboratories are properly equipped and the A level science teaching has been consistent. Boarding facilities are basic but clean.',
  },
  {
    schoolId: 'sch-6',
    userId: 'u2',
    userName: 'James Okello',
    rating: 4,
    title: 'Good value outside the city',
    content: 'Fees are far more manageable than Kampala equivalents and the teaching is committed. The agriculture programme is a genuine strength.',
  },
  {
    schoolId: 'sch-8',
    userId: 'u3',
    userName: 'Mary Achieng',
    rating: 5,
    title: 'Facilities are excellent',
    content: 'The pool and ICT rooms are as good as anything we saw while shopping around. Worth visiting in person before committing to the fees.',
  },
  {
    schoolId: 'sch-11',
    userId: 'u4',
    userName: 'Peter Kato',
    rating: 4,
    title: 'Good programmes, quiet campus',
    content: 'The campus is calm and well suited to study. Registration periods get busy, so start the paperwork early.',
  },
];
