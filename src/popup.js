"use strict"

const BASE = "https://atpr.to"

const form = document.getElementById("make")
const urlInput = document.getElementById("url")
const codeInput = document.getElementById("code")
const goBtn = document.getElementById("go")
const errorEl = document.getElementById("error")
const resultEl = document.getElementById("result")
const resultLink = document.getElementById("result-link")
const copyBtn = document.getElementById("copy")
const signedOutEl = document.getElementById("signedout")
const signInBtn = document.getElementById("signin")
const dashboardBtn = document.getElementById("dashboard")

function say(el, text) {
  el.textContent = text || ""
  el.hidden = !text
}

// Opened from the "Shorten this link" context menu: the link was stashed
// in storage rather than read from the tab, since the tab's own URL is
// the page the link sits on, not the link itself. Cleared right after so
// a later plain open of the popup doesn't reuse a stale value.
chrome.storage.local.get("pendingUrl", data => {
  if (data.pendingUrl) {
    urlInput.value = data.pendingUrl
    chrome.storage.local.remove("pendingUrl")
    urlInput.focus()
    urlInput.select()
    return
  }

  // Opened from the toolbar icon: prefill with the current tab's URL — the
  // common case is "shorten what I'm looking at", not typing one in.
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0]
    if (tab && tab.url && /^https?:\/\//.test(tab.url)) urlInput.value = tab.url
    urlInput.focus()
    urlInput.select()
  })
})

function shorten(url, code) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "shorten", url, code }, res => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (res.ok) resolve(res.body)
      else {
        const err = new Error(res.message)
        err.status = res.status
        reject(err)
      }
    })
  })
}

form.addEventListener("submit", async e => {
  e.preventDefault()
  say(errorEl, "")
  signedOutEl.hidden = true
  resultEl.hidden = true
  goBtn.disabled = true

  try {
    const body = await shorten(urlInput.value.trim(), codeInput.value.trim())
    resultLink.textContent = body.short_url
    resultLink.href = body.short_url
    resultEl.hidden = false
  } catch (err) {
    if (err.status === 401) signedOutEl.hidden = false
    else say(errorEl, err.message)
    if (err.status === 409) codeInput.focus()
  } finally {
    goBtn.disabled = false
  }
})

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultLink.textContent)
    copyBtn.textContent = "Copied"
  } catch (_) {
    copyBtn.textContent = "Press ⌘C"
  }
  setTimeout(() => (copyBtn.textContent = "Copy"), 1500)
})

signInBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: BASE })
  window.close()
})

dashboardBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: BASE + "/dashboard" })
  window.close()
})
