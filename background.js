"use strict"

const BASE = "https://atpr.to"
const MENU_ID = "atpr-shorten-link"

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Shorten this link with atpr.to…",
    contexts: ["link"],
  })
})

// Mirrors the dashboard's own explain(): the server's message is safe to
// show, but a couple of statuses read better in plain language.
function explain(status, body) {
  if (status === 401) return "You're not signed in to atpr.to. Opening the site so you can log in."
  if (status === 409) return "That code is already taken."
  if (status === 429) return "Too many requests — wait a moment and try again."
  if (status === 502 || status === 503 || status === 504) return "atpr.to didn't respond. Try again shortly."
  if (body && body.error) return body.error
  return "That didn't work."
}

async function shorten(url, code) {
  const payload = { url }
  if (code) payload.code = code

  const res = await fetch(BASE + "/api/shorten", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  })

  let body = null
  try {
    body = await res.json()
  } catch (_) {
    // no body — fall through to explain()
  }

  if (!res.ok) {
    const err = new Error(explain(res.status, body))
    err.status = res.status
    throw err
  }
  return body
}

// Right-clicking a link wants to see and confirm the shorten before it
// happens, same as typing one in — so this opens the real toolbar popup
// prefilled with the link rather than firing the request straight away.
// openPopup() takes no arguments, so the link travels through storage:
// stashed here, read and cleared by popup.js on load.
const api = typeof browser !== "undefined" ? browser : chrome

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID || !info.linkUrl) return

  await chrome.storage.local.set({ pendingUrl: info.linkUrl })
  try {
    await api.action.openPopup()
  } catch (_) {
    // Older Chrome (pre-127) doesn't have action.openPopup() at all, and
    // even where it exists it can decline outside a fresh user gesture.
    // Nothing to fall back to here — the stashed URL just sits ready for
    // whenever the popup is next opened by hand.
  }
})

// The popup can't reach fetch() on the atpr.to origin as cleanly from its
// own context in every browser, so it routes shorten requests through here.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "shorten") return false
  shorten(msg.url, msg.code)
    .then(body => sendResponse({ ok: true, body }))
    .catch(err => sendResponse({ ok: false, message: err.message, status: err.status }))
  return true // keep the channel open for the async response
})
