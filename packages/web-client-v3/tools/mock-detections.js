// Fixture responses for POST /detections (openapi.yaml: DetectRequest / DetectResponse).
//
// This route decides which states of the capture flow are even reachable to build and screenshot
// (ui-v3.md, ruling G): a mock that only ever returns three clean candidates would leave the
// preview-before-commit discipline, the per-resolver error path and manual-entry fallback
// completely unbuilt, because nobody can design or critique a state they cannot reach. So this
// file is deliberately keyed off a fixed, documented input per state (an ISBN, a title, or a
// sentinel string standing in for an image) rather than random or synthetic data - a state
// reachable only by chance cannot be screenshot twice.
//
// Shapes are cross-checked against the real handler (packages/functions/api/handlers/detection.go,
// models.go, internal/domain/entities.go, services/resolvers/*.go), not just the OpenAPI doc,
// because the Go struct tags matter here in ways the doc alone does not capture:
//   - `DetectResponse.DetectedBooks`/`DetectedVideos` are `[]T` with `omitempty` - and Go's
//     `encoding/json` omits a slice whenever it has zero length, WHETHER OR NOT it is nil
//     (`detectedBooks := make([]DetectedBookResponse, 0)` still gets omitted on a genuine miss).
//   - `ExtractedTitle *string` with `omitempty` only omits on a NIL pointer - a non-nil pointer
//     to "" is still emitted. But see the "true miss" note below: OCR failing to read anything
//     legible never actually reaches a non-nil-empty-string state on the real backend, so that
//     is not a shape this file models after all (round 1 of this fixture invented it).
//   - `Authors`/`Directors`/`Cast` have NO `omitempty` on DetectedBookResponse/DetectedVideoResponse,
//     but the zero value of a Go slice is `nil`, which still marshals to JSON `null` - so a
//     resolver's zero-value failure candidate (`domain.ResolvedBook{Source: ..., Error: &msg}`)
//     serializes with `"authors":null`, not `"authors":[]`. `ReleaseYear`/`Duration`/`TmdbId` on
//     `DetectedVideoResponse` are plain non-pointer, non-omitempty fields, so a zero-value error
//     candidate still carries `"releaseYear":0,"duration":0,"tmdbId":""` rather than omitting them.
// The client must read absence, never an empty-array check, exactly the discipline ui-v3.md §6
// already requires for `lentTo`/`picture`/`order`.
//
// FIX-ROUND-2 CORRECTION: `PictureUrl *string` and `Error *string` both carry `omitempty` on
// BOTH response structs (handlers/models.go:21,24,32,39). A nil pointer with `omitempty` is
// ABSENT on the wire, never an explicit `null` - `.claude/ui-v3.md`'s own binding API constraint
// ("Optional fields are omitempty ... arrive absent, not null. Any === null test is wrong.")
// applies here exactly as it does to `lentTo`/`picture`/`order` on the item shape. Round 1 of
// this fixture emitted `error: null` on every successful candidate and `pictureUrl: null` on
// Goodreads'/TMDB's no-artwork candidates - both wrong, and both fixed by omitting the key
// entirely. The one shape that IS a genuine present empty string rather than an absence is
// Google's own no-artwork case: `PictureUrl: &b.VolumeInfo.ImageLinks.Thumbnail` (google.go:99)
// is always a non-nil pointer, even when the thumbnail URL it points to is `""`, because that
// line takes the address unconditionally with no nil/empty check - unlike Goodreads
// (`goodreads.go:91-94`, pointer set only inside a callback gated on the cover element existing)
// and TMDB (`tmdb.go:267-270`, an explicit `!= nil && != ""` guard), both of which leave the
// pointer genuinely nil on a miss. FIX-ROUND-3 modelled this third state as `ISBN_GOOGLE_BLANK_PICTURE`
// below - present-and-empty, not absent, and Google-specific: do not "fix" a future Goodreads/TMDB
// no-artwork candidate to match this shape, and do not collapse this one into the absent shape
// either. `Id`/`Title`/`Summary`/`Isbn`/`Source`/`Authors`/`Directors`/`Cast`/
// `ReleaseYear`/`Duration`/`TmdbId` all lack `omitempty` on both structs, so those are correctly
// ALWAYS present at their Go zero value (`''`, `null` for a nil slice, or `0`) even on a failed
// candidate - see the zero-value comments beside each error candidate below.
//
// THE FIX-ROUND-1 CORRECTION THIS FILE EXISTS TO RECORD: "no usable result" is NOT "zero
// candidates". Two of the three book resolvers (Babelio, Goodreads) contribute nothing at all on
// a scrape/parse miss (services/resolvers/babelio.go:363-364's `ch <- []domain.ResolvedBook{}`;
// goodreads.go's no-location branch does the same) - but Google ALWAYS emits exactly one
// candidate carrying `error` when `totalItems == 0` (services/resolvers/google.go:81-88). Video
// detection queries only TMDB (services/lookup_video.go's registry has one entry), and TMDB does
// the same thing on zero matches (services/resolvers/tmdb.go:150-158). So a REAL miss - book or
// video - is a `detectedBooks`/`detectedVideos` array of length >= 1 whose every entry carries
// `error`, never an empty/absent array. The fully-empty response is kept below as its own,
// separately-documented case: the schema permits an absent array and a client must survive it,
// but it corresponds to every resolver failing at the network/request level simultaneously (a
// real, if rare, platform outage) or - for video - the TMDB access token being unset
// (tmdb.go:122-133's two `ch <- nil` branches, silently contributing nothing) - not to "no book
// matches this ISBN" or "no film matches this title". Task 18's manual-entry fallback must key
// its "every resolver failed or none matched" predicate off the ERRORED-ARRAY shape
// (`*_TRUE_MISS` below), because that is the one a real miss actually produces.

