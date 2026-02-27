// Edited by Claude.
// Action sheet for choosing item type when adding to library
import { BookOpen, Film, FolderPlus } from 'lucide-react';
import BottomSheet from './BottomSheet';

const AddItemSheet = ({ isOpen, onClose, onSelectBook, onSelectVideo, onSelectCollection }) => {
  const handleBook = () => {
    onClose();
    onSelectBook?.();
  };

  const handleVideo = () => {
    onClose();
    onSelectVideo?.();
  };

  const handleCollection = () => {
    onClose();
    onSelectCollection?.();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Add Item">
      <div className="space-y-2">
        <button
          onClick={handleBook}
          className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Book</p>
            <p className="text-sm text-muted-foreground">Scan ISBN or enter manually</p>
          </div>
        </button>

        <button
          onClick={handleVideo}
          className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Film className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Video</p>
            <p className="text-sm text-muted-foreground">DVD, Blu-ray, or digital</p>
          </div>
        </button>

        <button
          onClick={handleCollection}
          className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <FolderPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Collection</p>
            <p className="text-sm text-muted-foreground">Group related items together</p>
          </div>
        </button>
      </div>
    </BottomSheet>
  );
};

export default AddItemSheet;
