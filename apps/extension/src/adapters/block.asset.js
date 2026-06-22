/* AD-ME-START */
(function () {
  "use strict";
  var AD = __AD_ME_TEXT__;
  var CLICK_URL = __AD_ME_URL__;
  var AD_ID = __AD_ME_ID__;

  // Escape HTML entities
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Build ad HTML that matches Claude Code's spinner styling
  function buildAdHtml() {
    var href = /^https?:\/\//i.test(CLICK_URL) ? esc(CLICK_URL) : "#";
    var fg = "var(--vscode-foreground,currentColor)";
    var dim = "var(--vscode-descriptionForeground,currentColor)";
    return '<span data-ad-me="1" style="display:flex;align-items:center;width:100%;' +
      'box-sizing:border-box;padding:0 32px;white-space:nowrap;justify-content:flex-start">' +
      '<span style="display:flex;align-items:center;gap:7px;color:' + fg + ';min-width:0">' +
      '<svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true" ' +
      'style="vertical-align:middle;border-radius:3px;flex:0 0 auto">' +
      '<rect width="13" height="13" rx="3" fill="#e67e22"/>' +
      '<text x="6.5" y="9.6" font-size="8" font-family="monospace" ' +
      'font-weight="700" text-anchor="middle" fill="#fff">A</text></svg>' +
      '<a href="' + href + '" target="_blank" rel="noopener noreferrer" ' +
      'data-ad-me-link="1" style="color:' + fg +
      ';text-decoration:underline;overflow:hidden;text-overflow:ellipsis">' +
      esc(AD) + '</a></span>' +
      '<span style="font-size:11px;color:' + dim +
      ';flex:0 0 auto;margin-left:auto;padding-left:24px;opacity:0.6">Sponsored</span>' +
      '</span>';
  }

  // Find the active spinner row by class prefix
  function findSpinnerRow() {
    var els = document.querySelectorAll('[class*="spinnerRow_"]');
    // Prefer the last non-empty row (the live one, since transcript appends)
    for (var i = els.length - 1; i >= 0; i--) {
      var text = els[i].textContent || "";
      if (text.trim() && !isAdContent(text)) return els[i];
    }
    return null;
  }

  function isAdContent(text) {
    return text.indexOf("Sponsored") !== -1 && text.indexOf(AD) !== -1;
  }

  var lastClobberedNode = null;
  var lastSig = "";
  var GRACE_MS = 2000;
  var lastSeenMs = 0;
  var adVisible = false;

  function paint() {
    var row = findSpinnerRow();

    if (!row) {
      // No spinner row — check grace period
      if (adVisible && Date.now() - lastSeenMs > GRACE_MS) {
        adVisible = false;
        lastClobberedNode = null;
      }
      return;
    }

    lastSeenMs = Date.now();

    // Freshness check: only clobber if content changed (CC animates the verb)
    var sig = row.textContent || "";
    if (sig === lastSig && adVisible) return; // Already showing, content unchanged
    lastSig = sig;

    // Find the text element inside the spinner row
    var target = row;
    var spans = row.querySelectorAll("span");
    if (spans.length > 0) {
      // Target the first meaningful span (the verb text)
      for (var j = 0; j < spans.length; j++) {
        var t = (spans[j].textContent || "").trim();
        if (t && !isAdContent(t)) {
          target = spans[j];
          break;
        }
      }
    }

    // Clobber: replace spinner text with our ad
    if (target !== lastClobberedNode || !adVisible) {
      target.innerHTML = buildAdHtml();
      lastClobberedNode = target;
      adVisible = true;
    }
  }

  // Click handler: open URL on ad link click (capture phase for reliability)
  document.addEventListener("click", function (e) {
    var el = e.target;
    // Walk up to find our ad link
    for (var i = 0; i < 5 && el; i++) {
      if (el.getAttribute && el.getAttribute("data-ad-me-link") === "1") {
        // The href handles navigation; VS Code webview host opens it externally
        return;
      }
      el = el.parentElement;
    }
  }, true);

  // Poll + MutationObserver for immediate response
  var pollInterval = setInterval(paint, 300);

  var observer = new MutationObserver(function () {
    paint();
  });

  // Start observing once body exists
  function startObserving() {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } else {
      setTimeout(startObserving, 100);
    }
  }
  startObserving();
})();
/* AD-ME-END */
