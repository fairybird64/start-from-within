// CLINICAL CONTENT POLICY: card_database.json must contain ONLY the 129 verbatim original cards (13 decks).
// NEVER add AI-generated card content. Any new deck or card requires explicit approval from the clinical lead (Fairy) before merge.
import cardDatabase from '@/data/card_database.json';
import type { Card, DeckId, IcebergLayer } from './types';

function getAllCards(): Card[] {
  return cardDatabase.decks.flatMap((deck) =>
    deck.cards.map((c) => ({
      id: c.id,
      deck_id: c.deck_id as DeckId,
      question_th: c.question_th,
      question_en: c.question_en,
      layer: (c as { layer?: string }).layer as IcebergLayer | undefined,
    }))
  );
}

export function getRandomCard(deckId: DeckId, excludeIds: string[] = []): Card | null {
  const all = getAllCards().filter(
    (c) => c.deck_id === deckId && !excludeIds.includes(c.id)
  );
  if (all.length === 0) return null;
  return all[Math.floor(Math.random() * all.length)];
}

// Layers without a card deck (coping, self) return null — callers must handle no-card path.
const layerToDeck: Partial<Record<IcebergLayer, DeckId>> = {
  behavior: 'behavior',
  feelings: 'feelings',
  feelings_about_feelings: 'feelings_about_feelings',
  perceptions: 'perceptions',
  expectations: 'expectations',
  yearnings: 'yearnings',
};

export function getRandomCardForLayer(layer: IcebergLayer, excludeIds: string[] = []): Card | null {
  const deckId = layerToDeck[layer];
  if (!deckId) return null;
  return getRandomCard(deckId, excludeIds);
}
