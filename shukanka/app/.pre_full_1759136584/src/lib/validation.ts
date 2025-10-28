import { z } from 'zod';

export const StudyLogSchema = z.object({
  minutes: z.number().int().min(1, '1分以上を選んでください').max(500, '最大500分までです'),
  memo: z.string().max(500, 'メモは500文字以内にしてください').optional().or(z.literal(''))
});
