import React, { useState, useEffect } from 'react';
import { account } from '@/config/appwrite';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

const AppwriteGoogleDebug = () => {
  const [appwriteStatus, setAppwriteStatus] = useState('Testing...');
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    testAppwriteConnection();
  }, []);

  const testAppwriteConnection = async () => {
    try {
      const user = await account.get();
      setAppwriteStatus('✅ Connected & Logged In');
      setCurrentUser(user);
      setIsConnected(true);
    } catch (error: any) {
      if (error.code === 401) {
        setAppwriteStatus('✅ Connected (Not logged in)');
        setIsConnected(true);
      } else {
        setAppwriteStatus(`❌ Connection failed: ${error.message}`);
        setIsConnected(false);
      }
    }
  };

  const testGoogleOAuth = async () => {
    try {
      console.log('🔍 Testing Google OAuth...');
      console.log('Current origin:', window.location.origin);
      
      // Direct call to createOAuth2Session
      (account as any).createOAuth2Session(
        "google",
        "http://localhost:8080", // success redirect
        "http://localhost:8080"  // failure redirect
      );
      
      toast({
        title: "Google OAuth Initiated",
        description: "If this doesn't redirect, check console for errors",
      });
    } catch (error: any) {
      console.error('❌ Google OAuth Error:', error);
      toast({
        title: "Google OAuth Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setCurrentUser(null);
      await testAppwriteConnection();
      toast({
        title: "Logged out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Appwrite + Google OAuth Debug
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Appwrite Status */}
        <div className="p-3 border rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            {isConnected ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
            Appwrite Connection
          </h3>
          <p className="text-sm text-muted-foreground mb-2">{appwriteStatus}</p>
          {currentUser && (
            <div className="text-xs bg-muted p-2 rounded">
              <strong>User:</strong> {currentUser.email} (ID: {currentUser.$id})
            </div>
          )}
        </div>

        {/* Current Configuration */}
        <div className="p-3 border rounded-lg">
          <h3 className="font-semibold mb-2">Current Configuration</h3>
          <div className="space-y-1 text-sm">
            <p><strong>Frontend URL:</strong> {window.location.origin}</p>
            <p><strong>Appwrite Endpoint:</strong> http://localhost/v1</p>
            <p><strong>Project ID:</strong> social-hub</p>
          </div>
        </div>

        {/* Required Appwrite Console Setup */}
        <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
          <h3 className="font-semibold mb-2 text-blue-700 dark:text-blue-300">Required Appwrite Console Setup</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside text-blue-600 dark:text-blue-400">
            <li>Go to <code>http://localhost/console</code></li>
            <li>Navigate to <strong>Auth → Settings → OAuth2 Providers</strong></li>
            <li>Enable <strong>Google</strong> provider</li>
            <li>Add your Google OAuth <strong>Client ID</strong> and <strong>Client Secret</strong></li>
            <li>Save the configuration</li>
          </ol>
        </div>

        {/* Required Google Console Setup */}
        <div className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
          <h3 className="font-semibold mb-2 text-orange-700 dark:text-orange-300">Required Google Console Setup</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside text-orange-600 dark:text-orange-400">
            <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="h-3 w-3" /></a></li>
            <li>Create/Edit OAuth 2.0 Client ID</li>
            <li>Add <strong>Authorized JavaScript origins:</strong> <code>http://localhost:8080</code></li>
            <li>Add <strong>Authorized redirect URIs:</strong> <code>http://localhost/v1/account/sessions/oauth2/callback/google/social-hub</code></li>
          </ol>
        </div>

        {/* Test Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={testGoogleOAuth}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Test Google OAuth
          </Button>
          <Button 
            onClick={testAppwriteConnection}
            variant="outline"
          >
            Refresh Status
          </Button>
          {currentUser && (
            <Button 
              onClick={logout}
              variant="outline"
            >
              Logout
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Check browser console (F12) for detailed error messages
        </p>
      </CardContent>
    </Card>
  );
};

export default AppwriteGoogleDebug;