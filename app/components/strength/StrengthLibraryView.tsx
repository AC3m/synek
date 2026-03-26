import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { AppLoader } from '~/components/ui/app-loader';
import { VariantCard } from '~/components/strength/VariantCard';
import { VariantProgressModal } from '~/components/strength/VariantProgressModal';
import { StrengthEmptyState } from '~/components/strength/StrengthEmptyState';
import { VariantFormModal } from '~/components/strength/VariantFormModal';
import { useStrengthVariants, useDeleteStrengthVariant } from '~/lib/hooks/useStrengthVariants';
import type { StrengthVariant } from '~/types/training';

interface StrengthLibraryViewProps {
  userId: string;
  canManage: boolean;
  baseRoute: string;
}

export function StrengthLibraryView({ userId, canManage, baseRoute }: StrengthLibraryViewProps) {
  const { t } = useTranslation('training');
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [progressVariantId, setProgressVariantId] = useState<string | null>(null);

  const { data: variants = [], isLoading } = useStrengthVariants(userId);
  const deleteVariant = useDeleteStrengthVariant(userId);

  const filteredVariants = useMemo(() => {
    if (!searchQuery.trim()) return variants;
    const q = searchQuery.toLowerCase();
    return variants.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.exercises.some((ex) => ex.name.toLowerCase().includes(q)),
    );
  }, [variants, searchQuery]);

  const showSearch = variants.length >= 4;

  function handleCreated(variant: StrengthVariant) {
    navigate(`${baseRoute}/${variant.id}`);
  }

  function handleEdit(id: string) {
    navigate(`${baseRoute}/${id}`);
  }

  function handleDelete(id: string) {
    deleteVariant.mutate(id, {
      onSuccess: () => {
        toast(t('strength.variant.deleteConfirm'), { duration: 5000 });
      },
    });
  }

  if (isLoading) return <AppLoader />;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('strength.variant.library')}</h1>
        {canManage && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            {t('strength.variant.new')}
          </Button>
        )}
      </div>

      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('strength.variant.searchPlaceholder')}
            className="pl-9"
            aria-label={t('strength.variant.searchPlaceholder')}
          />
        </div>
      )}

      {variants.length === 0 ? (
        <StrengthEmptyState
          heading={t('strength.empty.noVariants.heading')}
          body={t('strength.empty.noVariants.body')}
          actionLabel={canManage ? t('strength.variant.new') : undefined}
          onAction={canManage ? () => setModalOpen(true) : undefined}
        />
      ) : filteredVariants.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t('strength.variant.searchEmpty')}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredVariants.map((variant) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              onEdit={canManage ? handleEdit : undefined}
              onDelete={canManage ? handleDelete : undefined}
              onViewProgress={setProgressVariantId}
            />
          ))}
        </div>
      )}

      {canManage && (
        <VariantFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
        />
      )}

      <VariantProgressModal
        variantId={progressVariantId}
        userId={userId}
        onClose={() => setProgressVariantId(null)}
      />
    </div>
  );
}
