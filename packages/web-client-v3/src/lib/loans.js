const MS_PER_DAY = 86_400_000;

export const daysBetween = (from, to) =>
  Math.floor((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY);

// The API stores LENT/RETURNED events, not loans, and has no due date — so a loan, its
// duration, and whether it is still open are all derived here. "Overdue" is not a concept
// this backend has, and nothing in the UI may imply it.
export const pairLoanEvents = (events = [], now = new Date()) => {
  const chronological = events
    .filter((event) => event.date)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const loans = [];
  let open = null;

  const close = (returnedAt, extra = {}) => {
    loans.push({
      name: open.name,
      lentAt: open.lentAt,
      returnedAt,
      days: daysBetween(open.lentAt, returnedAt ?? now),
      open: false,
      unresolved: false,
      ...extra,
    });
    open = null;
  };

  for (const event of chronological) {
    if (event.type === 'LENT') {
      // A LENT superseded by another LENT: the first loan has no recorded return. Say that,
      // rather than inventing a date or pretending both are still out.
      if (open) close(null, { unresolved: true });
      open = { name: event.event, lentAt: event.date };
    } else if (event.type === 'RETURNED' && open) {
      close(event.date);
    }
    // A RETURNED with nothing open is orphaned history; it is dropped, not turned into a loan.
  }

  if (open) {
    loans.push({
      name: open.name,
      lentAt: open.lentAt,
      returnedAt: null,
      days: daysBetween(open.lentAt, now),
      open: true,
      unresolved: false,
    });
  }

  return loans.reverse();
};
