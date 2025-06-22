
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type MusterSheet = Pick<Tables<'mustersheets'>, 'id' | 'title' | 'description'>;

export const QRCodePage = () => {
  const { sheetId } = useParams();
  const { toast } = useToast();
  const [sheet, setSheet] = useState<MusterSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string>('Sheet Not Found');

  const attendanceUrl = `${window.location.origin}/attend/${sheetId}`;

  useEffect(() => {
    // First, fetch the sheet metadata.
    fetchSheet();
  }, [sheetId]);

  // Once the sheet is successfully loaded generate the QR code.
  useEffect(() => {
    if (sheet) {
      generateQRCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  const fetchSheet = async () => {
    if (!sheetId) return;
    
    try {
      // Debug: show exact query params
      console.log('[QRCodePage] fetching sheet', {
        table: 'mustersheets',
        match: { id: sheetId }
      });
      const { data, error } = await supabase
        .from('mustersheets')
        .select('id, title, description, is_active, expires_at')
        // using match ensures exact equality without type confusion
        .match({ id: sheetId })
        .single();

      if (error) {
        console.error('[QRCodePage] Error fetching sheet:', {
          code: error.code,
          message: error.message,
          details: error.details,
        });

        // Permission-related errors need a clearer explanation
        if (
          error.code === 'PGRST301' || // anon permission denied
          error.code === '42501' ||
          error.message.toLowerCase().includes('permission')
        ) {
          setErrorTitle('Access Restricted');
          setError(
            'This sheet is not publicly accessible. ' +
              'Ensure the required RLS policies are applied so anyone can view it.',
          );
        } else {
          setErrorTitle('Sheet Not Found');
          setError(
            'This sheet could not be found or is no longer available.',
          );
        }
      } else if (data) {
        // Additional validation: must be active & not expired
        const expired =
          data.expires_at && new Date(data.expires_at) < new Date();
        if (!data.is_active || expired) {
          setErrorTitle(expired ? 'Event Expired' : 'Event Inactive');
          setError(
            expired
              ? 'This sheet has expired and is no longer accepting responses.'
              : 'This sheet is currently inactive.',
          );
        } else {
          setSheet(data);
        }
      }
    } catch (error) {
      console.error('Error in fetchSheet:', error);
      setErrorTitle('Network Error');
      setError(
        'Failed to reach the server. Please check your connection and try again.',
      );
    }
    setLoading(false);
  };

  const generateQRCode = () => {
    // Using QR Server API for QR code generation
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(attendanceUrl)}`;
    setQrCodeUrl(qrUrl);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(attendanceUrl);
      toast({
        title: "Link copied!",
        description: "Attendance link has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${sheet?.title || 'attendance'}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-4">{errorTitle}</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <p className="text-sm text-gray-500">
              Tip: If you are the owner, run&nbsp;
              <code className="bg-gray-700 px-1 rounded">npm run apply-rls</code>&nbsp;
              (or execute the SQL) to make the sheet public.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white mb-2">
              QR Code for {sheet?.title || 'Attendance Sheet'}
            </CardTitle>
            {sheet?.description && (
              <p className="text-gray-400">{sheet.description}</p>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg">
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code for attendance" 
                    className="w-64 h-64"
                  />
                ) : (
                  <div className="w-64 h-64 bg-gray-200 flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-gray-300">
                Scan this QR code to access the attendance page
              </p>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Direct Link:</p>
                <p className="text-green-400 font-mono text-sm break-all">
                  {attendanceUrl}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                
                <Button
                  onClick={handleDownloadQR}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
                
                <Button
                  onClick={() => window.open(attendanceUrl, '_blank')}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test Page
                </Button>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">How to use:</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Print this QR code and display it at your event</li>
                <li>• Attendees can scan with their phone camera</li>
                <li>• They'll be taken directly to the attendance form</li>
                <li>• All responses are recorded in real-time</li>
                <li className="pt-2 text-yellow-300">
                  Note: The sheet must have public access enabled. If scanning shows
                  “Sheet Not Found”, apply the RLS policies
                  (<code className="bg-gray-600 px-1 rounded">npm run apply-rls</code>).
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
