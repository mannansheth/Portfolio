import { HttpError } from './validation.js';
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/;
export function parseRepository(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw new HttpError(400, 'Enter a GitHub repository URL.');
  }
  const parts = u.pathname
    .replace(/\.git\/?$/, '')
    .split('/')
    .filter(Boolean);
  if (
    u.protocol !== 'https:' ||
    u.hostname !== 'github.com' ||
    u.port ||
    u.username ||
    u.password ||
    parts.length !== 2 ||
    parts.some((p) => !identifier.test(p))
  )
    throw new HttpError(400, 'Use https://github.com/owner/repository.');
  return { owner: parts[0], repo: parts[1] };
}
export function sanitizeSource(text) {
  return text
    .split('\n')
    .filter(
      (line) =>
        !/(?:api[_-]?key|secret|password|passwd|access[_-]?(?:token|key)|authorization|private[_-]?key|connectionstring|credential|bearer)\b/i.test(
          line,
        ),
    )
    .join('\n')
    .replace(/-----BEGIN[\s\S]*?-----END[^\n]+/g, '[REDACTED KEY]')
    .replace(
      /(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16})/g,
      '[REDACTED]',
    )
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED TOKEN]')
    .replace(/(["'`])[A-Za-z0-9_+/=-]{32,}\1/g, '"[REDACTED VALUE]"')
    .replace(/https?:\/\/[^\s/]+:[^\s@]+@/g, 'https://[REDACTED]@')
    .slice(0, 10000);
}
export function safeFile(path) {
  return (
    !/(^|\/)(?:\.|node_modules|vendor|dist|build|coverage|__pycache__|config)(\/|$)|credentials|secrets|(?:lock|\.min\.js$|\.map$)|\.env|google-services|firebase.*json|(?:^|\/)\.[^/]+/i.test(
      path,
    ) && /\.(?:md|js|jsx|py|cs|csproj|sql|json|txt)$/i.test(path)
  );
}
async function github(path) {
  const r = await fetch(`https://api.github.com/${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Mannan-Portfolio',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(15000),
  }).catch(() => {
    throw new HttpError(502, 'GitHub could not be reached. Please retry.');
  });
  if (!r.ok) {
    if (r.status === 429 || (r.status === 403 && r.headers.get('x-ratelimit-remaining') === '0'))
      throw new HttpError(
        429,
        `GitHub access is limited. Retry after ${r.headers.get('x-ratelimit-reset') ? new Date(Number(r.headers.get('x-ratelimit-reset')) * 1000).toISOString() : 'a short wait'}, or configure a read-only GITHUB_TOKEN.`,
      );
    if (r.status === 401)
      throw new HttpError(502, 'GitHub rejected GITHUB_TOKEN. Check the token and its expiration.');
    if (r.status === 403)
      throw new HttpError(
        403,
        'GitHub access denied. Check token repository selection, Contents read permission, and organization approval.',
      );
    throw new HttpError(
      r.status === 404 ? 404 : 502,
      r.status === 404
        ? 'Repository or file not found, or GITHUB_TOKEN does not have access. For private repositories, select the repository and grant Contents read permission.'
        : 'GitHub request failed. Please retry.',
    );
  }
  return r.json();
}
export async function discover(owner = 'mannansheth', source = 'public') {
  if (!identifier.test(owner)) throw new HttpError(400, 'Invalid GitHub username.');
  if (!['public', 'accessible'].includes(source))
    throw new HttpError(400, 'Invalid repository discovery source.');
  if (source === 'accessible' && !process.env.GITHUB_TOKEN)
    throw new HttpError(
      503,
      'Private repository discovery requires GITHUB_TOKEN in backend/.env. Use a fine-grained token with selected repository access and Contents read permission.',
    );
  const repositories = [];
  let complete = false;
  for (let page = 1; page <= 10; page++) {
    const endpoint =
      source === 'accessible'
        ? 'user/repos?visibility=all&affiliation=owner,collaborator,organization_member'
        : `users/${owner}/repos?type=owner`;
    const batch = await github(`${endpoint}&per_page=100&page=${page}&sort=updated`);
    repositories.push(...batch);
    if (batch.length < 100) {
      complete = true;
      break;
    }
  }
  return {
    repositories: repositories.map((r) => ({
      name: r.name,
      owner: r.owner.login,
      url: r.html_url,
      description: r.description || '',
      language: r.language || '',
      fork: r.fork,
      archived: r.archived,
      private: Boolean(r.private),
      size: r.size,
      updatedAt: r.updated_at,
    })),
    complete,
    source,
    tokenConfigured: Boolean(process.env.GITHUB_TOKEN),
  };
}

export async function contributions(owner = 'mannansheth') {
  if (!identifier.test(owner)) throw new HttpError(400, 'Invalid GitHub username.');
  if (!process.env.GITHUB_TOKEN)
    throw new HttpError(
      503,
      'Contribution data needs a read-only GITHUB_TOKEN in backend/.env.',
    );

  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 364);
  const query = `query ContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays { date contributionCount contributionLevel weekday }
          }
        }
      }
    }
  }`;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mannan-Portfolio',
    },
    body: JSON.stringify({
      query,
      variables: { login: owner, from: from.toISOString(), to: to.toISOString() },
    }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => {
    throw new HttpError(502, 'GitHub contribution data could not be reached.');
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.errors?.length)
    throw new HttpError(
      response.status === 401 || response.status === 403 ? 502 : response.status || 502,
      'GitHub could not return the contribution calendar. Check the token permissions and try again.',
    );
  const calendar = result.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new HttpError(404, 'GitHub user or contribution calendar not found.');
  return {
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks,
    updatedAt: new Date().toISOString(),
  };
}

export async function inspect(url) {
  const { owner, repo } = parseRepository(url),
    base = `repos/${owner}/${repo}`,
    meta = await github(base);
  const warnings = [];
  const optional = async (path, fallback) => {
    try {
      return await github(path);
    } catch (e) {
      warnings.push(e.message);
      return fallback;
    }
  };
  const [languages, tree, readme] = await Promise.all([
    optional(`${base}/languages`, {}),
    optional(`${base}/git/trees/${encodeURIComponent(meta.default_branch)}?recursive=1`, {
      tree: [],
    }),
    optional(`${base}/readme`, null),
  ]);
  const paths = (tree.tree || []).filter(
    (f) => f.type === 'blob' && safeFile(f.path) && f.size <= 25000,
  );
  const priority = (path) =>
    /readme/i.test(path)
      ? 0
      : /package.json|requirements.txt|\.csproj/i.test(path)
        ? 1
        : /routes|models|schema|server|app\./i.test(path)
          ? 2
          : 3;
  const selected = paths.sort((a, b) => priority(a.path) - priority(b.path)).slice(0, 8),
    files = [];
  if (readme?.content && readme.size <= 25000)
    files.push({
      path: readme.path,
      text: sanitizeSource(Buffer.from(readme.content, 'base64').toString('utf8')),
    });
  else if (readme?.content)
    warnings.push('README exceeds the 25 KB source-file limit and was skipped.');
  for (const f of selected) {
    if (files.some((x) => x.path === f.path)) continue;
    const data = await optional(
      `${base}/contents/${f.path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(meta.default_branch)}`,
      null,
    );
    if (data?.content && data.encoding === 'base64')
      files.push({
        path: f.path,
        text: sanitizeSource(Buffer.from(data.content, 'base64').toString('utf8')),
      });
  }
  let remaining = 45000;
  for (const f of files) {
    f.text = f.text.slice(0, remaining);
    remaining -= f.text.length;
  }
  return {
    owner,
    repo,
    private: Boolean(meta.private),
    url: meta.html_url,
    description: sanitizeSource(meta.description || ''),
    homepage: /^https?:\/\//i.test(meta.homepage || '') ? meta.homepage : '',
    languages: Object.keys(languages),
    structure: paths.map((f) => f.path).slice(0, 100),
    files: files.filter((f) => f.text),
    warnings,
    treeTruncated: !!tree.truncated,
    inspectedAt: new Date().toISOString(),
  };
}
