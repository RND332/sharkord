import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // the address of the server is the screen of the sign in, the app itself
    // lives under its own path
    throw redirect({ to: '/connect' });
  }
});
