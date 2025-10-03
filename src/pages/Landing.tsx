import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Users, MessageCircle, Heart, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { useAuth } from '@/contexts/AuthContext';

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to feed if user is already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/feed', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render landing page if user is authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  const features = [
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: 'Connect with Friends',
      description: 'Build meaningful connections and stay in touch with people who matter to you.',
    },
    {
      icon: <MessageCircle className="h-8 w-8 text-secondary" />,
      title: 'Real-time Messaging',
      description: 'Chat instantly with your friends and communities with our seamless messaging.',
    },
    {
      icon: <Heart className="h-8 w-8 text-accent" />,
      title: 'Share Moments',
      description: 'Share your thoughts, photos, and experiences with your network.',
    },
    {
      icon: <Zap className="h-8 w-8 text-warning" />,
      title: 'Stay Updated',
      description: 'Get real-time notifications about what matters most to you.',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-hero min-h-screen flex items-center">
        <div className="container mx-auto px-4">
          <div className="text-center animate-fade-in">
            {/* Logo */}
            <div className="gradient-primary rounded-2xl p-6 w-24 h-24 mx-auto mb-8 flex items-center justify-center shadow-glow">
              <span className="text-3xl font-bold text-white">SH</span>
            </div>

            {/* Hero Content */}
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                SocialHub
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Connect, share, and discover in a beautiful social environment designed for meaningful interactions.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                asChild 
                size="lg" 
                className="text-lg px-8 py-6 transition-spring hover:scale-105 shadow-soft"
              >
                <Link to="/signup">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                asChild 
                size="lg"
                className="text-lg px-8 py-6 transition-smooth hover:bg-accent/10"
              >
                <Link to="/login">
                  Sign In
                </Link>
              </Button>
            </div>

            {/* Preview Cards */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto animate-slide-up">
              <Card className="shadow-card hover:shadow-soft transition-smooth">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Instant Messaging</h3>
                  <p className="text-sm text-muted-foreground">
                    Chat with friends in real-time with beautiful message bubbles
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card hover:shadow-soft transition-smooth">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                    <Heart className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2">Social Feed</h3>
                  <p className="text-sm text-muted-foreground">
                    Share posts, like, comment, and engage with your community
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card hover:shadow-soft transition-smooth">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-semibold mb-2">Profile Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize your profile and connect with like-minded people
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Everything you need to stay connected
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience social networking reimagined with our elegant, feature-rich platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="text-center shadow-card hover:shadow-soft transition-smooth animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-accent">
        <div className="container mx-auto px-4 text-center animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to join SocialHub?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create your account today and start connecting with friends in a whole new way.
          </p>
          <Button 
            asChild 
            size="lg"
            className="text-lg px-8 py-6 transition-spring hover:scale-105 shadow-soft"
          >
            <Link to="/signup">
              Join Now - It's Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="gradient-primary rounded-lg p-2 flex items-center justify-center">
              <span className="text-lg font-bold text-white">SH</span>
            </div>
            <span className="text-lg font-semibold text-foreground">SocialHub</span>
          </div>
          <p className="text-muted-foreground">
            © 2024 SocialHub. Connecting people in beautiful ways.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;