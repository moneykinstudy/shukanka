import { supabase } from './supabase';
export async function getSessionUser(){
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}
export async function hasProfile(userId: string){
  const { data, error } = await supabase.from('profiles').select('id').eq('id', userId).limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}
