// Hand-authored marks rather than an icon dependency. The system refuses icons that carry
// state — state is a stamp, a ribbon or a rule — so only universal affordances remain, and
// their stroke weights belong on the division scale like every other rule in the interface.
//
// 2px stroke, square caps, no fill. Geometry matches the reference marks in the comp.
const Mark = ({ children, size = 20, viewBox = '0 0 20 20', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);

export const ChevronLeft = (props) => (
  <Mark {...props}>
    <path d="M12 4 L6 10 L12 16" />
  </Mark>
);

// The select's own disclosure mark — drawn by hand so it sits on the same 2px stroke as every
// other mark, rather than the browser's native arrow (§9: chrome this world has no vocabulary
// for; the native glyph is neither a rule nor drawn at this stroke weight).
export const ChevronDown = (props) => (
  <Mark {...props}>
    <path d="M4 7 L10 13 L16 7" />
  </Mark>
);

// Two cuts: 16 for the pinned search field, 20 for the header plate on the cover.
export const Search = ({ size = 20, ...props }) =>
  size <= 16 ? (
    <Mark size={size} viewBox="0 0 16 16" {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 L14.5 14.5" />
    </Mark>
  ) : (
    <Mark size={size} {...props}>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M12.5 12.5 L17 17" />
    </Mark>
  );

export const Plus = (props) => (
  <Mark {...props}>
    <path d="M10 4 V16 M4 10 H16" />
  </Mark>
);

export const Close = (props) => (
  <Mark {...props}>
    <path d="M4 4 L16 16 M16 4 L4 16" />
  </Mark>
);

export const Camera = (props) => (
  <Mark {...props}>
    <path d="M2 6 H6 L7 4 H13 L14 6 H18 V16 H2 Z" />
    <circle cx="10" cy="11" r="3" />
  </Mark>
);

export const Check = (props) => (
  <Mark {...props}>
    <path d="M4 10 L8 14 L16 5" />
  </Mark>
);

export const Copy = (props) => (
  <Mark {...props}>
    <path d="M7 7 H16 V16 H7 Z" />
    <path d="M4 13 V4 H13" />
  </Mark>
);

export const More = (props) => (
  <Mark {...props}>
    <path d="M4 10 H4.01 M10 10 H10.01 M16 10 H16.01" strokeWidth="3" strokeLinecap="round" />
  </Mark>
);

// The password-reveal pair. Not a state-carrying icon in the sense DESIGN.md §9 refuses: the
// state (masked vs. showing) is already legible in the field itself — the reader can see
// whether their password is showing by looking at their password — so the glyph carries no
// fact that has no words behind it, only the toggle's own action affordance.
export const Eye = (props) => (
  <Mark {...props}>
    <path d="M2 10 C5 4 15 4 18 10 C15 16 5 16 2 10 Z" />
    <circle cx="10" cy="10" r="2.5" />
  </Mark>
);

export const EyeOff = (props) => (
  <Mark {...props}>
    <path d="M2 10 C5 4 15 4 18 10 C15 16 5 16 2 10 Z" />
    <circle cx="10" cy="10" r="2.5" />
    <path d="M3 3 L17 17" />
  </Mark>
);
