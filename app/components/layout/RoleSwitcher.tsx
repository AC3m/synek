import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';

export function RoleSwitcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const currentRole = location.pathname.startsWith('/trainee')
    ? 'trainee'
    : 'coach';

  const handleRoleChange = (role: string) => {
    if (role !== currentRole) {
      navigate(`/${role}`);
    }
  };

  return (
    <Tabs value={currentRole} onValueChange={handleRoleChange}>
      <TabsList>
        <TabsTrigger value="coach">{t('nav.coach')}</TabsTrigger>
        <TabsTrigger value="trainee">{t('nav.trainee')}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
