/**
 * Stamps the saved theme on <html> before first paint so the page never flashes
 * paper before switching to navy. Runs as a plain inline script, not React.
 */
const script = `
(function(){
  try {
    var saved = window.localStorage.getItem('laddu_theme');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch (e) {
    // Private windows and blocked site data both land here. The OS preference
    // still applies through the media query, so there is nothing to do.
  }
})();
`

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
