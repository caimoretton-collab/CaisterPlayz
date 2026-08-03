export const THEMES = {
  cyberpunk: {
    cyan: '#00f0ff',
    violet: '#b042ff',
    lime: '#39ff14',
    hot: '#ff2a2a',
    amber: '#ffd700',
    grad: 'linear-gradient(135deg, #00f0ff, #b042ff, #ffd700)'
  },
  neonGreen: {
    cyan: '#39ff14',
    violet: '#00f0ff',
    lime: '#b042ff',
    hot: '#ff2a2a',
    amber: '#ffd700',
    grad: 'linear-gradient(135deg, #39ff14, #00f0ff, #ffd700)'
  },
  bloodRed: {
    cyan: '#ff2a2a',
    violet: '#ffd700',
    lime: '#39ff14',
    hot: '#00f0ff',
    amber: '#b042ff',
    grad: 'linear-gradient(135deg, #ff2a2a, #ffd700, #b042ff)'
  },
  gold: {
    cyan: '#ffd700',
    violet: '#ff2a2a',
    lime: '#39ff14',
    hot: '#b042ff',
    amber: '#00f0ff',
    grad: 'linear-gradient(135deg, #ffd700, #ff2a2a, #39ff14)'
  }
};

export function applyTheme(themeName) {
  const t = THEMES[themeName] || THEMES.cyberpunk;
  const root = document.documentElement;
  root.style.setProperty('--cyan', t.cyan);
  root.style.setProperty('--violet', t.violet);
  root.style.setProperty('--lime', t.lime);
  root.style.setProperty('--hot', t.hot);
  root.style.setProperty('--amber', t.amber);
  root.style.setProperty('--caister-grad', t.grad);
}

export function triggerHaptic(type = 'light') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    if (type === 'light') navigator.vibrate(10);
    else if (type === 'medium') navigator.vibrate(20);
    else if (type === 'heavy') navigator.vibrate(30);
    else if (type === 'success') navigator.vibrate([10, 50, 20]);
  }
}

export function compressImage(file, maxDim = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Invalid image file'));
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file'));

    reader.onload = e => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to load image'));

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          reject(err);
        }
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

export function compressAvatar(file) {
  return compressImage(file, 400, 0.75);
}

export function formatTime(timestamp) {
  if (!timestamp) return 'just now';

  let parsedDate;

  if (timestamp.toDate) {
    parsedDate = timestamp.toDate();
  } else if (typeof timestamp === 'string') {
    parsedDate = new Date(timestamp.replace(' ', 'T'));
  } else {
    parsedDate = new Date(timestamp);
  }

  if (isNaN(parsedDate.getTime())) return 'just now';

  const now = new Date();
  const diff = (now - parsedDate) / 1000;

  if (diff < 0 || diff < 10) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

export function formatCount(n) {
  if (!n || n === 0) return '0';
  if (n >= 1e12) return (n / 1e12).toFixed(1).replace(/\.0$/, '') + 't';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'b';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export function signalEnergyScore(signal) {
  const boosts = (signal.likedBy || []).length;
  const relays = (signal.repostedBy || []).length;
  const echoes = signal._commentCount || 0;

  return boosts * 2 + relays * 3 + echoes * 4;
}

export const engagementScore = signalEnergyScore;

const URL_REGEX =
  /(https?:\/\/[^\s<]+[^\s<.,;:!?\])'">-]|#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/gi;

export function parseSignalText(text) {
  if (!text) return [];

  const parts = [];
  let lastIndex = 0;
  let match;

  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }

    const token = match[0];

    if (token.startsWith('#')) {
      parts.push({ type: 'signal-tag', content: token });
    } else if (token.startsWith('@')) {
      parts.push({ type: 'operator-mention', content: token });
    } else {
      parts.push({ type: 'link', content: token });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

export const parsePostText = parseSignalText;

export function getTrendingSignalTags(posts) {
  if (!posts || posts.length === 0) return [];

  const counts = {};

  posts.forEach(p => {
    if (!p.text) return;

    const tags = p.text.match(/#[a-zA-Z0-9_]+/g);

    if (tags) {
      const uniqueTags = [...new Set(tags.map(t => t.toLowerCase()))];

      uniqueTags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    }
  });

  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export const getTrendingHashtags = getTrendingSignalTags;

export function getCoreBadge(userId) {
  if (!userId) return null;

  const badges = [
    { text: 'Signal Architect 📡', color: 'text-brand-primary' },
    { text: 'Core Runner ⚡', color: 'text-brand-success' },
    { text: 'Echo Shifter 💬', color: 'text-brand-accent' },
    { text: 'Relay Phantom 🌐', color: 'text-brand-secondary' },
    { text: 'Vault Keeper 🔒', color: 'text-brand-warning' },
    { text: 'Prime Operator 🎯', color: 'text-red-500' }
  ];

  let hash = 0;

  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % badges.length;

  return badges[index];
}

export const getGamerBadge = getCoreBadge;

export function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  const n = Number(num);
  if (isNaN(n)) return '0';
  if (n >= 1e12) return (n / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

export function notifyDiscordWebhook(message) {
  const url = "https://discord.com/api/webhooks/1533209931489214484/JdHMwQPeuKCpl23irIsl3Tg30b9C1s9Bu4kPl1gU-h4MBoTviWNhG_-vtUXgIcYapZuo";
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: message,
      username: 'CaisterPlayz Activity',
    })
  }).catch(() => {});
}
