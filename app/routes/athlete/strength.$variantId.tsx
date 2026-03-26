import { Navigate, useParams } from 'react-router';
import { VariantDetailView } from '~/components/strength/VariantDetailView';
import { useAuth } from '~/lib/context/AuthContext';
import { useSelfPlanPermission } from '~/lib/hooks/useProfile';

export default function AthleteStrengthVariantDetail() {
  const { locale = 'pl', variantId } = useParams<{ locale?: string; variantId: string }>();
  const { user } = useAuth();
  const { data: canEdit = false } = useSelfPlanPermission(user?.id ?? '');

  if (variantId === 'new') return <Navigate to={`/${locale}/athlete/strength`} replace />;

  return (
    <VariantDetailView
      variantId={variantId!}
      canEdit={canEdit}
      baseRoute={`/${locale}/athlete/strength`}
    />
  );
}
