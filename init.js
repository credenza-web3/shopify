// ============================================================
// CREDENZA SHOPIFY — UNIVERSAL SCRIPT
// ============================================================

// ============================================================
// CONFIG — is set from outside via window.credenzaConfig
// ============================================================

const CONFIG = window.credenzaConfig || {};

// ============================================================
// INIT — EVM
// ============================================================

export const initPassport = async () => {
  console.log("[Credenza] initPassport — chainId:", CONFIG.chainId);
  window.passport = new window.CredenzaPassport({
    chainId: CONFIG.chainId,
    clientId: CONFIG.clientId,
  });

  await passport.init();
  console.log(
    "[Credenza] passport initialized, isLoggedIn:",
    passport.isLoggedIn,
  );
  return passport;
};

// ============================================================
// NAV
// ============================================================

export const showNavScript = async (passport) => {
  const renderLoginImageOrPassportNav = () => {
    const customerEmail = window.shopifyCustomer?.email;
    console.log(
      "[Credenza] renderNav — isLoggedIn:",
      passport.isLoggedIn,
      "customerEmail:",
      customerEmail,
    );

    if (customerEmail) {
      passport.showNavigation({ left: "25px", bottom: "50px" });
    }
  };
  renderLoginImageOrPassportNav();
};

// ============================================================
// GATE — unified access check
//
// gate.type = "nft"        → checks ERC-1155 token balance
// gate.type = "ruleset"    → validates ruleset via Credenza API
// gate.type = "membership" → checks membership via passport
//
// Returns { allowed: boolean, code: string | null }
// code — discount code (ruleset and membership only)
// ============================================================

const checkGate = async (passport, gate) => {
  console.log("[Credenza] checkGate — type:", gate.type);

  if (gate.type === "nft") {
    const allowed = await checkNftOwnership(passport, gate);
    return { allowed: true, code: null };
  }

  if (gate.type === "ruleset") {
    const result = await validateRuleset(passport, gate.rulesetId);
    return { allowed: !!result, code: result?.discount?.code || null };
  }

  if (gate.type === "membership") {
    const address = await passport.getAddress();
    console.log(
      "[Credenza] checkMembership — address:",
      address,
      "package:",
      gate.membershipPackage,
    );
    const { isMember, meta } = await passport.checkMembership(
      address,
      gate.membershipPackage,
    );
    console.log(
      "[Credenza] checkMembership — isMember:",
      isMember,
      "meta:",
      meta,
    );
    return { allowed: isMember, code: meta || null };
  }

  console.warn("[Credenza] checkGate — unknown gate type:", gate.type);
  return { allowed: false, code: null };
};

// ============================================================
// RULESET VALIDATION
// ============================================================

const validateRuleset = async (passport, rulesetId) => {
  const apiUrl = "https://api.testnets.credenza.online";
  console.log("[Credenza] validateRuleset — rulesetId:", rulesetId);

  const timestamp = String(new Date().getTime());
  const providerObj = await passport.getWeb3Provider();
  const signer = await providerObj.getSigner();
  const signature = await signer.signMessage(timestamp);

  const result = await fetch(`${apiUrl}/discounts/rulesets/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${passport.accessToken}`,
    },
    body: JSON.stringify({
      ruleSetId: rulesetId,
      passportId: {
        payload: timestamp,
        sig: signature,
        chainId: CONFIG.chainId,
        scanType: "PASSPORT_ID",
      },
    }),
  });

  if (!result.ok) {
    console.warn(
      "[Credenza] validateRuleset — response not ok:",
      result.status,
    );
    return null;
  }

  const data = await result.json();
  console.log("[Credenza] validateRuleset — response:", data);
  return data;
};

// ============================================================
// ERC-1155 NFT CHECK
// ============================================================

