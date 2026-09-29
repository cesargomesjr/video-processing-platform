const API_BASE = 'http://localhost:3000';
const TOKEN_KEY = 'fiapx.accessToken';
const POLL_INTERVAL_MS = 5000;

const authSection = document.querySelector('#auth-section');
const videosSection = document.querySelector('#videos-section');
const authForm = document.querySelector('#auth-form');
const uploadForm = document.querySelector('#upload-form');
const refreshButton = document.querySelector('#refresh');
const logoutButton = document.querySelector('#logout');
const videosList = document.querySelector('#videos-list');
const emptyState = document.querySelector('#empty-state');
const message = document.querySelector('#message');
const sessionLabel = document.querySelector('#session-label');
const pollLabel = document.querySelector('#poll-label');
const fileInput = document.querySelector('#file');
const fileLabel = document.querySelector('#file-label');

const STATUS_META = {
  PENDING: { label: 'Recebido', progress: 10, tone: 'active' },
  ANALYZED: { label: 'Analisado', progress: 30, tone: 'active' },
  PROCESSING: { label: 'Processando', progress: 65, tone: 'active' },
  AGGREGATING: { label: 'Compactando', progress: 85, tone: 'active' },
  COMPLETED: { label: 'Concluído', progress: 100, tone: 'success' },
  FAILED: { label: 'Falhou', progress: 100, tone: 'danger' },
};

let accessToken = localStorage.getItem(TOKEN_KEY);
let pollTimer = null;
let videos = [];

function setMessage(text, tone = 'neutral') {
  message.textContent = text;
  message.dataset.tone = tone;
}

function setSession(active) {
  authSection.classList.toggle('hidden', active);
  videosSection.classList.toggle('hidden', !active);
  logoutButton.classList.toggle('hidden', !active);
  sessionLabel.textContent = active ? 'Sessão ativa' : 'Sessão offline';
}

