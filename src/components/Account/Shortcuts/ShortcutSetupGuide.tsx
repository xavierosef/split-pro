import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import React, { useCallback, useState } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { Button } from '~/components/ui/button';

const GUIDE_STEPS = [
  'step_trigger',
  'step_request',
  'step_auth',
  'step_body',
  'step_notification',
  'step_test',
] as const;

const CopyableBlock: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-start gap-2">
        <code className="bg-muted min-w-0 flex-1 rounded-md p-2 text-xs break-all">{value}</code>
        <Button variant="ghost" size="sm" onClick={onCopy} aria-label={label}>
          {copied ? <Check className="size-4 text-teal-500" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
};

/**
 * The shortcut is built by hand in the Shortcuts app, so the screen has to hand over
 * the two things the user cannot guess: the endpoint URL and the JSON body.
 */
export const ShortcutSetupGuide: React.FC<{ baseUrl: string }> = ({ baseUrl }) => {
  const { t } = useTranslation();

  const endpoint = `${baseUrl}/api/shortcuts/expense`;
  const body = `{"amount": "<Amount>", "merchant": "<Merchant>", "date": "<Date>"}`;

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="guide">
        <AccordionTrigger className="text-base">{t('shortcuts.guide.title')}</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4">
          <CopyableBlock label={t('shortcuts.guide.endpoint')} value={endpoint} />
          <CopyableBlock label={t('shortcuts.guide.body')} value={body} />

          <ol className="flex list-decimal flex-col gap-2 pl-4 text-sm text-gray-400">
            {GUIDE_STEPS.map((step) => (
              <li key={step}>{t(`shortcuts.guide.${step}`)}</li>
            ))}
          </ol>

          <p className="text-xs text-gray-500">{t('shortcuts.guide.fallback')}</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
