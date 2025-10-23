document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("adminLoginForm");
  if (loginForm) {
    // 🔹 Handle login form submission
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!username || !password) {
        alert("Please enter both username and password.");
        return;
      }

      try {
        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // ✅ Important for sessions
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          alert("Login successful!");
          window.location.href = "/admin"; // ✅ Redirect to dashboard
        } else {
          alert(data.message || "Invalid credentials. Please try again.");
        }
      } catch (error) {
        console.error("Login error:", error);
        alert("Server error. Please try again later.");
      }
    });
  }

  // 🔹 Auto redirect to /admin if already authenticated
  checkExistingSession();
});

// ✅ Check if admin is already logged in
async function checkExistingSession() {
  try {
    const response = await fetch("/api/admin/auth-status", {
      credentials: "include",
    });
    const data = await response.json();

    if (data.authenticated && window.location.pathname === "/admin-login") {
      window.location.href = "/admin";
    }
  } catch (error) {
    console.error("Session check failed:", error);
  }
}
