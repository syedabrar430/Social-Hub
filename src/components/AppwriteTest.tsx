import React, { useState, useEffect } from 'react';
import { account } from '@/config/appwrite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AppwriteTest = () => {
  const [status, setStatus] = useState('Testing connection...');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // Try to get account info (will fail if not logged in, but connection works)
      await account.get();
      setStatus('✅ Connected to Appwrite & User is logged in');
      setIsConnected(true);
    } catch (error: any) {
      if (error.code === 401) {
        // User not logged in, but connection works
        setStatus('✅ Connected to Appwrite (Not logged in)');
        setIsConnected(true);
      } else {
        setStatus(`❌ Connection failed: ${error.message}`);
        setIsConnected(false);
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Appwrite Status 
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{status}</p>
      </CardContent>
    </Card>
  );
};

export default AppwriteTest;