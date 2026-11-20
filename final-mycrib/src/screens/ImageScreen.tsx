import { useState } from 'react';
import { STAND } from '../stand';
import { useStore } from '../state/store';
import { InspoGrid, ProductSheet, SaveSheet } from '../components/Inspo';
import { Button, IconButton, navigate } from '../components/ui';
import { nok } from '../state/catalog';
import { inspoById, inspoSrc, productsFor, sceneById, similarTo, type Inspo, type Product } from '../state/inspo';

/** One image, big, with images like it underneath (Synne 06.11, like Pinterest). */
export function ImageScreen({ id, natureId }: { id: string; natureId?: string }) {
  const [saving, setSaving] = useState(false);
  // the stand's moodboard task (Synne 19.11): «Save» shows the way while the visitor's board is still empty
  const { state } = useStore();
  const ownBoard = STAND && state.standBoard ? (state.boards ?? []).find((b) => b.id === state.standBoard) : undefined;
  const showSave = !!ownBoard && ownBoard.items.length === 0;
  const [product, setProduct] = useState<Product | null>(null);
  const item = inspoById(id);
  if (!item) {
    navigate('/discover', true);
    return null;
  }
  const open = (i: Inspo) => navigate(`/image/${i.id}${natureId ? `/${natureId}` : ''}`);
  return (
    <div className="screen image-screen">
      <div className="screen-scroll image-scroll">
        <div className="image-hero">
          <img src={inspoSrc(item.id)} alt={item.title} />
          <IconButton icon="chevron_left" label="Back" className="image-back" onClick={() => window.history.back()} />
        </div>
        <div className="image-head">
          <h1>{item.title}</h1>
          <Button className={'image-save' + (showSave ? ' stand-ok-btn' : '')} onClick={() => setSaving(true)}>
            Save
          </Button>
        </div>
        <h2 className="discover-heading">Found in nature</h2>
        <div className="nature-strip nature-strip-small">
          {item.natures.map((n) => (
            <button key={n} className="nature-pick" onClick={() => navigate(`/discover/${n}`)}>
              <img src={inspoSrc(n)} alt="" />
              <span>{sceneById(n)?.name}</span>
            </button>
          ))}
        </div>
        {productsFor(item).length > 0 && (
          <>
            <h2 className="discover-heading">Furniture that matches</h2>
            <div className="nature-strip">
              {productsFor(item).map((p) => (
                <button key={p.id} className="nature-pick product-pick" onClick={() => setProduct(p)}>
                  <img src={inspoSrc(p.id)} alt="" />
                  <span>{p.title}</span>
                  <span className="inspo-tile-meta">{nok(p.price)}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <h2 className="discover-heading">More like this</h2>
        <InspoGrid items={similarTo(item)} onOpen={open} />
      </div>
      {product && <ProductSheet product={product} nature={natureId} onClose={() => setProduct(null)} />}
      {saving && <SaveSheet item={item.id} nature={natureId} onClose={() => setSaving(false)} />}
    </div>
  );
}
