export const AUTOFOCUS_KEY = 'cna-add-autofocus';

export type AutoFocusTarget = 'amount' | 'description' | 'none';

export const AUTOFOCUS_TARGETS: AutoFocusTarget[] = ['amount', 'description', 'none'];

export const getAutoFocusTarget = (): AutoFocusTarget => {
  if ('undefined' === typeof window) {
    return 'amount';
  }
  const stored = localStorage.getItem(AUTOFOCUS_KEY) as AutoFocusTarget | null;
  return stored && AUTOFOCUS_TARGETS.includes(stored) ? stored : 'amount';
};

export const setAutoFocusTarget = (target: AutoFocusTarget) =>
  localStorage.setItem(AUTOFOCUS_KEY, target);
