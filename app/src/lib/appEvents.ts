// app/src/lib/appEvents.ts

// ==== 自前の超シンプル EventEmitter 実装 ====

type Listener = (...args: any[]) => void;

class SimpleEventEmitter {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, listener: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
    return this;
  }

  off(event: string, listener: Listener) {
    const arr = this.listeners[event];
    if (!arr) return this;
    this.listeners[event] = arr.filter((fn) => fn !== listener);
    return this;
  }

  addListener(event: string, listener: Listener) {
    this.on(event, listener);
    // KnowUserWeek.tsx が sub.remove() を呼べるようにする
    return {
      remove: () => {
        this.off(event, listener);
      },
    };
  }

  removeListener(event: string, listener: Listener) {
    this.off(event, listener);
    return this;
  }

  emit(event: string, ...args: any[]) {
    const arr = this.listeners[event];
    if (!arr) return false;
    arr.forEach((fn) => {
      try {
        fn(...args);
      } catch (e) {
        console.error('[appEvents listener error]', e);
      }
    });
    return arr.length > 0;
  }
}

// アプリ内で使うイベント名
export enum AppEvent {
  StudySubmitted = 'StudySubmitted', // 提出完了
}

// アプリ全体で共有するインスタンス
const appEvents = new SimpleEventEmitter();

// 両方の import パターンに対応:
//   import appEvents from '../lib/appEvents'
//   import { appEvents, AppEvent } from '../lib/appEvents'
export default appEvents;
export { appEvents };

