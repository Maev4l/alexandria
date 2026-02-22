// Edited by Claude.
// Add video page - capture cover for OCR or search by title
// Uses react-webcam for reliable camera lifecycle management
import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Camera, Search, VideoOff, Loader2 } from 'lucide-react';
import { AppBar } from '@/navigation';
import { detectionApi } from '@/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';

const videoConstraints = {
  facingMode: 'environment',
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

const AddVideo = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const webcamRef = useRef(null);
  const prefilledCollection = location.state?.collection || null;
  const prefilledOrder = location.state?.order || '';

  const [title, setTitle] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Handle camera ready
  const handleUserMedia = useCallback(() => {
    setCameraReady(true);
    setCameraError(null);
  }, []);

  // Handle camera error
  const handleUserMediaError = useCallback((error) => {
    console.error('Camera error:', error);
    if (error.name === 'NotAllowedError') {
      setCameraError('Camera permission denied');
    } else {
      setCameraError(error.message || 'Failed to start camera');
    }
  }, []);

  // Capture frame and send for OCR
  const handleCapture = useCallback(async () => {
    if (!webcamRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      // Get screenshot as base64
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        toast.error('Failed to capture image');
        setIsCapturing(false);
        return;
      }

      // Extract base64 data (remove data:image/jpeg;base64, prefix)
      const imageBase64 = imageSrc.split(',')[1];

      // Send to backend for OCR + TMDB search
      const result = await detectionApi.detectVideoByImage(imageBase64);

      if (result.detectedVideos?.length > 0) {
        navigate(`/libraries/${libraryId}/video-results`, {
          state: {
            videos: result.detectedVideos,
            extractedTitle: result.extractedTitle,
            collection: prefilledCollection,
            order: prefilledOrder,
          },
        });
      } else {
        toast.error(
          result.extractedTitle
            ? `No videos found for "${result.extractedTitle}"`
            : 'Could not extract title from cover'
        );
        setIsCapturing(false);
      }
    } catch (err) {
      console.error('OCR detection error:', err);
      toast.error(err.message || 'Failed to detect video');
      setIsCapturing(false);
    }
  }, [navigate, libraryId, toast, isCapturing]);

  // Handle manual title search
  const handleTitleSearch = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSearching) return;

    setIsSearching(true);

    try {
      const result = await detectionApi.detectVideoByTitle(trimmedTitle);

      if (result.detectedVideos?.length > 0) {
        navigate(`/libraries/${libraryId}/video-results`, {
          state: {
            videos: result.detectedVideos,
            searchTitle: trimmedTitle,
            collection: prefilledCollection,
            order: prefilledOrder,
          },
        });
      } else {
        toast.error(`No videos found for "${trimmedTitle}"`);
        setIsSearching(false);
      }
    } catch (err) {
      console.error('Title search error:', err);
      toast.error(err.message || 'Failed to search');
      setIsSearching(false);
    }
  };

  // Render camera area
  const renderCameraArea = () => {
    if (cameraError) {
      return (
        <div className="h-48 w-full max-w-xs rounded-2xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 p-4">
          <VideoOff className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground text-center">{cameraError}</p>
          {cameraError === 'Camera permission denied' && (
            <p className="text-xs text-muted-foreground text-center">
              Please enable camera permissions in your browser settings
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="relative h-48 w-full max-w-xs rounded-2xl overflow-hidden bg-black">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.8}
          videoConstraints={videoConstraints}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Target area overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={cn(
              'w-3/4 h-32 border-2 rounded-lg transition-colors',
              isCapturing ? 'border-green-500 bg-green-500/30' : 'border-white/70'
            )}
          />
        </div>

        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <p className="text-sm text-white">Starting camera...</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <AppBar title="Add Video" />
      {/* 1. Camera capture area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center gap-3">
        {renderCameraArea()}
        <div className="space-y-2">
          <p className="text-base font-medium">Scan Video Cover</p>
          <Button
            onClick={handleCapture}
            disabled={!cameraReady || isCapturing || !!cameraError}
            className="gap-2"
          >
            {isCapturing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Capture
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Manual title search */}
      <div className="px-4 pb-4 space-y-1">
        <form onSubmit={handleTitleSearch} className="flex gap-2">
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Or search by title"
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!title.trim() || isSearching}
            size="icon"
            aria-label="Search title"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddVideo;
