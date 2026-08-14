import { useNavigate } from 'react-router-dom';
import Sheet from '@/components/imprint/Sheet.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';

// Adding starts inside the library being viewed, so the destination is never asked. This sheet
// only chooses what kind of thing is arriving.
const AddItemSheet = ({ open, onClose, libraryId }) => {
  const navigate = useNavigate();

  return (
    <Sheet open={open} onClose={onClose} title="Add to this library">
      <div className="flex flex-col gap-2">
        <PlateButton onClick={() => navigate(`/libraries/${libraryId}/add/book`)}>Book</PlateButton>
        <PlateButton onClick={() => navigate(`/libraries/${libraryId}/add/video`)}>Film</PlateButton>
        {/* Always reachable, not a fallback after the camera fails. */}
        <PlateButton
          variant="secondary"
          onClick={() => navigate(`/libraries/${libraryId}/items/new/book`)}
        >
          Enter by hand
        </PlateButton>
        <PlateButton
          variant="secondary"
          onClick={() => navigate(`/libraries/${libraryId}/collections/new`)}
        >
          New collection
        </PlateButton>
      </div>
    </Sheet>
  );
};

export default AddItemSheet;
