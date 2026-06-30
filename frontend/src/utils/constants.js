export const API_BASE_URL = 'http://localhost:5000/api';

export const ELECTION_POSITIONS = [
  { id: 1, label: 'President', order: 1 },
  { id: 2, label: 'Vice President', order: 2 },
  { id: 3, label: 'General Secretary', order: 3 },
  { id: 4, label: 'Treasurer', order: 4 },
  { id: 5, label: 'Financial Secretary', order: 5 },
  { id: 6, label: 'Assistant General Secretary', order: 6 },
  { id: 7, label: 'Public Relations Officer', order: 7 },
];

export const POSITION_LABELS = ELECTION_POSITIONS.reduce((acc, pos) => {
  acc[pos.id] = pos.label;
  return acc;
}, {});

export const VOTE_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  VERIFIED: 'verified',
};

export const MEMBER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

export const STORAGE_KEYS = {
  TOKEN: 'nsc_voting_token',
  ADMIN: 'nsc_voting_admin',
  THEME: 'nsc_voting_theme',
  VOTE_DATA: 'nsc_vote_data',
  VOTE_SELECTIONS: 'nsc_vote_selections',
};

export const DEPARTMENTS = [
  'Administration',
  'Finance & Accounts',
  'Marine & Operations',
  'Human Resources',
  'Legal Services',
  'Information Technology',
  'Corporate Affairs',
  'Internal Audit',
  'Procurement',
  'Research & Statistics',
];

export const LOCATIONS = [
  'Headquarters - Lagos',
  'Apapa Area Command',
  'Tin Can Island Command',
  'Eastern Ports Command',
  'Western Ports Command',
  'Kano Inland Office',
  'Liaison Office - Abuja',
  'Liaison Office - Port Harcourt',
];

export const POSITION_IDS = {
  PRESIDENT: 1,
  VICE_PRESIDENT: 2,
  GENERAL_SECRETARY: 3,
  TREASURER: 4,
  FINANCIAL_SECRETARY: 5,
  ASSISTANT_GENERAL_SECRETARY: 6,
  PRO: 7,
};

export const THEME_MODE = {
  LIGHT: 'light',
  DARK: 'dark',
};
