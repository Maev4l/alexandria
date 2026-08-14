const join = (parts) => parts.filter(Boolean).join(' · ');

// The engraved metadata line. Fields differ by type; the line's position never does.
export const bookPlateLine = (book) => join([(book.authors ?? []).join(', '), book.isbn]);

// The prime mark is film-only, which is one of the three redundant layers marking type —
// alongside the spine rule and the FILM tag, none of them colour.
export const filmPlateLine = (video) =>
  join([
    (video.directors ?? []).join(', '),
    video.releaseYear ? String(video.releaseYear) : '',
    video.duration ? `${video.duration}′` : '',
  ]);
