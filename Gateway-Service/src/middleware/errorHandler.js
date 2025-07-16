export function handleProxyError(err, _req, res) {
    console.error('✖ Proxy Error:', err.message);
    res.status(502).json({ error: 'Service unavailable. Try again later.' });
}