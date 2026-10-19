// Entry point used when the API is deployed as a Vercel serverless function.
// Render (or any normal Node host) uses src/server.js instead.
//
// The app is imported inside a try/catch so that a startup failure (for
// example a bad configuration value) produces a JSON error and a log line
// instead of an opaque FUNCTION_INVOCATION_FAILED page.
const appPromise = import('../src/app.js');

export default async function handler(req, res) {
  try {
    const { default: app } = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('[startup] API failed to load:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: { code: 'STARTUP_FAILED', message: 'The API could not start. Check the server logs.' } }));
  }
}
