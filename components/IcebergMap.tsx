'use client';

import type { IcebergLayer, StarToken } from '@/lib/types';

interface LayerConfig {
  id: IcebergLayer;
  label_th: string;
  label_en: string;
  color: string;
  hoverColor: string;
  widthPct: number; // grows wider top→bottom
  description_th: string;
}

// Width increases from top (behavior) to bottom (self) — correct Satir iceberg shape
const LAYERS: LayerConfig[] = [
  { id: 'behavior',              label_th: 'พฤติกรรม',                  label_en: 'Behavior',                color: 'bg-sky-200',     hoverColor: 'hover:bg-sky-300',     widthPct: 45, description_th: 'สิ่งที่คนอื่นมองเห็น' },
  { id: 'coping',                label_th: 'ท่าทางการรับมือ',            label_en: 'Coping Stances',          color: 'bg-blue-200',    hoverColor: 'hover:bg-blue-300',    widthPct: 52, description_th: 'วิธีที่เราปกป้องตัวเอง' },
  { id: 'feelings',              label_th: 'ความรู้สึก',                 label_en: 'Feelings',                color: 'bg-indigo-200',  hoverColor: 'hover:bg-indigo-300',  widthPct: 60, description_th: 'อารมณ์ที่เราสัมผัส' },
  { id: 'feelings_about_feelings', label_th: 'ความรู้สึกต่อความรู้สึก', label_en: 'Feelings About Feelings', color: 'bg-violet-200',  hoverColor: 'hover:bg-violet-300',  widthPct: 67, description_th: 'ทัศนคติต่ออารมณ์ของตัวเอง' },
  { id: 'perceptions',           label_th: 'การรับรู้',                  label_en: 'Perceptions',             color: 'bg-purple-200',  hoverColor: 'hover:bg-purple-300',  widthPct: 74, description_th: 'ความคิดและการตีความ' },
  { id: 'expectations',          label_th: 'ความคาดหวัง',               label_en: 'Expectations',            color: 'bg-fuchsia-200', hoverColor: 'hover:bg-fuchsia-300', widthPct: 80, description_th: 'สิ่งที่เราหวังจากตัวเองและผู้อื่น' },
  { id: 'yearnings',             label_th: 'ความปรารถนาลึกๆ',           label_en: 'Yearnings',               color: 'bg-rose-200',    hoverColor: 'hover:bg-rose-300',    widthPct: 87, description_th: 'ความต้องการพื้นฐานของหัวใจ' },
  { id: 'self',                  label_th: 'ตัวตน / พลังชีวิต',         label_en: 'Self / Life Force',       color: 'bg-amber-200',   hoverColor: 'hover:bg-amber-300',   widthPct: 100, description_th: 'แก่นแท้ของเรา' },
];

interface Props {
  activeLayer?: IcebergLayer | null;
  stars: StarToken[];
  onLayerSelect?: (layer: IcebergLayer) => void;
  interactive?: boolean;
}

export default function IcebergMap({ activeLayer, stars, onLayerSelect, interactive = false }: Props) {
  const starCountFor = (layer: IcebergLayer) => stars.filter((s) => s.layer === layer).length;
  const totalStars = stars.length;

  return (
    <div className="flex flex-col items-center gap-1 py-2 select-none">
      {/* Header row */}
      <div className="flex items-center justify-between w-full mb-1 px-1">
        <div className="text-xs text-stone-400 tracking-wider uppercase">ส่วนที่มองเห็น</div>
        {interactive && (
          <div className="text-xs text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">
            ⭐ {totalStars} ดวง
          </div>
        )}
      </div>

      {LAYERS.map((layer, index) => {
        const isActive = activeLayer === layer.id;
        const count = starCountFor(layer.id);
        const isBelowWater = index >= 2;
        const isTopLayer = index === 0;
        const isBottomLayer = index === LAYERS.length - 1;

        return (
          <div key={layer.id} className="w-full flex flex-col items-center">
            {/* Waterline between coping (index 1) and feelings (index 2) */}
            {index === 2 && (
              <div className="w-full flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-blue-300/60" />
                <span className="text-xs text-blue-400 tracking-widest">〰 เส้นน้ำ 〰</span>
                <div className="flex-1 h-px bg-blue-300/60" />
              </div>
            )}

            <div className="w-full flex items-center justify-center relative">
              <button
                onClick={() => interactive && onLayerSelect?.(layer.id)}
                disabled={!interactive}
                style={{ width: `${layer.widthPct}%` }}
                className={[
                  'transition-all duration-200 rounded-lg flex items-center justify-center gap-2 px-2 h-11',
                  layer.color,
                  interactive ? `${layer.hoverColor} cursor-pointer` : 'cursor-default',
                  isActive ? 'ring-2 ring-offset-1 ring-stone-600 scale-105 shadow-md' : '',
                  isBelowWater ? 'opacity-90' : '',
                  interactive && isTopLayer && !isActive ? 'animate-pulse-subtle' : '',
                  isBottomLayer ? 'h-14' : '',
                ].join(' ')}
                title={layer.description_th}
              >
                <span className="text-xs font-medium text-stone-700 text-center leading-tight min-w-0">
                  {layer.label_th}
                </span>
                {count > 0 && (
                  <span className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                      <span key={i} className="text-sm leading-none">⭐</span>
                    ))}
                    {count > 5 && <span className="text-xs text-stone-600">+{count - 5}</span>}
                  </span>
                )}
              </button>

              {/* "Start here" hint on top layer */}
              {interactive && isTopLayer && !isActive && (
                <span className="absolute right-0 text-xs text-sky-500 font-medium whitespace-nowrap pointer-events-none">
                  เริ่มต้นที่นี่ ↓
                </span>
              )}
            </div>
          </div>
        );
      })}

      <div className="text-xs text-stone-400 mt-1 tracking-wider uppercase">แก่นแท้</div>
    </div>
  );
}