const cover = (n) => `/mock-thumbnails/cover-${n}.webp`;

// Exact resolver names the Go backend emits (services/resolvers/*.go's Name()) - not invented
// labels, since a source badge in the UI would otherwise show fixture-only strings that never
// appear against the real API.
const GOOGLE = 'Google';
const BABELIO = 'Babelio';
const GOODREADS = 'Goodreads';
const TMDB = 'TMDB';

// ---------------------------------------------------------------------------------------------
// Books (type: 0, keyed by `code`)
// ---------------------------------------------------------------------------------------------

// Several candidates, most carrying artwork and one without. PRODUCT.md: a cover is now the
// NORMAL case, so a results screen that only ever shows illustrated candidates would never
// exercise the one thing it must still render correctly - a candidate with no artwork sitting
// beside ones that have it. Real, valid ISBN-13 (Le Petit Prince, Folio) so a barcode-format
// check downstream never rejects it.
export const ISBN_MIXED_ARTWORK = '9782070408504';

// THREE GOOGLE VOLUMES AGAINST ONE ISBN, plus Babelio and Goodreads: five candidates on the book
// side. This is the REALISTIC bad case, not the theoretical one, and the distinction is the whole
// point of the fixture.
//
// Babelio and Goodreads emit exactly zero or one candidate each — verified, every `ch <-` in both
// files is a zero- or one-element slice. Google does not: `google.go:92-106` appends every item
// from `?q=isbn:<code>` with no `maxResults` requested and no slice applied, so the bound is the
// Google Books API's own default page size, 10, and the theoretical worst case for this screen is
// twelve. That number is NOT modelled here, deliberately. `q=isbn:` is an exact identifier match,
// so the real shape is one volume per identifier and occasionally a handful where Google holds
// several records against one — which is what this serves.
//
// What the true maximum is cannot be answered by reading the resolver at all; it needs the live
// Google Books API across real ISBNs. Modelling twelve would be dressing a guess as a measurement.
export const ISBN_MULTI_VOLUME = '9782070368228';

