// A shared @testing-library TextMatch function, factored out of three test files that each
// pasted an identical copy (LibraryRow.test.jsx, DetailMarks.test.jsx, ItemDetail.test.jsx).
// This project's own doctrine — applied twice already elsewhere in the codebase — is that
// where a small class of sites needs one correct construction, make the correct one the only
// one reachable rather than repeating it: the name carries the rule, and the wrong (retyped)
// form stops being available to reach for.
//
// SharedRibbon puts a labelled count in its own mono span (DESIGN.md §3), so a phrase like
// "Shared · 2" is split across two text nodes: the outer span's direct text is "Shared · " and
// the count lives in a nested <span className="num">. `getByText`'s default matcher
// (`getNodeText`) only concatenates an element's DIRECT text-node children, not its full
// subtree — so a plain string/regex match against the combined phrase can no longer find it as
// one node once any part of it moves into a child element.
//
// This matches the innermost element whose full rendered text (via `textContent`, which DOES
// walk the subtree) satisfies the pattern, and excludes any element one of whose children also
// satisfies it — otherwise both the wrapping element and the matching child would be returned,
// which `getByText` treats as an ambiguous multi-match failure.
export const matchesOwnText = (pattern) => (_, element) => {
  const text = element.textContent ?? '';
  if (!pattern.test(text)) return false;
  return Array.from(element.children).every((child) => !pattern.test(child.textContent ?? ''));
};
