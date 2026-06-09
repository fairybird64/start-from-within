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
          className="px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs transition-colors border border-amber-200"
        >
          ✨ ขอเพิ่ม
        </button>
        <button
          onClick={onRest}
          className="px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs transition-colors border border-blue-200"
        >
          🌿 ขอพัก
        </button>
        <button
          onClick={onStop}
          className="px-3 py-1.5 rounded-full bg-stone-50 hover:bg-stone-100 text-stone-500 text-xs transition-colors border border-stone-200"
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
