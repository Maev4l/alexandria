// Shapes mirror handlers/models.go exactly: optional fields are OMITTED, never null.
export const libraries = [
  {
    id: 'lib-fiction',
    name: 'Fiction',
    description: 'Romans et nouvelles',
    totalItems: 412,
    updatedAt: '2026-08-01T09:12:00Z',
    sharedTo: ['marie@example.com', 'paul@example.com'],
  },
  {
    id: 'lib-films',
    name: 'Films',
    description: 'DVD and Blu-ray',
    totalItems: 268,
    updatedAt: '2026-07-22T18:40:00Z',
    sharedTo: [],
  },
  {
    id: 'lib-empty',
    name: 'Bandes dessinées',
    description: '',
    totalItems: 0,
    updatedAt: '2026-08-10T07:00:00Z',
    sharedTo: [],
  },
  {
    id: 'lib-shared-in',
    name: 'Polars',
    description: 'Shared with me, read only',
    totalItems: 96,
    updatedAt: '2026-08-05T11:30:00Z',
    sharedFrom: 'marie@example.com',
  },
];
