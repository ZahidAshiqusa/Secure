document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admissionForm');
  const statusEl = document.getElementById('status');
  const btn = form.querySelector('.submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = 'Saving...';
    statusEl.textContent = '';

    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.name || !data.adminPassword) {
      statusEl.textContent = 'Please fill all required fields.';
      btn.disabled = false;
      btn.textContent = 'Submit';
      return;
    }

    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ entry: data })
      });

      const result = await res.json();
      if (res.ok) {
        statusEl.style.color = 'green';
        statusEl.textContent = '✅ Saved successfully!';
        form.reset();
      } else {
        statusEl.style.color = 'red';
        statusEl.textContent = '❌ ' + (result.error || 'Failed to save.');
      }
    } catch (err) {
      statusEl.style.color = 'red';
      statusEl.textContent = 'Network error: ' + err.message;
    }

    btn.disabled = false;
    btn.textContent = 'Submit';
  });
});
