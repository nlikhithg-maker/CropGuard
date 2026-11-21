import { createClient } from '@supabase/supabase-js';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const url = configuredUrl
  ? (() => {
      try {
        const projectUrl = new URL(configuredUrl);
        projectUrl.pathname = '';
        projectUrl.search = '';
        projectUrl.hash = '';
        return projectUrl.origin;
      } catch {
        return configuredUrl.replace(/\/+$/, '');
      }
    })()
  : undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;
