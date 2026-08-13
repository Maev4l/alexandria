// Newest first, as the API returns them. Includes a closed loan, an open loan, and a LENT
// with no matching RETURNED so the pairing logic's unresolved branch has real data.
export const eventsByItem = {
  'item-lent': [
    { date: '2026-08-07T10:00:00Z', type: 'LENT', event: 'Marie' },
    { date: '2026-06-02T16:30:00Z', type: 'RETURNED', event: 'Paul' },
    { date: '2026-05-20T09:00:00Z', type: 'LENT', event: 'Paul' },
    { date: '2026-03-11T14:00:00Z', type: 'LENT', event: 'Léa' },
  ],
  'item-1984': [],
};
