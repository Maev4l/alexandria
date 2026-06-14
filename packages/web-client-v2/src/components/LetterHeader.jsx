// Edited by Claude.
// Passive sticky alphabetical divider for the library stream.
// Client-derived label only (does NOT navigate). A large faint "ghost letter"
// sits behind the small sticky label.
const LetterHeader = ({ letter }) => {
  return (
    <div
      role="separator"
      aria-label={`Items starting with ${letter}`}
      data-l={letter}
      className="sticky top-0 z-20 -mx-4 px-4 py-1.5 select-none pointer-events-none
                 before:content-[attr(data-l)] before:absolute before:right-4 before:top-1/2
                 before:-translate-y-1/2 before:text-5xl before:font-extrabold
                 before:text-[var(--wood-d)]/10 before:leading-none before:pointer-events-none"
    >
      <span className="relative inline-block font-sans text-sm font-bold tracking-wide text-[var(--wood-d)]">
        {letter}
      </span>
    </div>
  );
};

export default LetterHeader;
