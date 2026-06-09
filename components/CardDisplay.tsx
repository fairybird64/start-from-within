'use client';

import type { Card } from '@/lib/types';

interface Props {
  card: Card;
  onNewCard?: () => void;
  showNewCardButton?: boolean;
}

export default function CardDisplay({ card, onNewCard, showNewCardButton = true }: Props) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-stone-200 p-6 flex flex-col gap-4">
      <p className="text-lg font-medium text-stone-800 leading-relaxed text-center">
        {card.question_th}
      </p>
      <p className="text-sm text-stone-400 text-center italic">
        {card.question_en}
      </p>
      {showNewCardButton && onNewCard && (
        <button
          onClick={onNewCard}
          className="self-center text-sm text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors"
        >
          ขอการ์ดใบใหม่
        </button>
      )}
    </div>
  );
}
