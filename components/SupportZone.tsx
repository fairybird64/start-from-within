'use client';

import type { Card } from '@/lib/types';
import CardDisplay from './CardDisplay';

interface Props {
  onBelief: () => void;
  onRest: () => void;
  onStop: () => void;
  supportCard: Card | null;
  onNewSupportCard: () => void;
  onCloseSupportCard: () => void;
}

export default function SupportZone({
  onBelief,
  onRest,
  onStop,
  supportCard,
  onNewSupportCard,
  onCloseSupportCard,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 justify-center flex-wrap">
        <button
          onClick={onBelief}
          className="px-4 py-2 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium transition-colors border border-amber-200"
        >
          ✨ ขอเพิ่ม
        </button>
        <button
          onClick={onRest}
          className="px-4 py-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium transition-colors border border-blue-200"
        >
          🌿 ขอพัก
        </button>
        <button
          onClick={onStop}
          className="px-4 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-medium transition-colors border border-stone-200"
        >
          🚪 ขอหยุด
        </button>
      </div>

      {supportCard && (
        <div className="relative">
          <CardDisplay
            card={supportCard}
            onNewCard={onNewSupportCard}
            showNewCardButton={supportCard.deck_id !== 'helper'}
          />
          <button
            onClick={onCloseSupportCard}
            className="absolute top-2 right-2 text-stone-300 hover:text-stone-500 transition-colors text-lg leading-none"
            aria-label="ปิด"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
