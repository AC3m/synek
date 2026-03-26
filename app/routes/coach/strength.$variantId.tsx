import { Navigate, useParams } from 'react-router';
import { VariantDetailView } from '~/components/strength/VariantDetailView';

export default function CoachStrengthVariantDetail() {
  const { locale = 'pl', variantId } = useParams<{ locale?: string; variantId: string }>();

  if (variantId === 'new') return <Navigate to={`/${locale}/coach/strength`} replace />;

  return (
    <VariantDetailView
      variantId={variantId!}
      canEdit={true}
      baseRoute={`/${locale}/coach/strength`}
    />
  );
}
