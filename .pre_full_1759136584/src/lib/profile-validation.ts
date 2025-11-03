import { z } from 'zod';

export const ProfileSchema = z.object({
  nickname: z.string().min(1,'ニックネームは必須').max(24,'24文字以内'),
  grade: z.enum(['中1','中2','中3','高1','高2','高3','既卒'], { message:'学年を選択してください' }),
  gender: z.enum(['male','female','other','unknown']).default('unknown')
});
export type ProfileInput = z.infer<typeof ProfileSchema>;
