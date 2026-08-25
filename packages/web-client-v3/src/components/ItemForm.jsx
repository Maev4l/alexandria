import { useState } from 'react';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { BOOK, FILM, collectionUnchanged, validateItem } from '@/lib/validate.js';

const TITLE_MAX = 100;
const SUMMARY_MAX = 4000;
// Title's 20-remaining-or-fewer counter is not this finding's target — 100 is short enough to
// hit that showing it at rest is the whole point. 4000 is a different animal: the fixture
// summaries this catalogue actually ships (src/test/fixtures/items.js) run one short sentence,
// nowhere near even 10% of the budget, so a counter shown from the first keystroke narrates a
// wall nobody is near. 300 remaining — 92.5% typed, ~3700 characters in — is close enough to the
// real ceiling that a reader who IS writing a long summary sees it with room to wrap up a
// paragraph before truncation, and far enough out from the rare current-fixture length that
// ordinary use never triggers it at all.
const SUMMARY_COUNTER_THRESHOLD = 300;

// Authors/directors/cast are one comma-separated field each, split into the array the API
// wants only at submit time — trimming each name and dropping the empty entries a trailing or
// doubled comma would otherwise leave behind.
const splitList = (value) =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const joinList = (list) => (list ?? []).join(', ');

// Seeds editable state from whatever the caller has: an existing item (edit) or nothing (new).
// Every value becomes a string, including the numeric ones, because that is what a controlled
// text/number input holds — '' rather than undefined, so the field starts genuinely empty
// instead of "uncontrolled" (and React warns the moment a controlled input flips between the
// two across a render).
const seed = (initial = {}) => ({
  title: initial.title ?? '',
  summary: initial.summary ?? '',
  // Pre-filled with whatever detection supplied, empty when it supplied nothing — the case that
  // most needed a control (no source at all) is exactly the case a URL-presence gate excluded.
  pictureUrl: initial.pictureUrl ?? '',
  authors: joinList(initial.authors),
  isbn: initial.isbn ?? '',
  directors: joinList(initial.directors),
  cast: joinList(initial.cast),
  releaseYear: initial.releaseYear != null ? String(initial.releaseYear) : '',
  duration: initial.duration != null ? String(initial.duration) : '',
  tmdbId: initial.tmdbId ?? '',
  collectionId: initial.collectionId ?? '',
  order: initial.order != null ? String(initial.order) : '',
});

