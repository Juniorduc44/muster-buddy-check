import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
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
 * Camera/photo QR reader for the creator's Results page, built on
 * nimiq/qr-scanner (MIT). It decodes entirely on-device in a WebWorker — no
 * network, no third party, nothing leaves the browser. The decoded text is
 * handed back via onDecode and matched locally against the owner's records.
 *
 * qr-scanner manages the camera stream, scan region and worker lifecycle for
 * us, and its jsQR-based engine attempts both normal and inverted codes, which
 * is far more robust than the previous hand-rolled BarcodeDetector loop.
 */
export const QrScannerModal = ({ open, onOpenChange, onDecode }: QrScannerModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [decoding, setDecoding] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let scanner: QrScanner | null = null;

    const hit = (text: string) => {
      if (cancelled) return;
      cancelled = true;
      onDecode(text);
    };

    const start = async () => {
      setError(null);
      setScanning(false);
      const video = videoRef.current;
      if (!video) return;

      try {
        scanner = new QrScanner(
          video,
          (result) => hit(result.data),
          {
            preferredCamera: 'environment',
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 5,
            returnDetailedScanResult: true,
          },
        );
        await scanner.start();
        if (cancelled) {
          scanner.destroy();
          scanner = null;
          return;
        }
        setScanning(true);
      } catch (err) {
        console.error('[QrScannerModal] camera unavailable:', err);
        if (cancelled) return;
        setScanning(false);
        setError(
          'Camera unavailable or permission denied. Use “Upload / take photo” instead. (Live camera needs HTTPS — localhost and the deployed site qualify.)'
        );
      }
    };

    start();

    return () => {
      cancelled = true;
      scanner?.destroy();
      scanner = null;
      setScanning(false);
      setError(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setDecoding(true);

    try {
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
        // Try the full image too, not just the centre region — phone photos
        // often have the QR off-centre or surrounded by the receipt card.
        alsoTryWithoutScanRegion: true,
      });
      onDecode(result.data);
    } catch (err) {
      console.error('[QrScannerModal] no QR in image:', err);
      setError(
        'No QR code found in that image. Make sure the QR fills most of the frame and is in focus, then try again.'
      );
    } finally {
      setDecoding(false);
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
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            disabled={decoding}
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            {decoding ? 'Reading image…' : 'Upload / take photo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
