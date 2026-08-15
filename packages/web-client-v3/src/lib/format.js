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
// thing: §3 reserves the mono for numerals, so a person's name takes the sans and only the
// year is mono. The digits beside it used to disguise that a name in mono was a category error.
export const plateLineParts = (item) => {
  const names =
    item.type === FILM ? (item.directors ?? []).join(', ') : (item.authors ?? []).join(', ');
  const year = item.type === FILM && item.releaseYear ? String(item.releaseYear) : null;
  return { names: names || null, year };
};

// Detail earns the fields the row withholds — an ISBN or TMDB id, and a runtime — because
// here the reader is examining one object rather than recognising it in a scan (DESIGN.md §4,
// "the row carries recognition; detail carries identification").
//
// Returned apart from `names` for the same reason `plateLineParts` splits them: §3 reserves the
// mono face for numerals only, so a person's name belongs in the sans and only the ISBN, year
// and runtime — all figures — may take the mono column. `identifiers` is that column, in
// display order; the caller supplies the mono styling, this module only supplies the values.
export const detailLineParts = (item) => {
  const names =
    item.type === FILM ? (item.directors ?? []).join(', ') : (item.authors ?? []).join(', ');
  const identifiers =
    item.type === FILM
      ? [
          item.releaseYear ? String(item.releaseYear) : null,
          // The prime mark is the catalogue's own convention for a runtime in minutes (DESIGN.md
          // §3 type scale, "Numerals · mono 13 · tabular" reads "130′").
          item.duration ? `${item.duration}′` : null,
        ].filter(Boolean)
      : [item.isbn || null].filter(Boolean);
  return { names: names || null, identifiers };
};
