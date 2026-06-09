import { Suspense } from 'react';
import { BattleLayout } from '../components/BattleLayout';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BattleLayout />
    </Suspense>
  );
}
