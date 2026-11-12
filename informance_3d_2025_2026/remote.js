/*
 * Informance 3D - conexión remota V8.
 * Archivo PÚBLICO: solo contiene la URL del backend; nunca credenciales.
 * Requiere remote-config.js antes de remote.js y un backend autenticado.
 */
(() => {
  'use strict';

  function initialize() {
    const API = String(window.INFORMANCE_API_URL || '').trim().replace(/\/+$/, '');
    const valid = /^https:\/\/[^\s/]+(?:\/.*)?$/.test(API) && !API.includes('REEMPLAZAR');
    const el = id => document.getElementById(id);

    // El botón original puede tener controladores V6 registrados por app.js.
    // Lo sustituimos para quitar controladores DIRECTOS asociados al elemento.
    const oldButton = el('downloadInformance');
    if (!oldButton) {
      console.error('[Informance V8] No se encontró #downloadInformance.');
      return;
    }
    const actions = oldButton.closest('.action-row') || oldButton.parentElement;
    const button = oldButton.cloneNode(true);
    oldButton.replaceWith(button);
    button.type = 'button';
    button.removeAttribute('onclick');
    button.textContent = '⬇ Descargar mes actual y reemplazar Excel';
    button.disabled = !valid;

    // Evita duplicar el panel cuando se reinyecta el script.
    let panel = el('informanceRemotePanel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'informanceRemotePanel';
      panel.className = 'panel';
      panel.style.cssText = 'margin:12px 0;padding:15px;border:2px solid #2c83cc';
      panel.innerHTML = `
        <div style="font-weight:800;font-size:16px;margin-bottom:7px">Descarga remota desde la página web 3D</div>
        <div id="remoteHint" style="font-size:12px;margin-bottom:8px">${valid
          ? 'Para controlar las descargas, inicia sesión con tu contraseña de operador.'
          : 'Configura la URL HTTPS en remote-config.js. No introduzcas aquí contraseñas de Microsoft.'}</div>
        <div id="remoteLogin" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <input id="remotePassword" type="password" autocomplete="off" placeholder="Contraseña de operador" style="min-height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:8px;flex:1;min-width:150px" />
          <button id="remoteConnect" class="primary-btn" type="button">Conectar</button>
        </div>
        <div id="remoteState" role="status" aria-live="polite" style="font-size:12px;white-space:pre-wrap">Sin conexión</div>`;
      if (actions) actions.insertAdjacentElement('afterend', panel);
      else button.insertAdjacentElement('afterend', panel);
    }

    let accessToken = null;
    let latestSummaryVersion = null;
    let previousDone = null;
    let busy = false;
    let requestInFlight = false;
    const say = value => { const output = el('remoteState'); if (output) output.textContent = String(value); };

    async function request(path, opts = {}) {
      const headers = {'Content-Type': 'application/json', ...(opts.headers || {})};
      if (accessToken) headers.Authorization = 'Bearer ' + accessToken;
      const response = await fetch(API + path, {...opts, headers, cache: 'no-store'});
      let data;
      try { data = await response.json(); }
      catch { data = {detail: 'Respuesta no válida del servidor'}; }
      if (!response.ok) {
        const message = typeof data.detail === 'string' ? data.detail : 'Error HTTP ' + response.status;
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }
      return data;
    }

    async function connect() {
      if (!valid || requestInFlight) return;
      requestInFlight = true;
      const connectButton = el('remoteConnect');
      if (connectButton) connectButton.disabled = true;
      try {
        const input = el('remotePassword');
        const password = input?.value || '';
        if (!password) throw new Error('Introduce la contraseña de operador.');
        const result = await request('/api/login', {method:'POST', body:JSON.stringify({password})});
        if (!result.token) throw new Error('El servidor no devolvió una sesión de operador.');
        accessToken = result.token;
        input.value = '';
        el('remoteLogin').style.display = 'none';
        say('Conectado. Mantén el agente Windows abierto para ejecutar las descargas.');
        await refresh();
      } catch (error) {
        say('⚠ ' + error.message);
      } finally {
        requestInFlight = false;
        if (connectButton) connectButton.disabled = false;
      }
    }

    async function refresh() {
      if (!accessToken || busy) return;
      busy = true;
      try {
        const job = await request('/api/jobs/latest');
        if (job.status === 'queued') say('⏳ Trabajo en cola: ' + job.month + ' · Esperando al agente Windows.');
        else if (job.status === 'running') say('⏳ Descargando ' + job.month + ' en Windows. Completa MFA en Chrome si es necesario.');
        else if (job.status === 'error') say('⚠ La descarga falló: ' + (job.message || 'Revisa el agente Windows.'));
        else if (job.status === 'done') say('✓ ' + (job.message || 'Descarga finalizada') + ' · ' + job.month);
        else say('Conectado. Pulsa el botón para descargar el mes actual.');

        button.disabled = job.status === 'queued' || job.status === 'running';
        if (job.status === 'done' && previousDone !== job.id) {
          previousDone = job.id;
          latestSummaryVersion = null;
        }
        if (job.status !== 'running' && job.status !== 'queued') {
          try {
            const summary = await request('/api/summary');
            const signature = String(summary.updated_at || '') + '|' + (summary.rows?.length || 0) + '|' + (summary.source_files || '');
            if (signature !== latestSummaryVersion) {
              // uploadPrivateSummary es una función proporcionada por el dashboard existente.
              if (typeof window.uploadPrivateSummary === 'function') {
                await window.uploadPrivateSummary(summary, true);
                latestSummaryVersion = signature;
              } else {
                console.warn('[Informance V8] No está disponible uploadPrivateSummary; revisa integración app.js.');
              }
            }
          } catch (error) {
            if (error.status !== 404) console.warn('[Informance V8] No se cargó el resumen:', error.message);
          }
        }
      } catch (error) {
        say('⚠ ' + error.message);
        if (error.status === 401 || /caducada/i.test(error.message)) {
          accessToken = null;
          el('remoteLogin').style.display = 'flex';
          button.disabled = !valid;
        }
      } finally {
        busy = false;
      }
    }

    async function start(event) {
      // Evita que el botón V8 navegue o ejecute handlers heredados en el elemento.
      event?.preventDefault();
      event?.stopPropagation();
      if (!accessToken) {
        say('Primero inicia sesión como operador.');
        el('remotePassword')?.focus();
        return;
      }
      if (!window.confirm('¿Descargar de nuevo el mes actual, validar y reemplazar el Excel existente?')) return;
      button.disabled = true;
      try {
        const result = await request('/api/jobs', {method:'POST', body:'{}'});
        say((result.already_active ? 'Ya hay una actualización en curso: ' : 'Solicitud registrada para ') + result.month);
        await refresh();
      } catch (error) {
        say('⚠ ' + error.message);
        button.disabled = false;
      }
    }

    el('remoteConnect')?.addEventListener('click', connect);
    el('remotePassword')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); void connect(); }
    });
    button.addEventListener('click', start);
    if (valid) window.setInterval(refresh, 10000);
    else say('⚠ Configura la URL real de Render en remote-config.js.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once:true});
  else initialize();
})();
