import { describe, expect, test } from 'bun:test';
import {
  dirtyForms,
  discardDraft,
  hasUnsavedChanges,
  hasUnsavedWork,
  pickActiveSectionId,
  registerForm,
  unregisterForm
} from '../helpers';

type TTestForm = {
  isDirty: boolean;
  isSaving: boolean;
};

const cleanForm: TTestForm = { isDirty: false, isSaving: false };
const dirtyForm: TTestForm = { isDirty: true, isSaving: false };

describe('hasUnsavedChanges', () => {
  test('should report a form matching its baseline as clean', () => {
    expect(hasUnsavedChanges({ name: 'general' }, { name: 'general' })).toBe(
      false
    );
  });

  test('should report an edited field as dirty', () => {
    expect(hasUnsavedChanges({ name: 'edited' }, { name: 'general' })).toBe(
      true
    );
  });

  // the save bar must disappear again when a toggle is flipped twice, so the comparison is by
  // value and never by object identity
  test('should report a toggle flipped back to its original state as clean', () => {
    const baseline = { enabled: false };
    const flipped = { ...baseline, enabled: true };
    const flippedBack = { ...flipped, enabled: false };

    expect(hasUnsavedChanges(flipped, baseline)).toBe(true);
    expect(hasUnsavedChanges(flippedBack, baseline)).toBe(false);
  });

  // role permissions and channel overrides hand back a rebuilt array on every toggle
  test('should compare arrays by their members, not by reference', () => {
    expect(
      hasUnsavedChanges({ permissions: [1, 2] }, { permissions: [1, 2] })
    ).toBe(false);
    expect(
      hasUnsavedChanges({ permissions: [2, 1] }, { permissions: [1, 2] })
    ).toBe(true);
  });

  // an untouched image is absent from the draft, picking one adds the key
  test('should treat an added optional key as dirty', () => {
    expect(
      hasUnsavedChanges({ bio: '', avatar: { fileId: 'a' } }, { bio: '' })
    ).toBe(true);
    expect(hasUnsavedChanges({ bio: '', avatar: undefined }, { bio: '' })).toBe(
      false
    );
  });
});

describe('pickActiveSectionId', () => {
  test('should report no active section for a page without sections', () => {
    expect(pickActiveSectionId([], 32)).toBe('');
  });

  // the page opens above the first section, that one is the active one
  test('should keep the first section active while the page is above it', () => {
    const sections = [
      { id: 'general', top: 32 },
      { id: 'permissions', top: 420 }
    ];

    expect(pickActiveSectionId(sections, 32)).toBe('general');
  });

  test('should hand over to the section that scrolled past the activation line', () => {
    const sections = [
      { id: 'general', top: -120 },
      { id: 'permissions', top: 18 }
    ];

    expect(pickActiveSectionId(sections, 32)).toBe('permissions');
  });

  // the last section stays active when the page rests at its bottom
  test('should keep the last section active at the bottom of the page', () => {
    const sections = [
      { id: 'general', top: -900 },
      { id: 'permissions', top: -380 }
    ];

    expect(pickActiveSectionId(sections, 32)).toBe('permissions');
  });

  test('should skip a section that did not reach the activation line yet', () => {
    const sections = [
      { id: 'general', top: 32 },
      { id: 'permissions', top: 260 }
    ];

    expect(pickActiveSectionId(sections, 32)).toBe('general');
  });
});

describe('registerForm', () => {
  // a section must never take the slot of another one, otherwise the draft of the first
  // section is lost as soon as the second one mounts
  test('should keep the form of every mounted section', () => {
    const general = { id: 'general', isDirty: true };
    const permissions = { id: 'permissions', isDirty: false };

    const registry = registerForm(
      registerForm({}, general.id, general),
      permissions.id,
      permissions
    );

    expect(Object.keys(registry)).toEqual(['general', 'permissions']);
    expect(registry.general).toBe(general);
    expect(registry.permissions).toBe(permissions);
  });

  test('should replace the handle of a section that changed its state', () => {
    const first = { id: 'general', isDirty: false };
    const second = { id: 'general', isDirty: true };

    const registry = registerForm(
      registerForm({}, first.id, first),
      first.id,
      second
    );

    expect(registry.general).toBe(second);
  });
});

describe('unregisterForm', () => {
  test('should drop the form of the section that unmounted and keep the other one', () => {
    const general = { id: 'general', isDirty: true };
    const permissions = { id: 'permissions', isDirty: false };

    const registry = unregisterForm(
      registerForm(
        registerForm({}, general.id, general),
        permissions.id,
        permissions
      ),
      general.id,
      general
    );

    expect(Object.keys(registry)).toEqual(['permissions']);
    expect(registry.permissions).toBe(permissions);
  });

  // the cleanup of an outdated handle must not remove the handle that replaced it
  test('should keep a newer handle of the same section', () => {
    const outdated = { id: 'general', isDirty: false };
    const current = { id: 'general', isDirty: true };

    const registry = unregisterForm(
      registerForm({}, current.id, current),
      outdated.id,
      outdated
    );

    expect(registry.general).toBe(current);
  });
});

describe('dirtyForms', () => {
  test('should list only the sections that hold unsaved edits', () => {
    const dirty = dirtyForms([dirtyForm, cleanForm, dirtyForm]);

    expect(dirty).toHaveLength(2);
    expect(dirty).toContain(dirtyForm);
  });

  test('should list nothing when every section is clean', () => {
    expect(dirtyForms([cleanForm, cleanForm])).toEqual([]);
  });
});

describe('hasUnsavedWork', () => {
  // leaving the settings with unsaved work asks for confirmation
  test('should ask for confirmation while a section holds unsaved edits', () => {
    expect(hasUnsavedWork({ general: dirtyForm, permissions: cleanForm })).toBe(
      true
    );
  });

  test('should let the user leave when every section is clean', () => {
    expect(hasUnsavedWork({ general: cleanForm, permissions: cleanForm })).toBe(
      false
    );
  });
});

describe('discardDraft', () => {
  test('should restore the saved values', () => {
    const draft = discardDraft({
      values: { name: 'edited' },
      baseline: { name: 'general' }
    });

    expect(draft.values).toEqual({ name: 'general' });
  });

  test('should clear the dirty state of the draft', () => {
    const draft = discardDraft({
      values: { name: 'edited' },
      baseline: { name: 'general' }
    });

    expect(hasUnsavedChanges(draft.values, draft.baseline)).toBe(false);
  });

  test('should keep the saved values as the baseline of the draft', () => {
    const draft = discardDraft({
      values: { name: 'edited' },
      baseline: { name: 'general' }
    });

    expect(draft.baseline).toEqual({ name: 'general' });
  });
});
