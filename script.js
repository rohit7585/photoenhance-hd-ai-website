const API_BASE = (window.PHOTOENHANCE_API_BASE ?? 'http://127.0.0.1:5000').replace(/\/$/, '');
const input = document.querySelector('#photo');
const img = document.querySelector('#img');
const resultImg = document.querySelector('#resultImg');
const saveOriginal = document.querySelector('#saveOriginal');
const saveResult = document.querySelector('#saveResult');
let originalUrl = null;
let resultUrl = null;
const empty = document.querySelector('#empty');
const status = document.querySelector('#status');
const backendStatus = document.querySelector('#backendStatus');
const enhanceButton = document.querySelector('#enhance');
const modeSelect = document.querySelector('#mode');
let selectedFile = null;

input.addEventListener('change', () => {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    status.textContent = 'Image must be under 10MB.';
    input.value = '';
    selectedFile = null;
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    status.textContent = 'Please select a JPG, PNG, or WEBP image.';
    input.value = '';
    selectedFile = null;
    return;
  }
  selectedFile = file;
  if (originalUrl) URL.revokeObjectURL(originalUrl);
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  originalUrl = URL.createObjectURL(file);
  resultUrl = null;
  img.src = originalUrl;
  if (resultImg) { resultImg.removeAttribute('src'); resultImg.style.display = 'none'; }
  if (saveOriginal) saveOriginal.disabled = false;
  if (saveResult) saveResult.disabled = true;
  img.style.display = 'block';
  if (empty) empty.style.display = 'none';
  status.textContent = 'Photo selected. Preview is ready.';
});

async function checkBackend() {
  if (!backendStatus) return;
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    if (!response.ok) throw new Error('Backend unavailable');
    const data = await response.json();
    backendStatus.textContent = data.upscale_model_ready
      ? 'Backend online · Real-ESRGAN HD Upscale ready.'
      : 'Backend online, but Real-ESRGAN model executable is not installed.';
  } catch (_) {
    backendStatus.textContent = 'Backend not running locally. Website preview still works.';
  }
}

enhanceButton.addEventListener('click', async () => {
  if (!selectedFile) {
    status.textContent = 'Please select a photo first.';
    return;
  }
  status.textContent = 'Sending photo to the local AI backend…';
  enhanceButton.disabled = true;
  const formData = new FormData();
  formData.append('image', selectedFile);
  formData.append('mode', modeSelect ? modeSelect.value : 'upscale');

  try {
    const response = await fetch(`${API_BASE}/api/enhance`, {
      method: 'POST',
      body: formData
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || contentType.includes('application/json')) {
      const result = await response.json();
      status.textContent = result.error || 'The request could not be completed.';
      return;
    }
    const resultBlob = await response.blob();
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(resultBlob);
    if (resultImg) { resultImg.src = resultUrl; resultImg.style.display = 'block'; }
    else img.src = resultUrl;
    if (saveResult) saveResult.disabled = false;
    if (empty) empty.style.display = 'none';

    status.textContent = 'HD enhancement complete. Use Save Enhanced Photo to download your result.';
  } catch (_) {
    status.textContent = 'AI backend is not reachable. Start the backend and install Real-ESRGAN first.';
  } finally {
    enhanceButton.disabled = false;
  }
});

function downloadUrl(url, filename) {
  if (!url) return;
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
if (saveOriginal) saveOriginal.addEventListener('click', () => downloadUrl(originalUrl, 'photoenhance-original.jpg'));
if (saveResult) saveResult.addEventListener('click', () => downloadUrl(resultUrl, 'photoenhance-hd.png'));

const feedbackForm = document.querySelector('#form');
if (feedbackForm) {
  feedbackForm.addEventListener('submit', event => {
    event.preventDefault();
    const message = document.querySelector('#msg');
    if (message) message.textContent = 'Thanks! This demo does not send or store feedback yet.';
    feedbackForm.reset();
  });
}

checkBackend();