const checkNftOwnership = async (passport, gate) => {
  try {
    const address = await passport.getAddress();
    console.log(
      "[Credenza] checkNftOwnership — address:",
      address,
      "contract:",
      gate.contractAddress,
      "tokenId:",
      gate.tokenId,
    );
    const provider = await passport.getWeb3Provider();
    const abi = [
      "function balanceOf(address account, uint256 id) view returns (uint256)",
    ];
    const contract = new passport.ethers.Contract(
      gate.contractAddress,
      abi,
      provider,
    );
    const balance = await contract.balanceOf(address, gate.tokenId);
    console.log("[Credenza] checkNftOwnership — balance:", balance.toString());
    return balance > 0n;
  } catch (e) {
    console.error("[Credenza] checkNftOwnership failed:", e?.message || e);
    return false;
  }
};

// ============================================================
// DISCOUNTS
//
// config.discounts = {
//   enabled: true,
//   defaultCode: "FALLBACK",
//   gate: {
//     type: "ruleset",
//     rulesetId: "abc123"
//   }
// }
// — or —
//   gate: {
//     type: "membership",
//     membershipPackage: "0x..."
//   }
// ============================================================

export const discountsScript = (passport, config = CONFIG) => {
  const run = async () => {
    console.log("[Credenza] discountsScript — start");
    const { allowed, code: gateCode } = await checkGate(
      passport,
      config.discounts.gate,
    );

    if (!allowed) {
      console.log("[Credenza] discountsScript — gate not passed, skipping");
      return;
    }

    const code = gateCode || config.discounts.defaultCode || "";
    console.log("[Credenza] discountsScript — applying code:", code);

    if (code) {
      document.cookie = `discount_code=${code}; path=/`;
      fetch(`/discount/${code}`);
    }

    await updateCart(passport);

    const checkImg = document.getElementById("checkImg");
    if (checkImg) checkImg.style.display = "inline";
  };

  passport.on("LOGIN", () => {
    console.log("[Credenza] discountsScript — LOGIN triggered");
    run();
  });
  if (passport.isLoggedIn) {
    console.log("[Credenza] discountsScript — already logged in");
    run();
  }
};

// ============================================================
// CART UPDATE
// ============================================================

const updateCart = async (passport, opts) => {
  const userAddress = await passport.getAddress();
  console.log("[Credenza] updateCart — address:", userAddress);
  fetch("/cart/update.js", {
    method: "post",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ note: userAddress, ...(opts || {}) }),
  }).catch((e) => console.error("[Credenza] updateCart error:", e));
};

// ============================================================
// HIDDEN COLLECTION MODAL
//
// config.hiddenCollection = {
//   enabled: true,
//   collectionHandle: "my-collection",
//   storefrontToken: "xxx",
//   gate: {
//     type: "nft",
//     contractAddress: "0x...",
//     tokenId: "1"
//   }
// }
// — or —
//   gate: { type: "ruleset", rulesetId: "..." }
// — or —
//   gate: { type: "membership", membershipPackage: "0x..." }
// ============================================================

