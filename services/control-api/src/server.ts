import { serve } from '@hono/node-server';

import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3001);

serve({
  fetch: createApp().fetch,
  port
});

console.log(`control-api listening on http://localhost:${port}`);
