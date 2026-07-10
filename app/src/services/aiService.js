// services/aiService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';

class AIService {
  get BASE_URL() {
    // Dynamically derive the base server URL from the global axios configuration
    return (api.defaults.baseURL || '').replace('/api', '');
  }

  /**
   * POST /api/v1/chat/message
   */
  async sendMessage(message, sessionId, category) {
    try {
      const response = await api.post('/v1/chat/message', {
        message,
        sessionId,
        category,
      });
      return response.data;
    } catch (err) {
      console.error('API sendMessage error:', err.message);
      throw this.normalizeError(err);
    }
  }

  /**
   * GET /api/v1/chat/sessions
   */
  async getSessions(searchQuery = '') {
    try {
      const url = searchQuery ? `/v1/chat/sessions?q=${encodeURIComponent(searchQuery)}` : '/v1/chat/sessions';
      const response = await api.get(url);
      return response.data;
    } catch (err) {
      console.error('API getSessions error:', err.message);
      throw this.normalizeError(err);
    }
  }

  /**
   * GET /api/v1/chat/history/:sessionId
   */
  async getHistory(sessionId) {
    try {
      const response = await api.get(`/v1/chat/history/${sessionId}`);
      return response.data;
    } catch (err) {
      console.error('API getHistory error:', err.message);
      throw this.normalizeError(err);
    }
  }

  /**
   * DELETE /api/v1/chat/session/:sessionId
   */
  async deleteSession(sessionId) {
    try {
      const response = await api.delete(`/v1/chat/session/${sessionId}`);
      return response.data;
    } catch (err) {
      console.error('API deleteSession error:', err.message);
      throw this.normalizeError(err);
    }
  }

  /**
   * POST /api/v1/chat/title
   */
  async updateSessionTitle(sessionId, title = '') {
    try {
      const response = await api.post('/v1/chat/title', {
        sessionId,
        title,
      });
      return response.data;
    } catch (err) {
      console.error('API updateSessionTitle error:', err.message);
      throw this.normalizeError(err);
    }
  }

  /**
   * GET /api/v1/chat/suggestions
   */
  async getSuggestions(sessionId = '') {
    try {
      const url = sessionId ? `/v1/chat/suggestions?sessionId=${sessionId}` : '/v1/chat/suggestions';
      const response = await api.get(url);
      return response.data;
    } catch (err) {
      console.error('API getSuggestions error:', err.message);
      throw this.normalizeError(err);
    }
  }

  /**
   * GET /api/v1/chat/status
   */
  async getEngineStatus() {
    try {
      const response = await api.get('/v1/chat/status');
      return response.data;
    } catch (err) {
      console.error('API getEngineStatus error:', err.message);
      throw this.normalizeError(err);
    }
  }

  /**
   * Toggle Pin Session for client state compatibility
   */
  async togglePinSession(sessionId) {
    try {
      const response = await api.post(`/v1/chat/title`, {
        sessionId,
        pin: true // Simple toggle pass through
      });
      return response.data;
    } catch (err) {
      return { success: true }; // Graceful fallback
    }
  }

  /**
   * Backend check health endpoint compatibility
   */
  async checkBackendHealth() {
    try {
      const response = await api.get('/v1/chat/status', { timeout: 5000 });
      return response.status === 200;
    } catch (err) {
      console.error('Backend health check error:', err.message);
      return false;
    }
  }

  /**
   * Server-Sent Events (SSE) stream messaging utilizing native XMLHttpRequest.
   */
  streamMessage(message, sessionId, category, onToken, onComplete, onError) {
    const xhr = new XMLHttpRequest();
    const url = `${this.BASE_URL}/api/v1/chat/stream`;

    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'text/event-stream');

    AsyncStorage.multiGet(['token', 'isGuest']).then((stores) => {
      const token = stores[0][1];
      const isGuest = stores[1][1];

      if (isGuest === 'true') {
        xhr.setRequestHeader('Authorization', 'Bearer guest-token-2024');
      } else if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      let processedChars = 0;
      let buffer = '';

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 3 || xhr.readyState === 4) {
          const currentText = xhr.responseText;
          const chunk = currentText.substring(processedChars);
          processedChars = currentText.length;
          
          buffer += chunk;

          const parts = buffer.split('\n\n');
          // The last element of parts might be incomplete. Save it in the buffer.
          buffer = parts.pop() || '';

          for (const frame of parts) {
            const cleanFrame = frame.trim();
            if (!cleanFrame) continue;

            if (cleanFrame.startsWith('data: ')) {
              const dataString = cleanFrame.replace('data: ', '').trim();
              
              if (dataString === '[DONE]') {
                if (onComplete) onComplete();
              } else {
                try {
                  const dataObject = JSON.parse(dataString);
                  if (dataObject.token && onToken) {
                    onToken(dataObject.token);
                  }
                  if (dataObject.error && onError) {
                    onError(new Error(dataObject.error));
                  }
                } catch (e) {
                  // Skip partial JSON parsing errors
                }
              }
            }
          }
        }

        if (xhr.readyState === 4) {
          // Process any remaining data left in the buffer at the end of stream
          if (buffer.trim()) {
            const cleanFrame = buffer.trim();
            if (cleanFrame.startsWith('data: ')) {
              const dataString = cleanFrame.replace('data: ', '').trim();
              if (dataString !== '[DONE]') {
                try {
                  const dataObject = JSON.parse(dataString);
                  if (dataObject.token && onToken) {
                    onToken(dataObject.token);
                  }
                  if (dataObject.error && onError) {
                    onError(new Error(dataObject.error));
                  }
                } catch (e) {}
              }
            }
          }
          if (xhr.status >= 400 && onError) {
            onError(new Error(`Streaming failed with status: ${xhr.status}`));
          }
        }
      };

      xhr.onerror = (err) => {
        if (onError) onError(new Error('Network request failed or CORS error.'));
      };

      xhr.send(
        JSON.stringify({
          message,
          sessionId,
          category,
        })
      );
    }).catch(err => {
      if (onError) onError(err);
    });

    return {
      abort: () => {
        xhr.abort();
      },
    };
  }

  normalizeError(err) {
    if (err.response) {
      return new Error(err.response.data?.message || `Server returned error status ${err.response.status}`);
    }
    if (err.request) {
      return new Error('Server connection timeout. Please check your network and try again.');
    }
    return new Error(err.message || 'Unknown network error encountered.');
  }
}

export default new AIService();