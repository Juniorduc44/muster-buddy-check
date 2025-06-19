
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MusterSheet {
  id: string;
  title: string;
  description: string;
}

export const QRCodePage = () => {
  const { sheetId } = useParams();
  const { toast } = useToast();
  const [sheet, setSheet] = useState<MusterSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const attendanceUrl = `${window.location.origin}/attend/${sheetId}`;

  useEffect(() => {
    fetchSheet();
    generateQRCode();
  }, [sheetId]);

  const fetchSheet = async () => {
    if (!sheetId) return;
    
    try {
      const { data, error } = await supabase
        .from('muster_sheets' as any)
        .select('id, title, description')
        .eq('id', sheetId)
        .single();

      if (error) {
        console.error('Error fetching sheet:', error);
      } else {
        setSheet(data);
      }
    } catch (error) {
      console.error('Error in fetchSheet:', error);
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
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
