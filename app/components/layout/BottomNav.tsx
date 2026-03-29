import { BarChart3, CalendarDays, Dumbbell, Trophy, Settings, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';
import { cn } from '~/lib/utils';
import { useAuth } from '~/lib/context/AuthContext';
import { useLocalePath } from '~/lib/hooks/useLocalePath';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

function NavItem({ to, icon: Icon, label, isActive, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-2"
    >
      <Icon
        className={cn(
          'h-5 w-5 transition-colors',
          isActive ? 'text-foreground' : 'text-[color:var(--foreground-tertiary)]',
        )}
        strokeWidth={isActive ? 2 : 1.5}
      />
      <span
        className={cn(
          'text-[10px] font-medium transition-colors',
          isActive ? 'text-foreground' : 'text-[color:var(--foreground-tertiary)]',
        )}
      >
        {label}
      </span>
    </NavLink>
  );
}

export function BottomNav() {
  const { t } = useTranslation('common');
  const { user, isLoading, selectedAthleteId, clearSelectedAthlete } = useAuth();
  const localePath = useLocalePath();
  const { pathname } = useLocation();

  if (isLoading || !user) return null;

  const isTeamActive = user.role === 'coach' && !selectedAthleteId && pathname.includes('/coach');
  const isWeekActive =
    pathname.includes('/week') && (user.role === 'athlete' || !!selectedAthleteId);
  const isStrengthActive = pathname.includes('/strength');
  const isGoalsActive = pathname.includes('/goals');
  const isAnalyticsActive = pathname.includes('/analytics');
  const isSettingsActive = pathname.includes('/settings');

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--separator)] bg-surface-1/90 backdrop-blur-md md:hidden">
      <div className="flex h-14 items-stretch">
        <NavItem
          to={localePath(`/${user.role}`)}
          icon={CalendarDays}
          label={t('nav.week')}
          isActive={isWeekActive}
        />
        {user.role === 'coach' && (
          <NavItem
            to={localePath('/coach')}
            icon={Users}
            label={t('nav.team')}
            isActive={isTeamActive}
            onClick={() => clearSelectedAthlete?.()}
          />
        )}
        <NavItem
          to={localePath(`/${user.role}/strength`)}
          icon={Dumbbell}
          label={t('nav.strength')}
          isActive={isStrengthActive}
        />
        <NavItem
          to={localePath(`/${user.role}/goals`)}
          icon={Trophy}
          label={t('nav.goals')}
          isActive={isGoalsActive}
        />
        <NavItem
          to={localePath(`/${user.role}/analytics`)}
          icon={BarChart3}
          label={t('nav.analytics')}
          isActive={isAnalyticsActive}
        />
        <NavItem
          to={localePath('/settings')}
          icon={Settings}
          label={t('nav.settings')}
          isActive={isSettingsActive}
        />
      </div>
    </nav>
  );
}
