import { useState } from 'react';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { Check } from '@/components/icons';
import { BOOK, FILM, validateItem } from '@/lib/validate.js';
import { cn } from '@/lib/cn';

const TITLE_MAX = 100;
const SUMMARY_MAX = 4000;

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
  authors: joinList(initial.authors),
  isbn: initial.isbn ?? '',
  directors: joinList(initial.directors),
  cast: joinList(initial.cast),
  releaseYear: initial.releaseYear != null ? String(initial.releaseYear) : '',
  duration: initial.duration != null ? String(initial.duration) : '',
  tmdbId: initial.tmdbId ?? '',
  collectionId: initial.collectionId ?? '',
  order: initial.order != null ? String(initial.order) : '',
  updatePicture: false,
});

// One form, driven by `type` (BOOK=0, FILM=1) — the shared fields plus whichever half of the
// API's two request bodies applies. `initial` carries an `id` only when editing a real item;
// that single fact also decides whether the "fetch cover again" checkbox exists at all, since
// NewBook/NewVideo have no `pictureUrl` yet to fetch from.
const ItemForm = ({ type, initial, collections, onSubmit, submitLabel }) => {
  const isEdit = Boolean(initial?.id);
  const canRefetchCover = Boolean(initial?.pictureUrl);
  const [values, setValues] = useState(() => seed(initial));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

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

  const toggleUpdatePicture = () => {
    if (!canRefetchCover) return;
    setValues((current) => ({ ...current, updatePicture: !current.updatePicture }));
  };

  const buildPayload = () => {
    const shared = {
      title: values.title.trim(),
      summary: values.summary,
      collectionId: values.collectionId || null,
      order: values.collectionId ? Number(values.order) : null,
    };

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

    // A read-only fact carried through so a re-fetch can happen — the source URL is never one
    // of the fields this form lets the reader retype.
    if (initial?.pictureUrl) typed.pictureUrl = initial.pictureUrl;
    if (isEdit && values.updatePicture) typed.updatePicture = true;

    return { ...shared, ...typed };
  };

  const onFormSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateItem(type, {
      title: values.title,
      summary: values.summary,
      collectionId: values.collectionId,
      order: values.order,
      directors: type === FILM ? splitList(values.directors) : undefined,
      releaseYear: values.releaseYear,
      duration: values.duration,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setError(null);
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
        <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm">
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
        counter={SUMMARY_MAX - values.summary.length}
        value={values.summary}
        error={errors.summary}
        onChange={set('summary')}
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
        <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm">
          {errors.collection}
        </p>
      )}

      {isEdit && (
        <div className="mb-6">
          <button
            type="button"
            role="checkbox"
            aria-checked={values.updatePicture}
            disabled={!canRefetchCover}
            onClick={toggleUpdatePicture}
            className={cn(
              'flex min-h-12 items-center gap-3 text-left text-sm',
              !canRefetchCover && 'text-ink-soft',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-6 shrink-0 items-center justify-center border-2',
                canRefetchCover ? 'border-ink' : 'border-ink-soft',
                // `text-ink` is paired explicitly here, not inherited from `body`'s default:
                // a ground that sets its own colour and leaves the foreground ambient is exactly
                // the defect shape that shipped once already — correct on paper by coincidence,
                // unreadable the moment the same class runs on the black cover.
                values.updatePicture && canRefetchCover && 'on-imprint bg-imprint text-ink',
              )}
            >
              {values.updatePicture && canRefetchCover && <Check size={16} />}
            </span>
            Fetch the cover again from its source
          </button>
          {!canRefetchCover && (
            <p className="mt-1 text-[13px] text-ink-soft">No source image to fetch from.</p>
          )}
        </div>
      )}

      <PlateButton type="submit" disabled={isBusy || !values.title.trim()}>
        {isBusy ? 'Saving' : submitLabel}
      </PlateButton>
    </form>
  );
};

export default ItemForm;
