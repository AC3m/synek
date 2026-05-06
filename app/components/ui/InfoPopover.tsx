import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';

interface InfoPopoverProps {
  content: React.ReactNode;
}

export function InfoPopover({ content }: InfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
          aria-label="More information"
        >
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-sm">{content}</PopoverContent>
    </Popover>
  );
}
