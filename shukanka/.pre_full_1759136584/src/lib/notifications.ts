import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import dayjs from 'dayjs';
import { isTodaySubmitted } from './submit-check';
import { supabase } from './supabase';

export async function configureNotificationChannel(){
  if(Device.osName === 'Android'){
    await Notifications.setNotificationChannelAsync('default', { name:'default', importance: Notifications.AndroidImportance.DEFAULT });
  }
}

export async function ensureNotificationPermission(){
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function getHoursForUser(userId:string){
  const { data } = await supabase
    .from('notification_prefs')
    .select('hours')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.hours as number[] | undefined) ?? [16,19,22,23];
}

export async function scheduleDailyReminders(userId:string){
  await Notifications.cancelAllScheduledNotificationsAsync();
  const already = await isTodaySubmitted(userId);
  if(already) return;

  const hours = await getHoursForUser(userId);
  const now = dayjs();
  for(const h of hours){
    let t = now.hour(h).minute(0).second(0);
    if(t.isBefore(now)) t = t.add(1,'day');
    await Notifications.scheduleNotificationAsync({
      content: { title:'勉強記録の提出リマインダー', body:`${t.format('HH:mm')} の時点で未提出です。今日の分を提出しましょう！`, sound:true, data:{ open:'submit' } },
      trigger: { date: t.toDate() }
    });
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert:true, shouldPlaySound:false, shouldSetBadge:false })
});
