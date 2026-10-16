import { protectedProcedure } from '../../utils/trpc';

const pingRoute = protectedProcedure.query(() => null);

export { pingRoute };
