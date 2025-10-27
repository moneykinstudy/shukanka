import dayjs from 'dayjs';

export function calcStreak(dates: string[]): number{
  // dates: 'YYYY-MM-DD' の配列（提出した日）
  const set = new Set(dates);
  let n = 0;
  let d = dayjs().startOf('day');
  while(set.has(d.format('YYYY-MM-DD'))){
    n++; d = d.subtract(1,'day');
  }
  return n;
}
