import type { THttpFieldError } from '@dodecagon/shared';
import type z from 'zod';

const toFieldErrors = (error: z.ZodError): THttpFieldError[] => {
  const errors: THttpFieldError[] = [];

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field === 'string') {
      errors.push({ field, message: issue.message });
    }
  }

  return errors;
};

export { toFieldErrors };