// A THIRD artwork shape, distinct from both "has a cover" and "absent": Google always takes the
// address of its thumbnail field unconditionally (`PictureUrl: &b.VolumeInfo.ImageLinks.Thumbnail`,
// google.go:99) - no nil check, no empty check. A Google match with no thumbnail therefore
// serializes as a NON-NIL pointer to an empty string: `pictureUrl: ""`, present, not absent. This
// is Google-specific, not a fixture inconsistency to "tidy" into the same absent shape as the
// no-artwork candidates below: Goodreads only ever sets `PictureUrl` inside the callback that
// fires when the cover `<img>` element exists at all (`goodreads.go:91-94`), and TMDB sets it
// behind an explicit `!= nil && != ""` guard (`tmdb.go:267-270`) - both of those genuinely leave
// the pointer nil, i.e. absent, when there is no cover. Google is the outlier by construction.
// Matters concretely: `BookDetectionResults` renders `pictureUrl` straight into an `<img src>`,
// and an empty `src` resolves against the page's own URL and fails to load - the broken-image
// state `DESIGN.md` §6 forbids outright - which an `if (!pictureUrl)` check alone would not catch
// the way it does for the genuinely-absent Goodreads/TMDB cases, because `''` is also falsy but
// arrives on a DIFFERENT key state (present) than a missing key (absent). A screen built only
// against the two absent-artwork fixtures above would never be exercised against this one.
export const ISBN_GOOGLE_BLANK_PICTURE = '9782000000000';

// One resolver answers with `error` while the other two succeed - the exact shape
// preview-before-commit exists for (ui-v3.md): a failed source is SHOWN as such, never silently
// dropped from the candidate list. Real, valid ISBN-13 (L'Étranger, Folio). The failed candidate
// models Babelio's network/timeout branch specifically (babelio.go:344-351, the only Babelio
// path that emits a VISIBLE candidate rather than silently contributing nothing) - its message
// and zero-valued fields are copied from that branch, not paraphrased.
export const ISBN_RESOLVER_ERROR = '9782070360024';

// The TRUE full miss: every resolver ran, none matched, and the aggregate is length 1 - Google's
// always-present error candidate (google.go:81-88) - not length 0. This is what a real "no book
// at this ISBN" looks like, and it is what Task 18's manual-entry predicate must key off, not
// ISBN_NO_RESULT below.
export const ISBN_TRUE_MISS = '9781000000000';

// A response with NO candidates at all. This does not model "no book matches" (see
// ISBN_TRUE_MISS above for what that actually looks like) - it models every resolver failing at
// the network/request level in the same call (Google's client.Do() itself erroring returns
// `ch <- nil`, contributing nothing at all, not even an error candidate - google.go's earlier
// branches, before the `Total == 0` check). Kept as its own case because the schema permits an
// absent array and a client must survive it regardless of how rare the real trigger is. Reuses
// the "no specific data" placeholder ISBN already established by
// src/test/fixtures/items.js's `book()` default.
export const ISBN_NO_RESULT = '9780000000000';

// The request itself fails - a Lambda timeout, an unhandled panic, API Gateway's own 5xx. A
// non-200, non-DetectResponse-shaped body. Not sourced from a specific branch in detection.go
// (there is none for the book path - resolver failures are always cushioned into the aggregate
// above), but a client has to survive it regardless: "no result" must not be the only error path
// anyone ever designs for.
export const ISBN_NETWORK_ERROR = '9999999999999';

