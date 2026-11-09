const BASE = import.meta.env.VITE_API_URL || '';

export const MAX_MESSAGE = 500;

const ERROR_TEXT = {
  400: 'Please enter a question of up to 500 characters.',
  422: 'I couldn’t understand that — try rephrasing your question.',
  502: 'Something went wrong with the AI provider. Please retry.',
  503: 'The AI provider isn’t configured on the server. Please contact the backend team.',
};

export const chatErrorText = (status) => ERROR_TEXT[status] || 'Something went wrong. Please try again.';

/**
 * Streams a chat answer over Server-Sent Events.
 * Returns a function that cancels the request.
 */
export function streamChat({ message, conversationId, onStatus, onToken, onResult, onError }) {
  const qs = new URLSearchParams({ message });
  if (conversationId) qs.set('conversation_id', conversationId);
  const es = new EventSource(`${BASE}/api/chat/stream?${qs}`);
  let done = false;
  const finish = () => { done = true; es.close(); };

  es.addEventListener('status', (e) => onStatus?.(JSON.parse(e.data).text));
  es.addEventListener('token', (e) => onToken?.(JSON.parse(e.data).text));
  es.addEventListener('result', (e) => { finish(); onResult(JSON.parse(e.data)); });
  // A named `error` event carries JSON; a dropped connection has no data.
  es.addEventListener('error', (e) => {
    if (done) return;
    finish();
    if (e.data) {
      const body = JSON.parse(e.data);
      onError({ status: body.status, message: chatErrorText(body.status), detail: body.error });
    } else {
      onError({ status: 0, message: 'Cannot reach the server. It may be waking up, so wait a minute and try again.' });
    }
  });

  return finish;
}
