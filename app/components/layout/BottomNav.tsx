import { CalendarDays, Settings, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { cn } from '~/lib/utils'
import { useAuth } from '~/lib/context/AuthContext'
import { useLocalePath } from '~/lib/hooks/useLocalePath'

interface NavItemProps {
  to: string
  icon: React.ElementType
  label: string
  isActive: boolean
  onClick?: (e: React.MouseEvent) => void
}

function NavItem({ to, icon: Icon, label, isActive, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] py-2"
    >
      <Icon
        className={cn(
          'h-5 w-5 transition-colors',
          isActive ? 'text-foreground' : 'text-[color:var(--foreground-tertiary)]'
        )}
        strokeWidth={isActive ? 2 : 1.5}
      />
      <span
        className={cn(
          'text-[10px] font-medium transition-colors',
          isActive ? 'text-foreground' : 'text-[color:var(--foreground-tertiary)]'
        )}
      >
        {label}
      </span>
    </NavLink>
  )
}

export function BottomNav() {
  const { t } = useTranslation('common')
  const { user, selectedAthleteId, clearSelectedAthlete } = useAuth()
  const localePath = useLocalePath()
  const { pathname } = useLocation()

  if (!user) return null

  const isTeamActive = user.role === 'coach' && !selectedAthleteId && pathname.includes('/coach')
  const isWeekActive = pathname.includes('/week') && (user.role === 'athlete' || !!selectedAthleteId)
  const isSettingsActive = pathname.includes('/settings')

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[color:var(--separator)] bg-surface-1/90 backdrop-blur-md pb-safe">
      <div className="flex items-stretch h-14">
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
          to={localePath('/settings')}
          icon={Settings}
          label={t('nav.settings')}
          isActive={isSettingsActive}
        />
      </div>
    </nav>
  )
}
