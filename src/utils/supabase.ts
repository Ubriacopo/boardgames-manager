import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import { environment } from '../environments/environment.generated';

export const supabase = createClient<Database>(
  environment.supabaseUrl || 'https://configuration-required.supabase.co',
  environment.supabaseKey || 'configuration-required',
);
