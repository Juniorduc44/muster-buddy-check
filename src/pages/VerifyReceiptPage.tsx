import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  CheckCircle,
  XCircle,
  Search,
  QrCode,
  User,
  Calendar,
  Clock,
  Copy
} from 'lucide-react';
import { isValidHashFormat, formatHashForDisplay } from '@/lib/hash-utils';

type VerificationResult = {
  isValid: boolean;
  sheetTitle?: string;
  checkedInAt?: string;
  attendeeNameMasked?: string;
  error?: string;
};

export const VerifyReceiptPage = () => {
  const { toast } = useToast();
  const [receiptHash, setReceiptHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const displayHash = receiptHash.replace(/\s/g, '');

  const handleVerify = async () => {
    if (!receiptHash.trim()) {
      toast({
        title: "No Receipt Code",
        description: "Please enter a receipt code to verify",
        variant: "destructive",
      });
      return;
    }

    // Clean the hash (remove spaces)
    const cleanHash = receiptHash.replace(/\s/g, '');
    
    if (!isValidHashFormat(cleanHash)) {
      toast({
        title: "Invalid Format",
        description: "Please enter a valid receipt code",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    setVerificationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke<VerificationResult>('verify-receipt', {
        body: { receiptHash: cleanHash }
      });

      if (error) {
        setVerificationResult({
          isValid: false,
          error: error.message || 'Receipt verification failed'
        });
        return;
      }

      if (!data) {
        setVerificationResult({
          isValid: false,
          error: 'Verification returned no result'
        });
        return;
      }

      setVerificationResult(data);

    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        isValid: false,
        error: 'An error occurred during verification'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleQRScan = () => {
    // TODO: Implement QR code scanning
    toast({
      title: "QR Scanning",
      description: "QR code scanning will be implemented soon",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
    };
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center border-b border-gray-700">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Verify Attendance Receipt
            </CardTitle>
            <p className="text-gray-400">
              Enter a receipt code or scan a QR code to verify attendance
            </p>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receipt" className="text-white">
                  Receipt Code
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id="receipt"
                    type="text"
                    placeholder="Enter receipt code..."
                    value={receiptHash}
                    onChange={(e) => setReceiptHash(e.target.value)}
                    className="flex-1 bg-gray-700 border-gray-600 text-white"
                  />
                  <Button
                    onClick={handleQRScan}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Button
                onClick={handleVerify}
                disabled={verifying || !receiptHash.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {verifying ? (
                  <>
                    <Search className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Verify Receipt
                  </>
                )}
              </Button>
            </div>

            {/* Verification Result */}
            {verificationResult && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                {verificationResult.isValid ? (
                  <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                      <h3 className="text-lg font-semibold text-green-400">Valid Receipt</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-white font-medium">
                          {verificationResult.attendeeNameMasked || 'Verified attendee'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">
                          {verificationResult.sheetTitle || 'Verified event'}
                        </span>
                      </div>
                      
                      {verificationResult.checkedInAt && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">
                            Checked in: {formatDateTime(verificationResult.checkedInAt).date} at {formatDateTime(verificationResult.checkedInAt).time}
                          </span>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-green-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Receipt Code:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                // Try modern clipboard API first
                                if (navigator.clipboard && window.isSecureContext) {
                                  await navigator.clipboard.writeText(displayHash);
                                  toast({
                                    title: "Receipt Copied!",
                                    description: "Receipt code copied to clipboard",
                                  });
                                } else {
                                  // Fallback for older browsers or non-secure contexts
                                  const textArea = document.createElement('textarea');
                                  textArea.value = displayHash;
                                  textArea.style.position = 'fixed';
                                  textArea.style.left = '-999999px';
                                  textArea.style.top = '-999999px';
                                  document.body.appendChild(textArea);
                                  textArea.focus();
                                  textArea.select();
                                  
                                  const successful = document.execCommand('copy');
                                  document.body.removeChild(textArea);
                                  
                                  if (successful) {
                                    toast({
                                      title: "Receipt Copied!",
                                      description: "Receipt code copied to clipboard",
                                    });
                                  } else {
                                    throw new Error('execCommand copy failed');
                                  }
                                }
                              } catch (error) {
                                console.error('Failed to copy to clipboard:', error);
                                toast({
                                  title: "Copy Failed",
                                  description: "Failed to copy receipt to clipboard. Please copy manually.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="h-6 text-green-400 hover:text-green-300"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <p className="text-xs font-mono text-green-400 mt-1">
                          {formatHashForDisplay(displayHash)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <XCircle className="h-5 w-5 text-red-400 mr-2" />
                      <h3 className="text-lg font-semibold text-red-400">Invalid Receipt</h3>
                    </div>
                    <p className="text-gray-300">
                      {verificationResult.error || 'This receipt could not be verified.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 
