export type IcebergLayer =
  | 'behavior'
  | 'coping'
  | 'feelings'
  | 'feelings_about_feelings'
  | 'perceptions'
  | 'expectations'
  | 'yearnings'
  | 'self';

export type DeckId =
  | 'check_in'
  | 'situation'
  | 'behavior'
  | 'coping'
  | 'feelings'
  | 'feelings_about_feelings'
  | 'perceptions'
  | 'expectations'
  | 'yearnings'
  | 'self'
  | 'satir_beliefs'
  | 'positive_resources'
  | 'helper'
  | 'check_out';

export type CopingStance = 'placating' | 'blaming' | 'super_reasonable' | 'irrelevant';

export interface Card {
  id: string;
  deck_id: DeckId;
  question_th: string;
  question_en: string;
  layer?: IcebergLayer;
}

export interface StarToken {
  layer: IcebergLayer;
  placedAt: number;
}

export interface SessionEntry {
  phase: GamePhase;
  cardId: string;
  question: string;
  playerAnswer: string;
  aiReflection?: string;
  layer?: IcebergLayer;
  timestamp: number;
}

export type GamePhase =
  | 'check_in'
  | 'situation'
  | 'explore'
  | 'appreciate'
  | 'check_out'
  | 'complete';

export interface GameState {
  phase: GamePhase;
  sessionEntries: SessionEntry[];
  stars: StarToken[];
  currentCard: Card | null;
  currentLayer: IcebergLayer | null;
  copingStance: CopingStance | null;
  usedCardIds: Set<string>;
  supportZoneOpen: boolean;
  supportZoneCard: Card | null;
  resourceStatement: string;
}
