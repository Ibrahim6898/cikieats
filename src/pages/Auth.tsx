import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Store, Bike, Phone, Utensils, MapPin, ChevronRight, AlertCircle, ShoppingBag } from 'lucide-react';
import { AuthMode, AuthFormData } from '../types/auth';

type UserRole = 'customer' | 'vendor' | 'rider';

export function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [cuisine, setCuisine] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('bicycle');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<AuthFormData>({
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
      const { data: authData, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (authData.user) {
        const { name, email, role } = formData;
        // Create profile
        const { error: profileError } = await (supabase.from('profiles') as any).insert({
          id: authData.user.id,
          name: name,
          email: email,
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        }

        if (role === 'vendor') {
          const { error: vendorError } = await (supabase.from('vendors') as any).insert({
            owner_id: authData.user.id,
            restaurant_name: name,
            cuisine,
            address,
            status: 'pending',
          });
          if (vendorError) throw vendorError;
        } else if (role === 'rider') {
          const { error: riderError } = await (supabase.from('riders') as any).insert({
            user_id: authData.user.id,
            phone_number: phoneNumber,
            vehicle_type: vehicleType,
            status: 'pending',
            is_online: false,
          });
          if (riderError) throw riderError;
        }

        // Create role
        const { error: roleError } = await (supabase.from('user_roles') as any).insert({
          user_id: authData.user.id,
          role: role,
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
    { value: 'customer', label: 'Customer', icon: ShoppingBag, description: 'Order food from restaurants' },
    { value: 'vendor', label: 'Vendor', icon: Store, description: 'Manage your restaurant' },
    { value: 'rider', label: 'Rider', icon: Bike, description: 'Deliver orders and earn' },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
      <div className="glass-card rounded-[40px] p-10 max-w-lg w-full premium-shadow border border-white/50 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-green-600 rounded-[24px] flex items-center justify-center mx-auto mb-6 rotate-3 shadow-xl shadow-green-100">
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-3">CIKI<span className="text-green-600">EATS</span></h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Premium Food Delivery</p>
        </div>

        <div className="flex gap-4 p-1.5 bg-gray-50 rounded-[24px] mb-8">
          <button
            onClick={() => {
              setMode('signin');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest transition-all ${
              mode === 'signin'
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Mail className="w-4 h-4" />
            Sign In
          </button>
          <button
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest transition-all ${
              mode === 'signup'
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <User className="w-4 h-4" />
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-8 p-5 bg-red-50 border border-red-100 text-red-600 rounded-[20px] text-xs font-bold leading-relaxed flex items-start gap-4 animate-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-6">
          {mode === 'signup' && (
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-transparent rounded-[24px] focus:bg-white focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-bold text-gray-900 placeholder:text-gray-300"
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-transparent rounded-[24px] focus:bg-white focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-bold text-gray-900 placeholder:text-gray-300"
                placeholder="you@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-transparent rounded-[24px] focus:bg-white focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-bold text-gray-900 placeholder:text-gray-300"
                placeholder="••••••••"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-8 py-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1 text-center">I want to join as</label>
                <div className="grid grid-cols-1 gap-3">
                  {roleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleRoleSelect(option.value as UserRole)}
                      className={`p-5 rounded-[24px] text-left transition-all border-2 flex items-center gap-5 ${
                        formData.role === option.value
                          ? 'border-green-500 bg-green-50 shadow-lg shadow-green-100'
                          : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl ${formData.role === option.value ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-400'}`}>
                        <option.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-black text-gray-900 uppercase tracking-tight text-sm leading-none mb-1">{option.label}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{option.description}</div>
                      </div>
                      <ChevronRight className={`ml-auto w-5 h-5 transition-transform ${formData.role === option.value ? 'text-green-600 translate-x-1' : 'text-gray-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {formData.role === 'vendor' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="h-px bg-gray-100" />
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cuisine Specialization</label>
                    <div className="relative">
                      <Utensils className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <input
                        type="text"
                        required
                        value={cuisine}
                        onChange={(e) => setCuisine(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-gray-100/50 border border-transparent rounded-[24px] focus:bg-white focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-bold text-gray-900"
                        placeholder="e.g., Nigerian, Fast Food"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Business Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-gray-100/50 border border-transparent rounded-[24px] focus:bg-white focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-bold text-gray-900"
                        placeholder="Street, City, State"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.role === 'rider' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="h-px bg-gray-100" />
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-gray-100/50 border border-transparent rounded-[24px] focus:bg-white focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-bold text-gray-900"
                        placeholder="+234..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Delivery Vehicle</label>
                    <div className="relative">
                      <Bike className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full pl-14 pr-12 py-5 bg-gray-100/50 border border-transparent rounded-[24px] focus:bg-white focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-bold text-gray-900 appearance-none cursor-pointer"
                      >
                        <option value="bicycle">Bicycle</option>
                        <option value="motorbike">Motorbike</option>
                        <option value="car">Car</option>
                      </select>
                      <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-6 rounded-[28px] font-black uppercase tracking-[0.2em] text-sm hover:bg-black transition-all premium-shadow active:scale-[0.98] disabled:opacity-50 mt-4 group"
          >
            {loading ? 'Processing...' : (
              <span className="flex items-center justify-center gap-3">
                {mode === 'signin' ? 'Unlock Account' : 'Initialize Profile'}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
