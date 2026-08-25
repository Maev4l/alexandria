import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Close, Search } from '@/components/icons';

// A real input, not a link costumed as one. It was previously a <Link> with the box, the
// placeholder grey and the magnifier, and it accepted no keystroke — which inverted the product's
// first principle: lookup is the front door, and the front door did not open.
//
// It takes the --imprint ground because yellow marks the apparatus of finding and acting, and on
// this screen finding is the dominant job. Placeholder at REGULAR weight deliberately: bold ink
// on saturated yellow reads as a button you press rather than a field you type in.
// Two mounts, ONE construction, and the same gesture in both: type, then submit. Pinned in the
// header on the libraries root, where submitting carries the query to /search. Mounted again on
// the search surface itself, where submitting runs it — supplying `onQueryChange` puts the field
// in that CONTROLLED mode, where the surface owns the text and the lookup.
//
// Not two components: the ground, the rule, the 48px floor and — the part that would rot
// silently — the `focus-control` indicator (index.css RULING 3: the whole control indicates, the
// inner input does not) are all decisions this file owns. A second field costumed to match would
// diverge from them the first time any one moved.
const SearchField = ({ className, value, onQueryChange, onSubmit }) => {
  const [typed, setTyped] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const isControlled = onQueryChange != null;

  // CONTROLLED MODE ONLY: this file's own comment says a reader arriving mid-lookup "must land on
  // the thing they were typing into", and until now none of them did — `activeElement` was `body`
  // on a cold load, on arrival from the pinned field, and after Back. Another description that
  // outlived its behaviour.
  //
  // Never in launcher mode: the libraries root is a browse screen, and stealing focus there would
  // raise the phone keyboard over the list on every visit to the app's home.
  useEffect(() => {
    if (isControlled) inputRef.current?.focus();
    // Mount only. Re-focusing on any later render would fight a reader who has tabbed to the
    // clear mark, which is the control this field just learned to distinguish.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const terms = isControlled ? (value ?? '') : typed;

  // SUBMIT IS THE ONLY THING THAT RUNS A SEARCH, in both modes. The surface used to query as the
  // reader typed, on a 300ms debounce, so this handler had nothing to do there and returned
  // immediately. Every keystroke past the third cost a round trip on the poor signal PRODUCT.md
  // describes, and `roman` alone spent three of them to answer the one the reader meant.
  //
  // What makes explicit submission the ordinary construction rather than a step added back is
  // that both routes to it already exist and are already used: `enterKeyHint="search"` gives the
  // phone keyboard an action key, and the magnifier is the visible duplicate of it.
  const submit = (event) => {
    event.preventDefault();
    // CONTROLLED MODE: the surface owns the query, so it runs it. Blurring dismisses the phone
    // keyboard, which is what a reader expects of the action key once it has acted — and it must
    // happen here rather than being left to the OS, because preventing the default submit is
    // what stops the browser doing it for us.
    if (isControlled) {
      inputRef.current?.blur();
      onSubmit?.(terms);
      return;
    }
    // LAUNCHER MODE: nothing to run here — this field belongs to a browse screen. It carries
    // what has been typed to the surface, so the reader never types it twice.
    navigate(terms.trim() ? `/search?q=${encodeURIComponent(terms.trim())}` : '/search');
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      // `field-control`, not `focus-control`. DESIGN.md §2: the whole-box `:focus-within` construction
      // "holds only while the control has exactly one focusable descendant", and this control has
      // three — the input, the submit mark, and the clear mark. Measured under `focus-within`,
      // `Clear the search` and `Search` were pixel-identical when focused, because the box lit for
      // both and neither drew a ring of its own: three tab stops, two indistinguishable, and one of
      // those destroys the query. `:has(input:focus-visible)` keys the box to the INPUT
      // specifically and leaves each mark to show its own ring — the same construction `Field`
      // already uses for its password reveal.
      //
      // THREE TAB STOPS AGAIN, now that the submit mark is back — the exact adjacency the critique
      // pixel-diffed. It is safe because of this selector and not because one of the two marks was
      // removed, and `check-browser.mjs` proves that by diffing all three focused states against
      // each other rather than only the pair that happened to remain.
      // A whole division (§4). This sat at `mt-3` — 12px, 1.5 divisions — the only layout-scale
      // gap in the app off the scale, on the one mark the product's first principle is about.
      className={`field-control mt-4 flex min-h-12 items-center gap-2 border-2 border-ink bg-imprint px-2 ${className ?? ''}`}
    >
      <input
        ref={inputRef}
        type="search"
        // 16px, NOT §3's 13px display step, and this is platform behaviour rather than
        // typography. Mobile Safari ZOOMS THE PAGE when a focused input's font-size is under
        // 16px — reported from the deployed app as "when I click on search there is somehow a
        // zoom", on the most-tapped control in the product.
        //
        // `Field.jsx` has set 16px for exactly this reason since it was written, with a paragraph
        // in DESIGN.md §3 explaining it. The reason never reached here, and the type-scale guard
        // could not help: its exception was recorded as a property of a FILE
        // (`components/imprint/Field.jsx`), so 13px on a different input was on the scale and
        // passed. The exception now describes what it always meant — an input, select or textarea
        // — so a third one cannot inherit the same defect.
        //
        // `enterKeyHint="search"` gives the virtual keyboard an ACTION key instead of "Done"
        // (French: "Rechercher"). Reported alongside the zoom: the reader typed, pressed Done to
        // dismiss the keyboard, then had to reach for the magnifier — three steps for one
        // intent. The label itself comes from the OS in the reader's own language, which is why
        // this is a hint rather than a string we write.
        enterKeyHint="search"
        value={terms}
        onChange={(event) => (isControlled ? onQueryChange(event.target.value) : setTyped(event.target.value))}
        aria-label="Search every library"
        placeholder="Search every library"
        // No inner ring, and now that is TRUE: `on-imprint` used to be here, which is precisely
        // what gave the input a ring of its own, so the comment claimed one thing while the code
        // did the opposite. The indicator lives on the whole control (`focus-control`) because
        // that is the thing a reader sees.
        // `type="search"` gives WebKit a clear button of its own, and it is native chrome this
        // world has no vocabulary for (DESIGN.md §9) — the same refusal `Field.jsx` already makes
        // for the textarea's resize grabber and the number spinner. Worse than out of place: it
        // renders BLUE, a colour that appears nowhere in the palette, on the loudest mark in the
        // whole design. It has been here since this field was built and was invisible until now,
        // because on the libraries root typing navigates away before the field ever holds text —
        // the search surface is the first place it stays long enough to be seen.
        className="min-h-12 min-w-0 flex-1 bg-transparent text-base font-normal text-ink placeholder:text-ink [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
      {/* Suppressing the native control removes a real affordance rather than mere decoration —
          clearing the field is genuinely useful on the one screen built for repeated lookups — so
          it is REPLACED, not simply deleted. `Close` is already in the Marks set (DESIGN.md §5
          names close among the universal affordances), so this authors nothing new; it draws the
          same mark at the same 2px stroke in ink.
          Controlled mode only: on the libraries root the field is a launcher whose text never
          persists, so a clear control there would have nothing to clear. */}
      {isControlled && terms.length > 0 && (
        <button
          type="button"
          aria-label="Clear the text"
          onClick={() => onQueryChange('')}
          // NAMES THE VISIBLE ACT, and it is deliberately the narrower of the two names. Emptying
          // the field does also drop the query, so `Clear the search` was defensible — but the
          // mark is an unlabelled cross beside the text it wipes, and a reader meets it as the
          // control that empties the box. The behaviour does not rest on this string; see
          // `Search.jsx`, where the reason is that the recents are otherwise unreachable.
          //
          // Same 48px floor and negative margin as the submit mark beside it: a tap target that
          // clears the field must not be smaller than the one that runs it.
          className="-my-2 flex size-12 shrink-0 items-center justify-center text-ink"
        >
          <Close />
        </button>
      )}
      {/* IN BOTH MODES NOW, because in both it is the control that runs the lookup. It was
          dropped from the surface when the surface searched as it was typed: submitting did
          nothing there, and §6 forbids the action slot holding an inert control. That premise is
          gone — the field no longer queries on its own — so the mark is back, and it is the one
          the reader reaches for after typing rather than a decoration beside a live query.
          It is also the only route for a reader with no action key: a hardware keyboard's Return
          submits, but a pointer needs something to press.
          `aria-label` rather than visible text, per §5's Marks — search is one of the universal
          affordances that set names outright. */}
      <button
        type="submit"
        aria-label="Search"
        // 48px floor: the field's own row is already 48px tall because the input carries the
        // same min-h-12, so the full size-12 box only ever consumes slack already sitting unused
        // inside the row. The icon itself stays 16px; only the tappable box grows.
        className="on-imprint flex size-12 shrink-0 items-center justify-center text-ink"
      >
        <Search size={16} />
      </button>
    </form>
  );
};

export default SearchField;
