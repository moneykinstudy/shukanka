import dayjs from 'dayjs';
import { supabase } from './supabase';

export async function isTodaySubmitted(userId: string){
  const today = dayjs().format('YYYY-MM-DD');
  const { data, error } = await supabase
    .from('study_logs')
    .select('user_id')
    .eq('user_id', userId)
    .eq('study_date', today)
    .limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}
