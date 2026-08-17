const BOOK = 0;
const FILM = 1;

const isSet = (value) => value !== undefined && value !== null && value !== '';

// `undefined` (no initial collection at all — a new item) and `''` (the collection field
// cleared) must compare equal to "no collection before": the backend's own comparison
// (`oldCollectionId != *i.CollectionId`, api/services/items.go:188) is a plain string
// comparison, and normalising both sides here is what keeps a newly-set collection from being
// misread as unchanged.
const normalize = (id) => id ?? '';

// Order is required only when the item stays filed under the SAME collection it was already
// in. Verified against the Go source, not inferred: on create the server always ranks a
// nil order last (`maxOrder + 1`, api/services/items.go:277-284); on update it only
// auto-recalculates when the collection actually changed
// (`isNewToCollection := oldCollectionId != *i.CollectionId`, api/services/items.go:188-196).
// An UNCHANGED collection with a null order does not get auto-ranked — it corrupts the
// record instead: `internal/persistence/models.go:96-101` sorts an order-less item into the
// standalone alphabet regardless of its CollectionId, while the two-pass grouping lookup in
// `api/repositories/dynamodb/items.go:813` still keys it into `collectionItems[collectionId]`
// by CollectionId alone. The same record then renders as a nested member on one page and a
// loose row on another, page-dependently, and silently wrecks `ItemCount`/`partial` bookkeeping.
const collectionUnchanged = ({ collectionId, initialCollectionId }) =>
  normalize(collectionId) === normalize(initialCollectionId);

// The backend enforces the "order needs a collection" half only at the handler
// (`api/handlers/items.go:31`), so the form has to hold that or the reader gets a generic 400
// with no field to fix. The other half — "a collection needs an order" — is no longer
// unconditional; see `collectionUnchanged` above.
export const validateCollectionOrder = ({ collectionId, order, initialCollectionId }) => {
  const hasCollection = Boolean(collectionId);
  const hasOrder = isSet(order);

  if (!hasCollection && !hasOrder) return null;
  if (!hasCollection && hasOrder) return 'Choose a collection, or clear the order.';
  if (!hasOrder) {
    return collectionUnchanged({ collectionId, initialCollectionId })
      ? 'Give this item its order in the collection, 1 to 1000.'
      : null;
  }

  const value = Number(order);
  if (!Number.isInteger(value)) return 'The order must be a whole number.';
  if (value < 1 || value > 1000) return 'The order must be from 1 to 1000.';
  return null;
};

export { collectionUnchanged };

export const validateItem = (type, values) => {
  const errors = {};

  if (!values.title?.trim()) errors.title = 'A title is required.';
  else if (values.title.length > 100) errors.title = 'The title can be at most 100 characters.';

  if (values.summary && values.summary.length > 4000) {
    errors.summary = 'The summary can be at most 4000 characters.';
  }

  // The fetch this address feeds is server-side, so a typo's only feedback would otherwise be a
  // cover that silently never appears. Rejecting anything without a scheme up front turns that
  // into an error the reader can actually see and fix.
  if (isSet(values.pictureUrl) && !/^https?:\/\//i.test(values.pictureUrl.trim())) {
    errors.pictureUrl = 'The cover image address must start with http:// or https://.';
  }

  if (type === FILM) {
    if (isSet(values.releaseYear)) {
      const year = Number(values.releaseYear);
      if (!Number.isInteger(year) || year < 1800 || year > 2100) {
        errors.releaseYear = 'The release year must be from 1800 to 2100.';
      }
    }
    if (isSet(values.duration)) {
      const minutes = Number(values.duration);
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1000) {
        errors.duration = 'The duration must be from 0 to 1000 minutes.';
      }
    }
    if ((values.directors ?? []).some((name) => name.length > 100)) {
      errors.directors = 'Each director name can be at most 100 characters.';
    }
  }

  const collectionError = validateCollectionOrder(values);
  if (collectionError) errors.collection = collectionError;

  return errors;
};

export { BOOK, FILM };
