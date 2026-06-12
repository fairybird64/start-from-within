'use client';

import { useState, useCallback } from 'react';
import type { GameState, IcebergLayer, Card, CopingStance, SessionEntry } from '@/lib/types';
import { getRandomCard, getRandomCardForLayer } from '@/lib/cards';
import IcebergMap from './IcebergMap';
import CardDisplay from './CardDisplay';
import PlayerInput from './PlayerInput';
import SupportZone from './SupportZone';

// Congruent removed — it is an outcome of the journey, not a selectable stance
const COPING_STANCES: { id: CopingStance; label_th: string; label_en: string; emoji: string; desc_th: string }[] = [
  { id: 'placating',        label_th: 'ยอมตาม',          label_en: 'Placating',        emoji: '🟡', desc_th: 'เอาใจคนอื่น ลืมความต้องการของตัวเอง' },
  { id: 'blaming',          label_th: 'โทษผู้อื่น',       label_en: 'Blaming',          emoji: '🔴', desc_th: 'ปกป้องตัวเองด้วยการโทษคนอื่น' },
  { id: 'super_reasonable', label_th: 'มีเหตุผลเกินไป',  label_en: 'Super Reasonable', emoji: '🔵', desc_th: 'ใช้เหตุผลปิดกั้นความรู้สึก' },
  { id: 'irrelevant',       label_th: 'เฉไฉ',             label_en: 'Irrelevant',       emoji: '⚪', desc_th: 'เบี่ยงประเด็น พูดเรื่องอื่นเพื่อหนีสถานการณ์' },
];

const LAYER_LABELS: Record<IcebergLayer, string> = {
  behavior:                'พฤติกรรม',
  coping:                  'ท่าทางการรับมือ',
  feelings:                'ความรู้สึก',
  feelings_about_feelings: 'ความรู้สึกต่อความรู้สึก',
  perceptions:             'การรับรู้',
  expectations:            'ความคาดหวัง',
  yearnings:               'ความปรารถนาลึกๆ',
  self:                    'ตัวตน / พลังชีวิต',
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
    resourceStatement: '',
  };
}