const detectBook = (code) => {
  if (!code) return { status: 400, body: { message: 'code is required for book detection' } };

  if (code === ISBN_NETWORK_ERROR) {
    return { status: 500, body: { message: 'Detection service unavailable' } };
  }

  if (code === ISBN_NO_RESULT) {
    // Zero-length slice on the real backend is omitted by `omitempty` too - see file header.
    return { status: 200, body: {} };
  }

  if (code === ISBN_GOOGLE_BLANK_PICTURE) {
    // See the constant's own comment for why this is Google-specific: `PictureUrl` is a non-nil
    // pointer to `''`, not a nil one - present-and-empty, not absent. A single-candidate response
    // (like ISBN_TRUE_MISS above) so the state under test - this one field's value - is not
    // competing for attention with an unrelated multi-candidate layout.
    return {
      status: 200,
      body: {
        detectedBooks: [
          {
            id: 'google-peste',
            authors: ['Albert Camus'],
            title: 'La Peste',
            summary: 'La ville d’Oran est frappée par une épidémie de peste.',
            pictureUrl: '',
            isbn: code,
            source: GOOGLE,
          },
        ],
      },
    };
  }

  if (code === ISBN_TRUE_MISS) {
    const message = `No item found for code: ${code}`;
    return {
      status: 200,
      body: {
        detectedBooks: [
          // Copied field-for-field from google.go's zero-value literal
          // (`domain.ResolvedBook{Source: r.Name(), Error: &msg}`): every field not explicitly
          // set keeps Go's zero value, which is `null` for a nil slice (`authors`), not `[]`.
          {
            id: '',
            authors: null,
            title: '',
            summary: '',
            isbn: code,
            source: GOOGLE,
            error: message,
          },
        ],
      },
    };
  }

  if (code === ISBN_RESOLVER_ERROR) {
    return {
      status: 200,
      body: {
        detectedBooks: [
          {
            id: 'google-etranger',
            authors: ['Albert Camus'],
            title: "L'Étranger",
            summary: "Aujourd'hui, maman est morte.",
            pictureUrl: cover(1),
            isbn: code,
            source: GOOGLE,
            // `error` omitted, not `null` - a successful candidate has a nil `*string` Error,
            // and `omitempty` drops a nil pointer entirely (handlers/models.go:24). See the
            // file header's "fix round 2" note.
          },
          // babelio.go:344-351's network/timeout branch: no id, no title, no authors (nil, not
          // []) - only the source and its real message, "Unavailable - Try later.". The UI must
          // render this as a failed candidate, not skip it or crash reading a missing title.
          {
            id: '',
            authors: null,
            title: '',
            summary: '',
            isbn: code,
            source: BABELIO,
            error: 'Unavailable - Try later.',
          },
          {
            id: 'goodreads-etranger',
            authors: ['Albert Camus'],
            title: "L'Étranger",
            summary: '1942. Un homme, Meursault, tue un Arabe sur une plage.',
            pictureUrl: cover(3),
            isbn: code,
            source: GOODREADS,
          },
        ],
      },
    };
  }

  if (code === ISBN_MULTI_VOLUME) {
    // Three Google volume records for one identifier, plus one each from Babelio and Goodreads.
    // Five rows of 88x132 artwork and five primary plates — the state the plate ruling has to
    // survive being looked at, and the one nothing in either suite had ever rendered.
    const googleVolume = (suffix, edition, art) => ({
      id: `google-madame-bovary-${suffix}`,
      authors: ['Gustave Flaubert'],
      title: `Madame Bovary${edition}`,
      summary: 'Emma Rouault épouse Charles Bovary, officier de santé.',
      ...(art === undefined ? {} : { pictureUrl: art }),
      isbn: code,
      source: GOOGLE,
    });
    return {
      status: 200,
      body: {
        detectedBooks: [
          googleVolume('folio', '', cover(1)),
          googleVolume('classique', ' — édition classique annotée', cover(3)),
          // One of the five with no artwork, so the empty frame is exercised inside a long list
          // rather than only in the three-candidate case.
          googleVolume('poche', ' (poche)', undefined),
          {
            id: 'babelio-madame-bovary',
            authors: ['Gustave Flaubert'],
            title: 'Madame Bovary',
            summary: 'Mœurs de province.',
            pictureUrl: cover(4),
            isbn: code,
            source: BABELIO,
          },
          {
            id: 'goodreads-madame-bovary',
            authors: ['Gustave Flaubert'],
            title: 'Madame Bovary',
            summary: 'Édition Goodreads.',
            pictureUrl: cover(2),
            isbn: code,
            source: GOODREADS,
          },
        ],
      },
    };
  }

  if (code === ISBN_MIXED_ARTWORK) {
    return {
      status: 200,
      body: {
        detectedBooks: [
          {
            id: 'google-petit-prince',
            authors: ['Antoine de Saint-Exupéry'],
            title: 'Le Petit Prince',
            summary: 'S’il vous plaît... dessine-moi un mouton.',
            pictureUrl: cover(2),
            isbn: code,
            source: GOOGLE,
          },
          // A LONG TITLE, deliberately, on a candidate that also has artwork. Titles on this
          // screen used to be `truncate`d, so a row could show two editions of one book cut at
          // the same word — on the screen whose entire job is telling editions apart, and where a
          // wrong pick writes a record the reader cannot detect as wrong later. The truncation is
          // gone and the title wraps; a fixture where nothing is long enough to wrap would let
          // that assertion pass vacuously, which is the third time this project has caught a
          // check passing for the wrong reason. Realistic rather than synthetic: Babelio does
          // return full edition titles where Google returns the short form.
          {
            id: 'babelio-petit-prince',
            authors: ['Antoine de Saint-Exupéry'],
            title: 'Le Petit Prince — édition originale illustrée par l’auteur, aquarelles restaurées',
            summary: 'Un aviateur en panne dans le désert du Sahara.',
            pictureUrl: cover(4),
            isbn: code,
            source: BABELIO,
          },
          // The exception PRODUCT.md now names: a resolver that matched the title but has no
          // artwork on file for it - a real, successful candidate, not the empty/failed states.
          // `pictureUrl` omitted, not `null`: Goodreads leaves its nil-pointer `PictureUrl`
          // unset when it found no cover, and `omitempty` drops a nil pointer entirely
          // (handlers/models.go:21) - it never sends an explicit `null`.
          {
            id: 'goodreads-petit-prince',
            authors: ['Antoine de Saint-Exupéry'],
            title: 'Le Petit Prince',
            summary: 'Édition Goodreads, sans couverture référencée.',
            isbn: code,
            source: GOODREADS,
          },
        ],
      },
    };
  }

  // Any other code: one clean match, for exploratory dev use while building screens that do not
  // care which state they are looking at. The constants above are what actually reach the states
  // this route exists to serve - do not screenshot a documented state off this branch.
  return {
    status: 200,
    body: {
      detectedBooks: [
        {
          id: 'google-default',
          authors: ['Anonyme'],
          title: 'Ouvrage sans particularité',
          summary: 'Résultat de secours pour un code non répertorié dans les fixtures.',
          pictureUrl: cover(1),
          isbn: code,
          source: GOOGLE,
        },
      ],
    },
  };
};

