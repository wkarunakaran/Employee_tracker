// ================================
// admin.js — ProEduvate Employee Tracker
// Handles Admin Login & Secure Redirection
// ================================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      alert("⚠️ Please enter both username and password.");
      return;
    }

    try {
      // ✅ POST to backend admin login route
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // allows session cookie
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("✅ Login successful!");
        // Small delay for smooth UX
        setTimeout(() => {
          window.location.href = "/admin-dashboard.html";
        }, 500);
      } else {
        alert("❌ Invalid credentials. Please try again.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("⚠️ Unable to connect to the server. Try again later.");
    }
  });
});

// ================================
// Optional: Auto-redirect if already logged in
// ================================
(async function checkAdminSession() {
  try {
    const res = await fetch("/api/admin/check-session", {
      method: "GET",
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.loggedIn) {
        window.location.href = "/admin-dashboard.html";
      }
    }
  } catch (err) {
    console.warn("Session check skipped:", err);
  }
})();
