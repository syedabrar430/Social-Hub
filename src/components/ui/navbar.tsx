import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, User, Bell, MessageCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  const navItems = [
    { path: '/feed', icon: Home, label: 'Feed' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: '/messages', icon: MessageCircle, label: 'Messages' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/feed" className="flex items-center space-x-2">
          <div className="gradient-primary rounded-lg p-2">
            <span className="text-xl font-bold text-white">SH</span>
          </div>
          <span className="text-xl font-semibold text-foreground">SocialHub</span>
        </Link>

        {/* Navigation Links - Desktop */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "default" : "ghost"}
              size="sm"
              asChild
              className={`transition-smooth ${
                isActive(item.path) 
                  ? 'bg-primary text-primary-foreground shadow-soft' 
                  : 'hover:bg-accent/50'
              }`}
            >
              <Link to={item.path} className="flex items-center space-x-2">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </Button>
          ))}
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-2">
          {user && (
            <div className="hidden sm:flex items-center space-x-3">
              <span className="text-2xl">👤</span>
              <div className="hidden lg:block">
                <p className="text-sm font-medium">{user.full_name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:ml-2 sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t bg-card">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "default" : "ghost"}
              size="sm"
              asChild
              className={`flex-col h-auto py-2 transition-smooth ${
                isActive(item.path) 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent/50'
              }`}
            >
              <Link to={item.path}>
                <item.icon className="h-4 w-4" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;