// ---------------------------------------------------------------------------------------------
// Videos (type: 1, keyed by `title` for a typed search, or by `image` for an OCR capture)
// ---------------------------------------------------------------------------------------------

// Several candidates, most with artwork and one without - the video-side twin of
// ISBN_MIXED_ARTWORK, reached through the typed-title path.
export const TITLE_MIXED_ARTWORK = 'Les Tontons flingueurs';

// THE RESOLVER'S OWN MAXIMUM, five candidates. Measured rather than assumed: `tmdb.go:161` slices
// the deduped `fr-FR` + `en-US` results to `maxResults := 5` before fetching any details, so five
// is the most this screen can ever show for a film — and the cap is OURS, not TMDB's. The search
// request asks for no limit at all and TMDB returns a full page of 20; a line in our resolver is
// what a visual ruling now depends on, which is exactly why this fixture exists rather than a
// note saying "probably three".
//
// It exists because nothing in either suite had ever rendered more than three candidates, so
// "what do five primary plates look like stacked" was a question nobody could answer by looking.
// A design ruling defended on a count nobody has seen is the substrate problem in its purest
// form.
export const TITLE_FIVE_CANDIDATES = 'Le Samouraï';

// A response with NO candidates at all. Video detection queries only TMDB
// (services/lookup_video.go), and TMDB never returns an empty array on a real content miss (see
// TITLE_TRUE_MISS below) - the only way this shape occurs is `getTmdbAccessToken()` failing or
// returning an empty token (tmdb.go:122-133, both branches `ch <- nil`, contributing nothing at
// all, not even an error candidate). That is a configuration failure, not "no film matches this
// title", and is kept here as its own case for the same reason ISBN_NO_RESULT is: the schema
// allows an absent array and a client must survive it.
export const TITLE_NO_RESULT = 'Film Introuvable XYZ';

// The TRUE full miss for a typed title: TMDB always emits exactly one candidate carrying `error`
// on zero matches (tmdb.go:150-158), so `detectedVideos` has length 1, not 0. This is
// simultaneously Finding 1 (a video candidate can and does carry `error`) and Finding 2 (this,
// not an empty array, is what a real video miss looks like) - because video has only one
// resolver, its failure IS the full-miss shape; there is no second resolver left to check.
export const TITLE_TRUE_MISS = 'Film Sans Correspondance TMDB';

// The request itself fails, reached through a typed title (no image/OCR involved).
export const TITLE_NETWORK_ERROR = 'TRIGGER_NETWORK_ERROR';

