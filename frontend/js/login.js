(function() {
  const form = document.getElementById('loginForm');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  // If already logged in, go to main app
  if (sessionStorage.getItem('user')) {
    window.location.href = 'index.html';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    btn.classList.add('loading');

    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: username.value.trim(),
          senha: password.value
        })
      });

      const data = await r.json();

      if (!r.ok || !data.success) {
        errorEl.textContent = data.error || 'Erro ao fazer login';
        btn.classList.remove('loading');
        password.value = '';
        password.focus();
        return;
      }

      // Store user info
      sessionStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.setItem('userName', data.user.nome);

      // Redirect to main app
      window.location.href = 'index.html';

    } catch (err) {
      errorEl.textContent = 'Erro de conexao com o servidor';
      btn.classList.remove('loading');
    }
  });

  // Enter key on password field submits form
  password.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
  });
})();