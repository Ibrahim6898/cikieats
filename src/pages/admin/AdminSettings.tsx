import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Settings, Save, Mail, CheckCircle, AlertCircle, ArrowLeft, Percent } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 mb-8">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/admin')}
              className="p-3 bg-white rounded-2xl hover:bg-gray-50 transition border border-gray-100 shadow-sm group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-1">
                Platform <span className="text-green-600">Settings</span>
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Configuration & Parameters</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-4 py-2 bg-green-50 rounded-xl border border-green-100">
                <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">System Active</span>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {message && (
          <div className={`mb-8 p-6 rounded-[32px] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 ${
            message.type === 'success' 
              ? 'bg-green-600 text-white shadow-lg shadow-green-200' 
              : 'bg-red-600 text-white shadow-lg shadow-red-200'
          }`}>
            <div className="p-2 bg-white/20 rounded-xl">
              {message.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <p className="font-bold tracking-tight">{message.text}</p>
          </div>
        )}

        <div className="space-y-6">
          {settings.map((setting) => (
            <div key={setting.id} className="glass-card rounded-[40px] p-10 premium-shadow border border-white/50 hover:border-green-200 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                  <Settings className="w-32 h-32" />
              </div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                       {setting.key.includes('email') ? <Mail className="w-4 h-4 text-gray-400" /> : <Percent className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">{setting.key.replace(/_/g, ' ')}</h3>
                      <p className="text-xs font-bold text-gray-400 mt-1">{setting.description}</p>
                    </div>
                  </div>

                  <div className="relative group/input">
                    <input
                      type="text"
                      value={setting.value}
                      onChange={(e) => handleValueChange(setting.key, e.target.value)}
                      className="w-full px-8 py-5 bg-[#f8fafc] border border-gray-100 rounded-3xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 font-black text-gray-900 transition-all outline-none text-lg"
                      placeholder={`Enter ${setting.key.replace(/_/g, ' ')}`}
                    />
                  </div>
                </div>

                <div className="md:pt-10">
                  <button
                    onClick={() => handleSave(setting)}
                    disabled={saving}
                    className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-green-600 text-white font-black rounded-3xl hover:bg-green-700 transition-all shadow-xl shadow-green-100 active:scale-95 disabled:opacity-50 disabled:pointer-events-none group/btn"
                  >
                    <Save className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                    <span>{saving ? 'UPDATING...' : 'UPDATE'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {settings.length === 0 && (
            <div className="glass-card rounded-[40px] p-20 text-center border border-dashed border-gray-200">
              <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Settings className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Configuration Void</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed">No settings found in the structural database.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
