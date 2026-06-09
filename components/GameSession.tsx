'use client';

import { useState, useCallback } from 'react';
import type { GameState, IcebergLayer, Card, CopingStance, SessionEntry } from '@/lib/types';
import { getRandomCard, getRandomCardForLayer } from '@/lib/cards';
import IcebergMap from './IcebergMap';
import CardDisplay from './CardDisplay';
import PlayerInput from './PlayerInput';
import SupportZone from './SupportZone';

const COPING_STANCES: { id: CopingStance; label_th: string; label_en: string; emoji: string; desc_th: string }[] = [
  { id: 'placating', label_th: 'ยอมตาม', label_en: 'Placating', emoji: '🙏', desc_th: 'เอาใจคนอื่น ลืมความต้องการของตัวเอง' },
  { id: 'blaming', label_th: 'โทษผู้อื่น', label_en: 'Blaming', emoji: '👉', desc_th: 'ปกป้องตัวเองด้วยการโทษคนอื่น' },
  { id: 'super_reasonable', label_th: 'มีเหตุผลเกินไป', label_en: 'Super-Reasonable', emoji: '🧠', desc_th: 'ใช้เหตุผลปิดกั้นความรู้สึก' },
  { id: 'irrelevant', label_th: 'เฉไฉ', label_en: 'Irrelevant', emoji: '🌀', desc_th: 'เบี่ยงประเด็น พูดเรื่องอื่นเพื่อหนีสถานการณ์' },
  { id: 'congruent', label_th: 'สอดคล้องกับตัวเอง', label_en: 'Congruent', emoji: '💚', desc_th: 'เป้าหมายของการเดินทาง — ตรงและเปิดใจ' },
];

const LAYER_LABELS: Record<IcebergLayer, string> = {
  behavior: 'พฤติกรรม',
  coping: 'ท่าทางการรับมือ',
  feelings: 'ความรู้สึก',
  feelings_about_feelings: 'ความรู้สึกต่อความรู้สึก',
  perceptions: 'การรับรู้',
  expectations: 'ความคาดหวัง',
  yearnings: 'ความปรารถนาลึกๆ',
  self: 'ตัวตน / พลังชีวิต',
};

function initialState(): GameState {
  return {
    phase: 'check_in',
    sessionEntries: [],
    stars: [],
    currentCard: getRandomCard('check_in'),
    currentLayer: null,
    copingStance: null,
    usedCardIds: new Set(),
    supportZoneOpen: false,
    supportZoneCard: null,
  };
}

