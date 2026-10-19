// Entry point used when the API is deployed as a Vercel serverless function.
// Render (or any normal Node host) uses src/server.js instead.
const appPromise = import('../src/app.js');

export default async function handler(req, res) {
  try {
    const { default: app } = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('[startup]', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`DIAG startup failure: ${error?.stack || error}`);
  }
}
