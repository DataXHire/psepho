/**
 * Source datasets and the naming fixes needed to turn Census-2011 vintage
 * boundaries into the present-day (post-2019) set of States and UTs.
 */

export const SOURCES = {
  // Census 2011 district boundaries published by the DataMeet India community
  // (MIT licensed). This is the highest-detail set that draws India's external
  // boundary as claimed by India: the full Jammu & Kashmir / Ladakh extent
  // (including Gilgit-Baltistan and Aksai Chin) and Arunachal Pradesh.
  datameetDistricts: {
    base: 'https://raw.githubusercontent.com/datameet/maps/master/Districts/Census_2011/2011_Dist',
    extensions: ['shp', 'dbf', 'shx', 'prj'],
  },
  // Present-day district boundaries (post-2019 reorganisations: 33 Telangana
  // districts, Ladakh as a UT, and so on), one file per State/UT.
  currentDistricts: {
    base: 'https://cdn.jsdelivr.net/gh/udit-001/india-maps-data@2884453/geojson/states',
  },
};

/** Census-2011 ST_NM -> present-day State/UT name. */
export const STATE_NAME_FIXES = {
  'Andaman & Nicobar Island': 'Andaman & Nicobar Islands',
  'Arunanchal Pradesh': 'Arunachal Pradesh',
  'NCT of Delhi': 'Delhi',
  'Jammu & Kashmir': 'Jammu & Kashmir',
  // Merged into a single UT in January 2020.
  'Dadara & Nagar Havelli': 'Dadra & Nagar Haveli and Daman & Diu',
  'Daman & Diu': 'Dadra & Nagar Haveli and Daman & Diu',
};

/**
 * Districts carved out of undivided Andhra Pradesh to form Telangana in 2014.
 * Census 2011 predates the split, so the ten parent districts are relabelled.
 */
export const TELANGANA_DISTRICTS = new Set([
  'Adilabad',
  'Hyderabad',
  'Karimnagar',
  'Khammam',
  'Mahbubnagar',
  'Medak',
  'Nalgonda',
  'Nizamabad',
  'Rangareddy',
  'Warangal',
]);

/** Districts of the Ladakh UT, carved out of Jammu & Kashmir in 2019. */
export const LADAKH_DISTRICTS = new Set(['Leh (ladakh)', 'Kargil']);

/**
 * Census 2011 carries the areas of the J&K / Ladakh claim that India does not
 * administer as a single unnamed district ("Data Not Available"). It cannot be
 * split along the Gilgit-Baltistan / PoK line from this data, so it is kept
 * with Jammu & Kashmir. It never carries poll data, so it always renders in the
 * inert "no data" style.
 */
export const UNADMINISTERED_DISTRICT = 'Data Not Available';

/** ISO 3166-2:IN style two-letter codes, using the forms in common Indian use. */
export const STATE_CODES = {
  'Andaman & Nicobar Islands': 'AN',
  'Andhra Pradesh': 'AP',
  'Arunachal Pradesh': 'AR',
  Assam: 'AS',
  Bihar: 'BR',
  Chandigarh: 'CH',
  Chhattisgarh: 'CG',
  'Dadra & Nagar Haveli and Daman & Diu': 'DH',
  Delhi: 'DL',
  Goa: 'GA',
  Gujarat: 'GJ',
  Haryana: 'HR',
  'Himachal Pradesh': 'HP',
  'Jammu & Kashmir': 'JK',
  Jharkhand: 'JH',
  Karnataka: 'KA',
  Kerala: 'KL',
  Ladakh: 'LA',
  Lakshadweep: 'LD',
  'Madhya Pradesh': 'MP',
  Maharashtra: 'MH',
  Manipur: 'MN',
  Meghalaya: 'ML',
  Mizoram: 'MZ',
  Nagaland: 'NL',
  Odisha: 'OD',
  Puducherry: 'PY',
  Punjab: 'PB',
  Rajasthan: 'RJ',
  Sikkim: 'SK',
  'Tamil Nadu': 'TN',
  Telangana: 'TG',
  Tripura: 'TR',
  'Uttar Pradesh': 'UP',
  Uttarakhand: 'UK',
  'West Bengal': 'WB',
};

/** File name of each State/UT in the present-day district dataset. */
export const CURRENT_DISTRICT_FILES = {
  AN: 'andaman-and-nicobar-islands',
  AP: 'andhra-pradesh',
  AR: 'arunachal-pradesh',
  AS: 'assam',
  BR: 'bihar',
  CH: 'chandigarh',
  CG: 'chhattisgarh',
  DH: 'dnh-and-dd',
  DL: 'delhi',
  GA: 'goa',
  GJ: 'gujarat',
  HR: 'haryana',
  HP: 'himachal-pradesh',
  JK: 'jammu-and-kashmir',
  JH: 'jharkhand',
  KA: 'karnataka',
  KL: 'kerala',
  LA: 'ladakh',
  LD: 'lakshadweep',
  MP: 'madhya-pradesh',
  MH: 'maharashtra',
  MN: 'manipur',
  ML: 'meghalaya',
  MZ: 'mizoram',
  NL: 'nagaland',
  OD: 'odisha',
  PY: 'puducherry',
  PB: 'punjab',
  RJ: 'rajasthan',
  SK: 'sikkim',
  TN: 'tamil-nadu',
  TG: 'telangana',
  TR: 'tripura',
  UP: 'uttar-pradesh',
  UK: 'uttarakhand',
  WB: 'west-bengal',
};