// Only a book has "multiple resolvers, one fails" (services/lookup_book.go queries three; video
// detection queries exactly one - TMDB, per backend.md). Forcing an equivalent multi-resolver
// failure for video would misrepresent the backend's real shape rather than exercise a state it
// can produce, so that case is deliberately book-only. TITLE_TRUE_MISS/IMAGE_OCR_TRUE_MISS are
// video's actual equivalent, and they are the same fact as its "no result" case, not a sibling
// of it - see the header note.

// OCR read the cover as a plausible-but-wrong title, and the search on that wrong text finds a
// real, confident, WRONG match - not an empty result and not an errored one. This is the
// dangerous case editability exists for: a miss at least signals something is off, but a wrong
// match that looks legitimate is the one a reader could accept without noticing.
// `extractedTitle` comes back as "Le Trou" (a different, real Jacques Becker film) as if OCR
// mistook a worn/glare-hit cover.
export const IMAGE_OCR_MISREAD = 'fixture:ocr-misread-cover';

// OCR read SOME text, but it matches nothing on TMDB - the OCR-path counterpart of
// TITLE_TRUE_MISS, and built the same way: one TMDB candidate carrying `error`, plus
// `extractedTitle` set to the (legible but wrong-enough-to-match-nothing) text OCR produced.
export const IMAGE_OCR_TRUE_MISS = 'fixture:ocr-tmdb-no-match';

// OCR produced NO legible text at all (glare, motion blur). On the real backend
// (handlers/detection.go's `if extracted == "" { ... early return ... }`) this returns before
// `extractedTitle` is ever assigned, so the response is `DetectResponse{DetectedVideos: []}` -
// which `omitempty` then drops entirely, same as every other empty-array case in this file.
// Round 1 of this fixture modelled this state as `extractedTitle: ''` (present, empty) - that
// shape does not exist on the real backend; `extractedTitle` is only ever set inside the
// non-empty branch, so a fully illegible cover produces `{}`, identical on the wire to
// TITLE_NO_RESULT. Kept as its own named constant anyway because it is reached through a
// different INPUT (an image, not a title) and a capture screen needs to exercise that path
// specifically, even though the two responses are byte-identical.
export const IMAGE_OCR_NO_RESULT = 'fixture:ocr-illegible-cover';

// The OCR call itself fails (Bedrock/Claude vision unreachable, etc). Reached through the
// image/OCR path specifically, so a capture screen's error handling is exercised on both of its
// inputs, not just the typed-title one. Message copied verbatim from
// handlers/detection.go's `ExtractTextFromImage` error branch.
export const IMAGE_OCR_NETWORK_ERROR = 'fixture:ocr-network-error';

