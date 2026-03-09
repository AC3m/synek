import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuth } from '~/lib/context/AuthContext';
import { useLocalePath } from '~/lib/hooks/useLocalePath';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

export function AthletePicker() {
  const { athletes, selectAthlete } = useAuth();
  const { t } = useTranslation('coach');
  const localePath = useLocalePath();

  if (athletes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <Users className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          {t('athletePicker.noAthletes')}
        </p>
        <Link
          to={localePath('/settings?tab=athletes')}
          className="text-sm text-primary underline hover:text-primary/80"
        >
          {t('athletePicker.noAthletesHint')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold">{t('athletePicker.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('athletePicker.subtitle')}
          </p>
        </div>

        <div className="space-y-2">
          {athletes.map((athlete) => (
            <Card
              key={athlete.id}
              className="cursor-pointer transition-colors hover:border-primary hover:bg-accent"
              onClick={() => selectAthlete(athlete.id)}
            >
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-base">{athlete.name}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
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
        </div>
      </div>
    </div>
  );
}