function authHeaders() {
  return { Authorization: `Bearer ${accessToken}` };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);

  if (response.status === 401) {
    clearSession('Sessão expirada. Entre novamente.');
    throw new Error('Sessão expirada');
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Falha na requisição (${response.status})`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function authRequest(path, email, password) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

function persistToken(token) {
  accessToken = token;
  localStorage.setItem(TOKEN_KEY, token);
  setSession(true);
  startPolling();
}

function clearSession(text = 'Sessão encerrada.') {
  accessToken = null;
  localStorage.removeItem(TOKEN_KEY);
  stopPolling();
  videos = [];
  renderVideos();
  setSession(false);
  setMessage(text);
}

function startPolling() {
  stopPolling();
  pollTimer = window.setInterval(() => {
    void refreshStatuses({ silent: true });
  }, POLL_INTERVAL_MS);
  pollLabel.textContent = 'Atualiza a cada 5s';
}

function stopPolling() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  pollLabel.textContent = 'Atualização pausada';
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('Autenticando...');

  const email = document.querySelector('#email').value;
  const password = document.querySelector('#password').value;

  try {
    const login = await authRequest('/auth/login', email, password);
    persistToken(login.accessToken);
    setMessage('Autenticado.', 'success');
    await loadVideos();
  } catch {
    try {
      await authRequest('/auth/register', email, password);
      const login = await authRequest('/auth/login', email, password);
      persistToken(login.accessToken);
      setMessage('Cadastro criado e sessão ativa.', 'success');
      await loadVideos();
    } catch (error) {
      setMessage(error.message, 'danger');
    }
  }
});

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('Enviando vídeo...');

  const file = fileInput.files[0];
  if (!file) {
    setMessage('Selecione um arquivo de vídeo.', 'danger');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    await request('/videos', {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    fileInput.value = '';
    fileLabel.textContent = 'Selecionar vídeo';
    fileLabel.removeAttribute('title');
    setMessage('Vídeo enviado para processamento.', 'success');
    await loadVideos();
  } catch (error) {
    setMessage(error.message, 'danger');
  }
});

fileInput.addEventListener('change', () => {
  const name = fileInput.files[0]?.name;
  fileLabel.textContent = name ?? 'Selecionar vídeo';
  if (name) {
    fileLabel.title = name;
  } else {
    fileLabel.removeAttribute('title');
  }
});

refreshButton.addEventListener('click', () => {
  void refreshStatuses();
});

logoutButton.addEventListener('click', () => {
  clearSession();
});

async function restoreSession() {
  if (!accessToken) {
    setSession(false);
    return;
  }

  try {
    await request('/auth/me', { headers: authHeaders() });
    setSession(true);
    startPolling();
    setMessage('Sessão restaurada.', 'success');
    await loadVideos();
  } catch {
    clearSession('Entre para iniciar.');
  }
}

async function loadVideos() {
  setMessage('Carregando vídeos...');

  try {
    const result = await request('/videos?page=1&pageSize=50', {
      headers: authHeaders(),
    });

    videos = result.items ?? [];
    renderVideos();
    setMessage(`${result.total} tarefa(s) encontrada(s).`);
    await refreshStatuses({ silent: true });
  } catch (error) {
    setMessage(error.message, 'danger');
  }
}

async function refreshStatuses({ silent = false } = {}) {
  if (!accessToken || videos.length === 0) {
    renderVideos();
    return;
  }

  if (!silent) {
    setMessage('Atualizando progresso...');
  }

  const updated = await Promise.all(
    videos.map(async (item) => {
      if (item.status === 'COMPLETED' || item.status === 'FAILED') {
        return item;
      }

      try {
        return await request(`/videos/${item.videoId}`, { headers: authHeaders() });
      } catch {
        return item;
      }
    }),
  );

  videos = updated;
  renderVideos();

  if (!silent) {
    setMessage('Progresso atualizado.', 'success');
  }
}

function renderVideos() {
  videosList.replaceChildren();
  emptyState.classList.toggle('hidden', videos.length > 0);

  for (const item of videos) {
    const meta = statusMeta(item);
    const card = document.createElement('article');
    card.className = `task-card ${meta.tone}`;

    const header = document.createElement('div');
    header.className = 'task-header';

    const titleGroup = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = item.originalName || shortId(item.videoId);
    title.title = title.textContent;
    const subtitle = document.createElement('p');
    subtitle.textContent = buildSubtitle(item);
    titleGroup.append(title, subtitle);

    const badge = document.createElement('span');
    badge.className = 'status-badge';
    badge.textContent = meta.label;

    header.append(titleGroup, badge);

    const progress = document.createElement('div');
    progress.className = 'progress-track';
    const bar = document.createElement('span');
    bar.style.width = `${meta.progress}%`;
    progress.append(bar);

    const footer = document.createElement('div');
    footer.className = 'task-footer';
    const percent = document.createElement('span');
    percent.textContent = `${meta.progress}%`;
    const id = document.createElement('span');
    id.textContent = shortId(item.videoId);
    footer.append(percent, id);

    card.append(header, progress, footer);

    if (item.status === 'COMPLETED') {
      const downloadButton = document.createElement('button');
      downloadButton.className = 'download-button';
      downloadButton.textContent = 'Baixar frames';
      downloadButton.addEventListener('click', () => {
        void download(item.videoId);
      });
      card.append(downloadButton);
    }

    videosList.append(card);
  }
}

function statusMeta(item) {
  const fallback = STATUS_META[item.status] ?? STATUS_META.PENDING;
  const progress = Number.isFinite(item.progress) ? item.progress : fallback.progress;
  return { ...fallback, progress: Math.max(0, Math.min(100, progress)) };
}

function buildSubtitle(item) {
  const parts = [];

  if (item.format) {
    parts.push(item.format.toUpperCase().replace('.', ''));
  }

  if (Number.isFinite(item.sizeBytes)) {
    parts.push(formatBytes(item.sizeBytes));
  }

  if (Number.isFinite(item.durationMs)) {
    parts.push(formatDuration(item.durationMs));
  }

  return parts.length > 0 ? parts.join(' • ') : 'Aguardando metadados da API';
}

function shortId(id) {
  return id ? `#${id.slice(0, 8)}` : '#video';
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = units.shift();

  while (value >= 1024 && units.length > 0) {
    value /= 1024;
    unit = units.shift();
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

function formatDuration(ms) {
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

async function download(videoId) {
  setMessage('Gerando link de download...');

  try {
    const result = await request(`/videos/${videoId}/download`, {
      headers: authHeaders(),
    });

    window.open(result.url, '_blank', 'noopener');
    setMessage('Download iniciado.', 'success');
  } catch (error) {
    setMessage(error.message, 'danger');
  }
}

void restoreSession();
