// 🌐 Update backend URL
const BACKEND_URL = "https://employee-tracker-vgqx.onrender.com";

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
  loading.style.display = "block";
  errorMessage.style.display = "none";

  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include"   // 👈 very important for session
    });

    const result = await response.json();

    if (result.success) {
      window.location.href = `${BACKEND_URL}/admin-dashboard.html`;
    } else {
      throw new Error(result.message || "Invalid credentials");
    }

  } catch (err) {
    errorText.innerText = err.message;
    errorMessage.style.display = "block";
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = "Login";
    loading.style.display = "none";
  }
});
