import type { UserProfile } from './types';

/**
 * Ready-made identities for trying subgroup analysis without filling the form.
 *
 * This module is only ever reached from a development build — see
 * `PersonaModal` — so the data never reaches a real visitor's bundle.
 */
export const devPersonas: UserProfile[] = [
  {
    id: 'user-priya',
    name: 'Priya Sharma',
    avatar: 'PS',
    role: 'Tech Lead',
    city: 'Bengaluru',
    district: 'Bengaluru Urban',
    districtId: 'ka-bengaluru-urban',
    stateId: 'in-ka',
    stateCode: 'KA',
    region: 'South',
    birthDate: { year: 1994, month: 3, day: 18 },
    ageCohort: '25-34',
    sector: 'Tech & Design',
  },
  {
    id: 'user-arjun',
    name: 'Arjun Patel',
    avatar: 'AP',
    role: 'Operations Director',
    city: 'Mumbai',
    district: 'Mumbai',
    districtId: 'mh-mumbai',
    stateId: 'in-mh',
    stateCode: 'MH',
    region: 'West',
    birthDate: { year: 1983, month: 11 },
    ageCohort: '35-49',
    sector: 'Operations & Supply Chain',
  },
  {
    id: 'user-sneha',
    name: 'Sneha Verma',
    avatar: 'SV',
    role: 'Public Policy Researcher',
    city: 'New Delhi',
    district: 'Delhi',
    districtId: 'dl-delhi',
    stateId: 'in-dl',
    stateCode: 'DL',
    region: 'North',
    birthDate: { year: 2004 },
    ageCohort: '18-24',
    sector: 'Governance & Civic Tech',
  },
  {
    id: 'user-rajesh',
    name: 'Rajesh Mukherjee',
    avatar: 'RM',
    role: 'Senior Consultant',
    city: 'Kolkata',
    district: 'Kolkata',
    districtId: 'wb-kolkata',
    stateId: 'in-wb',
    stateCode: 'WB',
    region: 'East',
    birthDate: { year: 1970, month: 6, day: 2 },
    ageCohort: '50+',
    sector: 'Corporate & Finance',
  },
];
