// Edited by Claude.
// Add book page - 3 ways to add: camera scan, manual ISBN, or full manual entry
import { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import { Camera, Search, PenLine, VideoOff } from 'lucide-react';
import { useNavigation } from '@/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// ISBN-10: 10 chars, digits 0-9, last char can be 'X' (value 10)
const isValidIsbn10 = (value) => {
  if (value.length !== 10) return false;
  return /^[0-9]{9}[0-9X]$/i.test(value);
};

// ISBN-13: 13 digits only
const isValidIsbn13 = (value) => {
  if (value.length !== 13) return false;
  return /^[0-9]{13}$/.test(value);
};

// Validate ISBN format (10 or 13)
const isValidIsbn = (value) => {
  const cleaned = value.replace(/[-\s]/g, '').toUpperCase();
  return isValidIsbn10(cleaned) || isValidIsbn13(cleaned);
};

// Clean ISBN: remove dashes/spaces
const cleanIsbn = (value) => value.replace(/[-\s]/g, '').toUpperCase();

const AddBook = () => {
  const { setOptions, params, navigate } = useNavigation();
  const library = params?.library;

  const [isbn, setIsbn] = useState('');
  const [isbnError, setIsbnError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scanner state
  const [scannerStatus, setScannerStatus] = useState('initializing'); // initializing, scanning, error, permission-denied
  const [scannerError, setScannerError] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false); // Flash on successful scan
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const lastDetectedRef = useRef(null); // Prevent duplicate detection
  const cooldownRef = useRef(false); // Prevent re-detection after returning from results

  useEffect(() => {
    setOptions({
      title: 'Add Book',
      headerRight: null,
    });
  }, [setOptions]);

  // Stop camera and release all media tracks
  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    // Also stop all tracks on the video element directly
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Navigate to detection results with ISBN
  const handleIsbnDetected = useCallback((detectedIsbn, fromScanner = false) => {
    // Prevent duplicate/rapid detections from scanner
    if (fromScanner) {
      if (cooldownRef.current || lastDetectedRef.current === detectedIsbn) {
        return;
      }
      lastDetectedRef.current = detectedIsbn;
      // Show success flash then navigate
      setScanSuccess(true);
      setTimeout(() => {
        stopCamera();
        navigate('bookDetectionResults', { push: true, params: { library, isbn: detectedIsbn } });
      }, 500);
      return;
    }

    stopCamera();
    navigate('bookDetectionResults', { push: true, params: { library, isbn: detectedIsbn } });
  }, [navigate, library, stopCamera]);

  // Ref to hold latest handleIsbnDetected to avoid useEffect dependency
  const handleIsbnDetectedRef = useRef(handleIsbnDetected);
  useEffect(() => {
    handleIsbnDetectedRef.current = handleIsbnDetected;
  }, [handleIsbnDetected]);

  // Set cooldown on mount to prevent immediate re-detection when returning
  useEffect(() => {
    cooldownRef.current = true;
    const timer = setTimeout(() => {
      cooldownRef.current = false;
    }, 1500); // 1.5s cooldown after returning to this page
    return () => clearTimeout(timer);
  }, []);

  // Initialize barcode scanner - runs once on mount
  useEffect(() => {
    let mounted = true;

    const initScanner = async () => {
      if (!videoRef.current) return;

      try {
        // Configure reader for EAN barcodes (ISBN)
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
        ]);

        readerRef.current = new BrowserMultiFormatReader(hints);

        // Get available video devices
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!mounted) return;

        if (devices.length === 0) {
          setScannerStatus('error');
          setScannerError('No camera found');
          return;
        }

        // Prefer back camera on mobile
        const backCamera = devices.find((d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear')
        );
        const deviceId = backCamera?.deviceId || devices[0].deviceId;

        // Start continuous scanning
        controlsRef.current = await readerRef.current.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              const scannedCode = result.getText();
              // EAN-13 starting with 978 or 979 is ISBN-13
              if (scannedCode && (scannedCode.startsWith('978') || scannedCode.startsWith('979') || scannedCode.length === 10)) {
                // Use ref to get latest callback
                handleIsbnDetectedRef.current(scannedCode, true);
              }
            }
            // Ignore errors during scanning (normal when no barcode in view)
          }
        );

        if (mounted) {
          setScannerStatus('scanning');
        }
      } catch (err) {
        console.error('Scanner init error:', err);
        if (!mounted) return;

        if (err.name === 'NotAllowedError') {
          setScannerStatus('permission-denied');
          setScannerError('Camera permission denied');
        } else {
          setScannerStatus('error');
          setScannerError(err.message || 'Failed to start camera');
        }
      }
    };

    initScanner();

    // Cleanup on unmount - stop camera and release all tracks
    return () => {
      mounted = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      // Stop all media tracks directly
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []); // Empty deps - run once on mount

  // Handle ISBN input change - clear error on edit
  const handleIsbnChange = (e) => {
    setIsbn(e.target.value);
    if (isbnError) setIsbnError('');
  };

  // Handle manual ISBN submission
  const handleIsbnSubmit = (e) => {
    e.preventDefault();
    const trimmedIsbn = isbn.trim();
    if (!trimmedIsbn || isSubmitting) return;

    // Validate ISBN format
    if (!isValidIsbn(trimmedIsbn)) {
      setIsbnError('Invalid ISBN format (10 or 13 digits)');
      return;
    }

    setIsSubmitting(true);
    handleIsbnDetected(cleanIsbn(trimmedIsbn));
  };

  // Go to full manual entry form
  const handleManualEntry = () => {
    stopCamera();
    navigate('newBook', { push: true, params: { library } });
  };

  // Render scanner area based on status
  const renderScannerArea = () => {
    if (scannerStatus === 'permission-denied') {
      return (
        <div className="h-48 w-full max-w-xs rounded-2xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 p-4">
          <VideoOff className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground text-center">Camera access denied</p>
          <p className="text-xs text-muted-foreground text-center">Please enable camera permissions in your browser settings</p>
        </div>
      );
    }

    if (scannerStatus === 'error') {
      return (
        <div className="h-48 w-full max-w-xs rounded-2xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 p-4">
          <Camera className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground text-center">{scannerError}</p>
        </div>
      );
    }

    return (
      <div className="relative h-48 w-full max-w-xs rounded-2xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        {/* Scanning overlay with target area */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={cn(
            'w-3/4 h-16 border-2 rounded-lg transition-colors',
            scanSuccess ? 'border-green-500 bg-green-500/30' : 'border-white/70'
          )} />
        </div>
        {scannerStatus === 'initializing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <p className="text-sm text-white">Starting camera...</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* 1. Camera scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center gap-3">
        {renderScannerArea()}
        <div className="space-y-1">
          <p className="text-base font-medium">Scan ISBN Barcode</p>
          <p className="text-xs text-muted-foreground">
            Point your camera at the book's barcode
          </p>
        </div>
      </div>

      {/* 2. Manual ISBN input */}
      <div className="px-4 pb-4 space-y-1">
        <form onSubmit={handleIsbnSubmit} className="flex gap-2">
          <Input
            type="text"
            value={isbn}
            onChange={handleIsbnChange}
            placeholder="Enter ISBN (10 or 13 digits)"
            className={cn('flex-1', isbnError && 'border-destructive')}
          />
          <Button
            type="submit"
            disabled={!isbn.trim() || isSubmitting}
            size="icon"
            aria-label="Search ISBN"
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>
        {isbnError && (
          <p className="text-xs text-destructive">{isbnError}</p>
        )}
      </div>

      {/* 3. Manual entry fallback */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleManualEntry}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors"
        >
          <PenLine className="h-4 w-4" />
          <span>Enter all details manually</span>
        </button>
      </div>
    </div>
  );
};

export default AddBook;
