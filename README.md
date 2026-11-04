# Popp for Bullhorn: reference extension

This is a small Chrome extension that opens Popp inside Bullhorn. Use it as a
reference for your own extension: it shows the URLs to open, the values to send,
and the rules the iframe must follow so that the login works.

It is a reference, not a product. It has no build step, no tests and no release
process.

## What it does

1. On every Bullhorn page (`https://*.bullhornstaffing.com/*`), it adds a round
   **Popp** badge (65 × 65 px), 20 px from the bottom-right corner of the window.
   On hover it turns dark and shows "Use AI to find candidates and build
   workflows". If the badge covers a Bullhorn control, the recruiter can move it
   to another corner or edge with **Badge position** in the menu.
2. A click on the badge opens Popp on **Candidates**, in a drawer on the right side
   of the page. The recruiter moves to Workflows with Popp's own header in the
   drawer. The drawer title is "Popp · Job {id}" when a vacancy is open, and
   "Popp" otherwise. The badge is hidden while the drawer is open, so it does
   not cover Popp; the drawer's × closes it.
3. A right-click on the badge opens a menu with **Find candidates**, **New
   workflow** and **Badge position**.

| Option | From a vacancy | From any other screen |
|---|---|---|
| Find candidates | Candidates opens with the job description in the search box | Candidates with an empty search box |
| New workflow | Workflows opens the vacancy's workflow, or creates a draft | The Workflows list |

## The contract

### URLs

| Option | URL |
|---|---|
| Find candidates | `https://ai.joinpopp.com/ats?instanceId={instanceId}&jobId={jobId}` |
| New workflow | `https://app.joinpopp.com/ats?instanceId={instanceId}&jobId={jobId}` |

### Parameters

| Parameter | Required | Value |
|---|---|---|
| `instanceId` | Yes | The Bullhorn corporation id of the account. Popp uses it to find the Popp account that is connected to this Bullhorn account. |
| `jobId` | No | The id of the open vacancy (Bullhorn `JobOrder` id). Leave it out when no vacancy is open. |

Bullhorn job ids are unique only inside one Bullhorn account, so always send
`instanceId` together with `jobId`.

### Where the values come from

This extension reads both values from the Bullhorn page:

- `instanceId`: `window.NOVO_SESSION.UlSession.identity.corporationId`.
- `jobId`: the address of the record frame that is shown, which has the form
  `/content/record/JobOrder/{id}/…`. Bullhorn keeps one frame for each open
  record, so the extension reads only the frame that is visible.

These are Bullhorn internals, not a public API. A Bullhorn release can change
them. If you have a supported way to get the corporation id and the open
vacancy, use that instead.

A content script normally runs in an isolated world and cannot read
`window.NOVO_SESSION`. This extension runs in the page's main world
(`"world": "MAIN"` in `manifest.json`, Chrome 111 or later).

### Rules for the iframe

Candidates and Workflows share one login through cookies. Both must see those
cookies inside the iframe, so:

- **Put the iframe directly on a `*.bullhornstaffing.com` page.** Popp uses the
  shared login in a frame only when every parent page is on
  `https://*.bullhornstaffing.com`. Inside another site, Popp asks for its own
  login. Inside an extension page (`chrome-extension://…`), Workflows does not
  load at all, because that parent is not allowed to frame it.
- **Do not add a `sandbox` attribute.** A sandboxed frame cannot use cookies.
- **Use one iframe for both.** Popp moves between Candidates and Workflows
  inside the same frame.
- **Open the URL in the frame, not in a new tab.** Popp shows its Bullhorn header
  (Workflows, Candidates, Admin ↗) only inside a frame that opened `/ats`.

Popp allows only Popp and `*.bullhornstaffing.com` to frame Workflows
(`Content-Security-Policy: frame-ancestors`).

### Browsers

| Browser | Result |
|---|---|
| Chrome | One login for Candidates and Workflows |
| Edge | Expected to match Chrome (not tested) |
| Safari, Firefox, or Chrome with third-party cookies blocked | Popp works, but Workflows asks for its own login, because these browsers block the shared cookies in a frame |

## Install for testing

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Open Bullhorn and click the **Popp** button.

After you change a file, click the reload icon on the extension card, then reload
the Bullhorn page.

The badge position is kept in the Bullhorn page's `localStorage`.
