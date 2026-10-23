import type { IRootState } from '@/features/store';
import { createCachedSelector } from 're-reselect';
import { createSelector } from 'reselect';

export const categoriesSelector = createSelector(
  [(state: IRootState) => state.server.categories],
  (categories) =>
    [...categories].sort((a, b) => a.position - b.position || a.id - b.id)
);

export const categoryByIdSelector = createCachedSelector(
  [categoriesSelector, (_: IRootState, categoryId: number) => categoryId],
  (categories, categoryId) =>
    categories.find((category) => category.id === categoryId)
)((_, categoryId: number) => categoryId);
