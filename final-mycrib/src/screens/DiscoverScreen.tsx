import { useRef, useState } from 'react';
import { InspoGrid, ProductSheet, SurfaceSwitch } from '../components/Inspo';
import { Icon } from '../components/Icon';
import { navigate } from '../components/ui';
import { useStore } from '../state/store';
import { STAND } from '../stand';
import { INSPO, inspoSrc, matches, NATURE, productText, PRODUCTS, ROOM_TYPES, roomText, sceneById, searchSuggestions, STYLES, type Product, type RoomType } from '../state/inspo';

/**
 * Discover: search, a row of nature images, and styles. A nature image works as a filter: one at a time, it stands
 * first among the filters, and the row stays (Synne 06.11). It is kept in the address, so Back returns to it.
 */
/** Discover's search, filters and images, without the screen around it, so Create (V1) and Studio (V2) can hold it (10.11). */
/** `onPick`: Explore as a picker (Inspiration from + in the room, Synne 14.11) – a tap picks the photo instead of opening it */
export function DiscoverContent({ natureId, natureStrip = true, onPick }: { natureId?: string; natureStrip?: boolean; onPick?: (id: string, title: string) => void }) {
  const { state } = useStore();
  // the stand's moodboard task (Synne 19.11): until a photo is saved in the visitor's new board, the first photo pulses
  const boardTask = STAND && !!state.standBoard && !(state.boards ?? []).find((b) => b.id === state.standBoard)?.items.length;
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomType | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [pickScene, setPickScene] = useState<string | undefined>(natureId);
  const scene = sceneById((onPick ? pickScene : natureId) ?? '') ;
  const toggle = (id: string) => (onPick ? setPickScene(scene?.id === id ? undefined : id) : navigate(scene?.id === id ? '/discover' : `/discover/${id}`, true));

  const query = q.trim().toLowerCase();
  const fits = (i: { natures: string[]; styles: string[] }) => (!scene || i.natures.includes(scene.id)) && (!!scene || !style || i.styles.includes(style));
  // only the room types that have something to show for these filters
  const roomTypes = ROOM_TYPES.filter((r) => INSPO.some((i) => fits(i) && i.room === r));
  const activeRoom = room && roomTypes.includes(room) ? room : null;
  const rooms = INSPO.filter((i) => fits(i) && (!activeRoom || i.room === activeRoom) && matches(roomText(i), query));
  const products = PRODUCTS.filter((p) => fits(p) && matches(productText(p), query));
  const suggestions = searchSuggestions(state, q);
  const refined = !!scene || !!style;

  return (
    <>
        <div className="discover-search-wrap">
          <div className="discover-search">
            <Icon name="search" size={20} />
            <label className="sr-only" htmlFor="dc-search">
              Search
            </label>
            <input
              ref={input}
              id="dc-search"
              type="search"
              autoComplete="off"
              placeholder="Search for inspiring photos"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setSearching(true)}
              onBlur={() => setSearching(false)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            {q && (
              <button
                type="button"
                className="discover-clear"
                aria-label="Clear search"
                onClick={() => {
                  setQ('');
                  input.current?.focus();
                }}
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
          {/* a dropdown of whole searches, like Pinterest; pointerdown keeps the focus, so a tap is not lost to blur (Synne 06.11) */}
          {searching && suggestions.length > 0 && (
            <div className="search-dropdown glass" onPointerDown={(e) => e.preventDefault()}>
              {!q.trim() && <h2 className="search-dropdown-title">Based on what you save</h2>}
              {suggestions.map((t) => (
                <button
                  key={t}
                  className="menu-item"
                  onClick={() => {
                    setQ(t);
                    input.current?.blur();
                  }}
                >
                  <Icon name="search" size={20} />
                  <span>{t}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {natureStrip && !query && (
          <section aria-labelledby="dc-nature">
            <h2 className="discover-heading" id="dc-nature">
              If nature says it fits, then it fits
            </h2>
            <div className="nature-strip">
              {NATURE.map((n) => (
                <button key={n.id} className={'nature-pick' + (scene?.id === n.id ? ' is-active' : '')} aria-pressed={scene?.id === n.id} onClick={() => toggle(n.id)}>
                  <img src={inspoSrc(n.id)} alt="" />
                  <span>{n.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="inspo-chips discover-filters">
          {scene && (
            <button className="inspo-chip is-active has-thumb" aria-label={`Remove ${scene.name}`} onClick={() => toggle(scene.id)}>
              <img src={inspoSrc(scene.id)} alt="" />
              {scene.name}
              <Icon name="close" size={16} />
            </button>
          )}
          {/* with a nature image picked, only that filter shows – no Scandi, Japandi … (Synne 11.11) */}
          {!scene && (
            <>
              <button className={'inspo-chip' + (!style ? ' is-active' : '')} aria-pressed={!style} onClick={() => setStyle(null)}>
                All
              </button>
              {STYLES.map((s) => (
                <button key={s} className={'inspo-chip' + (style === s ? ' is-active' : '')} aria-pressed={style === s} onClick={() => setStyle(style === s ? null : s)}>
                  {s}
                </button>
              ))}
            </>
          )}
        </div>

        {refined && !scene && (
          <div className="inspo-chips discover-filter">
            {roomTypes.map((t) => (
              <button key={t} className={'inspo-chip' + (activeRoom === t ? ' is-active' : '')} aria-pressed={activeRoom === t} onClick={() => setRoom(activeRoom === t ? null : t)}>
                {t}
              </button>
            ))}
          </div>
        )}

        {rooms.length > 0 && <InspoGrid items={rooms} glowFirst={boardTask} onOpen={(i) => (onPick ? onPick(i.id, i.title) : navigate(`/image/${i.id}${scene ? `/${scene.id}` : ''}`))} />}
        {query && products.length > 0 && (
          <>
            <h2 className="discover-heading">Furniture</h2>
            <InspoGrid items={products} onOpen={setProduct} />
          </>
        )}
        {!rooms.length && !(query && products.length) && <p className="empty">Nothing here yet. Try another filter.</p>}
        {product && <ProductSheet product={product} nature={scene?.id} onClose={() => setProduct(null)} />}
    </>
  );
}

export function DiscoverScreen({ natureId }: { natureId?: string }) {
  return (
    <div className="screen discover">
      <div className="screen-scroll discover-scroll">
        <h1 className="discover-title">Discover your style</h1>
        <DiscoverContent natureId={natureId} />
      </div>
      <SurfaceSwitch active="discover" />
    </div>
  );
}
