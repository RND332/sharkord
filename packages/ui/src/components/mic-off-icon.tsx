import * as React from 'react';

// the approved Paper artwork for the muted microphone, Heroicons has no slashed mic
const MicOffIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(({ className, ...props }, ref) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
    data-slot="icon"
    ref={ref}
    className={className}
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v7a3 3 0 0 0 3 3ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8M3 3l18 18"
    />
  </svg>
));

MicOffIcon.displayName = 'MicOffIcon';

export { MicOffIcon };
