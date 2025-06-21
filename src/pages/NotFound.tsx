
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-4">404</h1>
          <p className="text-xl text-gray-400 mb-4">Page not found</p>
          <p className="text-gray-500 mb-6">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <a 
            href="/" 
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Return to Home
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
