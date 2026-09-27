const API_BASE = 'http://localhost:3000';

const authSection = document.querySelector('#auth-section');
const videosSection = document.querySelector('#videos-section');
const authForm = document.querySelector('#auth-form');
const uploadForm = document.querySelector('#upload-form');
const refreshButton = document.querySelector('#refresh');
const videosBody = document.querySelector('#videos-body');
const message = document.querySelector('#message');

let accessToken = null;

function setMessage(text) {
  message.textContent = text;
}

async function authRequest(path, email, password) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Falha na autenticação (${response.status})`);
  }

  return response.json();
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('Autenticando...');

  const email = document.querySelector('#email').value;
  const password = document.querySelector('#password').value;

  try {
    const login = await authRequest('/auth/login', email, password);
    accessToken = login.accessToken;
    authSection.classList.add('hidden');
    videosSection.classList.remove('hidden');
    setMessage('Autenticado.');
    await loadVideos();
  } catch {
    try {
      await authRequest('/auth/register', email, password);
      const login = await authRequest('/auth/login', email, password);
      accessToken = login.accessToken;
      authSection.classList.add('hidden');
      videosSection.classList.remove('hidden');
      setMessage('Cadastrado e autenticado.');
      await loadVideos();
    } catch (error) {
      setMessage(error.message);
    }
  }
});

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('Enviando vídeo...');

  const fileInput = document.querySelector('#file');
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE}/videos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Falha no upload (${response.status})`);
    }

    setMessage('Vídeo enviado.');
    fileInput.value = '';
    await loadVideos();
  } catch (error) {
    setMessage(error.message);
  }
});

refreshButton.addEventListener('click', () => {
  void loadVideos();
});

async function loadVideos() {
  setMessage('Carregando vídeos...');

  try {
    const response = await fetch(`${API_BASE}/videos`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Falha ao listar vídeos (${response.status})`);
    }

    const result = await response.json();
    renderVideos(result.items);
    setMessage(`${result.total} vídeo(s).`);
  } catch (error) {
    setMessage(error.message);
  }
}

function renderVideos(items) {
  videosBody.replaceChildren();

  for (const item of items) {
    const row = document.createElement('tr');

    const idCell = document.createElement('td');
    idCell.textContent = item.videoId;

    const statusCell = document.createElement('td');
    statusCell.textContent = item.status;

    const actionCell = document.createElement('td');
    if (item.status === 'COMPLETED') {
      const downloadButton = document.createElement('button');
      downloadButton.textContent = 'Baixar';
      downloadButton.addEventListener('click', () => {
        void download(item.videoId);
      });
      actionCell.appendChild(downloadButton);
    }

    row.append(idCell, statusCell, actionCell);
    videosBody.appendChild(row);
  }
}

async function download(videoId) {
  setMessage('Gerando link de download...');

  try {
    const response = await fetch(`${API_BASE}/videos/${videoId}/download`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Falha ao gerar download (${response.status})`);
    }

    const result = await response.json();
    window.open(result.url, '_blank', 'noopener');
    setMessage('Download iniciado.');
  } catch (error) {
    setMessage(error.message);
  }
}
