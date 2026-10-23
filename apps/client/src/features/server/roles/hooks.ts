import { useStoreSelector, type IRootState } from '@/features/store';
import { roleByIdSelector, rolesSelector } from './selectors';

export const useRoleById = (roleId: number) =>
  useStoreSelector((state: IRootState) => roleByIdSelector(state, roleId));

export const useRoles = () => useStoreSelector(rolesSelector);
