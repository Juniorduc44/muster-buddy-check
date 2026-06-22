import React, { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
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
 * Minimal BarcodeDetector typing — the Web API isn't in TS's DOM lib yet.
 * It's a standard, sandboxed browser API backed by the platform's native
 * barcode engine (available in Chromium-based browsers, incl. Brave/Vanadium
 * on Android). Decoding runs entirely on-device; nothing is sent anywhere.
 */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource | ImageBitmap | Blob) => Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

const getNativeDetector = (): BarcodeDetectorLike | null => {
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ['qr_code'] });
  } catch {
    return null;
  }
};

/**
 * Camera/photo QR reader for the creator's Results page. Prefers the native
 * BarcodeDetector API (reliable + hardware-accelerated on mobile) and falls
 * back to @zxing/browser where it's unavailable. The camera stream is managed
 * here directly with an explicit play() so the preview never renders black,
 * and is fully torn down on close/unmount. The decoded text is handed back via
 * onDecode and matched locally against the owner's records — no network call.
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
    let stream: MediaStream | null = null;
    let rafId = 0;
    let zxingControls: { stop: () => void } | null = null;

    const stopAll = () => {
      cancelAnimationFrame(rafId);
      zxingControls?.stop();
      zxingControls = null;
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    };

    const hit = (text: string) => {
      if (cancelled) return;
      cancelled = true;
      stopAll();
      onDecode(text);
    };

    const start = async () => {
      setError(null);
      setScanning(false);
      try {
        // Manage the stream ourselves so the preview always paints.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stopAll();
          return;
        }
        const video = videoRef.current;
        if (!video) {
          stopAll();
          return;
        }
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play().catch(() => undefined);
        setScanning(true);

        const detector = getNativeDetector();
        if (detector) {
          // Native path: poll frames via requestAnimationFrame.
          const tick = async () => {
            if (cancelled) return;
            if (video.readyState >= 2) {
              try {
                const codes = await detector.detect(video);
                if (codes.length > 0) {
                  hit(codes[0].rawValue);
                  return;
                }
              } catch {
                /* transient decode error — keep polling */
              }
            }
            rafId = requestAnimationFrame(tick);
          };
          rafId = requestAnimationFrame(tick);
        } else {
          // Fallback: let zxing decode from the element we're already playing.
          const reader = new BrowserQRCodeReader();
          zxingControls = await reader.decodeFromVideoElement(video, (result, _err, controls) => {
            if (cancelled) {
              controls.stop();
              return;
            }
            if (result) hit(result.getText());
          });
        }
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
      stopAll();
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
      // Native path first — handles large phone photos and EXIF rotation well.
      const detector = getNativeDetector();
      if (detector) {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        try {
          const codes = await detector.detect(bitmap);
          if (codes.length > 0) {
            onDecode(codes[0].rawValue);
            return;
          }
        } finally {
          bitmap.close();
        }
      }

      // Fallback: zxing on the raw image.
      const url = URL.createObjectURL(file);
      try {
        const reader = new BrowserQRCodeReader();
        const result = await reader.decodeFromImageUrl(url);
        onDecode(result.getText());
        return;
      } finally {
        URL.revokeObjectURL(url);
      }
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
            {scanning && (
              <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-green-400/70" />
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
