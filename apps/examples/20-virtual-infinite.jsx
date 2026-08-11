import { createSignal, render, VirtualList, Show } from 'grainlet';

const PAGE_SIZE = 24;
const MAX_ITEMS = 240;

function photoUrl(id) {
  return `https://picsum.photos/seed/grain-inf-${id}/160/120`;
}

function createItem(id) {
  return {
    id,
    label: `Photo ${id + 1}`,
    src: photoUrl(id),
  };
}

/** Simulated paged API — delay + next chunk from an offset. */
function fetchPage(offset) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const next = Array.from({ length: PAGE_SIZE }, (_, i) =>
        createItem(offset + i)
      ).filter((item) => item.id < MAX_ITEMS);
      resolve({
        items: next,
        hasMore: offset + next.length < MAX_ITEMS,
      });
    }, 450);
  });
}

function Row(props) {
  const item = props.item;
  return (
    <div class="card">
      <img
        class="card__img"
        src={item.src}
        alt=""
        width="72"
        height="72"
        loading="lazy"
        decoding="async"
      />
      <div class="card__body">
        <div class="card__title">{item.label}</div>
        <div class="card__sub">id {item.id}</div>
      </div>
    </div>
  );
}

function InfiniteDemo() {
  const [items, setItems] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);
  const [pages, setPages] = createSignal(0);
  const [error, setError] = createSignal('');
  const [getBoot] = createSignal({ started: false });
  const [getList] = createSignal({
    api: null,
    element: null,
    setApi: null,
    setElement: null,
  });
  const boot = getBoot();
  const list = getList();

  if (!list.setApi) {
    list.setApi = (api) => {
      list.api = api;
    };
    list.setElement = (element) => {
      list.element = element;
    };
  }

  const loadMore = async () => {
    if (loading() || !hasMore()) return;
    setLoading(true);
    setError('');
    try {
      const page = await fetchPage(items().length);
      setItems((list) => [...list, ...page.items]);
      setHasMore(page.hasMore);
      setPages((n) => n + 1);
    } catch (err) {
      setError(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  if (!boot.started) {
    boot.started = true;
    queueMicrotask(() => loadMore());
  }

  return (
    <div class="demo">
      <h1>VirtualList — infinite scroll</h1>
      <p class="lead">
        Scroll to the bottom to load the next page from a fake API. Parent owns
        fetch + append; <code>onEndReached</code> only fires when near the end
        and not while <code>endReachedLoading</code> is true.
      </p>

      <div class="stats">
        <span class="badge">items: {items().length}</span>
        <span class="badge">pages: {pages()}</span>
        <span class="badge badge--more">
          hasMore: {hasMore() ? 'yes' : 'no'}
        </span>
        <Show when={loading()}>
          <span class="badge badge--load">loading…</span>
        </Show>
      </div>

      <div class="toolbar">
        <button
          type="button"
          disabled={items().length === 0}
          onClick={() =>
            list.api?.scrollToIndex(0, {
              align: 'start',
              behavior: 'smooth',
            })
          }
        >
          Back to top
        </button>
        <button
          type="button"
          disabled={items().length === 0}
          onClick={() =>
            list.api?.scrollToItem(items().at(-1), {
              align: 'end',
              behavior: 'smooth',
            })
          }
        >
          Jump to latest
        </button>
        <button type="button" onClick={() => list.element?.focus()}>
          Focus feed
        </button>
      </div>

      <Show when={error()}>
        <p class="error" role="alert">
          {error()}
        </p>
      </Show>

      <VirtualList
        each={items()}
        itemHeight={88}
        height={520}
        overscan={4}
        debounceTime={16}
        onEndReached={loadMore}
        endReachedThreshold={0.25}
        endReachedLoading={loading()}
        class="list"
        id="infinite-photo-feed"
        aria-label="Infinite photo feed"
        aria-busy={loading()}
        data-demo="virtual-infinite"
        tabIndex={0}
        ref={list.setElement}
        apiRef={list.setApi}
        fallback={<p class="empty">Loading first page…</p>}
      >
        {(item) => <Row item={item} />}
      </VirtualList>

      <Show when={!hasMore() && items().length > 0}>
        <p class="footer">End of feed ({MAX_ITEMS} items).</p>
      </Show>
    </div>
  );
}

render(InfiniteDemo, document.getElementById('app'));