export default function GameSession() {
  const [state, setState] = useState<GameState>(initialState);
  const [aiReflection, setAiReflection] = useState<string>('');
  const [hasReflection, setHasReflection] = useState(false);
  const [suggestedLayer, setSuggestedLayer] = useState<IcebergLayer | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [checkOutCard, setCheckOutCard] = useState<Card | null>(null);
  const [intention, setIntention] = useState('');

  // Appreciate phase state
  const [appreciateStep, setAppreciateStep] = useState<1 | 2 | 3 | 4>(1);
  const [appreciateCard, setAppreciateCard] = useState<Card | null>(null);
  const [appreciateSatirsCard, setAppreciateSatirsCard] = useState<Card | null>(null);
  const [appreciateReflection, setAppreciateReflection] = useState('');
  const [resourceInput, setResourceInput] = useState('');
  const [checkInCard, setCheckInCard] = useState<Card | null>(null);

  const addEntry = useCallback(
    (entry: Omit<SessionEntry, 'timestamp'>) => {
      setState((prev) => ({
        ...prev,
        sessionEntries: [...prev.sessionEntries, { ...entry, timestamp: Date.now() }],
      }));
    },
    []
  );

  async function getReflection(
    answer: string,
    question: string,
    currentLayer?: IcebergLayer | null,
    copingStance?: CopingStance | null,
  ): Promise<{ reflection: string; suggestedLayer: IcebergLayer | null }> {
    try {
      const res = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerInput: answer, cardQuestion: question, currentLayer, copingStance }),
      });
      const data = await res.json();
      return { reflection: data.reflection ?? '', suggestedLayer: data.suggestedLayer ?? null };
    } catch {
      return { reflection: '', suggestedLayer: null };
    }
  }

  async function getLayerReflection(entries: SessionEntry[]): Promise<string> {
    const content = entries
      .filter((e) => e.playerAnswer && e.phase === 'explore')
      .map((e) => `[${e.layer ? LAYER_LABELS[e.layer] : ''}] ${e.playerAnswer}`)
      .join('\n');
    try {
      const res = await fetch('/api/reflect-layers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionContent: content }),
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
    const { reflection } = await getReflection(answer, state.currentCard.question_th);
    const card = state.currentCard;
    addEntry({ phase: 'check_in', cardId: card.id, question: card.question_th, playerAnswer: answer, aiReflection: reflection });
    setCheckInCard(card); // save for check-out comparison
    setAiReflection(reflection);
    setLoading(false);
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
    addEntry({ phase: 'situation', cardId: state.currentCard.id, question: state.currentCard.question_th, playerAnswer: answer });
    setLoading(false);
    setState((prev) => ({ ...prev, currentCard: null }));
  }

  function handleCopingSelect(stance: CopingStance) {
    setState((prev) => ({ ...prev, copingStance: stance, phase: 'explore', currentCard: null, currentLayer: null }));
  }

  // ── EXPLORE ──
  function handleLayerSelect(layer: IcebergLayer) {
    if (layer === state.currentLayer && hasReflection) {
      handlePlaceStar();
      return;
    }
    setAiReflection('');
    setHasReflection(false);
    setSuggestedLayer(null);
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
    const { reflection, suggestedLayer: sl } = await getReflection(
      answer,
      state.currentCard.question_th,
      state.currentLayer,
      state.copingStance,
    );
    addEntry({ phase: 'explore', cardId: state.currentCard.id, question: state.currentCard.question_th, playerAnswer: answer, aiReflection: reflection, layer: state.currentLayer });
    setAiReflection(reflection);
    setHasReflection(true);
    setSuggestedLayer(sl);
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
    setHasReflection(false);
    setSuggestedLayer(null);
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
    goToAppreciate();
  }

  function handleNewSupportCard() {
    if (!state.supportZoneCard) return;
    const card = getRandomCard(state.supportZoneCard.deck_id, Array.from(state.usedCardIds));
    setState((prev) => ({ ...prev, supportZoneCard: card }));
  }

  // ── APPRECIATE ──
  async function goToAppreciate() {
    setState((prev) => ({ ...prev, phase: 'appreciate' }));
    setAppreciateStep(1);
    setLoading(true);
    const reflection = await getLayerReflection(state.sessionEntries);
    setAiSummary(reflection);
    setLoading(false);
  }

  async function handleAppreciateResourceSubmit(answer: string) {
    const card = appreciateCard;
    if (card) addEntry({ phase: 'appreciate', cardId: card.id, question: card.question_th, playerAnswer: answer });
    setLoading(true);
    const { reflection } = await getReflection(answer, card?.question_th ?? '');
    setAppreciateReflection(reflection);
    setLoading(false);
  }

  function handleAppreciateResourceCardStep() {
    const card = getRandomCard('positive_resources', Array.from(state.usedCardIds));
    setAppreciateCard(card);
    setAppreciateReflection('');
    setAppreciateStep(2);
  }

  function handleAppreciateNewResourceCard() {
    const card = getRandomCard('positive_resources', Array.from(state.usedCardIds));
    setAppreciateCard(card);
    setAppreciateReflection('');
  }

  function handleGoToResourceStatement() {
    setAppreciateStep(3);
    setAppreciateReflection('');
  }

  function handleResourceStatementSubmit() {
    if (!resourceInput.trim()) return;
    setState((prev) => ({ ...prev, resourceStatement: resourceInput.trim() }));
    const card = getRandomCard('satir_beliefs', Array.from(state.usedCardIds));
    setAppreciateSatirsCard(card);
    setAppreciateStep(4);
  }

  function handleNewSatirsCard() {
    const card = getRandomCard('satir_beliefs', Array.from(state.usedCardIds));
    setAppreciateSatirsCard(card);
  }

  function handleAppreciateDone() {
    setState((prev) => ({ ...prev, phase: 'check_out' }));
    setCheckOutCard(getRandomCard('check_out'));
  }

  // ── CHECK-OUT ──
  async function handleCheckOutSubmit(answer: string) {
    if (!checkOutCard) return;
    addEntry({ phase: 'check_out', cardId: checkOutCard.id, question: checkOutCard.question_th, playerAnswer: answer });
    setState((prev) => ({ ...prev, phase: 'complete' }));
    setIntention(answer);
  }

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-stone-700 tracking-wide">เริ่มจากข้างใน</h1>
          <p className="text-sm text-stone-400 mt-1">Start from Within</p>
        </header>

        {/* ── CHECK-IN ── */}
        {state.phase === 'check_in' && state.currentCard && (
          <PhaseCard title="เช็คอิน" subtitle="Check-In">
            <CardDisplay card={state.currentCard} onNewCard={() => setState((prev) => ({ ...prev, currentCard: getRandomCard('check_in', Array.from(prev.usedCardIds)) }))} />
            {!aiReflection && <PlayerInput onSubmit={handleCheckInSubmit} loading={loading} />}
            {aiReflection && <ReflectionBubble text={aiReflection} />}
          </PhaseCard>
        )}

        {/* ── SITUATION ── */}
        {state.phase === 'situation' && state.currentCard && (
          <PhaseCard title="สถานการณ์" subtitle="Situation">
            <CardDisplay card={state.currentCard} onNewCard={() => setState((prev) => ({ ...prev, currentCard: getRandomCard('situation', Array.from(prev.usedCardIds)) }))} />
            <PlayerInput onSubmit={handleSituationSubmit} loading={loading} placeholder="เล่าให้ฟังสักนิด..." />
          </PhaseCard>
        )}

        {/* ── COPING STANCE ── */}
        {state.phase === 'situation' && !state.currentCard && (
          <PhaseCard title="ท่าทางการรับมือ" subtitle="Coping Stance">
            <div className="text-center flex flex-col gap-1">
              <p className="text-base text-stone-700">เมื่อเผชิญกับสถานการณ์นี้ คุณมักตอบสนองแบบไหน?</p>
              <p className="text-xs text-stone-400">ท่าทีการรับมือของ Satir Model — ไม่มีผิดถูก แค่สังเกตตัวเอง</p>
            </div>
            <div className="flex flex-col gap-2">
              {COPING_STANCES.map((s) => (
                <button key={s.id} onClick={() => handleCopingSelect(s.id)} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 bg-white/70 hover:bg-stone-50 transition-colors text-left">
                  <span className="text-xl">{s.emoji}</span>
                  <div>
                    <div className="text-sm font-medium text-stone-700">{s.label_th} <span className="font-normal text-stone-400">({s.label_en})</span></div>
                    <div className="text-xs text-stone-500 mt-0.5">{s.desc_th}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-400 text-center mt-1">ไม่มีผิดถูก แค่สังเกตตัวเอง</p>
          </PhaseCard>
        )}

        {/* ── EXPLORE ── */}
        {state.phase === 'explore' && (
          <PhaseCard title="สำรวจภูเขาน้ำแข็งของคุณ" subtitle="เลือกชั้นที่อยากสำรวจ — การ์ดจะช่วยพาคุณลงลึก เริ่มจากชั้นไหนก็ได้ ไม่มีผิดถูก">
            <IcebergMap activeLayer={state.currentLayer} stars={state.stars} onLayerSelect={handleLayerSelect} interactive />

            {state.currentCard && state.currentLayer && (
              <div className="flex flex-col gap-4 mt-2">
                <div className="text-xs text-center text-stone-400 uppercase tracking-wider">{LAYER_LABELS[state.currentLayer]}</div>
                <CardDisplay card={state.currentCard} onNewCard={handleNewCardInLayer} />
                {!aiReflection && <PlayerInput onSubmit={handleExploreSubmit} loading={loading} />}
                {aiReflection && (
                  <div className="flex flex-col gap-3">
                    <ReflectionBubble text={aiReflection} />
                    {/* CLINICAL WORDING — approved by Fairy, do not modify */}
                    {state.currentLayer === 'self' && (
                      <button
                        onClick={goToAppreciate}
                        className="self-center px-4 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-sm border border-amber-200 transition-colors text-center leading-snug"
                      >
                        → เมื่อคุณพร้อม เราไปเก็บสิ่งดี ๆ ที่คุณค้นพบ กลับไปดูแลใจตัวเองกันนะคะ
                      </button>
                    )}
                    {state.currentLayer !== 'self' && suggestedLayer && (
                      <button
                        onClick={() => handleLayerSelect(suggestedLayer)}
                        className="self-center px-4 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm border border-indigo-200 transition-colors"
                      >
                        → สำรวจชั้น{LAYER_LABELS[suggestedLayer]}
                      </button>
                    )}
                    <PlayerInput onSubmit={handleExploreSubmit} loading={loading} placeholder="เขียนต่อ หรือเลือกชั้นอื่นบนแผนที่..." />
                    <p className="text-sm text-stone-400 text-center">
                      พิมพ์ต่อเพื่อสำรวจให้ลึกขึ้น · คลิกชั้นเดิมอีกครั้งเพื่อวางดาว ⭐<br />· หรือเลือกชั้นอื่นเพื่อสำรวจต่อ
                    </p>
                  </div>
                )}
              </div>
            )}

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

        {/* ── APPRECIATE ── */}
        {state.phase === 'appreciate' && (
          <PhaseCard title="ชื่นชมตัวเอง" subtitle="Appreciate">

            {/* Step 1 — Star map + layer reflection */}
            {appreciateStep === 1 && (
              <div className="flex flex-col gap-4">
                <IcebergMap stars={state.stars} interactive={false} />
                {loading ? (
                  <p className="text-center text-stone-400 text-sm">กำลังสะท้อนกลับ...</p>
                ) : aiSummary ? (
                  <ReflectionBubble text={aiSummary} />
                ) : null}
                <button onClick={handleAppreciateResourceCardStep} className="self-center px-6 py-3 rounded-full bg-stone-700 hover:bg-stone-800 text-white text-sm font-medium transition-colors">
                  ถัดไป →
                </button>
              </div>
            )}

            {/* Step 2 — Positive Resource card */}
            {appreciateStep === 2 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-stone-500 text-center">การ์ดทรัพยากรภายใน</p>
                {appreciateCard && (
                  <CardDisplay card={appreciateCard} onNewCard={handleAppreciateNewResourceCard} />
                )}
                {!appreciateReflection && <PlayerInput onSubmit={handleAppreciateResourceSubmit} loading={loading} />}
                {appreciateReflection && (
                  <div className="flex flex-col gap-3">
                    <ReflectionBubble text={appreciateReflection} />
                    <button onClick={handleGoToResourceStatement} className="self-center px-6 py-3 rounded-full bg-stone-700 hover:bg-stone-800 text-white text-sm font-medium transition-colors">
                      ถัดไป →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — Resource statement */}
            {appreciateStep === 3 && (
              <div className="flex flex-col gap-4">
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                  <p className="text-sm text-stone-700 text-center leading-relaxed">
                    จากที่สำรวจวันนี้ มีพลังอะไรในตัวคุณที่อยากพกกลับไป?
                  </p>
                </div>
                <textarea
                  value={resourceInput}
                  onChange={(e) => setResourceInput(e.target.value)}
                  placeholder="พลังในตัวฉันที่อยากพกกลับไป..."
                  rows={4}
                  className="w-full rounded-xl border border-stone-200 bg-white/80 px-4 py-3 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none text-base leading-relaxed"
                />
                <button
                  onClick={handleResourceStatementSubmit}
                  disabled={!resourceInput.trim()}
                  className="self-end px-6 py-2 rounded-full bg-stone-700 hover:bg-stone-800 text-white text-sm font-medium transition-colors disabled:opacity-40"
                >
                  บันทึก →
                </button>
              </div>
            )}

            {/* Step 4 — Satir Beliefs card */}
            {appreciateStep === 4 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-stone-500 text-center">อ่านและนั่งอยู่กับมันสักครู่</p>
                {appreciateSatirsCard && (
                  <CardDisplay card={appreciateSatirsCard} onNewCard={handleNewSatirsCard} />
                )}
                <button onClick={handleAppreciateDone} className="self-center px-6 py-3 rounded-full bg-stone-700 hover:bg-stone-800 text-white text-sm font-medium transition-colors mt-2">
                  ถัดไป →
                </button>
              </div>
            )}
          </PhaseCard>
        )}

        {/* ── CHECK-OUT ── */}
        {state.phase === 'check_out' && checkOutCard && (
          <PhaseCard title="เช็คเอาท์" subtitle="Check-Out">
            {/* Show check-in card alongside for comparison */}
            {checkInCard && (
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">คำถามตอนเริ่มต้น</p>
                <p className="text-sm text-stone-500 italic">{checkInCard.question_th}</p>
              </div>
            )}
            <CardDisplay card={checkOutCard} onNewCard={() => setCheckOutCard(getRandomCard('check_out'))} />
            <PlayerInput onSubmit={handleCheckOutSubmit} loading={loading} placeholder="ความตั้งใจของฉันสำหรับวันข้างหน้า..." submitLabel="จบการสำรวจ" />
          </PhaseCard>
        )}

        {/* ── COMPLETE ── */}
        {state.phase === 'complete' && (
          <PhaseCard title="จบการสำรวจ" subtitle="Complete">
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <span className="text-5xl">🌿</span>
                <p className="text-stone-600 mt-2">ขอบคุณที่สำรวจข้างในวันนี้</p>
              </div>

              {/* Star map snapshot */}
              <IcebergMap stars={state.stars} interactive={false} />

              {/* Resource statement */}
              {state.resourceStatement && (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-xs text-emerald-600 uppercase tracking-wider mb-1">พลังที่พกกลับไป</p>
                  <p className="text-sm text-stone-700">{state.resourceStatement}</p>
                </div>
              )}

              {/* Intention */}
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
                  setHasReflection(false);
                  setAiSummary('');
                  setCheckOutCard(null);
                  setIntention('');
                  setAppreciateStep(1);
                  setAppreciateCard(null);
                  setAppreciateSatirsCard(null);
                  setAppreciateReflection('');
                  setResourceInput('');
                  setCheckInCard(null);
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
