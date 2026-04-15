import { checkGate } from "./gate.js";

const updateCart = async (passport) => {
  const address = await passport.getAddress();
  fetch("/cart/update.js", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ note: address }),
  }).catch(() => {});
};

const injectModalStyles = () => {
  if (document.getElementById("credenza-modal-styles")) return;
  const style = document.createElement("style");
  style.id = "credenza-modal-styles";
  style.textContent = `
    #credenza-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 99999;
      display: flex; align-items: center; justify-content: center;
    }
    #credenza-modal {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      max-width: 700px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    }
    #credenza-modal h2 { margin: 0 0 16px; font-size: 20px; }
    #credenza-modal-close {
      position: absolute; top: 16px; right: 16px;
      background: none; border: none;
      font-size: 20px; cursor: pointer;
    }
    #credenza-products {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }
    .credenza-product { border: 1px solid #eee; border-radius: 8px; padding: 12px; text-align: center; }
    .credenza-product img { width: 100%; border-radius: 4px; }
    .credenza-product h3 { font-size: 14px; margin: 8px 0 4px; }
    .credenza-product p { font-size: 13px; color: #555; margin: 0 0 8px; }
    .credenza-product button {
      background: #000; color: #fff;
      border: none; border-radius: 4px;
      padding: 8px 12px; cursor: pointer;
      width: 100%; font-size: 13px;
    }
    .credenza-product button:hover { background: #333; }
  `;
  document.head.appendChild(style);
};

const showModal = (passport, products) => {
  if (sessionStorage.getItem("credenza_modal_shown")) return;

  injectModalStyles();

  const existing = document.getElementById("credenza-modal-overlay");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "credenza-modal-overlay";
  modal.innerHTML = `
    <div id="credenza-modal">
      <h2>Members Only Drop</h2>
      <button id="credenza-modal-close">✕</button>
      <div id="credenza-products">
        ${products.map((p) => `
          <div class="credenza-product">
            <img src="${p.image}" alt="${p.title}" />
            <h3>${p.title}</h3>
            <p>${p.price}</p>
            <button data-variant="${p.variantId}">Add to Cart</button>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  sessionStorage.setItem("credenza_modal_shown", "1");

  modal.querySelector("#credenza-modal-close").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelectorAll("[data-variant]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.textContent = "Adding...";
      try {
        const variantId = Number(btn.dataset.variant);
        const res = await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] }),
        });
        if (!res.ok) { btn.textContent = "Error"; return; }
        btn.textContent = "Added";
        await updateCart(passport);
        fetch("/?sections=cart-icon-bubble")
          .then((r) => r.json())
          .then((sections) => {
            if (sections["cart-icon-bubble"]) {
              document.getElementById("cart-icon-bubble").innerHTML =
                new DOMParser()
                  .parseFromString(sections["cart-icon-bubble"], "text/html")
                  .getElementById("cart-icon-bubble").innerHTML;
            }
          })
          .catch(() => {});
      } catch {
        btn.textContent = "Error";
      }
    });
  });
};

const fetchCollection = async (collectionHandle, storefrontToken) => {
  const res = await fetch("/api/2024-01/graphql.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontToken,
    },
    body: JSON.stringify({
      query: `{
        collection(handle: "${collectionHandle}") {
          products(first: 20) {
            edges {
              node {
                title
                images(first: 1) { edges { node { url } } }
                variants(first: 1) {
                  edges { node { id price { amount } } }
                }
              }
            }
          }
        }
      }`,
    }),
  });
  const { data } = await res.json();
  return (data?.collection?.products?.edges || []).map(({ node: p }) => ({
    title: p.title,
    image: p.images.edges[0]?.node.url,
    price: p.variants.edges[0]?.node.price.amount,
    variantId: p.variants.edges[0]?.node.id.split("/").pop(),
  }));
};

export const hiddenCollectionScript = (passport, config) => {
  const run = async () => {
    const { allowed } = await checkGate(passport, config.hiddenCollection.gate);
    if (!allowed) return;

    const products = await fetchCollection(
      config.hiddenCollection.collectionHandle,
      config.hiddenCollection.storefrontToken,
    );
    if (products.length) showModal(passport, products);
  };

  passport.on("LOGIN", run);
  if (passport.isLoggedIn) run();
};
