// a settings form is dirty by value, not by identity: a toggle flipped back to its original state,
// or a rebuilt array holding the same members, counts as clean
const hasUnsavedChanges = (values: unknown, baseline: unknown) =>
  JSON.stringify(values) !== JSON.stringify(baseline);

export type TSettingsSectionPosition = {
  id: string;
  top: number;
};

// the active section is the last one that scrolled past the activation line, the first one
// stays active while the page is still above that line
const pickActiveSectionId = (
  sections: TSettingsSectionPosition[],
  activationOffset: number
) => {
  if (sections.length === 0) return '';

  let activeId = sections[0].id;

  for (const section of sections) {
    if (section.top > activationOffset) break;

    activeId = section.id;
  }

  return activeId;
};

// every mounted section owns a form, the shell keeps them apart so the draft of one section
// never takes the slot of another one
const registerForm = <T>(
  registry: Record<string, T>,
  id: string,
  handle: T
) => ({
  ...registry,
  [id]: handle
});

const unregisterForm = <T>(
  registry: Record<string, T>,
  id: string,
  handle: T
) => {
  if (registry[id] !== handle) return registry;

  const next = { ...registry };
  delete next[id];

  return next;
};

const dirtyForms = <T extends { isDirty: boolean }>(forms: T[]) =>
  forms.filter((form) => form.isDirty);

// leaving the settings asks for confirmation while any section still holds unsaved edits
const hasUnsavedWork = <T extends { isDirty: boolean }>(
  registry: Record<string, T>
) => dirtyForms(Object.values(registry)).length > 0;

export type TSettingsDraft<T> = {
  values: T;
  baseline: T;
};

// discard restores the saved values and drops the edits, the draft is clean again afterwards
const discardDraft = <T>(draft: TSettingsDraft<T>): TSettingsDraft<T> => ({
  values: draft.baseline,
  baseline: draft.baseline
});

export {
  dirtyForms,
  discardDraft,
  hasUnsavedChanges,
  hasUnsavedWork,
  pickActiveSectionId,
  registerForm,
  unregisterForm
};
