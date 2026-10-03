// Build info for templates. `version` changes on every build and is appended to
// CSS/JS links so browsers fetch the new files instead of an old cached copy.
export default { year: new Date().getFullYear(), version: Date.now().toString(36) };
