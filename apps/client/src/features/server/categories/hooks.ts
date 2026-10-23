import { useStoreSelector, type IRootState } from '@/features/store';
import { categoriesSelector, categoryByIdSelector } from './selectors';

export const useCategories = () => useStoreSelector(categoriesSelector);

export const useCategoryById = (categoryId: number) =>
  useStoreSelector((state: IRootState) =>
    categoryByIdSelector(state, categoryId)
  );
