// The only way to patch a fetched record into a list, and its value is NOT deduplication — it is
// a one-line `map`. What it buys is that the name carries the rule, and that the merge form is no
// longer something anyone has to remember not to reach for.
//
// THE RULE: a re-read REPLACES the record. It never spreads over the previous one.
//
// The reason, paid for once: optional fields on this API are `omitempty`, so they arrive ABSENT
// rather than null — and a spread cannot delete a key. `{ ...row, ...fresh }` therefore keeps
// every field the new record dropped. It shipped on the search surface, where returning an item
// left the row printing OUT after a return that had genuinely succeeded, and the reader's natural
// response — tapping `Mark returned` again — wrote a third RETURNED event for one loan into an
// append-only ledger.
//
// It survived a green suite because the test exercised a LEND, which ADDS a key, and a spread is
// perfect at adding. Only a return removes one. Any probe over this helper must therefore assert
// on ABSENCE: that a field the response OMITS is gone from what the reader sees.
//
// A checker was considered and declined: the whole app contained exactly one merge-style patch of
// a server record, so a guard would have protected a class of one. With two call sites the
// cheaper protection is to close the door rather than watch it.
export const replaceById = (rows, fresh) => rows.map((row) => (row.id === fresh.id ? fresh : row));
