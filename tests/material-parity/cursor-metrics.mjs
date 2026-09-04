export function effectiveBrowserCursor(authoredCursor, hasSelectableTextAtPoint) {
  if (authoredCursor !== 'auto') return authoredCursor;
  return hasSelectableTextAtPoint ? 'text' : 'default';
}
