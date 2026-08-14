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
