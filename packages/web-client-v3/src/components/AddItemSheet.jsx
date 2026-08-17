import { useNavigate } from 'react-router-dom';
import Sheet from '@/components/imprint/Sheet.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';

// Adding starts inside the library being viewed, so the destination is never asked. This sheet
// only chooses what kind of thing is arriving — Book or Film — and nothing else.
//
// `Enter by hand` used to live here too, and that was the bug: it needs a type to mean
// anything, and Book/Film are the controls that supply one. Putting it beside them made it
// look like their peer when it was actually downstream of them, so choosing it silently
// defaulted to book — the only path a film could ever be entered by hand was broken, with
// nothing on screen saying so. v2 has this right: its sheet is type-only, and the manual
// escape lives inside each capture screen (AddBook/AddVideo), where the type is already known
// and nothing needs to be assumed.
//
// `collection` is optional: absent for the header "+" (a standalone item), present when this
// sheet is reused from a collection board's Row Actions — and travels as a query parameter,
// `?collectionId=`, on both branches. Not `location.state`: state is gone on a cold load (a
// fresh tab, a deep link, a PWA restart resuming this exact URL), and AddBook/AddVideo now need
// the collection to build their own manual-entry link, not merely to display one — so a reader
// who explicitly chose a board must not silently resume filing standalone the moment either
// stub becomes real.
//
// `onBack` is optional too, and for a different reason: the header "+" has no menu to return
// to, so it renders no Back at all. Reached from a board's own menu, closing this sheet with
// only a forward exit is a one-way door — the same defect LendSheet and Share were both
// repaired for — so that caller supplies `onBack` and gets one back to its own menu.
const AddItemSheet = ({ open, onClose, libraryId, collection, onBack }) => {
  const navigate = useNavigate();
  const query = collection ? `?collectionId=${encodeURIComponent(collection.id)}` : '';

  return (
    <Sheet open={open} onClose={onClose} title="Add to this library">
      <div className="flex flex-col gap-2">
        <PlateButton onClick={() => navigate(`/libraries/${libraryId}/add/book${query}`)}>
          Book
        </PlateButton>
        <PlateButton onClick={() => navigate(`/libraries/${libraryId}/add/video${query}`)}>
          Film
        </PlateButton>
        {/* Absent, not disabled, when opened from a board (DESIGN.md §6's read-only rule
            applied to a single option rather than a whole screen): filing into `collection` IS
            this sheet's premise here, and "New collection" means abandoning that to go make an
            unrelated one. */}
        {!collection && (
          <PlateButton
            variant="secondary"
            onClick={() => navigate(`/libraries/${libraryId}/collections/new`)}
          >
            New collection
          </PlateButton>
        )}
        {onBack && (
          <PlateButton variant="secondary" onClick={onBack}>
            Back
          </PlateButton>
        )}
      </div>
    </Sheet>
  );
};

export default AddItemSheet;
