console.log('ENV check:',
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'KEY_OK' : 'KEY_NG'
);
export {};
