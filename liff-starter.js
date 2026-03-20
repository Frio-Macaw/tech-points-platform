// ===== CONFIG (ของคุณ) =====
const LIFF_ID = "2009127023-sgWJernO";
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzyzubdy2RHBv88vZmylzxy2_tL1FzQypLUSmQCbeH9Dq3KOAIKPrkA23DvZln9zx783Q/exec";

// ===== INIT =====
async function liffInit() {
  await liff.init({ liffId: LIFF_ID });

  if (!liff.isInClient()) {
    toast("กรุณาเปิดผ่าน LINE (Rich Menu) เท่านั้น", false);
    return;
  }

  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    return;
  }

  // 1) profile
  const profile = await liff.getProfile();
  window.__LIFF_PROFILE__ = profile;

  // ซ่อน UserId
  const uidEl = document.getElementById("userId");
  if (uidEl) {
    uidEl.textContent = profile.userId;
    const row = uidEl.closest(".mini");
    if (row) row.style.display = "none";
  }

  const dnEl = document.getElementById("displayName");
  if (dnEl) dnEl.textContent = profile.displayName || "-";

  // 2) email จาก LINE
  const decoded = liff.getDecodedIDToken();
  const email = decoded?.email ? String(decoded.email).trim() : "";
  window.__LIFF_EMAIL__ = email;

  console.log("LIFF decoded email =", email || "(empty)");
  console.log("LIFF userId =", profile.userId);

  // ถ้ามี input eMail อยู่บนหน้า ให้เติมให้เลย
  const emailEl = document.getElementById("eMail");
  if (emailEl && !emailEl.value && email) {
    emailEl.value = email;
  }

  // 3) auto save ลง eMail_2 ถ้ามี row อยู่แล้ว
  if (email) {
    const key = `emailSaved:v3:${profile.userId}`;
    const lastSaved = localStorage.getItem(key);

    if (lastSaved !== email) {
      try {
        const r = await apiPost("members", "patchEmail2", {
          userId: profile.userId,
          eMail_2: email
        });

        console.log("patchEmail2(auto) =", r);

        if (r && r.ok && r.mode === "patched") {
          localStorage.setItem(key, email);
        } else {
          console.warn("auto-save email not completed:", r);
        }
      } catch (err) {
        console.warn("auto-save email exception:", err);
      }
    }
  }
}

// ===== WAIT PROFILE =====
async function waitProfile_(ms = 5000){
  const start = Date.now();
  while (!window.__LIFF_PROFILE__) {
    if (Date.now() - start > ms) return null;
    await new Promise(r => setTimeout(r, 100));
  }
  return window.__LIFF_PROFILE__;
}

async function apiPost(sheet, action, payload) {
  const url = `${WEB_APP_URL}?sheet=${encodeURIComponent(sheet)}&action=${encodeURIComponent(action)}`;

  try{
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload || {})
    });

    const text = await res.text();
    if (!res.ok){
      return { ok:false, error:`HTTP_${res.status}`, raw:text };
    }

    try {
      return JSON.parse(text);
    } catch {
      return { ok:false, error:"INVALID_JSON", raw:text };
    }

  } catch(err){
    return { ok:false, error:"FETCH_FAILED", detail:String(err) };
  }
}

// ===== TOAST =====
function toast(msg, ok = true) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = ok ? "mini ok" : "mini err";
}

function popup(msg, title = "สำเร็จ ✅", autoCloseMs = 2500){
  const overlay = document.getElementById("modalOverlay");
  const titleEl = document.getElementById("modalTitle");
  const msgEl = document.getElementById("modalMsg");
  if (!overlay || !titleEl || !msgEl) { alert(msg); return; }

  titleEl.textContent = title;
  msgEl.textContent = msg;
  overlay.style.display = "flex";

  if (autoCloseMs > 0) setTimeout(() => closePopup(), autoCloseMs);
}

function closePopup(){
  const overlay = document.getElementById("modalOverlay");
  if (overlay) overlay.style.display = "none";
}

// ===== START =====
window.addEventListener("load", () => {
  if (typeof liff === "undefined") {
    toast("LIFF SDK not loaded", false);
    return;
  }
  liffInit().catch(err => toast(String(err), false));
});