const detectVideoFromTitle = (title) => {
  if (title === TITLE_NETWORK_ERROR) {
    return { status: 500, body: { message: 'Detection service unavailable' } };
  }

  if (title === TITLE_NO_RESULT) {
    return { status: 200, body: {} };
  }

  if (title === TITLE_TRUE_MISS) {
    return {
      status: 200,
      body: {
        detectedVideos: [
          // Copied field-for-field from tmdb.go:150-158's zero-value literal: every field not
          // explicitly set keeps Go's zero value - `null` for nil slices (`directors`/`cast`),
          // `0` for `releaseYear`/`duration`, `''` for `tmdbId` (none of these are pointers with
          // `omitempty` on DetectedVideoResponse, so none of them are simply absent).
          {
            id: '',
            title: '',
            summary: '',
            directors: null,
            cast: null,
            releaseYear: 0,
            duration: 0,
            tmdbId: '',
            source: TMDB,
            error: `No movies found for title: ${title}`,
          },
        ],
      },
    };
  }

  if (title === TITLE_FIVE_CANDIDATES) {
    // Exactly `tmdb.go:161`'s `maxResults := 5` — the most this screen can ever hold for a film,
    // and the state the primary-plate ruling has to survive being looked at.
    //
    // FIVE DIFFERENT FILMS, not five editions of one, and the first draft of this fixture got it
    // wrong. `search/movie?query=` matches TITLES and returns distinct movies; editions of a
    // single work are the BOOK side's shape, because an ISBN identifies one edition and Google
    // may hold several volume records against it. Rendered, the mistake was obvious and would
    // have been invisible in the source: five rows carrying the identical director, year, runtime
    // and cast, differing only by a suffix I had invented. That misrepresents both what the
    // reader is choosing between and how hard the choice is.
    return {
      status: 200,
      body: {
        detectedVideos: [
          {
            id: 'tmdb-samourai-1967',
            title: 'Le Samouraï',
            summary: 'Jef Costello, tueur à gages, prépare son alibi.',
            pictureUrl: cover(5),
            directors: ['Jean-Pierre Melville'],
            cast: ['Alain Delon', 'François Périer', 'Nathalie Delon'],
            releaseYear: 1967,
            duration: 105,
            tmdbId: '10366',
            source: TMDB,
          },
          {
            id: 'tmdb-samourai-1945',
            title: 'The Last Samurai',
            summary: 'Un capitaine américain formé par un chef samouraï.',
            pictureUrl: cover(6),
            directors: ['Edward Zwick'],
            cast: ['Tom Cruise', 'Ken Watanabe', 'Billy Connolly'],
            releaseYear: 2003,
            duration: 154,
            tmdbId: '616',
            source: TMDB,
          },
          // No poster ingested for this entry — the empty frame exercised inside a long list
          // rather than only in the three-candidate case.
          {
            id: 'tmdb-samourai-doc',
            title: 'Melville, le dernier samouraï',
            summary: 'Portrait documentaire du cinéaste.',
            directors: ['Olivier Bohler'],
            cast: ['Jean-Pierre Melville'],
            releaseYear: 2015,
            duration: 62,
            tmdbId: '387412',
            source: TMDB,
          },
          {
            id: 'tmdb-samourai-7',
            title: 'Les Sept Samouraïs',
            summary: 'Un village de paysans engage sept rōnin pour le défendre.',
            pictureUrl: cover(1),
            directors: ['Akira Kurosawa'],
            cast: ['Toshirō Mifune', 'Takashi Shimura', 'Keiko Tsushima'],
            releaseYear: 1954,
            duration: 207,
            tmdbId: '346',
            source: TMDB,
          },
          {
            id: 'tmdb-samourai-ghost',
            title: 'Ghost Dog : la voie du samouraï',
            summary: 'Un tueur à gages vit selon le code du bushido.',
            pictureUrl: cover(3),
            directors: ['Jim Jarmusch'],
            cast: ['Forest Whitaker', 'John Tormey', 'Cliff Gorman'],
            releaseYear: 1999,
            duration: 116,
            tmdbId: '9464',
            source: TMDB,
          },
        ],
      },
    };
  }

  if (title === TITLE_MIXED_ARTWORK) {
    return {
      status: 200,
      body: {
        detectedVideos: [
          {
            id: 'tmdb-tontons-1',
            title: 'Les Tontons flingueurs',
            summary: 'Le parrain Fernand Naudin doit régler les affaires de son défunt ami.',
            pictureUrl: cover(5),
            directors: ['Georges Lautner'],
            cast: ['Lino Ventura', 'Bernard Blier', 'Francis Blanche'],
            releaseYear: 1963,
            duration: 105,
            tmdbId: '31435',
            source: TMDB,
            // `error` omitted, not `null` - see the file header's "fix round 2" note and the
            // first book candidate above for the identical rule (handlers/models.go:39).
          },
          // A LONG TITLE on the film side too, and for the same reason as the book fixture's
          // Babelio candidate: nothing here wrapped, so an assertion that the title is no longer
          // truncated could pass without ever exercising a wrap. TMDB genuinely returns
          // sub-titled release variants like this.
          {
            id: 'tmdb-tontons-2',
            title: 'Les Tontons flingueurs — version restaurée 4K, édition collector du 60e anniversaire',
            summary: 'Édition remasterisée.',
            pictureUrl: cover(6),
            directors: ['Georges Lautner'],
            cast: ['Lino Ventura', 'Bernard Blier'],
            releaseYear: 1963,
            duration: 105,
            tmdbId: '31436',
            source: TMDB,
          },
          // TMDB has the record but no poster ingested for this particular entry - the video-side
          // exception to "artwork present is the normal case", same fact as the book candidate
          // above, just on the other resolver. `pictureUrl` omitted, not `null`, for the same
          // reason as Goodreads' no-cover book candidate above (handlers/models.go:32).
          {
            id: 'tmdb-tontons-3',
            title: 'Les Tontons flingueurs',
            summary: 'Fiche sans affiche référencée.',
            directors: ['Georges Lautner'],
            cast: [],
            releaseYear: 1963,
            duration: 105,
            tmdbId: '31437',
            source: TMDB,
          },
        ],
      },
    };
  }

  // Any other title: one clean match, for exploratory dev use - see the book-side default above.
  return {
    status: 200,
    body: {
      detectedVideos: [
        {
          id: 'tmdb-default',
          title: title || 'Film sans particularité',
          summary: 'Résultat de secours pour un titre non répertorié dans les fixtures.',
          pictureUrl: cover(2),
          directors: ['Anonyme'],
          cast: [],
          releaseYear: 2000,
          duration: 100,
          tmdbId: '1',
          source: TMDB,
        },
      ],
    },
  };
};

