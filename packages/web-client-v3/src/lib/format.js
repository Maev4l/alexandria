const FILM = 1;

// The row carries RECOGNITION; detail carries IDENTIFICATION. The test for a row field is
// whether it helps someone recognise a thing they already own — not whether it is true, and
// not whether it is available. An ISBN passes both of those and fails the one that matters:
// 9780451524935 takes as much of the line as "George Orwell" and carries no recognition value
// at all. ISBN, tmdbId and runtime therefore live on item detail only.
//
// The year stays, because it is identity rather than metadata: it disambiguates remakes and
// situates a film — Solaris '72 against '02 — which a director alone does not do.
//
// Returned as parts rather than a string because a name and a figure are different kinds of
// thing: the mono is reserved for numerals, so a person's name takes the sans and only the
// year is mono. The digits beside it used to disguise that a name in mono was a category error.
export const plateLineParts = (item) => {
  const names =
    item.type === FILM ? (item.directors ?? []).join(', ') : (item.authors ?? []).join(', ');
  const year = item.type === FILM && item.releaseYear ? String(item.releaseYear) : null;
  return { names: names || null, year };
};

// THE THIRD SURFACE. The Plate Line already varies by surface — on item detail it gains the
// edition, `AUTHOR · ISBN` — so a candidate row gaining the runtime is a third variant of one
// rule rather than a widening of the component's contract.
//
// Why the runtime is here at all is worth stating, because the obvious answer is wrong and a
// later pass acting on it would delete this correctly. It is NOT a discriminator: five distinct
// films are already separated by title, director and year, so a runtime separates almost nothing.
// It earns its place as CONFIRMATION — the DVD case is in the reader's hand and prints its
// runtime, so a matching number is evidence this is the right disc. That is the product's own
// mechanism, capture by pointing at the object.
//
// Explicit rather than reusing `detailLineParts`, which for a book returns the ISBN: a row must
// never print one ("the row carries recognition"), and on this screen the scanned code
// already sits once at the head. Deriving the candidate line from the detail line would make a
// book candidate sprout an identifier the moment someone gave that screen a PlateLine.
export const candidateLineParts = (item) => {
  const { names } = plateLineParts(item);
  if (item.type !== FILM) return { names, identifiers: [] };
  return {
    names,
    identifiers: [
      // Presence, not truthiness — `duration` permits 0, and a truthy check would silently drop
      // the runtime of a short film. Same idiom as `detailLineParts` below.
      item.releaseYear != null ? String(item.releaseYear) : null,
      item.duration != null ? `${item.duration}′` : null,
    ].filter(Boolean),
  };
};

// Detail earns the fields the row withholds — an ISBN or TMDB id, and a runtime — because
// here the reader is examining one object rather than recognising it in a scan ("the row carries
// recognition; detail carries identification").
//
// Returned apart from `names` for the same reason `plateLineParts` splits them: the mono
// face is reserved for numerals only, so a person's name belongs in the sans and only the ISBN, year
// and runtime — all figures — may take the mono column. `identifiers` is that column, in
// display order; the caller supplies the mono styling, this module only supplies the values.
export const detailLineParts = (item) => {
  const names =
    item.type === FILM ? (item.directors ?? []).join(', ') : (item.authors ?? []).join(', ');
  const identifiers =
    item.type === FILM
      ? [
          // Presence, not truthiness: both fields are optional-and-omitted (omitempty), never
          // null, but `duration` permits 0 (CreateVideoRequest.duration: minimum 0) — a
          // truthy check would silently drop the runtime of a short film. Same idiom as
          // `item.order != null` in VolumeFrame.jsx.
          item.releaseYear != null ? String(item.releaseYear) : null,
          // The prime mark is the catalogue's own convention for a runtime in minutes (the mono
          // type scale's entry, "Numerals · mono 13 · tabular", reads "130′").
          item.duration != null ? `${item.duration}′` : null,
        ].filter(Boolean)
      : [item.isbn || null].filter(Boolean);
  return { names: names || null, identifiers };
};
