// Maps jurisdiction + as_of_date to the code edition in effect.
// Extend this table as editions change.
const EDITION_SCHEDULE = [
  {
    state: 'FL',
    edition: 'FBC_9th_2027',
    label: 'FBC 9th Edition (2027)',
    effective: new Date('2026-12-31'),
  },
  {
    state: 'FL',
    edition: 'FBC_8th_2023',
    label: 'FBC 8th Edition (2023)',
    effective: new Date('2023-12-31'),
  },
];

export function resolveEdition(jurisdiction, asOfDate) {
  const state = jurisdiction.state?.toUpperCase();
  const date = asOfDate ? new Date(asOfDate) : new Date();
  const applicable = EDITION_SCHEDULE
    .filter(e => e.state === state && e.effective <= date)
    .sort((a, b) => b.effective - a.effective);
  if (!applicable.length) return { edition: 'FBC_8th_2023', label: 'FBC 8th Edition (2023)' };
  return { edition: applicable[0].edition, label: applicable[0].label };
}
