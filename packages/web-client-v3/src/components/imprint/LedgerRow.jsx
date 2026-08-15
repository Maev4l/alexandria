import { cn } from '@/lib/cn';

const stamp = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// One loan pairing. There is no due date in this API, so a loan states its duration and
// nothing about lateness.
const LedgerRow = ({ loan, inverted = false }) => {
  const right = loan.unresolved ? 'no return recorded' : `${loan.days} days`;
  const left = loan.open
    ? `${stamp(loan.lentAt)} → still out`
    : `${stamp(loan.lentAt)} → ${loan.returnedAt ? stamp(loan.returnedAt) : '—'}`;

  return (
    <div
      className={cn(
        'num flex justify-between gap-2 border-b py-2 text-[11px]',
        inverted ? 'border-cover-rule text-cover-soft' : 'border-ink text-ink-soft',
        loan.open && (inverted ? 'text-paper' : 'text-ink'),
      )}
    >
      <span>{left}</span>
      <span className={inverted ? 'text-cover-soft' : 'text-ink-soft'}>{right}</span>
    </div>
  );
};

export default LedgerRow;
