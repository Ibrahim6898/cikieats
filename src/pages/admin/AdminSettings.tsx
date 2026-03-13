import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Settings, Save, Mail, CheckCircle, AlertCircle, 
  ArrowLeft, Percent, Wallet, Clock, Shield, 
  Phone, MessageCircle, Power, DollarSign, CreditCard
} from 'lucide-react';

interface GlobalSetting {
  id: string;
  key: string;
  value: string;
  description: string;
}

export function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<GlobalSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .order('key', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, newValue: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
  };

  const handleSave = async (setting: GlobalSetting) => {
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await (supabase.from('global_settings') as any)
        .update({ value: setting.value, updated_at: new Date().toISOString() })
        .eq('id', setting.id);

      if (error) throw error;
      setMessage({ type: 'success', text: `Setting "${setting.key}" updated successfully!` });
    } catch (error: any) {
      console.error('Error updating setting:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update setting.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const categories = [
    { 
      id: 'financial', 
      name: 'Financial Controls', 
      icon: Wallet, 
      keys: ['platform_fee_percentage', 'minimum_order_value', 'base_delivery_fee', 'currency_symbol'] 
    },
    { 
      id: 'operational', 
      name: 'System Operations', 
      icon: Clock, 
      keys: ['maintenance_mode', 'operating_hours_start', 'operating_hours_end', 'rider_auto_unassign_minutes'] 
    },
    { 
      id: 'support', 
      name: 'Support & Help', 
      icon: Shield, 
      keys: ['support_email', 'support_phone', 'support_whatsapp'] 
    },
    { 
      id: 'payments', 
      name: 'Payment Gateway', 
      icon: CreditCard, 
      keys: ['paystack_enabled', 'paystack_public_key', 'paystack_secret_key'] 
    }
  ];

  const getIcon = (key: string) => {
    if (key.includes('email')) return Mail;
    if (key.includes('phone')) return Phone;
    if (key.includes('whatsapp')) return MessageCircle;
    if (key.includes('percentage')) return Percent;
    if (key.includes('fee') || key.includes('value')) return DollarSign;
    if (key.includes('mode') || key.includes('enabled')) return Power;
    return Settings;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 mb-12">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/admin')}
              className="p-3.5 bg-white rounded-2xl hover:bg-gray-50 transition border border-gray-100 shadow-sm group active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-1">
                Control <span className="text-green-600">Center</span>
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Advanced Platform Configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Node Status</span>
                <span className="text-xs font-bold text-green-600 tracking-tight">Syncing Live Data</span>
             </div>
             <div className="p-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-200"></div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        {message && (
          <div className={`mb-12 p-6 rounded-[32px] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 ${
            message.type === 'success' 
              ? 'bg-green-600 text-white shadow-2xl shadow-green-200' 
              : 'bg-red-600 text-white shadow-2xl shadow-red-200'
          }`}>
            <div className="p-2 bg-white/20 rounded-xl">
              {message.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <p className="font-bold tracking-tight text-lg">{message.text}</p>
          </div>
        )}

        <div className="space-y-16">
          {categories.map((category) => {
            const categorySettings = settings.filter(s => category.keys.includes(s.key));
            if (categorySettings.length === 0) return null;

            return (
              <section key={category.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-900">
                    <category.icon className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-[0.15em] italic">{category.name}</h2>
                  <div className="flex-1 h-[1px] bg-gray-100 ml-4"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categorySettings.map((setting) => {
                    const Icon = getIcon(setting.key);
                    const isBoolean = setting.key.includes('mode');
                    
                    return (
                      <div key={setting.id} className="glass-card rounded-[40px] p-8 premium-shadow border border-white/50 hover:border-green-200 transition-all group relative overflow-hidden flex flex-col justify-between h-full min-h-[220px]">
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 group-hover:text-green-600 transition-colors">
                                <Icon className="w-4 h-4" />
                              </div>
                              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{setting.key.replace(/_/g, ' ')}</h3>
                            </div>
                            <InfoIcon description={setting.description} />
                          </div>

                          <div className="mb-6">
                            {isBoolean ? (
                              <button
                                onClick={() => handleValueChange(setting.key, setting.value === 'true' ? 'false' : 'true')}
                                className={`w-full flex items-center justify-between px-6 py-4 rounded-3xl transition-all border-2 ${
                                  setting.value === 'true' 
                                    ? 'bg-red-50 border-red-100 text-red-600' 
                                    : 'bg-green-50 border-green-100 text-green-600'
                                }`}
                              >
                                <span className="font-black uppercase tracking-widest text-xs">
                                  {setting.value === 'true' ? 'Active' : 'Disabled'}
                                </span>
                                <div className={`w-10 h-6 rounded-full p-1 transition-all ${setting.value === 'true' ? 'bg-red-500' : 'bg-green-500'}`}>
                                  <div className={`w-4 h-4 bg-white rounded-full transition-all transform ${setting.value === 'true' ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                              </button>
                            ) : (
                              <input
                                type="text"
                                value={setting.value}
                                onChange={(e) => handleValueChange(setting.key, e.target.value)}
                                className="w-full px-6 py-4 bg-[#f8fafc] border border-gray-100 rounded-3xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 font-bold text-gray-900 transition-all outline-none"
                                placeholder={`Enter ${setting.key.replace(/_/g, ' ')}`}
                              />
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleSave(setting)}
                          disabled={saving}
                          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-100 active:scale-95 disabled:opacity-50 disabled:pointer-events-none group/btn mt-auto"
                        >
                          <Save className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                          <span className="text-xs uppercase tracking-widest">{saving ? 'Updating...' : 'Save Changes'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {settings.length === 0 && (
            <div className="glass-card rounded-[40px] p-24 text-center border border-dashed border-gray-200 animate-pulse">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <Settings className="w-12 h-12 text-gray-200" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-3">System Desolation</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] leading-relaxed">The structural parameters are currently offline.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoIcon({ description }: { description: string }) {
  return (
    <div className="group/info relative">
      <div className="p-1 cursor-help hover:bg-gray-100 rounded-lg transition-colors">
        <AlertCircle className="w-3.5 h-3.5 text-gray-300" />
      </div>
      <div className="absolute bottom-full right-0 mb-3 w-56 p-4 bg-gray-900/95 backdrop-blur-md text-white text-[10px] leading-relaxed font-bold rounded-2xl shadow-2xl opacity-0 group-hover/info:opacity-100 transition-all pointer-events-none translate-y-1 group-hover/info:translate-y-0 z-50 uppercase tracking-wider">
        <div className="absolute bottom-0 right-3 translate-y-1/2 w-3 h-3 bg-gray-900 rotate-45"></div>
        {description}
      </div>
    </div>
  );
}
