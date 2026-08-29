import { createSignal, createEffect, render } from 'grainlet';

const API = 'https://jsonplaceholder.typicode.com';

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => resolve(), ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

async function fetchJson(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

export function AsyncDemo() {
  const [query, setQuery] = createSignal('');
  const [debouncedQuery, setDebouncedQuery] = createSignal('');
  const [users, setUsers] = createSignal([]);
  const [searchStatus, setSearchStatus] = createSignal('idle');
  const [searchError, setSearchError] = createSignal('');

  const [userId, setUserId] = createSignal(1);
  const [profile, setProfile] = createSignal(null);
  const [posts, setPosts] = createSignal([]);
  const [chainStatus, setChainStatus] = createSignal('idle');
  const [chainLog, setChainLog] = createSignal([]);

  const [manualStatus, setManualStatus] = createSignal('idle');
  const [manualPost, setManualPost] = createSignal(null);

  const pushLog = (line) => {
    setChainLog((prev) => [...prev, `${new Date().toLocaleTimeString()} — ${line}`]);
  };

  // Debounce search input (async timer + cleanup)
  createEffect(() => {
    const q = query();
    const handle = setTimeout(() => setDebouncedQuery(q.trim()), 350);
    return () => clearTimeout(handle);
  });

  // Abortable search when debounced query changes
  createEffect(() => {
    const q = debouncedQuery();
    if (!q) {
      setUsers([]);
      setSearchStatus('idle');
      setSearchError('');
      return;
    }

    const ac = new AbortController();
    setSearchStatus('loading');
    setSearchError('');

    (async () => {
      try {
        // Artificial delay so AbortController / typing races are visible
        await delay(200, ac.signal);
        const data = await fetchJson(`${API}/users`, { signal: ac.signal });
        const filtered = data.filter((u) =>
          `${u.name} ${u.email} ${u.username}`.toLowerCase().includes(q.toLowerCase())
        );
        setUsers(filtered);
        setSearchStatus('ready');
      } catch (err) {
        if (err.name === 'AbortError') return;
        setSearchError(err.message || String(err));
        setSearchStatus('error');
        setUsers([]);
      }
    })();

    return () => ac.abort();
  });

  // Sequential async/await: user → posts (re-runs when userId changes)
  createEffect(() => {
    const id = userId();
    const ac = new AbortController();
    setChainStatus('loading');
    setProfile(null);
    setPosts([]);
    setChainLog([]);

    (async () => {
      try {
        pushLog(`Fetching user #${id}…`);
        const user = await fetchJson(`${API}/users/${id}`, { signal: ac.signal });
        setProfile(user);
        pushLog(`Got ${user.name}. Waiting briefly…`);

        await delay(400, ac.signal);

        pushLog(`Fetching posts for user #${id}…`);
        const userPosts = await fetchJson(`${API}/posts?userId=${id}`, {
          signal: ac.signal,
        });
        setPosts(userPosts.slice(0, 5));
        pushLog(`Loaded ${userPosts.length} posts (showing 5).`);
        setChainStatus('ready');
      } catch (err) {
        if (err.name === 'AbortError') {
          pushLog('Chain aborted (userId changed or unmount).');
          return;
        }
        pushLog(`Error: ${err.message}`);
        setChainStatus('error');
      }
    })();

    return () => ac.abort();
  });

  const loadRandomPost = async () => {
    setManualStatus('loading');
    setManualPost(null);
    try {
      const id = 1 + Math.floor(Math.random() * 20);
      await delay(300);
      const post = await fetchJson(`${API}/posts/${id}`);
      setManualPost(post);
      setManualStatus('ready');
    } catch (err) {
      setManualStatus('error');
      setManualPost({ title: 'Failed', body: err.message });
    }
  };

  return (
    <div class="async-demo">
      <section class="panel">
        <h2>1. Debounced search + AbortController</h2>
        <p class="hint">
          Type a name. Debounce waits 350ms; each new query aborts the previous{' '}
          <code>fetch</code>.
        </p>
        <input
          type="search"
          placeholder="Filter users (e.g. leanne, ervin…)"
          value={query()}
          oninput={(e) => setQuery(e.target.value)}
        />
        <p class="meta">
          Status: <strong>{searchStatus()}</strong>
          {searchError() ? ` — ${searchError()}` : ''}
        </p>
        <ul class="results">
          {users().map((u) => (
            <li key={u.id}>
              <strong>{u.name}</strong>
              <span>{u.email}</span>
            </li>
          ))}
        </ul>
        {searchStatus() === 'ready' && users().length === 0 && debouncedQuery() && (
          <p class="empty">No users matched “{debouncedQuery()}”.</p>
        )}
      </section>

      <section class="panel">
        <h2>2. Sequential await (user → delay → posts)</h2>
        <p class="hint">
          Changing the id aborts the in-flight chain via cleanup +{' '}
          <code>AbortSignal</code>.
        </p>
        <div class="row">
          <label>
            User id{' '}
            <input
              type="number"
              min="1"
              max="10"
              value={userId()}
              oninput={(e) => {
                const n = Number(e.target.value);
                setUserId(Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 1);
              }}
            />
          </label>
          <span class="meta">Chain: <strong>{chainStatus()}</strong></span>
        </div>
        {profile() && (
          <div class="card">
            <h3>{profile()?.name}</h3>
            <p>
              {profile()?.email} · @{profile()?.username}
            </p>
          </div>
        )}
        <ol class="posts">
          {posts().map((p) => (
            <li key={p.id}>
              <strong>{p.title}</strong>
            </li>
          ))}
        </ol>
        <pre class="log">{chainLog().join('\n')}</pre>
      </section>

      <section class="panel">
        <h2>3. async event handler</h2>
        <p class="hint">Button click runs <code>async</code> function with await — no effect.</p>
        <button type="button" onclick={() => loadRandomPost()}>
          Load random post
        </button>
        <p class="meta">Status: <strong>{manualStatus()}</strong></p>
        {manualPost() && (
          <div class="card">
            <h3>{manualPost()?.title}</h3>
            <p>{manualPost()?.body}</p>
          </div>
        )}
      </section>
    </div>
  );
}

render(AsyncDemo, document.getElementById('app'));
