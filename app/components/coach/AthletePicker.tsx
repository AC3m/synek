import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuth } from '~/lib/context/AuthContext';
import { useLocalePath } from '~/lib/hooks/useLocalePath';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

export function AthletePicker() {
  const { user, athletes, selectAthlete } = useAuth();
  const { t } = useTranslation('coach');
  const localePath = useLocalePath();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-sm space-y-4">
        <div className="space-y-1 text-center">
          <h2 className="text-xl font-semibold">{t('athletePicker.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('athletePicker.subtitle')}</p>
        </div>

        <div className="space-y-2">
          {/* Coach's own plan — always first, visually distinct */}
          {user && (
            <Card
              data-testid="myself-card"
              className="cursor-pointer border-primary/40 bg-primary/5 transition-colors hover:border-primary hover:bg-primary/10"
              onClick={() => selectAthlete(user.id)}
            >
              <CardHeader className="px-4 pt-4 pb-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{t('athletePicker.myself')}</CardTitle>
                  <Badge
                    variant="secondary"
                    className="border-0 bg-primary/15 px-1.5 py-0 text-[10px] text-primary"
                  >
                    {t('athletePicker.myselfBadge')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-sm text-muted-foreground">{t('athletePicker.myselfSubtitle')}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAthlete(user.id);
                  }}
                >
                  {t('athletePicker.viewPlan')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Athlete cards */}
          {athletes.map((athlete) => (
            <Card
              key={athlete.id}
              className="cursor-pointer transition-colors hover:border-primary hover:bg-accent"
              onClick={() => selectAthlete(athlete.id)}
            >
              <CardHeader className="px-4 pt-4 pb-1">
                <CardTitle className="text-base">{athlete.name}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-sm text-muted-foreground">{athlete.email}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAthlete(athlete.id);
                  }}
                >
                  {t('athletePicker.viewPlan')}
                </Button>
              </CardContent>
            </Card>
          ))}

          {athletes.length === 0 && (
            <div className="space-y-3 pt-4 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{t('athletePicker.noAthletes')}</p>
              <Link
                to={localePath('/settings?tab=athletes')}
                className="text-sm text-primary underline hover:text-primary/80"
              >
                {t('athletePicker.noAthletesHint')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