// One form, driven by `type` (BOOK=0, FILM=1) — the shared fields plus whichever half of the
// API's two request bodies applies. `initial` carries an `id` only when editing a real item;
// that single fact decides whether a changed cover address should ask the backend to refetch
// (`updatePicture`) — a brand-new item has nothing to refetch AGAINST, it is simply created with
// whatever address is on the form.
const ItemForm = ({ type, initial, collections, onSubmit, submitLabel }) => {
  const isEdit = Boolean(initial?.id);
  const [values, setValues] = useState(() => seed(initial));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  // The submit button IS the reason (DESIGN.md §6, first form): it stands alone in its row —
  // no secondary or destructive control beside it to confuse with — so a required-but-empty
  // order field is stated by the disabled outline itself, filling to a plate the moment it's
  // filled. No separate caps explanation is needed, because the empty box sitting right above
  // the button already is the visible reason.
  const orderRequired =
    Boolean(values.collectionId) &&
    values.order === '' &&
    collectionUnchanged({ collectionId: values.collectionId, initialCollectionId: initial?.collectionId });

  const set = (field) => (event) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const onCollectionChange = (event) => {
    const collectionId = event.target.value;
    setValues((current) => ({
      ...current,
      collectionId,
      // Clearing the collection clears its order too, so the pair invariant is never reachable
      // from the UI itself — and the order field disappears along with the reason for it.
      order: collectionId ? current.order : '',
    }));
    setErrors((current) => ({ ...current, collection: undefined }));
  };

  const onOrderChange = (event) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, order: value }));
    // The pair is validated and reported as one (DESIGN.md §6), so either half of it clears
    // the same error.
    setErrors((current) => ({ ...current, collection: undefined }));
  };

  const buildPayload = () => {
    const nextPictureUrl = values.pictureUrl.trim();
    const originalPictureUrl = (initial?.pictureUrl ?? '').trim();

    const shared = {
      title: values.title.trim(),
      summary: values.summary,
      pictureUrl: nextPictureUrl || null,
      collectionId: values.collectionId || null,
      // `Number('')` is `0`, not "absent" — and 0 is outside the API's 1-1000 range
      // (handlers/items.go:38), so an empty box must become `null`, never a coerced zero.
      order: values.collectionId && values.order !== '' ? Number(values.order) : null,
    };

    // `updatePicture` only means something on an edit, and only when the address on screen is
    // no longer the one that produced the item's current thumbnail — sending it whenever the
    // field is merely present would re-request the same image every save. Clearing the field
    // (empty result) sends `pictureUrl: null` with no `updatePicture`: there is no source left to
    // fetch FROM, so nothing is asked to run.
    if (isEdit && nextPictureUrl && nextPictureUrl !== originalPictureUrl) {
      shared.updatePicture = true;
    }

    const typed =
      type === FILM
        ? {
            directors: splitList(values.directors),
            cast: splitList(values.cast),
            releaseYear: values.releaseYear !== '' ? Number(values.releaseYear) : null,
            duration: values.duration !== '' ? Number(values.duration) : null,
            tmdbId: values.tmdbId.trim() || null,
          }
        : {
            authors: splitList(values.authors),
            isbn: values.isbn.trim(),
          };

    return { ...shared, ...typed };
  };

  const onFormSubmit = async (event) => {
    event.preventDefault();
    // Cleared before the field-validation early return, not after: a failed save followed by a
    // resubmit that trips field validation used to leave the OLD server-error banner sitting
    // above the new field errors, since `setError(null)` only ran on the path that reached the
    // API call.
    setError(null);
    const nextErrors = validateItem(type, {
      title: values.title,
      summary: values.summary,
      pictureUrl: values.pictureUrl,
      collectionId: values.collectionId,
      order: values.order,
      initialCollectionId: initial?.collectionId,
      directors: type === FILM ? splitList(values.directors) : undefined,
      releaseYear: values.releaseYear,
      duration: values.duration,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsBusy(true);
    try {
      await onSubmit(buildPayload());
    } catch (err) {
      // Whatever the API rejected, this is the one place left to say so: nothing on this form
      // maps a generic 400 to a specific field beyond the ones already checked above.
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <form onSubmit={onFormSubmit} noValidate>
      {error && (
        <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
          {error}
        </p>
      )}

      <Field
        label="Title"
        maxLength={TITLE_MAX}
        counter={TITLE_MAX - values.title.length}
        value={values.title}
        error={errors.title}
        onChange={set('title')}
      />
      <Field
        label="Summary"
        as="textarea"
        rows={4}
        maxLength={SUMMARY_MAX}
        // Hidden until the reader is actually near the wall — see SUMMARY_COUNTER_THRESHOLD.
        // `null` (not the number) is what makes Field skip the row entirely (`counter != null`).
        counter={
          SUMMARY_MAX - values.summary.length <= SUMMARY_COUNTER_THRESHOLD
            ? SUMMARY_MAX - values.summary.length
            : null
        }
        value={values.summary}
        error={errors.summary}
        onChange={set('summary')}
      />
      {/* Shared by both types, and editable rather than a re-fetch toggle (DESIGN.md, "the cover
          becomes editable"): detection frequently returns no cover at all, and gating a control
          on `pictureUrl` already existing excludes exactly the reader who needed one. The source
          is never named ("from Babelio") — the reader cannot act on which resolver produced it,
          only on the address itself, so that is the only thing this field states. A plain text
          input, not `.num`: an address is not a numeral (§3). */}
      <Field
        label="Cover image"
        type="url"
        value={values.pictureUrl}
        error={errors.pictureUrl}
        hint="A direct link to a cover picture — leave blank for none."
        onChange={set('pictureUrl')}
      />

      {type === BOOK ? (
        <>
          <Field
            label="Authors"
            value={values.authors}
            hint="Comma-separated — split into a list when you save."
            onChange={set('authors')}
          />
          <Field label="ISBN" value={values.isbn} onChange={set('isbn')} />
        </>
      ) : (
        <>
          <Field
            label="Directors"
            value={values.directors}
            error={errors.directors}
            hint="Comma-separated — split into a list when you save."
            onChange={set('directors')}
          />
          <Field
            label="Cast"
            value={values.cast}
            hint="Comma-separated — split into a list when you save."
            onChange={set('cast')}
          />
          <Field
            label="Release year"
            type="number"
            value={values.releaseYear}
            error={errors.releaseYear}
            onChange={set('releaseYear')}
          />
          <Field
            label="Duration (minutes)"
            type="number"
            value={values.duration}
            error={errors.duration}
            onChange={set('duration')}
          />
          <Field label="TMDB ID" value={values.tmdbId} onChange={set('tmdbId')} />
        </>
      )}

      <Field as="select" label="Collection" value={values.collectionId} onChange={onCollectionChange}>
        <option value="">None</option>
        {(collections ?? []).map((collection) => (
          <option key={collection.id} value={collection.id}>
            {collection.name}
          </option>
        ))}
      </Field>

      {/* Shown only once a collection is chosen — the invariant this pair enforces cannot even
          be expressed by the UI when there is no collection to be an order WITHIN. */}
      {values.collectionId && (
        <Field
          label="Order in the collection"
          type="number"
          min={1}
          max={1000}
          value={values.order}
          onChange={onOrderChange}
        />
      )}

      {/* Both controls above render together and are validated as one pair (DESIGN.md §6) — a
          single error under both, not two field-level messages the reader has to reconcile. */}
      {errors.collection && (
        <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
          {errors.collection}
        </p>
      )}

      {/* Two different reasons, and naming the right one matters more here than anywhere else in
          the app: `orderRequired` fires when an item is staying in its current collection and the
          order has been cleared, which is a hazard nothing else on screen explains (see the
          `orderRequired` comment above). A single generic reason would send a reader looking at
          the title field. */}
      <PlateButton
        type="submit"
        disabled={isBusy || !values.title.trim() || orderRequired}
        reason={orderRequired ? 'Give this item its order within the collection first.' : 'Give this item a title first.'}
      >
        {isBusy ? 'Saving' : submitLabel}
      </PlateButton>
    </form>
  );
};

export default ItemForm;
