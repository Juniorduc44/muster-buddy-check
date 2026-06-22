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
 * Live camera (getUserMedia) only works in a secure context: HTTPS or
 * http://localhost. A phone hitting the dev server over a LAN IP
 * (http://192.168.x.x:8080) is NOT secure, so the browser silently refuses the
 * camera — hence we always surface a clear reason and the photo-upload path
 * (which has no such restriction) stays available as a reliable fallback.
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
    let startTimeout: ReturnType<typeof setTimeout> | undefined;

    const hit = (text: string) => {
      if (cancelled) return;
      cancelled = true;
      onDecode(text);
    };

    const start = async () => {
      setError(null);
      setScanning(false);

      // The <video> lives inside the Radix Dialog portal — wait a few frames
      // for it to mount rather than silently bailing if the ref isn't set yet.
      let video = videoRef.current;
      for (let i = 0; !video && i < 30; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        if (cancelled) return;
        video = videoRef.current;
      }
      if (!video) {
        setError('Could not initialise the camera preview. Use “Upload / take photo” instead.');
        return;
      }

      // Insecure-origin / no-permission hangs never resolve or reject, so the
      // UI would otherwise sit on "Starting camera…" forever. Surface a reason.
      startTimeout = setTimeout(() => {
        if (cancelled) return;
        setError(
          'The camera did not start. This usually means the page is not on HTTPS ' +
            '(a http:// LAN address like 192.168.x.x blocks the camera), or permission ' +
            'was not granted. You can still use “Upload / take photo”.'
        );
      }, 8000);

      try {
        if (!(await QrScanner.hasCamera())) {
          clearTimeout(startTimeout);
          if (cancelled) return;
          setError('No camera detected on this device. Use “Upload / take photo” instead.');
          return;
        }

        scanner = new QrScanner(video, (result) => hit(result.data), {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          returnDetailedScanResult: true,
          onDecodeError: () => {
            /* per-frame "no QR in this frame" is normal — ignore */
          },
        });
        await scanner.start();
        clearTimeout(startTimeout);
        if (cancelled) {
          scanner.destroy();
          scanner = null;
          return;
        }
        setScanning(true);
        console.log('[QrScannerModal] camera started');
      } catch (err) {
        clearTimeout(startTimeout);
        console.error('[QrScannerModal] camera failed to start:', err);
        if (cancelled) return;
        setScanning(false);
        const name = (err as { name?: string })?.name;
        setError(
          name === 'NotAllowedError'
            ? 'Camera permission was blocked. Allow camera access for this site, or use “Upload / take photo”.'
            : name === 'NotFoundError'
            ? 'No camera was found on this device. Use “Upload / take photo” instead.'
            : 'Camera unavailable — this usually means the page is not served over HTTPS. ' +
              'Use “Upload / take photo” instead.'
        );
      }
    };

    start();

    return () => {
      cancelled = true;
      clearTimeout(startTimeout);
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
