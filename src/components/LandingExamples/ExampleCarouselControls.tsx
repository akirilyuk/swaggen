import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  index: number;
  total: number;
  onStep: (delta: number) => void;
};

export function ExampleCarouselControls({ index, total, onStep }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          onClick={() => onStep(-1)}
          aria-label="Previous example"
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          onClick={() => onStep(1)}
          aria-label="Next example"
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        {index + 1} / {total}
      </p>
    </div>
  );
}