export const hiddenCollectionScript = (passport, config = CONFIG) => {
  const run = async () => {
    console.log("[Credenza] hiddenCollectionScript — start");
    const { allowed } = await checkGate(passport, config.hiddenCollection.gate);

    if (!allowed) {
      console.log(
        "[Credenza] hiddenCollectionScript — gate not passed, skipping",
      );
      return;
    }

    console.log(
      "[Credenza] hiddenCollectionScript — fetching collection:",
      config.hiddenCollection.collectionHandle,
    );
    try {
      const res = await fetch("/api/2024-01/graphql.json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token":
            config.hiddenCollection.storefrontToken,
        },
        body: JSON.stringify({
          query: `{
            collection(handle: "${config.hiddenCollection.collectionHandle}") {
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
      const products = data?.collection?.products?.edges || [];
      console.log(
        "[Credenza] hiddenCollectionScript — products fetched:",
        products.length,
      );
      const mapped = products.map(({ node: p }) => ({
        title: p.title,
        image: p.images.edges[0]?.node.url,
        price: p.variants.edges[0]?.node.price.amount,
        variantId: p.variants.edges[0]?.node.id.split("/").pop(),
      }));
      if (mapped.length) showModal(mapped);
    } catch (e) {
      console.error("[Credenza] hiddenCollectionScript fetch error:", e);
    }
  };

  passport.on("LOGIN", () => {
    console.log("[Credenza] hiddenCollectionScript — LOGIN triggered");
    run();
  });
  if (passport.isLoggedIn) {
    console.log("[Credenza] hiddenCollectionScript — already logged in");
    run();
  }
};

// ============================================================
// MODAL
// ============================================================

const injectModalStyles = () => {
  if (document.getElementById("nft-modal-styles")) return;
  const style = document.createElement("style");
  style.id = "nft-modal-styles";
  style.textContent = `
    #nft-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 99999;
      display: flex; align-items: center; justify-content: center;
    }
    #nft-modal {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      max-width: 700px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    }
    #nft-modal h2 { margin: 0 0 16px; font-size: 20px; }
    #nft-modal-close {
      position: absolute; top: 16px; right: 16px;
      background: none; border: none;
      font-size: 20px; cursor: pointer;
    }
    #nft-products {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }
    .nft-product { border: 1px solid #eee; border-radius: 8px; padding: 12px; text-align: center; }
    .nft-product img { width: 100%; border-radius: 4px; }
    .nft-product h3 { font-size: 14px; margin: 8px 0 4px; }
    .nft-product p { font-size: 13px; color: #555; margin: 0 0 8px; }
    .nft-product button {
      background: #000; color: #fff;
      border: none; border-radius: 4px;
      padding: 8px 12px; cursor: pointer;
      width: 100%; font-size: 13px;
    }
    .nft-product button:hover { background: #333; }
  `;
  document.head.appendChild(style);
};

const showModal = (products) => {
  if (sessionStorage.getItem("credenza_modal_shown")) {
    console.log("[Credenza] showModal — already shown this session, skipping");
    return;
  }
  console.log("[Credenza] showModal — products count:", products.length);
  injectModalStyles();

  const existing = document.getElementById("nft-modal-overlay");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "nft-modal-overlay";
  modal.innerHTML = `
    <div id="nft-modal">
      <h2>🔒 Members Only Drop</h2>
      <button id="nft-modal-close">✕</button>
      <div id="nft-products">
        ${products
          .map(
            (p) => `
          <div class="nft-product">
            <img src="${p.image}" alt="${p.title}" />
            <h3>${p.title}</h3>
            <p>${p.price}</p>
            <button data-variant="${p.variantId}">Add to Cart</button>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  sessionStorage.setItem("credenza_modal_shown", "1");

  modal
    .querySelector("#nft-modal-close")
    .addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelectorAll("[data-variant]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.textContent = "Adding...";
      console.log("[Credenza] addToCart — variantId:", btn.dataset.variant);
      try {
        await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ id: btn.dataset.variant, quantity: 1 }],
          }),
        });
        btn.textContent = "✓ Added";
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
      } catch (e) {
        btn.textContent = "Error";
        console.error("[Credenza] addToCart error:", e);
      }
    });
  });
};

// ============================================================
// UNIVERSAL RUNNER — entry point
// ============================================================

export const credenzaShopify = async (passport, config = CONFIG) => {
  console.log(
    "[Credenza] credenzaShopify — config:",
    JSON.stringify(config, null, 2),
  );

  if (config.discounts?.enabled) {
    console.log(
      "[Credenza] discounts enabled, gate:",
      config.discounts.gate?.type,
    );
    discountsScript(passport, config);
  }

  if (config.hiddenCollection?.enabled) {
    console.log(
      "[Credenza] hiddenCollection enabled, gate:",
      config.hiddenCollection.gate?.type,
    );
    hiddenCollectionScript(passport, config);
  }
};
