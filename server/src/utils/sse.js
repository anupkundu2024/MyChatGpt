const HEARTBEAT_MS = 15_000;

/**
 * Switches the response into a Server-Sent Events stream.
 * Returns helpers to send named events and to end the stream.
 */
export function openSse(res) {
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Disable response buffering in nginx-style proxies.
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Comment lines keep proxies from closing the connection while the model is thinking.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

  const isOpen = () => !res.writableEnded && !res.destroyed;

  return {
    send(event, data) {
      if (isOpen()) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    close() {
      clearInterval(heartbeat);
      if (isOpen()) res.end();
    },
    isOpen,
  };
}
