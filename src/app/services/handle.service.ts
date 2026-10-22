import { Injectable } from '@angular/core';
import { supabase } from '../../utils/supabase';
import { validateHandle } from '../../utils/handles';

@Injectable({ providedIn: 'root' })
export class HandleService {
  async available(value: string): Promise<boolean> {
    const handle = validateHandle(value);
    const { data, error } = await supabase.from('social_profiles').select('handle')
      .eq('handle', handle).limit(1).abortSignal(AbortSignal.timeout(15000));
    if (error) throw error;
    return data.length === 0;
  }
}
