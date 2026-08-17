import { useNavigate } from 'react-router-dom';
import Sheet from '@/components/imprint/Sheet.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';

// Adding starts inside the library being viewed, so the destination is never asked. This sheet
// only chooses what kind of thing is arriving.
//
// `collection` is optional: absent for the header "+" (a standalone item), present when this
// sheet is reused from a collection board's Row Actions.
//
// `onBack` is optional too, and for a different reason: the header "+" has no menu to return
// to, so it renders no Back at all. Reached from a board's own menu, closing this sheet with
// only a forward exit is a one-way door — the same defect LendSheet and Share were both
// repaired for — so that caller supplies `onBack` and gets one back to its own menu.
const AddItemSheet = ({ open, onClose, libraryId, collection, onBack }) => {
  const navigate = useNavigate();
  // Book/Film land on AddBook/AddVideo, still stubs (slice D). Their query contract
  // (`?collectionId=`, per ui-v3.md's detection-results ruling) is specified but unbuilt, so
  // this stays as router state until those screens exist to read it — converting it here would
  // be building slice D from this file, not fixing this one.
  const state = collection ? { collection } : undefined;
  // Enter by hand lands on NewBook, which IS built, and its collection travels as a query
  // parameter rather than state — the mechanism ruled for the whole add flow: `location.state`
  // is gone on a cold load (a fresh tab, a deep link, a PWA restart resuming this exact URL),
  // so a reader who explicitly chose a board must not silently resume filing standalone.
  const manualEntryPath = collection
    ? `/libraries/${libraryId}/items/new/book?collectionId=${encodeURIComponent(collection.id)}`
    : `/libraries/${libraryId}/items/new/book`;

  return (
    <Sheet open={open} onClose={onClose} title="Add to this library">
      <div className="flex flex-col gap-2">
        <PlateButton onClick={() => navigate(`/libraries/${libraryId}/add/book`, { state })}>
          Book
        </PlateButton>
        <PlateButton onClick={() => navigate(`/libraries/${libraryId}/add/video`, { state })}>
          Film
        </PlateButton>
        {/* Always reachable, from every entry point, not a fallback after the camera fails —
            so unlike New collection below, this one is never scoped away by `collection`. */}
        <PlateButton variant="secondary" onClick={() => navigate(manualEntryPath)}>
          Enter by hand
        </PlateButton>
        {/* Absent, not disabled, when opened from a board (DESIGN.md §6's read-only rule
            applied to a single option rather than a whole screen): filing into `collection` IS
            this sheet's premise here, and "New collection" means abandoning that to go make an
            unrelated one. Narrowing by entry point is only right when an option contradicts the
            premise, not merely when it looks less likely — Enter by hand looks equally unlikely
            from a board and stays, because a non-camera path must always be in reach. */}
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
