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

/** Camera/photo QR reader. Decoding stays on-device via qr-scanner. */
export const QrScannerModal = ({ open, onOpenChange, onDecode }: QrScannerModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  useEffect(() => {
    if (!open || !cameraEnabled) return;

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

      // The <video> lives inside the Radix Dialog portal — wait for it to mount.
      let video = videoRef.current;
      let waited = 0;
      while (!video && waited < 30) {
        await new Promise((r) => requestAnimationFrame(r));
        if (cancelled) return;
        video = videoRef.current;
        waited++;
      }
      if (!video) {
        setError('Could not initialise the camera preview. Use “Upload receipt image” instead.');
        return;
      }

      // Watchdog: insecure-origin / never-answered-permission hangs never settle.
      startTimeout = setTimeout(() => {
        if (cancelled) return;
        setError(
          'The camera did not start. This usually means the page is not on HTTPS ' +
            '(a http:// LAN address like 192.168.x.x blocks the camera), or permission ' +
            'was not granted. You can still use “Upload receipt image”.'
        );
      }, 12000);

      try {
        scanner = new QrScanner(video, (result) => hit(result.data), {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          returnDetailedScanResult: true,
          onDecodeError: () => {
            /* per-frame "no QR" is normal — ignore */
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
      } catch (err) {
        clearTimeout(startTimeout);
        const e = err as { name?: string; message?: string };
        if (cancelled) return;
        setScanning(false);
        setError(
          e?.name === 'NotAllowedError'
            ? 'Camera permission was blocked. Allow camera access for this site, or upload a receipt image.'
            : e?.name === 'NotFoundError'
            ? 'No camera was found on this device. Upload a receipt image instead.'
            : `Camera unavailable (${e?.name || 'error'}). Upload a receipt image instead.`
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
  }, [open, cameraEnabled]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setCameraEnabled(false);
    onOpenChange(nextOpen);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setDecoding(true);

    try {
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
        alsoTryWithoutScanRegion: true,
      });
      onDecode(result.data);
    } catch {
      setError(
        'No QR code found in that image. Make sure the QR fills most of the frame and is in focus, then try again.'
      );
    } finally {
      setDecoding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-white">
            <Camera className="h-5 w-5 mr-2 text-green-400" />
            Scan a receipt QR
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Upload an image of the receipt QR, or use this device's camera.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {cameraEnabled && (
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
          )}

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
            {decoding ? 'Reading image…' : 'Upload receipt image'}
          </Button>

          {!cameraEnabled && (
            <Button
              type="button"
              onClick={() => {
                setError(null);
                setCameraEnabled(true);
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Camera className="h-4 w-4 mr-2" />
              Use camera
            </Button>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};
