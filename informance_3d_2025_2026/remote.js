/* Informance V8: conexión HTTPS al backend privado.
   Nunca colocar contraseñas, claves del agente ni credenciales de Epicor aquí. */
(() => {
  'use strict';

  function iniciar() {
    if (window.__informanceRemoteV8Iniciado) return;
    window.__informanceRemoteV8Iniciado = true;

    const API = String(window.INFORMANCE_API_URL || '').trim().replace(/\/+$/, '');
    const valid = /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(API) && !API.includes('REEMPLAZAR');
    const el = id => document.getElementById(id);

    // Crear un botón nuevo elimina los event listeners asociados directamente
    // al botón V6. Así evitamos que se abra 127.0.0.1 al pulsarlo.
    const antiguo = el('downloadInformance');
    let boton = null;
    if (antiguo) {
      boton = antiguo.cloneNode(true);
      boton.removeAttribute('onclick');
      boton.removeAttribute('href');
      boton.setAttribute('type', 'button');
      boton.textContent = '⬇ Descargar mes actual y reemplazar Excel';
      boton.disabled = !valid;
      antiguo.replaceWith(boton);
    }

    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.style.cssText = 'margin:12px 0;padding:15px;border:2px solid #2c83cc;border-radius:8px';
    panel.innerHTML = `
      <div style="font-weight:800;font-size:16px;margin-bottom:7px">Descarga remota de Informance</div>
      <div id="remoteHint" style="font-size:12px;margin-bottom:8px"></div>
      <div id="remoteLogin" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <input id="remotePassword" type="password" autocomplete="off"
               placeholder="Contraseña de operador de Render"
               style="min-height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:8px;flex:1;min-width:150px">
        <button id="remoteConnect" class="primary-btn" type="button">Conectar</button>
      </div>
      <div id="remoteState" role="status" aria-live="polite"
           style="font-size:12px;white-space:pre-wrap">Sin conexión</div>`;

    const top = boton?.closest('.action-row');
    if (top) top.insertAdjacentElement('afterend', panel);
    else (document.querySelector('main') || document.body).prepend(panel);

    el('remoteHint').textContent = valid
      ? 'Inicia sesión con la contraseña de operador. El agente Windows debe permanecer activo para ejecutar Python V14.'
      : 'Configura la URL HTTPS en remote-config.js. No introduzcas la contraseña de Microsoft aquí.';

    let accessToken = null;
    let latestSummaryVersion = null;
    let previousDone = null;
    let busy = false;
    let sending = false;

    function say(message) {
      el('remoteState').textContent = message;
    }

    async function req(path, opts = {}) {
      const headers = {'Content-Type': 'application/json', ...(opts.headers || {})};
      if (accessToken) headers.Authorization = 'Bearer ' + accessToken;
      const response = await fetch(API + path, {...opts, headers, cache: 'no-store'});
      let data;
      try { data = await response.json(); }
      catch { data = {detail: 'La API devolvió una respuesta no válida.'}; }
      if (!response.ok) {
        const message = typeof data.detail === 'string' ? data.detail : 'Error HTTP ' + response.status;
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }
      return data;
    }

    async function connect() {
      if (!valid) return;
      const connectButton = el('remoteConnect');
      connectButton.disabled = true;
      try {
        const password = el('remotePassword').value;
        if (!password) throw new Error('Introduce la contraseña de operador.');
        const result = await req('/api/login', {
          method: 'POST',
          body: JSON.stringify({password})
        });
        if (!result.token) throw new Error('El servidor no devolvió el token de sesión.');
        accessToken = result.token;
        el('remotePassword').value = '';
        el('remoteLogin').style.display = 'none';
        say('Conectado a Render. El agente Windows debe permanecer abierto.');
        if (boton) boton.disabled = false;
        await refresh();
      } catch (error) {
        say('⚠ ' + error.message);
      } finally {
        connectButton.disabled = false;
      }
    }

    async function refresh() {
      if (!accessToken || busy) return;
      busy = true;
      try {
        const job = await req('/api/jobs/latest');
        const status = job.status || 'idle';
        if (status === 'queued') say('⏳ Descarga en cola: ' + (job.month || '') + '. Esperando al agente Windows.');
        else if (status === 'running') say('⏳ Descargando ' + (job.month || '') + '. Completa MFA en Chrome si es necesario.');
        else if (status === 'error') say('⚠ La descarga falló: ' + (job.message || 'Revisa el agente Windows.'));
        else if (status === 'done') say('✓ ' + (job.message || 'Descarga finalizada') + ' · ' + (job.month || ''));
        else say('Conectado. Pulsa el botón para descargar el mes actual.');

        if (boton && !sending) boton.disabled = !valid || status === 'queued' || status === 'running';
        if (status === 'done' && previousDone !== job.id) {
          previousDone = job.id;
          latestSummaryVersion = null;
        }
        if (status !== 'queued' && status !== 'running') {
          try {
            const summary = await req('/api/summary');
            const signature = String(summary.updated_at || '') + '|' +
                              String(summary.rows?.length || 0) + '|' +
                              String(summary.source_files || '');
            if (signature !== latestSummaryVersion && typeof uploadPrivateSummary === 'function') {
              await uploadPrivateSummary(summary, true);
              latestSummaryVersion = signature;
            }
          } catch (error) {
            if (error.status !== 404 && !/todavía no hay resumen/i.test(error.message)) throw error;
          }
        }
      } catch (error) {
        say('⚠ ' + error.message);
        if (error.status === 401) {
          accessToken = null;
          el('remoteLogin').style.display = 'flex';
          if (boton) boton.disabled = true;
        }
      } finally {
        busy = false;
      }
    }

    async function start(event) {
      event?.preventDefault();
      event?.stopImmediatePropagation();
      if (sending) return;
      if (!accessToken) {
        say('Primero inicia sesión como operador.');
        el('remotePassword').focus();
        return;
      }
      if (!window.confirm('¿Descargar de nuevo el mes actual, validar y reemplazar el Excel existente?')) return;
      sending = true;
      if (boton) boton.disabled = true;
      try {
        const job = await req('/api/jobs', {method: 'POST', body: '{}'});
        say((job.already_active ? 'Ya existe una actualización en curso: ' : 'Solicitud registrada para ') + (job.month || 'mes actual'));
      } catch (error) {
        say('⚠ ' + error.message);
      } finally {
        sending = false;
        await refresh();
      }
    }

    el('remoteConnect').addEventListener('click', connect);
    el('remotePassword').addEventListener('keydown', event => {
      if (event.key === 'Enter') connect();
    });
    if (boton) boton.addEventListener('click', start);
    if (valid) window.setInterval(refresh, 10000);
    else say('⚠ Falta configurar la URL de Render.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, {once: true});
  else iniciar();
})();
