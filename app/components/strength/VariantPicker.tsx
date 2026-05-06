import { useState, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet';
import { useIsMobile } from '~/lib/hooks/useIsMobile';
import type { StrengthVariant } from '~/types/training';

interface VariantPickerProps {
  variants: StrengthVariant[];
  selectedVariantId: string | null;
  recentVariantIds?: string[];
  onSelect: (variantId: string | null) => void;
  className?: string;
}

export function VariantPicker({
  variants,
  selectedVariantId,
  recentVariantIds = [],
  onSelect,
  className,
}: VariantPickerProps) {
  const { t } = useTranslation('training');
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  const filteredVariants = useMemo(() => {
    if (!search.trim()) return variants;
    const q = search.toLowerCase();
    return variants.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.exercises.some((ex) => ex.name.toLowerCase().includes(q)),
    );
  }, [variants, search]);

  const recentVariants = useMemo(
    () => variants.filter((v) => recentVariantIds.includes(v.id)).slice(0, 3),
    [variants, recentVariantIds],
  );

  function handleSelect(id: string | null) {
    onSelect(id);
    setOpen(false);
    setSearch('');
  }

  const trigger = (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={() => setOpen(true)}
      className={cn(
        'flex min-h-[40px] w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent',
        className,
      )}
    >
      <span className={cn(!selectedVariant && 'text-muted-foreground')}>
        {selectedVariant ? selectedVariant.name : t('strength.variant.selectVariant')}
      </span>
      <ChevronDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
    </button>
  );

  const listContent = (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="pl-9"
          aria-label="Search variants"
          autoFocus={!isMobile}
        />
      </div>

      {/* Detach option when a variant is selected */}
      {selectedVariantId && (
        <button
          type="button"
          role="option"
          aria-selected={false}
          onClick={() => handleSelect(null)}
          className="flex min-h-[48px] items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
        >
          <X className="size-4" />
          {t('strength.variant.detachVariant')}
        </button>
      )}

      {/* Recently used section */}
      {recentVariants.length > 0 && !search && (
        <div>
          <p className="px-3 py-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {t('strength.variant.recentlyUsed')}
          </p>
          <ul role="listbox">
            {recentVariants.map((v) => (
              <VariantOption
                key={v.id}
                variant={v}
                isSelected={v.id === selectedVariantId}
                onSelect={handleSelect}
              />
            ))}
          </ul>
        </div>
      )}

      {/* All variants */}
      <ul role="listbox" aria-label={t('strength.variant.selectVariant')}>
        {filteredVariants.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">
            {t('strength.variant.noVariants')}
          </li>
        ) : (
          filteredVariants.map((v) => (
            <VariantOption
              key={v.id}
              variant={v}
              isSelected={v.id === selectedVariantId}
              onSelect={handleSelect}
            />
          ))
        )}
      </ul>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
          >
            <SheetHeader>
              <SheetTitle>{t('strength.variant.selectVariant')}</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{listContent}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: inline dropdown
  return (
    <div className="relative">
      {trigger}
      {open && (
        <>
          {/* Click-away overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-[280px] rounded-md border bg-popover p-2 shadow-md">
            {listContent}
          </div>
        </>
      )}
    </div>
  );
}

interface VariantOptionProps {
  variant: StrengthVariant;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function VariantOption({ variant, isSelected, onSelect }: VariantOptionProps) {
  const previewExercises = variant.exercises.slice(0, 2);
  return (
    <li role="option" aria-selected={isSelected}>
      <button
        type="button"
        onClick={() => onSelect(variant.id)}
        className={cn(
          'flex min-h-[48px] w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
          isSelected && 'bg-accent font-medium',
        )}
      >
        <span className="font-medium">{variant.name}</span>
        {previewExercises.length > 0 && (
          <span className="mt-0.5 text-xs text-muted-foreground">
            {previewExercises.map((ex) => ex.name).join(', ')}
            {variant.exercises.length > 2 ? ` +${variant.exercises.length - 2}` : ''}
          </span>
        )}
      </button>
    </li>
  );
}
