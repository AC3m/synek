import { useTranslation } from 'react-i18next';
import { Bell, Dumbbell, LineChart, Search, Target } from 'lucide-react';
import { LogoLink } from '../LogoLink';
import { cn } from '~/lib/utils';

export type MockTab = 'training' | 'goals' | 'analytics';

interface MockAppBarProps {
  activeTab?: MockTab;
  hasUnread?: boolean;
  avatarInitials?: string;
}

const TAB_ICON = {
  training: Dumbbell,
  goals: Target,
  analytics: LineChart,
} as const;

const TABS: MockTab[] = ['training', 'goals', 'analytics'];

export function MockAppBar({
  activeTab = 'training',
  hasUnread = true,
  avatarInitials,
}: MockAppBarProps) {
  const { t } = useTranslation('landing');
  const initials = avatarInitials ?? t('mock.appBar.avatarInitials');
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5">
      <div className="flex items-center gap-5">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
          <LogoLink size={16} />
          SYNEK
        </span>
        <div role="tablist" className="flex items-center gap-1">
          {TABS.map((tab) => {
            const Icon = TAB_ICON[tab];
            const selected = activeTab === tab;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={selected}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px]',
                  selected ? 'bg-white/10 text-white' : 'opacity-70 hover:opacity-100',
                )}
              >
                <Icon size={13} aria-hidden="true" />
                {t(`mock.appBar.${tab}` as never)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t('mock.appBar.search')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 opacity-80 hover:opacity-100"
        >
          <Search size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={t('mock.appBar.notifications')}
          className="relative inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 opacity-80 hover:opacity-100"
        >
          <Bell size={14} aria-hidden="true" />
          {hasUnread ? (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-400"
            />
          ) : null}
        </button>
        <span
          aria-label={t('mock.appBar.avatar')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[image:var(--grad)] text-[11px] font-semibold text-white"
        >
          {initials}
        </span>
      </div>
    </div>
  );
}
