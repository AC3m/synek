import { Check } from 'lucide-react';

interface PerspectiveBulletProps {
  title: string;
  body: string;
}

export function PerspectiveBullet({ title, body }: PerspectiveBulletProps) {
  return (
    <div
      data-testid="perspective-bullet"
      className="flex flex-col gap-1 border-t border-white/10 pt-4"
    >
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-white"
          style={{ background: 'var(--grad)' }}
          aria-hidden="true"
        >
          <Check size={11} />
        </span>
        <span className="text-[15px] font-semibold">{title}</span>
      </div>
      <p className="pl-[30px] text-[13.5px] leading-relaxed opacity-70">{body}</p>
    </div>
  );
}
