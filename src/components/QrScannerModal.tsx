import React, { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, AlertCircle } from 'lucide-react';

interface QrScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the decoded QR text (the raw receipt hash). */
  onDecode: (text: string) => void;
}

/**
 * Camera/photo QR reader for the creator's Results page. Decoding happens
 * entirely in the browser via @zxing/browser — the decoded text is handed back
 * through onDecode and matched locally against the owner's already-loaded
 * records. No data leaves the page; no network call is made here.
 */
export const QrScannerModal = ({ open, onOpenChange, onDecode }: QrScannerModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const stopStream = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  };

  // Start the live camera stream while the dialog is open; tear it down on
  // close/unmount so the camera light doesn't stay on.
  useEffect(() => {
    if (!open) {
      stopStream();
      setError(null);
      setScanning(false);
      return;
    }

    let cancelled = false;
    setError(null);
    setScanning(true);

    const reader = new BrowserQRCodeReader();
    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current!,
        (result, _err, controls) => {
          if (cancelled) {
            controls.stop();
            return;
          }
          controlsRef.current = controls;
          if (result) {
            controls.stop();
            controlsRef.current = null;
            onDecode(result.getText());
          }
        }
      )
      .catch((err) => {
        console.error('[QrScannerModal] camera unavailable:', err);
        if (cancelled) return;
        setScanning(false);
        setError(
          'Camera unavailable or permission denied. Use “Upload / take photo” instead. (Live camera needs HTTPS.)'
        );
      });

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const url = URL.createObjectURL(file);
    try {
      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeFromImageUrl(url);
      onDecode(result.getText());
    } catch (err) {
      console.error('[QrScannerModal] no QR in image:', err);
      setError('No QR code found in that image. Try a clearer photo.');
    } finally {
      URL.revokeObjectURL(url);
      e.target.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-white">
            <Camera className="h-5 w-5 mr-2 text-green-400" />
            Scan a receipt QR
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Point the camera at an attendee's receipt QR code, or upload a photo of it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
              autoPlay
            />
            {!scanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                Starting camera…
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start space-x-2 rounded-lg border border-yellow-800 bg-yellow-900/20 p-3 text-sm text-yellow-300">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload / take photo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
