import { useState } from 'react';
import Sheet from '@/components/imprint/Sheet.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { eventsApi } from '@/api';
import { useToast } from '@/state/ToastContext.jsx';

const NAME_MAX = 50;

// Detail's primary action either ACTS or asks for exactly what it needs — never a menu
// ("A control labelled with a specific action performs that action"). Lend is the one
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
        value={borrower}
        onChange={(event) => setBorrower(event.target.value)}
      />
      {/* The action slot's first form — outline-fills-to-plate with no words — only works when a disabled
          outline reads as "not yet". Here it sits directly beside Cancel, a secondary that is
          ALSO a ruled outline, so at rest the two controls are the same shape: the reader
          cannot tell commit from escape without reading 10px field-label caps above, in a flow
          PRODUCT.md times in seconds, at the door. This is the SECOND form instead: the reason
          takes the button's own position in `--ink-soft` caps, and the filled plate swaps in
          once there is a name. The reason's `min-h-12` matches PlateButton's own so the slot's
          height is reserved across both states and the row never resizes on the swap. */}
      <div className="flex items-center gap-2">
        {borrower.trim() ? (
          <PlateButton disabled={isBusy} onClick={submit}>
            {isBusy ? 'Recording' : 'Record the loan'}
          </PlateButton>
        ) : (
          <p className="caps flex min-h-12 items-center text-[11px] font-bold text-ink-soft">
            A borrower's name
          </p>
        )}
        <PlateButton variant="secondary" onClick={onClose}>
          Cancel
        </PlateButton>
      </div>
    </Sheet>
  );
};

export default LendSheet;
