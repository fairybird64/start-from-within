'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (text: string) => void;
  placeholder?: string;
  submitLabel?: string;
  loading?: boolean;
}

export default function PlayerInput({
  onSubmit,
  placeholder = 'เขียนสิ่งที่อยู่ในใจ...',
  submitLabel = 'ส่ง',
  loading = false,
}: Props) {
  const [text, setText] = useState('');

  function handleSubmit() {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-stone-200 bg-white/80 px-4 py-3 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none text-base leading-relaxed"
      />
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || loading}
        className="self-end px-6 py-2 rounded-full bg-stone-700 hover:bg-stone-800 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? '...' : submitLabel}
      </button>
    </div>
  );
}
