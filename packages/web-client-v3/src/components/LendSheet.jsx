import { useState } from 'react';
import Sheet from '@/components/imprint/Sheet.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { eventsApi } from '@/api';
import { useToast } from '@/state/ToastContext.jsx';

const NAME_MAX = 50;

// Detail's primary action either ACTS or asks for exactly what it needs — never a menu
// (DESIGN.md, "A control labelled with a specific action performs that action"). Lend is the one
// case that genuinely needs input, a borrower's name, so it is a sheet holding ONLY that form:
// no Edit, no Delete, nothing the reader did not ask for when they tapped "Lend".
const LendSheet = ({ item, libraryId, open, onClose, onLent }) => {
  const [borrower, setBorrower] = useState('');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const { confirm } = useToast();

  const submit = async () => {
    setError(null);
    setIsBusy(true);
    try {
      await eventsApi.create(libraryId, item.id, { type: 'LENT', event: borrower.trim() });
      // The write returns an empty body, so the item is re-read rather than assumed.
      await onLent?.();
      // The toast confirms only; the failure path below never reaches it.
      confirm(`${item.title} is out with ${borrower.trim()}`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={item.title}>
      {error && (
        <p role="alert" className="mb-4 border-t-2 border-out bg-paper p-4 text-sm text-ink">
          {error}
        </p>
      )}
      <Field
        label="Who has it"
        maxLength={NAME_MAX}
        counter={NAME_MAX - borrower.length}
        value={borrower}
        onChange={(event) => setBorrower(event.target.value)}
      />
      {/* The reason is visible — an empty required field right above — so the action is the
          ruled outline and fills to a plate on validity, never an inert control (DESIGN.md §6). */}
      <div className="flex gap-2">
        <PlateButton
          disabled={isBusy || !borrower.trim()}
          onClick={submit}
        >
          {isBusy ? 'Recording' : 'Record the loan'}
        </PlateButton>
        <PlateButton variant="secondary" onClick={onClose}>
          Cancel
        </PlateButton>
      </div>
    </Sheet>
  );
};

export default LendSheet;
