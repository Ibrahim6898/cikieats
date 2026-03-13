import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SettingsContextType {
  settings: Record<string, string>;
  loading: boolean;
  getSetting: (key: string, defaultValue?: string) => string;
  isMaintenanceMode: () => boolean;
  isOperatingHours: () => boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap = (data as any[] || []).reduce((acc, curr) => ({
        ...acc,
        [curr.key]: curr.value
      }), {} as Record<string, string>);

      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching global settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Subscribe to changes
    const channel = supabase
      .channel('global_settings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'global_settings' },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getSetting = (key: string, defaultValue: string = '') => {
    return settings[key] ?? defaultValue;
  };

  const isMaintenanceMode = () => {
    return settings['maintenance_mode'] === 'true';
  };

  const isOperatingHours = () => {
    const start = settings['operating_hours_start'] || '00:00';
    const end = settings['operating_hours_end'] || '23:59';
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= start && currentTime <= end;
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, getSetting, isMaintenanceMode, isOperatingHours, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
