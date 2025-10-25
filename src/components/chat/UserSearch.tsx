import React, { useState, useEffect, useRef } from 'react';
import { Search, User, MessageCircle } from 'lucide-react';
import { apiService, UserSearchResult } from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar } from '../ui/avatar';
import { Card } from '../ui/card';

interface UserSearchProps {
  onUserSelect: (user: UserSearchResult) => void;
  onClose: () => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ onUserSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Search users with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        console.log('🔍 UserSearch: Starting search for:', query);
        const response = await apiService.searchUsers(query);
        console.log('🔍 UserSearch: Search response:', response);
        setResults(response.users);
        setShowResults(true);
      } catch (error) {
        console.error('❌ UserSearch: Error searching users:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleUserClick = (user: UserSearchResult) => {
    onUserSelect(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={searchRef} className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-500" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search users by name, email, or username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus:ring-0 text-base"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2">Searching...</p>
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No users found</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="p-2">
              {results.map((user) => (
                <Card
                  key={user.id}
                  className="p-3 mb-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleUserClick(user)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {user.profile_picture ? (
                        <img
                          src={user.profile_picture}
                          alt={user.full_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {user.full_name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        @{user.username}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <MessageCircle className="h-5 w-5 text-gray-400" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!query.trim() && (
            <div className="p-4 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>Start typing to search for users</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
