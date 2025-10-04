import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const AuthTest = () => {
  const { register, login, user, error } = useAuth();
  const [email, setEmail] = useState('testuser@example.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Test User');

  const testRegister = async () => {
    try {
      console.log('Testing register with:', { email, password, name });
      await register(email, password, name);
      console.log('Registration successful!');
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const testLogin = async () => {
    try {
      console.log('Testing login with:', { email, password });
      await login(email, password);
      console.log('Login successful!');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Auth Test</h2>
      
      <div className="space-y-4">
        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        
        <div className="flex gap-2">
          <Button onClick={testRegister}>Test Register</Button>
          <Button onClick={testLogin}>Test Login</Button>
        </div>
        
        {error && (
          <div className="text-red-600 p-2 bg-red-100 rounded">
            Error: {error}
          </div>
        )}
        
        {user && (
          <div className="text-green-600 p-2 bg-green-100 rounded">
            User: {user.name} ({user.email})
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthTest;