import React, { useMemo, useState } from "react";
import { fmtDate, money, primaryImage, timeAgo, type Product, type TradeOrder } from "../../lib/data";
import { useStore } from "../../lib/store";
import { useStoredImage } from "../../lib/media";
import { EmptyState, FieldSelect, FieldText, PlusIcon, Tick } from "../../components/ui";
import { PhotosToggle, ProductPhotosPanel } from "../../components/admin/ProductPhotos";

/* ================= Trade inbox ================= */

export function TradeInboxView() {
  const { tradeOrders, products, fulfillTradeOrder, toast } = useStore();
  const [filter, setFilter] = useState<"new" | "fulfilled" | "all">("new");
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(() => tradeOrders.filter((t) => filter === "all" || t.status === filter), [tradeOrders, filter]);
  const nameOf = (id: string) => {
    const p = products.find((x) => x.id === id);
    return p ? `${p.name}${p.vintage ? " " + p.vintage : ""}` : "Retired product";
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker text-granite-500">Trade orders</p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium mt-1.5">Bottle shops, ringing in.</h1>
        </div>
        <div className="flex gap-2">
          {(
            [
              { id: "new", label: "To pack" },
              { id: "fulfilled", label: "Packed & sent" },
              { id: "all", label: "All" },
            ] as const
          ).map((f) => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={filter === f.id} className={`btn btn-sm ${filter === f.id ? "btn-dark" : "btn-ghost"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 space-y-4">
        {visible.length === 0 ? (
          <EmptyState
            title={filter === "new" ? "Nothing waiting to be packed." : "No trade orders here."}
            note={filter === "new" ? "When a stockist sends the order form, it lands at the top of this list." : "Orders from the trade form appear here."}
          />
        ) : (
          visible.map((t: TradeOrder) => {
            const open = openId === t.id;
            const bottleCount = t.lines.reduce((n, l) => n + l.qty, 0);
            return (
              <div key={t.id} className={`border-2 bg-bone ${t.status === "new" ? "border-granite-900" : "border-granite-300"}`}>
                <button type="button" className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 hover:bg-granite-100/60 transition-colors" onClick={() => setOpenId(open ? null : t.id)} aria-expanded={open}>
                  <span className="font-label font-semibold w-52 truncate">{t.business}</span>
                  <span className="text-sm text-granite-500">{t.contact}</span>
                  <span className="text-sm text-granite-500">
                    {bottleCount} bottles · {t.lines.length} lines
                  </span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-xs text-granite-500">{timeAgo(t.createdAt)}</span>
                    <span className={`text-[0.66rem] font-label font-bold uppercase tracking-[0.08em] px-2 py-1 border ${t.status === "new" ? "border-ochre text-ochre" : "border-vine text-vine"}`}>
                      {t.status === "new" ? "To pack" : "Fulfilled"}
                    </span>
                  </span>
                </button>
                {open ? (
                  <div className="border-t-2 border-granite-300 px-5 py-4 grid md:grid-cols-2 gap-6 rise-in">
                    <div>
                      <p className="kicker text-granite-500">The order</p>
                      <ul className="mt-3 divide-y divide-granite-300 border border-granite-300">
                        {t.lines.map((l, i) => (
                          <li key={i} className="px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
                            <span className="font-label font-semibold">{nameOf(l.productId)}</span>
                            <span className="text-granite-500">× {l.qty}</span>
                          </li>
                        ))}
                      </ul>
                      {t.notes ? <p className="mt-3 text-sm text-granite-700 italic border-l-2 border-granite-300 pl-4">"{t.notes}"</p> : null}
                    </div>
                    <div>
                      <p className="kicker text-granite-500">Who to ring</p>
                      <p className="mt-3 text-sm text-granite-700">
                        {t.contact} · {t.phone}
                        <br />
                        {t.email}
                        <br />
                        ABN {t.abn}
                      </p>
                      {t.status === "new" ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm mt-5"
                          onClick={() => {
                            fulfillTradeOrder(t.id);
                            toast(`${t.business} marked fulfilled. The stockist gets a dispatch note.`);
                          }}
                        >
                          <Tick className="w-4 h-4" /> Mark fulfilled
                        </button>
                      ) : (
                        <p className="mt-5 text-sm text-vine font-medium flex items-center gap-2">
                          <Tick className="w-4 h-4" /> Packed and on the truck.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ================= Shop & stock manager ================= */

function ProductThumb({ product }: { product: Product }) {
  const img = primaryImage(product);
  const url = useStoredImage(img?.id);
  return (
    <div className="hidden sm:grid shrink-0 w-11 h-11 place-items-center bg-granite-100 border-2 border-granite-900 overflow-hidden">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <span className="font-display italic text-[0.6rem] text-granite-500">HV</span>}
    </div>
  );
}

function ProductRow({ product }: { product: Product }) {
  const { updateProduct, toast } = useStore();
  const [price, setPrice] = useState((product.priceCents / 100).toFixed(2));
  const [stock, setStock] = useState(String(product.stock));
  const [photosOpen, setPhotosOpen] = useState(false);
  const dirty = price !== (product.priceCents / 100).toFixed(2) || stock !== String(product.stock);

  const save = () => {
    const priceCents = Math.round((parseFloat(price) || 0) * 100);
    const stockN = Math.max(0, parseInt(stock, 10) || 0);
    updateProduct(product.id, { priceCents, stock: stockN });
    toast(`${product.name} saved.`);
  };

  const stockN = parseInt(stock, 10) || 0;

  return (
    <li>
      <div className="grid grid-cols-2 md:grid-cols-[auto_1.4fr_0.6fr_0.7fr_0.6fr_1fr_auto] gap-3 md:gap-4 items-end px-5 py-4">
        <div className="hidden md:flex items-end pb-1.5">
          <ProductThumb product={product} />
        </div>
        <div className="col-span-2 md:col-span-1">
          <p className="font-label font-semibold text-sm">
            {product.name} {product.vintage ?? ""}
          </p>
          <p className="text-xs text-granite-500 mt-0.5">
            {product.type} · Stripe ID <span className="font-mono">{product.stripePriceId.slice(0, 9)}•••</span>
          </p>
        </div>
        <div>
          <label className="field-label" htmlFor={`pr-${product.id}`}>
            Price ($)
          </label>
          <input id={`pr-${product.id}`} className="field-input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor={`st-${product.id}`}>
            Stock
          </label>
          <input
            id={`st-${product.id}`}
            className={`field-input font-label font-semibold ${stockN === 0 ? "text-garnet" : stockN <= 15 ? "text-ochre" : ""}`}
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
        <div className="hidden md:block">
          <p className="field-label">Status</p>
          <span className={`inline-block text-[0.66rem] font-label font-bold uppercase tracking-[0.08em] px-2 py-1.5 border ${product.active ? "border-vine text-vine" : "border-granite-500 text-granite-500"}`}>
            {product.active ? "On sale" : "Hidden"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 col-span-2 md:col-span-2">
          <button type="button" className="btn btn-primary btn-sm flex-1 md:flex-none" disabled={!dirty} onClick={save}>
            {dirty ? "Save" : "Saved"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              updateProduct(product.id, { active: !product.active });
              toast(product.active ? `${product.name} hidden from the shop.` : `${product.name} back on the shelf.`);
            }}
          >
            {product.active ? "Hide" : "Show"}
          </button>
          <PhotosToggle product={product} open={photosOpen} onToggle={() => setPhotosOpen((o) => !o)} />
        </div>
      </div>
      {photosOpen ? <ProductPhotosPanel product={product} /> : null}
    </li>
  );
}

function AddProductForm() {
  const { addProduct, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", type: "wine" as Product["type"], varietal: "", vintage: "", price: "", stock: "", description: "" });
  const [err, setErr] = useState("");

  const submit = () => {
    if (f.name.trim().length < 2) {
      setErr("Give it a name first.");
      return;
    }
    const priceCents = Math.round((parseFloat(f.price) || 0) * 100);
    if (priceCents <= 0) {
      setErr("A price above zero, in dollars — e.g. 38 or 38.00.");
      return;
    }
    addProduct({
      name: f.name.trim(),
      type: f.type,
      varietal: f.varietal.trim() || (f.type === "wine" ? "Blend" : f.type === "beer" ? "Ale" : "Mead"),
      vintage: f.vintage.trim() || null,
      priceCents,
      stock: Math.max(0, parseInt(f.stock, 10) || 0),
      description: f.description.trim() || "Tasting notes to come — ask at the cellar door.",
    });
    toast(`${f.name.trim()} is on the shelf.`);
    setF({ name: "", type: "wine", varietal: "", vintage: "", price: "", stock: "", description: "" });
    setErr("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" className="btn btn-primary mt-6" onClick={() => setOpen(true)}>
        <PlusIcon className="w-4 h-4" /> Add a new product
      </button>
    );
  }

  return (
    <div className="mt-6 border-2 border-dashed border-granite-900 bg-granite-100/40 p-5 rise-in">
      <p className="kicker text-granite-500">New product for the shop</p>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <FieldText id="np-name" label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Winter Muscat" />
        <FieldSelect id="np-type" label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Product["type"] })}>
          <option value="wine">Wine</option>
          <option value="beer">Beer</option>
          <option value="mead">Mead</option>
        </FieldSelect>
        <FieldText id="np-varietal" label="Varietal / style" value={f.varietal} onChange={(e) => setF({ ...f, varietal: e.target.value })} placeholder="e.g. Shiraz" />
        <FieldText id="np-vintage" label="Vintage (blank for none)" value={f.vintage} onChange={(e) => setF({ ...f, vintage: e.target.value })} placeholder="e.g. 2023" />
        <FieldText id="np-price" label="Price ($)" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="38.00" />
        <FieldText id="np-stock" label="Stock (bottles)" inputMode="numeric" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} placeholder="24" />
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="field-label" htmlFor="np-desc">
            Tasting notes
          </label>
          <textarea id="np-desc" className="field-input min-h-[80px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Short, sensory, what to eat it with." />
        </div>
      </div>
      {err ? <p className="field-error mt-3">{err}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary btn-sm" onClick={submit}>
          Put it on the shelf
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <p className="text-xs text-granite-500 self-center">A demo Stripe Price ID is generated — swap it for the real one once the bank knows about it.</p>
      </div>
    </div>
  );
}

export function ShopManagerView() {
  const { products, orders } = useStore();
  const lowStock = products.filter((p) => p.active && p.stock <= 15).length;
  return (
    <div>
      <p className="kicker text-granite-500">Shop &amp; stock</p>
      <h1 className="font-display text-3xl sm:text-4xl font-medium mt-1.5">The shelf, by the numbers.</h1>
      <p className="text-sm text-granite-500 mt-2 max-w-xl">
        Prices and stock edit in place — press Save on a row and the shop updates. Stock counts itself down when an online order is paid.{" "}
        {lowStock > 0 ? `${lowStock} wine${lowStock === 1 ? "" : "s"} running low or sold out.` : "Everything's comfortably stocked."}
      </p>

      <AddProductForm />

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <div className="border-2 border-granite-900 bg-bone p-5">
          <p className="kicker text-granite-500">Products live</p>
          <p className="font-display text-4xl font-medium mt-1.5">{products.filter((p) => p.active).length}</p>
        </div>
        <div className="border-2 border-granite-900 bg-bone p-5">
          <p className="kicker text-granite-500">Running low (≤15)</p>
          <p className={`font-display text-4xl font-medium mt-1.5 ${lowStock > 0 ? "text-ochre" : ""}`}>{lowStock}</p>
        </div>
        <div className="border-2 border-granite-900 bg-bone p-5">
          <p className="kicker text-granite-500">Online orders, all time</p>
          <p className="font-display text-4xl font-medium mt-1.5">{orders.length}</p>
        </div>
      </div>

      <div className="mt-7 border-2 border-granite-900 bg-bone overflow-x-auto thin-scroll">
        <div className="min-w-[760px]">
          <div className="grid md:grid-cols-[auto_1.4fr_0.6fr_0.7fr_0.6fr_1fr_auto] gap-4 px-5 py-3 border-b-2 border-granite-900 bg-granite-100/60">
            <p className="kicker text-granite-500 hidden md:block">&nbsp;</p>
            <p className="kicker text-granite-500">Product</p>
            <p className="kicker text-granite-500">Price</p>
            <p className="kicker text-granite-500">Stock</p>
            <p className="kicker text-granite-500 hidden md:block">Status</p>
            <p className="kicker text-granite-500 col-span-2 md:col-span-2">Actions</p>
          </div>
          <ul className="divide-y divide-granite-300">
            {products.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs text-granite-500 mt-3">The Stripe ID is what checkout charges against — only touch it if the bank account says so.</p>
    </div>
  );
}

export function fmtDateOnly(s: string | null): string {
  return fmtDate(s);
}
