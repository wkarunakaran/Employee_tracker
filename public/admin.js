// ================================
// admin.js — ProEduvate Employee Tracker
// Handles Admin Login & Redirection
// ================================

const form = document.getElementById("adminLoginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("⚠️ Please enter both username and password.");
    return;
  }

  try {
    const response = await fetch("/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password }),
      credentials: "include"
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert("✅ Login successful!");
      window.location.href = "/admin-dashboard.html";
    } else {
      alert("❌ Invalid credentials. Please try again.");
    }
  } catch (error) {
    console.error("Login Error:", error);
    alert("⚠️ Server error. Please try again later.");
  }
});
