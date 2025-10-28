import React from 'react';
import KnowUser from './KnowUser';
export default function KnowUserDemo(){
  const route = { params: {
    nickname:'山田太郎', grade:'高2', gender:'男性',
    rankLabel:'A', streakDays:127, sum7:420,
    desired_univ:'東京大学', desired_faculty:'工学部'
  }};
  // @ts-ignore
  return <KnowUser route={route} />;
}
