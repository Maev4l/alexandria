package domain

import "errors"

// ErrItemNotFound signals that a library item does not exist, as opposed to a
// failure while reading it. Callers match it with errors.Is to distinguish a
// missing item (404) from an infrastructure error (500).
var ErrItemNotFound = errors.New("item not found")
