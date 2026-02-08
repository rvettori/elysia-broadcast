/**
 * SSE (Server-Sent Events) client for elysia-broadcast
 * 
 * 🎯 FULL COMPATIBILITY WITH ALPINE-AJAX:
 * Processes elements with 'x-sync' attribute and updates using Alpine.morph,
 * maintaining parity with alpine-ajax behavior in synchronous requests.
 * 
 * @module elysia-broadcast/client
 */

/**
 * Connects to an SSE channel and manages automatic DOM updates
 * 
 * @param {string} channel - SSE channel name
 * @param {Object} options - Configuration options
 * @param {string} options.basePath - SSE base path (default: '/stream')
 * @param {Function} options.onUpdate - Custom handler for events
 * @param {Function} options.onConnect - Callback when connected
 * @param {Function} options.onError - Callback when error occurs
 * @param {Function} options.onDisconnect - Callback when disconnected
 * @returns {EventSource} EventSource instance
 * 
 * @example
 * // Basic usage
 * ElysiaSSE.connect('todos');
 * 
 * @example
 * // With callbacks
 * ElysiaSSE.connect('todos', {
 *   onConnect: () => console.log('Connected!'),
 *   onUpdate: (data) => console.log('Updated:', data)
 * });
 */
window.ElysiaSSE = {
  connect: function (channel, options = {}) {
    const {
      basePath = '/stream',
      onUpdate = null,
      onConnect = null,
      onError = null,
      onDisconnect = null
    } = options;

    const url = basePath + '/' + channel;
    const eventSource = new EventSource(url);

    eventSource.onopen = function () {
      console.log('🔌 [SSE] Conectado ao canal:', channel);
      if (onConnect) onConnect();
    };

    eventSource.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);

        // Custom handler has priority
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate(data);
          return;
        }

        // Default processing: multiple elements with x-sync (like alpine-ajax)
        if (data.html) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.html, 'text/html');

          // Search ALL elements with x-sync attribute (alpine-ajax compatibility)
          const elementsWithSync = doc.querySelectorAll('[x-sync]');

          if (elementsWithSync.length === 0) {
            console.error('❌ [SSE] Nenhum elemento com atributo x-sync encontrado');
            console.error('💡 [SSE] Adicione x-sync e id="..." nos elementos');
            console.error('💡 [SSE] Exemplo: <div x-sync id="meu-elemento">...</div>');
            return;
          }

          let updatedCount = 0;
          let errors = [];

          // Process each element (compatible with alpine-ajax multi-target)
          elementsWithSync.forEach(function (newElement) {
            const targetId = newElement.getAttribute('id');

            if (!targetId) {
              errors.push('Element ' + newElement.tagName + ' without id');
              return;
            }

            const existingElement = document.getElementById(targetId);

            if (!existingElement) {
              errors.push('ID not found: ' + targetId);
              return;
            }

            // Use Alpine.morph to preserve reactive state
            if (window.Alpine && window.Alpine.morph) {
              Alpine.morph(existingElement, newElement.outerHTML);
            } else {
              // Fallback: direct replacement
              existingElement.outerHTML = newElement.outerHTML;
            }

            updatedCount++;
          });

          if (updatedCount > 0) {
            console.log('✨ [SSE] ' + updatedCount + ' element(s) updated - ' + data.type);
          }

          if (errors.length > 0) {
            console.error('❌ [SSE] Erros:', errors.join(', '));
          }
        }
      } catch (error) {
        console.error('❌ [SSE] Erro ao processar evento:', error);
      }
    };

    eventSource.onerror = function (error) {
      console.error('❌ [SSE] Connection error:', error);

      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('🔄 [SSE] Reconnecting in 5 seconds...');
        setTimeout(function () {
          window.location.reload();
        }, 5000);

        if (onError) onError(error);
      }
    };

    // Close connection when page is unloaded
    window.addEventListener('beforeunload', function () {
      eventSource.close();
      console.log('👋 [SSE] Desconectado do canal:', channel);
      if (onDisconnect) onDisconnect();
    });

    return eventSource;
  }
};