const detectVideoFromImage = (image) => {
  if (image === IMAGE_OCR_NETWORK_ERROR) {
    return { status: 500, body: { message: 'Failed to extract text from image' } };
  }

  if (image === IMAGE_OCR_NO_RESULT) {
    // See the constant's own comment: the real backend returns before ever setting
    // `extractedTitle` on this path, so this is genuinely `{}` - not `extractedTitle: ''`.
    return { status: 200, body: {} };
  }

  if (image === IMAGE_OCR_TRUE_MISS) {
    const extractedTitle = 'Xyzzy Fnord 1987';
    return {
      status: 200,
      body: {
        extractedTitle,
        detectedVideos: [
          {
            id: '',
            title: '',
            summary: '',
            directors: null,
            cast: null,
            releaseYear: 0,
            duration: 0,
            tmdbId: '',
            source: TMDB,
            error: `No movies found for title: ${extractedTitle}`,
          },
        ],
      },
    };
  }

  if (image === IMAGE_OCR_MISREAD) {
    return {
      status: 200,
      body: {
        extractedTitle: 'Le Trou',
        detectedVideos: [
          {
            id: 'tmdb-le-trou',
            title: 'Le Trou',
            summary: 'Quatre détenus préparent leur évasion de la Santé.',
            pictureUrl: cover(4),
            directors: ['Jacques Becker'],
            cast: ['Michel Constantin', 'Jean Keraudy'],
            releaseYear: 1960,
            duration: 132,
            tmdbId: '48434',
            source: TMDB,
          },
        ],
      },
    };
  }

  // Any other image payload: OCR reads it correctly and TMDB finds one clean match - the
  // exploratory/default branch, mirroring the two title-keyed defaults above.
  return {
    status: 200,
    body: {
      extractedTitle: 'Inception',
      detectedVideos: [
        {
          id: 'tmdb-inception',
          title: 'Inception',
          summary: "Un voleur s'infiltre dans les rêves pour y implanter une idée.",
          pictureUrl: cover(1),
          directors: ['Christopher Nolan'],
          cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt'],
          releaseYear: 2010,
          duration: 148,
          tmdbId: '27205',
          source: TMDB,
        },
      ],
    },
  };
};

const detectVideo = (image, title) => {
  // Priority order copied from handlers/detection.go's `handleVideoDetection`: "Priority: manual
  // title > OCR from image" - a non-empty `title` is used even when an `image` is ALSO present,
  // and OCR only runs in the `else if` branch when there is no usable title. Fix round 1 of this
  // fixture had this backwards (image checked first), which would have quietly made a
  // simultaneously-supplied title unreachable in a client that (matching the real API) sends
  // whichever one it collected - the opposite of what the backend actually does.
  if (title) return detectVideoFromTitle(title);
  if (image) return detectVideoFromImage(image);
  return {
    status: 400,
    body: { message: "Video detection requires either 'image' (base64) or 'title' field" },
  };
};

// Entry point wired into tools/mock-api.js for `POST /detections`.
export const handleDetection = (body) => {
  const { type, code, image, title } = body ?? {};

  if (type === 0) return detectBook(code);
  if (type === 1) return detectVideo(image, title);

  return { status: 400, body: { message: 'type must be 0 (book) or 1 (video)' } };
};
