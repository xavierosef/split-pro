import { Check, ChevronRight } from 'lucide-react';
import React from 'react';
import { AppDrawer, AppDrawerClose } from '~/components/ui/drawer';
import { cn } from '~/lib/utils';

interface Option {
  key: string;
  label: string;
}

// Meme grammaire que les lignes du formulaire d'ajout : libelle a gauche,
// valeur a droite, le tiroir s'ouvre au clic n'importe ou sur la ligne.
export const ChoiceRow: React.FC<{
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: Option[];
  onPick: (key: string) => void;
  title?: string;
}> = ({ label, icon, value, options, onPick, title }) => (
  <AppDrawer
    title={title ?? label}
    className="h-auto"
    trigger={
      <button
        type="button"
        style={{ justifyContent: 'space-between', textAlign: 'left' }}
        className="flex min-h-11 w-full items-center gap-4"
      >
        <span className="text-md flex items-center gap-4">
          {icon}
          {label}
        </span>
        <span className="flex min-w-0 items-center gap-1">
          <span className="text-muted-foreground truncate">
            {options.find((o) => o.key === value)?.label ?? value}
          </span>
          <ChevronRight className="size-6 shrink-0 text-gray-500" />
        </span>
      </button>
    }
  >
    <div className="flex flex-col pb-4">
      {options.map((option) => (
        <AppDrawerClose asChild key={option.key}>
          <button
            type="button"
            onClick={() => onPick(option.key)}
            style={{ justifyContent: 'space-between', textAlign: 'left' }}
            className="hover:bg-muted/40 flex min-h-14 w-full items-center rounded-xl px-4 text-base"
          >
            <span className={cn(option.key === value && 'text-primary font-medium')}>
              {option.label}
            </span>
            {option.key === value && <Check className="text-primary size-5" />}
          </button>
        </AppDrawerClose>
      ))}
    </div>
  </AppDrawer>
);
