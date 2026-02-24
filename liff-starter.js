// ===== CONFIG (ของคุณ) กรอกเอง =====
const LIFF_ID = "2009127023-sgWJernO"; // กรอกเอง
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzyzubdy2RHBv88vZmylzxy2_tL1FzQypLUSmQCbeH9Dq3KOAIKPrkA23DvZln9zx783Q/exec";

// ===== INIT =====
async function liffInit() {
  await liff.init({ liffId: LIFF_ID });

  if (!liff.isLoggedIn()) {
    // แนะนำให้คง redirectUri ไว้ให้กลับมาหน้าเดิม
    liff.login({ redirectUri: window.location.href });
    return;
  }

  // 1) getProfile เพื่อได้ userId และข้อมูลพื้นฐาน
  const profile = await liff.getProfile();
  window.__LIFF_PROFILE__ = profile;

  // โชว์ในหน้า (ถ้ามี element)
  const uidEl = document.getElementById("userId");
  if (uidEl) uidEl.textContent = profile.userId;

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
    const key = `emailSaved:${profile.userId}`;
    const lastSaved = localStorage.getItem(key);

    if (lastSaved !== email) {
      try {
        const r = await apiPost("members", "patchEmail2", {
          userId: profile.userId,
          eMail_2: email
        });

        if (r && r.ok) {
          localStorage.setItem(key, email);
          // ไม่ต้อง toast ก็ได้ เพราะคุณอยากแอบทำหลังบ้าน
          // toast("Email saved", true);
        } else {
          // ถ้าจะไม่ให้ผู้ใช้เห็น error ก็ comment บรรทัดนี้ได้
          toast("auto-save email failed: " + (r?.error || "unknown"), false);
        }
      } catch (err) {
        // ถ้าจะไม่ให้ผู้ใช้เห็น error ก็ comment บรรทัดนี้ได้
        toast("auto-save email failed: " + String(err), false);
      }
    }
  }
}

// ===== API POST =====
async function apiPost(sheet, action, payload) {
  const url = `${WEB_APP_URL}?sheet=${encodeURIComponent(sheet)}&action=${encodeURIComponent(action)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload || {})
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "INVALID_JSON", raw: text };
  }
}

// ===== TOAST =====
function toast(msg, ok = true) {
  const el = document.getElementById("toast");
  if (!el) return; // ถ้าอยากให้เด้ง alert ให้เปลี่ยนเป็น: return alert(msg);
  el.textContent = msg;
  el.className = ok ? "mini ok" : "mini err";
}

// ===== START =====
window.addEventListener("load", () => {
  if (typeof liff === "undefined") {
    toast("LIFF SDK not loaded", false);
    return;
  }
  liffInit().catch(err => toast(String(err), false));
});
