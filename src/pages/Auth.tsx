import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Store, Bike, Users } from 'lucide-react';

type AuthMode = 'signin' | 'signup';
type UserRole = 'customer' | 'vendor' | 'rider';

export function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer' as UserRole,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRoleSelect = (role: UserRole) => {
    setFormData({ ...formData, role });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: roleData } = await (supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle() as any);

        const userRole = roleData?.role;
        if (userRole === 'vendor') {
          navigate('/vendor');
        } else if (userRole === 'rider') {
          navigate('/rider');
        } else if (userRole === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        // Create profile
        const { error: profileError } = await (supabase.from('profiles') as any).insert({
          id: data.user.id,
          name: formData.name,
          email: formData.email,
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        }

        // Create role
        const { error: roleError } = await (supabase.from('user_roles') as any).insert({
          user_id: data.user.id,
          role: formData.role,
        });

        if (roleError) {
          console.error('Role assignment error:', roleError);
          throw new Error(`Failed to assign user role: ${roleError.message}`);
        }

        if (formData.role === 'vendor') {
          navigate('/vendor');
        } else if (formData.role === 'rider') {
          navigate('/rider');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'customer', label: 'Customer', icon: Users, description: 'Order food from restaurants' },
    { value: 'vendor', label: 'Vendor', icon: Store, description: 'Manage your restaurant' },
    { value: 'rider', label: 'Rider', icon: Bike, description: 'Deliver orders and earn' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-600 mb-2">CIKIEats</h1>
          <p className="text-gray-600">Your favorite food, delivered fast</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              mode === 'signin'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <LogIn className="inline-block w-4 h-4 mr-2" />
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              mode === 'signup'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <UserPlus className="inline-block w-4 h-4 mr-2" />
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I want to</label>
              <div className="grid grid-cols-1 gap-2">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleRoleSelect(option.value as UserRole)}
                    className={`p-3 border-2 rounded-lg text-left transition ${
                      formData.role === option.value
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <option.icon className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-600">{option.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
