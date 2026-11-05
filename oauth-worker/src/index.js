/**
 * Decap CMS "github" backend needs an OAuth handshake to happen somewhere
 * with a client secret, which a static GitHub Pages site can't hold. This
 * Worker is that somewhere: it redirects to GitHub's authorize screen,
 * exchanges the resulting code for a token, and hands the token back to
 * the Decap admin UI via the postMessage protocol Decap expects.
 *
 * Routes:
 *   GET /auth      - start the flow, redirect to GitHub
 *   GET /callback  - GitHub redirects here with ?code=..., we exchange it
 *
 * Required secrets (see README): GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 */

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const STATE_COOKIE = "decap_oauth_state";

function randomState() {
  return crypto.randomUUID();
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const SITE_COOKIE = "decap_oauth_site";

// Sites allowed to receive a token via the no-opener redirect fallback.
// The first entry is the default when the site can't be determined.
const ALLOWED_SITE_ORIGINS = [
  "https://housesofheaven.com",
  "https://www.housesofheaven.com",
];

// Decap passes the admin page's hostname as ?site_id= on /auth.
function siteOriginFromId(siteId) {
  if (!siteId) return ALLOWED_SITE_ORIGINS[0];
  const origin = `https://${siteId}`;
  return ALLOWED_SITE_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_SITE_ORIGINS[0];
}

// Safe to drop inside an inline <script>: JSON, with "<" escaped so a
// value can't close the script tag.
function jsLiteral(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function htmlMessagePage({ success, provider, token, error, siteOrigin }) {
  const payload = success
    ? `success:${JSON.stringify({ token, provider })}`
    : `error:${JSON.stringify({ message: error })}`;
  const message = `authorization:${provider}:${payload}`;
  const fallbackUrl =
    success && siteOrigin
      ? `${siteOrigin}/admin/#decap_token=${encodeURIComponent(token)}`
      : null;

  // Decap's popup handshake: the popup announces itself as "authorizing",
  // waits for the opener to echo that back, then sends the real result.
  // This two-step exists so the opener has a chance to attach its
  // listener before the payload is sent. The opener's listener isn't
  // guaranteed to be attached yet on the first ping (React hasn't
  // necessarily rendered), so re-ping on an interval until it responds
  // instead of firing once — a one-shot ping can race and hang forever.
  //
  // Some browsers / privacy settings sever window.opener once the popup
  // has passed through github.com. When that happens (or the opener never
  // answers), fall back to navigating this window to the admin page with
  // the token in the URL fragment; public/admin/index.html picks it up.
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Logging in…</title></head>
  <body style="font-family: system-ui, sans-serif; padding: 2rem;">
    <p id="status">Finishing login…</p>
    <script>
      (function () {
        var message = ${jsLiteral(message)};
        var provider = ${jsLiteral(provider)};
        var success = ${success ? "true" : "false"};
        var errorText = ${jsLiteral(error || "")};
        var fallbackUrl = ${jsLiteral(fallbackUrl)};
        var allowedOrigins = ${jsLiteral(ALLOWED_SITE_ORIGINS)};
        var statusEl = document.getElementById('status');
        var done = false;

        function setStatus(text) { statusEl.textContent = text; }

        function fallback(reason) {
          if (done) return;
          done = true;
          clearInterval(pingInterval);
          if (!success) {
            setStatus('Login failed: ' + errorText);
          } else if (fallbackUrl) {
            setStatus('Could not reach the admin window (' + reason + '). Redirecting…');
            window.location.replace(fallbackUrl);
          } else {
            setStatus('Could not reach the admin window (' + reason + '). Close this window and try again.');
          }
        }

        // Only answer Decap's echo from the admin window. Extensions
        // (password managers etc.) also post messages into this page;
        // answering one of those sends the token to the wrong origin,
        // where the browser silently drops it.
        function receiveMessage(e) {
          if (done || !window.opener) return;
          if (e.source !== window.opener) return;
          if (e.data !== 'authorizing:' + provider) return;
          if (allowedOrigins.indexOf(e.origin) === -1) return;
          done = true;
          window.opener.postMessage(message, e.origin);
          window.removeEventListener('message', receiveMessage, false);
          clearInterval(pingInterval);
          setStatus(success ? 'Logged in. You can close this window.' : 'Login failed: ' + errorText);
        }

        function ping() {
          if (!window.opener) return fallback('no opener');
          try {
            window.opener.postMessage('authorizing:' + provider, '*');
          } catch (err) {
            fallback(String(err));
          }
        }

        window.addEventListener('message', receiveMessage, false);
        var pingInterval = setInterval(ping, 250);
        ping();
        setTimeout(function () { fallback('timed out'); }, 5000);
      })();
    </script>
  </body>
</html>`;
}

async function handleAuth(url, env) {
  const provider = url.searchParams.get("provider") || "github";
  const scope = url.searchParams.get("scope") || "repo,user";
  const siteOrigin = siteOriginFromId(url.searchParams.get("site_id"));
  const state = randomState();

  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set(
    "redirect_uri",
    `${url.origin}/callback`,
  );
  authorizeUrl.searchParams.set("scope", scope);
  authorizeUrl.searchParams.set("state", state);

  const headers = new Headers({ Location: authorizeUrl.toString() });
  headers.append(
    "Set-Cookie",
    `${STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
  );
  headers.append(
    "Set-Cookie",
    `${SITE_COOKIE}=${encodeURIComponent(siteOrigin)}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
  );
  return new Response(null, { status: 302, headers });
}

async function handleCallback(request, url, env) {
  const provider = "github";
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = getCookie(request, STATE_COOKIE);

  if (!code || !state || state !== cookieState) {
    return new Response(
      htmlMessagePage({
        success: false,
        provider,
        error: "Invalid or missing OAuth state",
      }),
      { headers: { "Content-Type": "text/html" }, status: 400 },
    );
  }

  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/callback`,
    }),
  });

  const tokenBody = await tokenRes.json();

  if (!tokenRes.ok || tokenBody.error || !tokenBody.access_token) {
    return new Response(
      htmlMessagePage({
        success: false,
        provider,
        error: tokenBody.error_description || "Token exchange failed",
      }),
      { headers: { "Content-Type": "text/html" }, status: 400 },
    );
  }

  const siteCookie = getCookie(request, SITE_COOKIE);
  const siteOrigin = ALLOWED_SITE_ORIGINS.includes(siteCookie)
    ? siteCookie
    : ALLOWED_SITE_ORIGINS[0];

  return new Response(
    htmlMessagePage({
      success: true,
      provider,
      token: tokenBody.access_token,
      siteOrigin,
    }),
    {
      headers: {
        "Content-Type": "text/html",
        "Set-Cookie": `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`,
      },
    },
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      return handleAuth(url, env);
    }
    if (url.pathname === "/callback") {
      return handleCallback(request, url, env);
    }
    return new Response("Decap CMS OAuth provider", { status: 200 });
  },
};