export default function GameSession() {
  const [state, setState] = useState<GameState>(initialState);
  const [aiReflection, setAiReflection] = useState<string>('');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [checkOutCard, setCheckOutCard] = useState<Card | null>(null);
  const [, setCheckOutAnswer] = useState('');
  const [intention, setIntention] = useState('');

  const addEntry = useCallback(
    (entry: Omit<SessionEntry, 'timestamp'>) => {
      setState((prev) => ({
        ...prev,
        sessionEntries: [...prev.sessionEntries, { ...entry, timestamp: Date.now() }],
      }));
    },
    []
  );

  async function getReflection(answer: string, question: string): Promise<string> {
    try {
      const res = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerInput: answer, cardQuestion: question }),
      });
      const data = await res.json();
      return data.reflection ?? '';
    } catch {
      return '';
    }
  }

  // ── CHECK-IN ──
  async function handleCheckInSubmit(answer: string) {
    if (!state.currentCard) return;
    setLoading(true);
    const reflection = await getReflection(answer, state.currentCard.question_th);
    addEntry({
      phase: 'check_in',
      cardId: state.currentCard.id,
      question: state.currentCard.question_th,
      playerAnswer: answer,
      aiReflection: reflection,
    });
    setAiReflection(reflection);
    setLoading(false);

    // After brief pause transition to situation
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        phase: 'situation',
        currentCard: getRandomCard('situation', Array.from(prev.usedCardIds)),
      }));
      setAiReflection('');
    }, 2000);
  }

  // ── SITUATION ──
  async function handleSituationSubmit(answer: string) {
    if (!state.currentCard) return;
    setLoading(true);
    addEntry({
      phase: 'situation',
      cardId: state.currentCard.id,
      question: state.currentCard.question_th,
      playerAnswer: answer,
    });
    setLoading(false);
    setState((prev) => ({ ...prev, phase: 'situation', currentCard: prev.currentCard }));
    // Show coping stance selection
    setState((prev) => ({ ...prev, currentCard: null }));
  }

  function handleCopingSelect(stance: CopingStance) {
    setState((prev) => ({
      ...prev,
      copingStance: stance,
      phase: 'explore',
      currentCard: null,
      currentLayer: null,
    }));
  }

  // ── EXPLORE ──
  function handleLayerSelect(layer: IcebergLayer) {
    // Tapping the active layer while reflection is showing places a star
    if (layer === state.currentLayer && aiReflection) {
      handlePlaceStar();
      return;
    }
    setAiReflection('');
    const card = getRandomCardForLayer(layer, Array.from(state.usedCardIds));
    setState((prev) => ({
      ...prev,
      currentLayer: layer,
      currentCard: card,
      usedCardIds: card ? new Set(Array.from(prev.usedCardIds).concat(card.id)) : prev.usedCardIds,
    }));
  }

  function handleNewCardInLayer() {
    if (!state.currentLayer) return;
    const card = getRandomCardForLayer(state.currentLayer, Array.from(state.usedCardIds));
    setState((prev) => ({
      ...prev,
      currentCard: card,
      usedCardIds: card ? new Set(Array.from(prev.usedCardIds).concat(card.id)) : prev.usedCardIds,
    }));
  }

  async function handleExploreSubmit(answer: string) {
    if (!state.currentCard || !state.currentLayer) return;
    setLoading(true);
    const reflection = await getReflection(answer, state.currentCard.question_th);
    addEntry({
      phase: 'explore',
      cardId: state.currentCard.id,
      question: state.currentCard.question_th,
      playerAnswer: answer,
      aiReflection: reflection,
      layer: state.currentLayer,
    });
    setAiReflection(reflection);
    setLoading(false);
  }

  function handlePlaceStar() {
    if (!state.currentLayer) return;
    setState((prev) => ({
      ...prev,
      stars: [...prev.stars, { layer: prev.currentLayer!, placedAt: Date.now() }],
      currentCard: null,
      currentLayer: null,
    }));
    setAiReflection('');
  }

  // ── SUPPORT ZONE ──
  function handleBelief() {
    const card = getRandomCard('satir_beliefs', Array.from(state.usedCardIds));
    setState((prev) => ({ ...prev, supportZoneCard: card, supportZoneOpen: true }));
  }

  function handleRest() {
    const card = getRandomCard('helper');
    setState((prev) => ({ ...prev, supportZoneCard: card, supportZoneOpen: true }));
  }

  function handleStop() {
    goToReflect();
  }

  function handleNewSupportCard() {
    if (!state.supportZoneCard) return;
    const deckId = state.supportZoneCard.deck_id;
    const card = getRandomCard(deckId, Array.from(state.usedCardIds));
    setState((prev) => ({ ...prev, supportZoneCard: card }));
  }

  // ── REFLECT ──
  async function goToReflect() {
    setState((prev) => ({ ...prev, phase: 'reflect' }));
    setLoading(true);
    const entries = state.sessionEntries
      .filter((e) => e.playerAnswer)
      .map((e) => ({ question: e.question, answer: e.playerAnswer }));
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      setAiSummary(data.summary ?? '');
    } catch {
      setAiSummary('');
    }
    setLoading(false);
  }

  // ── CHECK-OUT ──
  async function handleCheckOutSubmit(answer: string) {
    if (!checkOutCard) return;
    setCheckOutAnswer(answer);
    addEntry({
      phase: 'check_out',
      cardId: checkOutCard.id,
      question: checkOutCard.question_th,
      playerAnswer: answer,
    });
    setState((prev) => ({ ...prev, phase: 'complete' }));
    setIntention(answer);
  }

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-stone-700 tracking-wide">เริ่มจากข้างใน</h1>
          <p className="text-sm text-stone-400 mt-1">Start from Within</p>
        </header>

        {/* ── CHECK-IN ── */}
        {state.phase === 'check_in' && state.currentCard && (
          <PhaseCard title="เช็คอิน" subtitle="Check-In">
            <CardDisplay
              card={state.currentCard}
              onNewCard={() =>
                setState((prev) => ({
                  ...prev,
                  currentCard: getRandomCard('check_in', Array.from(prev.usedCardIds)),
                }))
              }
            />
            {!aiReflection && (
              <PlayerInput onSubmit={handleCheckInSubmit} loading={loading} />
            )}
            {aiReflection && (
              <ReflectionBubble text={aiReflection} />
            )}
          </PhaseCard>
        )}

        {/* ── SITUATION ── */}
        {state.phase === 'situation' && state.currentCard && (
          <PhaseCard title="สถานการณ์" subtitle="Situation">
            <CardDisplay
              card={state.currentCard}
              onNewCard={() =>
                setState((prev) => ({
                  ...prev,
                  currentCard: getRandomCard('situation', Array.from(prev.usedCardIds)),
                }))
              }
            />
            <PlayerInput onSubmit={handleSituationSubmit} loading={loading} placeholder="เล่าให้ฟังสักนิด..." />
          </PhaseCard>
        )}

        {/* ── COPING STANCE SELECTION ── */}
        {state.phase === 'situation' && !state.currentCard && (
          <PhaseCard title="ท่าทางการรับมือ" subtitle="Coping Stance">
            <div className="text-center flex flex-col gap-1">
              <p className="text-base text-stone-700">เมื่อเผชิญกับสถานการณ์นี้ คุณมักตอบสนองแบบไหน?</p>
              <p className="text-xs text-stone-400">ท่าทีการรับมือของ Satir Model — ไม่มีผิดถูก แค่สังเกตตัวเอง</p>
            </div>
            <div className="flex flex-col gap-2">
              {COPING_STANCES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleCopingSelect(s.id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 bg-white/70 hover:bg-stone-50 transition-colors text-left"
                >
                  <span className="text-xl">{s.emoji}</span>
                  <div>
                    <div className="text-sm font-medium text-stone-700">{s.label_th} <span className="font-normal text-stone-400">({s.label_en})</span></div>
                    <div className="text-xs text-stone-500 mt-0.5">{s.desc_th}</div>
                  </div>
                </button>
              ))}
            </div>
          </PhaseCard>
        )}

        {/* ── EXPLORE ── */}
        {state.phase === 'explore' && (
          <PhaseCard title="สำรวจภูเขาน้ำแข็งของคุณ" subtitle="เลือกชั้นที่อยากสำรวจ — การ์ดจะช่วยพาคุณลงลึก เริ่มจากชั้นไหนก็ได้ ไม่มีผิดถูก">
            <IcebergMap
              activeLayer={state.currentLayer}
              stars={state.stars}
              onLayerSelect={handleLayerSelect}
              interactive
            />

            {state.currentCard && state.currentLayer && (
              <div className="flex flex-col gap-4 mt-2">
                <div className="text-xs text-center text-stone-400 uppercase tracking-wider">
                  {LAYER_LABELS[state.currentLayer]}
                </div>
                <CardDisplay
                  card={state.currentCard}
                  onNewCard={handleNewCardInLayer}
                />
                {!aiReflection && (
                  <PlayerInput onSubmit={handleExploreSubmit} loading={loading} />
                )}
                {aiReflection && (
                  <div className="flex flex-col gap-3">
                    <ReflectionBubble text={aiReflection} />
                    <PlayerInput onSubmit={handleExploreSubmit} loading={loading} placeholder="เขียนต่อ หรือเลือกชั้นอื่นบนแผนที่..." />
                    <p className="text-sm text-stone-400 text-center">
                      พิมพ์ต่อเพื่อสำรวจชั้นนี้ให้ลึกขึ้น<br />หรือเลือกชั้นอื่นบนแผนที่ด้านบน
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Support zone — pinned at bottom, small & unobtrusive */}
            <div className="mt-6 pt-4 border-t border-stone-100">
              <SupportZone
                onBelief={handleBelief}
                onRest={handleRest}
                onStop={handleStop}
                supportCard={state.supportZoneCard}
                onNewSupportCard={handleNewSupportCard}
                onCloseSupportCard={() => setState((prev) => ({ ...prev, supportZoneCard: null, supportZoneOpen: false }))}
              />
            </div>
          </PhaseCard>
        )}

        {/* ── REFLECT ── */}
        {state.phase === 'reflect' && (
          <PhaseCard title="สะท้อนกลับ" subtitle="Reflect">
            <IcebergMap stars={state.stars} interactive={false} />
            {loading ? (
              <p className="text-center text-stone-400 text-sm">กำลังสรุป...</p>
            ) : aiSummary ? (
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <p className="text-sm text-stone-600 leading-relaxed">{aiSummary}</p>
              </div>
            ) : null}
            <button
              onClick={() => {
                setState((prev) => ({ ...prev, phase: 'check_out' }));
                setCheckOutCard(getRandomCard('check_out'));
              }}
              className="self-center px-6 py-3 rounded-full bg-stone-700 hover:bg-stone-800 text-white text-sm font-medium transition-colors mt-2"
            >
              เช็คเอาท์ →
            </button>
          </PhaseCard>
        )}

        {/* ── CHECK-OUT ── */}
        {state.phase === 'check_out' && checkOutCard && (
          <PhaseCard title="เช็คเอาท์" subtitle="Check-Out">
            <CardDisplay
              card={checkOutCard}
              onNewCard={() => setCheckOutCard(getRandomCard('check_out'))}
            />
            <PlayerInput
              onSubmit={handleCheckOutSubmit}
              loading={loading}
              placeholder="ความตั้งใจของฉันสำหรับวันข้างหน้า..."
              submitLabel="จบการสำรวจ"
            />
          </PhaseCard>
        )}

        {/* ── COMPLETE ── */}
        {state.phase === 'complete' && (
          <PhaseCard title="จบการสำรวจ" subtitle="Complete">
            <div className="text-center flex flex-col gap-4">
              <span className="text-5xl">🌿</span>
              <p className="text-stone-600">ขอบคุณที่สำรวจข้างในวันนี้</p>
              {intention && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <p className="text-xs text-amber-600 uppercase tracking-wider mb-1">ความตั้งใจของคุณ</p>
                  <p className="text-sm text-stone-700">{intention}</p>
                </div>
              )}
              <button
                onClick={() => {
                  setState(initialState());
                  setAiReflection('');
                  setAiSummary('');
                  setCheckOutCard(null);
                  setIntention('');
                }}
                className="self-center px-6 py-3 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 text-sm font-medium transition-colors mt-2"
              >
                เริ่มการสำรวจใหม่
              </button>
            </div>
          </PhaseCard>
        )}
      </div>
    </div>
  );
}

// ── Small layout helpers ──

function PhaseCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-stone-700">{title}</h2>
        <p className="text-xs text-stone-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function ReflectionBubble({ text }: { text: string }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
      <p className="text-sm text-stone-600 leading-relaxed italic">{text}</p>
    </div>
  );
}
