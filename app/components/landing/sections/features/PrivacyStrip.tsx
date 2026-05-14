import { Lock } from 'lucide-react';

interface PrivacyStripProps {
  title: string;
  body: string;
}

const TAGS = ['EU-HOSTED', 'GDPR', 'AES-256', 'EXPORT', 'NO ADS', 'NO MODEL TRAINING'] as const;

export function PrivacyStrip({ title, body }: PrivacyStripProps) {
  return (
    <div
      data-testid="bento-card"
      data-span="6"
      className="rounded-2xl border border-white/10 p-6 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8"
      style={{
        background:
          'linear-gradient(120deg, color-mix(in oklab, var(--landing-bg-2) 92%, var(--grad-b) 5%), var(--landing-bg-2))',
      }}
    >
      <div className="flex flex-col gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] opacity-80">
          <Lock size={16} aria-hidden="true" />
        </span>
        <h4 className="landing-display text-[18px] leading-tight">{title}</h4>
        <p className="text-[14.5px] leading-relaxed opacity-70">{body}</p>
      </div>
      <ul className="mt-4 flex flex-wrap items-center gap-2 lg:mt-0 lg:justify-end">
        {TAGS.map((t) => (
          <li
            key={t}
            className="landing-mono inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] tracking-[0.08em] uppercase opacity-80"
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
