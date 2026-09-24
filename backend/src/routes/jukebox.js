const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

const videoIdFromUrl = (value) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'youtu.be' || hostname.endsWith('.youtu.be')) return url.pathname.slice(1);
    if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) return url.searchParams.get('v') || url.pathname.split('/').pop();
  } catch {}
  return null;
};

router.get('/search', auth, async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) return res.status(400).json({ error: 'Informe uma música ou link do YouTube.' });
  if (!process.env.YOUTUBE_API_KEY) {
    return res.status(503).json({ error: 'A Jukebox ainda não foi configurada. Defina YOUTUBE_API_KEY no backend.' });
  }

  try {
    const directId = videoIdFromUrl(query);
    const url = new URL(directId
      ? 'https://www.googleapis.com/youtube/v3/videos'
      : 'https://www.googleapis.com/youtube/v3/search');
    url.search = new URLSearchParams({
      key: process.env.YOUTUBE_API_KEY,
      part: 'snippet',
      ...(directId
        ? { id: directId }
        : { type: 'video', videoEmbeddable: 'true', maxResults: '8', q: query })
    }).toString();
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Não foi possível pesquisar no YouTube.');

    res.json({ results: data.items.map((item) => ({
      videoId: typeof item.id === 'string' ? item.id : item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url
    })).filter((item) => item.videoId) });
  } catch (error) {
    res.status(502).json({ error: error.message || 'Falha ao pesquisar no YouTube.' });
  }
});

module.exports = router;
