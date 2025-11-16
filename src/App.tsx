import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import IncomingCallBanner from "@/components/chat/IncomingCallBanner";
import { callInvitationManager, type CallInvitation } from "@/services/callInvitations";
import { toast } from "sonner";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Groups from "./pages/Groups";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Global call notification component
const GlobalCallNotifications = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallInvitation | null>(null);

  useEffect(() => {
    if (!user?.email) return;

    console.log('🎧 Starting call invitation listener for:', user.email);
    callInvitationManager.startListening(user.email);

    const unsubscribe = callInvitationManager.onInvitation((invitation) => {
      console.log('📞 INCOMING CALL NOTIFICATION RECEIVED!');
      console.log('📞 Invitation details:', invitation);
      console.log('📞 Setting incoming call state...');
      setIncomingCall(invitation);
      console.log('✅ Incoming call state set!');
      
      // Optional: Play notification sound here
      // new Audio('/notification.mp3').play().catch(console.error);
    });

    return () => {
      console.log('🔇 Stopping call invitation listener');
      unsubscribe();
      callInvitationManager.stopListening();
    };
  }, [user?.email]);

  const handleAcceptCall = (meetingLink: string) => {
    console.log('✅ Accepting call:', meetingLink);
    window.open(meetingLink, '_blank');
    setIncomingCall(null);

    toast.success('Joining call...', {
      description: 'Opening in a new tab',
    });
  };

  const handleDeclineCall = () => {
    console.log('❌ Declining call');
    setIncomingCall(null);

    toast.info('Call declined', {
      description: 'You can still join later from the chat message',
    });
  };

  return (
    <IncomingCallBanner
      invitation={incomingCall}
      onAccept={handleAcceptCall}
      onDecline={handleDeclineCall}
    />
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* Global incoming call banner - shows on all pages */}
        <GlobalCallNotifications />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/feed" element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } />
            <Route path="/groups" element={
              <ProtectedRoute>
                <Groups />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
