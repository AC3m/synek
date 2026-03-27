import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';

interface AthleteFeedbackProps {
  notes: string | null;
  onChange: (notes: string | null) => void;
}

export function AthleteFeedback({ notes, onChange }: AthleteFeedbackProps) {
  const { t } = useTranslation('athlete');
  const [expanded, setExpanded] = useState(!!notes);
  const [value, setValue] = useState(notes ?? '');

  const handleBlur = () => {
    const trimmed = value.trim() || null;
    if (trimmed !== notes) {
      onChange(trimmed);
    }
  };

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <MessageSquare className="h-2.5 w-2.5" />
        {notes ? t('feedback.addNotes') : t('feedback.addNotes')}
        {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      </button>

      {expanded && (
        <Textarea
          placeholder={t('feedback.placeholder')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          rows={2}
          className="mt-1 min-h-[50px] text-xs"
        />
      )}
    </div>
  );
}
