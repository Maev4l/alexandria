const BOOK = 0;
const FILM = 1;

const isSet = (value) => value !== undefined && value !== null && value !== '';

// The backend enforces this pair only at the handler, so the form has to hold it or the
// reader gets a generic 400 with no field to fix.
export const validateCollectionOrder = ({ collectionId, order }) => {
  const hasCollection = Boolean(collectionId);
  const hasOrder = isSet(order);

  if (!hasCollection && !hasOrder) return null;
  if (hasCollection && !hasOrder) return 'Give this item its order in the collection, 1 to 1000.';
  if (!hasCollection && hasOrder) return 'Choose a collection, or clear the order.';

  const value = Number(order);
  if (!Number.isInteger(value)) return 'The order must be a whole number.';
  if (value < 1 || value > 1000) return 'The order must be from 1 to 1000.';
  return null;
};

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
