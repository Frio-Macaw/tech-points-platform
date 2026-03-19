// ===== CONFIG (ของคุณ) กรอกเอง =====
const LIFF_ID = "2009127023-sgWJernO"; // กรอกเอง
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzyzubdy2RHBv88vZmylzxy2_tL1FzQypLUSmQCbeH9Dq3KOAIKPrkA23DvZln9zx783Q/exec";

// ===== INIT =====
async function liffInit() {
  await liff.init({ liffId: LIFF_ID });

  // ✅ บังคับต้องเปิดในแอป LINE เท่านั้น
  if (!liff.isInClient()) {
    toast("กรุณาเปิดผ่าน LINE (Rich Menu) เท่านั้น", false);
    return;
  }

  // ถ้าอยู่ใน LINE แต่ยังไม่ล็อกอิน (กรณี rare) ค่อย login
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    return;
  }

  // 1) getProfile เพื่อได้ userId และข้อมูลพื้นฐาน
  const profile = await liff.getProfile();
  window.__LIFF_PROFILE__ = profile;

  // ===== แสดงเฉพาะชื่อ LINE (ซ่อน UserId ทุกหน้า) =====
  const uidEl = document.getElementById("userId");
  if (uidEl) {
    // ยัง set ค่าไว้ได้ (เผื่อ debug) แต่ไม่โชว์ให้ผู้ใช้เห็น
    uidEl.textContent = profile.userId;

    // ✅ ซ่อนทั้งบรรทัด "UserId: ...." โดยซ่อนกล่อง parent (.mini)
    const row = uidEl.closest(".mini");
    if (row) row.style.display = "none";
  }

  const dnEl = document.getElementById("displayName");
  if (dnEl) dnEl.textContent = profile.displayName || "-";

  // 2) แอบดึง email จาก ID Token (ต้องมี scope: openid + email)
  //    ถ้าไม่มี email => ปล่อยว่าง ไม่ต้องทำอะไร
  const decoded = liff.getDecodedIDToken();
  const email = decoded?.email ? String(decoded.email).trim() : "";
  window.__LIFF_EMAIL__ = email;

  // 3) ถ้ามี email และยังไม่เคยเซฟ email นี้ในเครื่อง -> ส่งไปหลังบ้าน
  //    (กันยิงซ้ำทุกครั้งที่เปิดหน้า)
  if (email) {
    const key = `emailSaved:v2:${profile.userId}`;
    const lastSaved = localStorage.getItem(key);

    if (lastSaved !== email) {
      try {
        const r = await apiPost("members", "patchEmail2", {
          userId: profile.userId,
          eMail_2: email
        });

        if (r && r.ok && r.mode === "patched") {
          localStorage.setItem(key, email);
          } else {
          console.warn("auto-save email not completed:", r);
          }
      } catch (err) {
          // ✅ ไม่โชว์อะไรให้ end user เห็น
          console.warn("auto-save email exception:", err);
      }
    }
  }
}

// ===== WAIT PROFILE (กันกดเร็ว ตอน LIFF ยัง init ไม่เสร็จ) =====
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

    try { return JSON.parse(text); }
    catch { return { ok:false, error:"INVALID_JSON", raw:text }; }

  }catch(err){
    return { ok:false, error:"FETCH_FAILED", detail:String(err) };
  }
}

// ===== TOAST =====
function toast(msg, ok = true) {
  const el = document.getElementById("toast");
  if (!el) return; // ถ้าอยากให้เด้ง alert ให้เปลี่ยนเป็น: return alert(msg);
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
