import EventEmitter from 'events';

/** 画面間の軽い通知に使う小さなイベントバス */
export const appEvents = new EventEmitter();

/** イベント名（typo 防止） */
export const AppEvent = {
  StudySubmitted: 'study:submitted',
} as const;