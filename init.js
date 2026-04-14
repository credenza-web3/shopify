// ============================================================
// CREDENZA SHOPIFY — UNIVERSAL SCRIPT
// ============================================================

// ============================================================
// CONFIG
// ============================================================

const CONFIG = {
  chainId: "84532", // or '1', '137', etc
  clientId: "67039801735659a157687bfb",

  discounts: {
    enabled: true,
    rulesetId: "68109520182622174f6fc7cb",
  },

  membership: {
    enabled: false,
    package: "0x12a03c4330cf8bd7db2c90cfd378ec6ff02e19fa",
  },

  hiddenCollection: {
    enabled: false,
    collectionHandle: "sharks-test-shop-copy", // e.g. "members-only"
    nft: {
      contractAddress: "0x6c83c06a3edb16f6e79ae3c0cd9e21cfda35d25c",
      tokenId: "1",
    },
  },
};

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
    const customerEmail = "{{ customer.email }}";
    const loginButton = document.querySelector("#login-button-image");
    console.log(
      "[Credenza] renderNav — isLoggedIn:",
      passport.isLoggedIn,
      "customerEmail:",
      customerEmail,
    );

    if (customerEmail && !passport.isLoggedIn) {
      if (loginButton) loginButton.style.display = "block";
    }

    if (passport.isLoggedIn) {
      if (loginButton) loginButton.style.display = "none";
      passport.showNavigation({ left: "25px", bottom: "50px" });
    }
  };

  passport.onLogin(() => {
    console.log("[Credenza] event: onLogin");
    renderLoginImageOrPassportNav();
  });
  passport.onLogout(() => {
    console.log("[Credenza] event: onLogout");
    renderLoginImageOrPassportNav();
  });
  renderLoginImageOrPassportNav();
};

// ============================================================
// DISCOUNTS
// ============================================================

export const discountsScript = (passport) => {
  const apiUrl = "https://api.testnets.credenza.online";

  const validateRulesetWithApi = async (opts) => {
    console.log("[Credenza] validateRuleset — rulesetId:", opts.rulesetId);
    const result = await fetch(`${apiUrl}/discounts/rulesets/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${passport.accessToken}`,
      },
      body: JSON.stringify({
        ruleSetId: opts.rulesetId,
        passportId: opts.passportId,
      }),
    });
    if (!result.ok) {
      console.warn(
        "[Credenza] validateRuleset — response not ok:",
        result.status,
      );
      return;
    }
    const data = await result.json();
    console.log("[Credenza] validateRuleset — response:", data);
    return data;
  };

  const checkDiscounts = async () => {
    console.log("[Credenza] checkDiscounts — start");
    const timestamp = String(new Date().getTime());
    const providerObj = await passport.getWeb3Provider();
    const signer = await providerObj.getSigner();
    const signature = await signer.signMessage(timestamp);

    const $settings = document.querySelector("#customSettings");
    const rulesetId =
      $settings?.getAttribute("data-rulesetId") || CONFIG.discounts.rulesetId;
    console.log("[Credenza] checkDiscounts — rulesetId:", rulesetId);

    let code = null;
    if (rulesetId) {
      try {
        ({
          discount: { code },
        } = await validateRulesetWithApi({
          chainId: CONFIG.chainId,
          passportId: {
            payload: timestamp,
            sig: signature,
            chainId: CONFIG.chainId,
            scanType: "PASSPORT_ID",
          },
          rulesetId,
        }));
      } catch (e) {
        console.log(
          "[Credenza] checkDiscounts — validation error:",
          e?.message || e,
        );
      }
    }

    if (!code) code = "APESPASSPORT";
    console.log("[Credenza] checkDiscounts — applying code:", code);

    document.cookie = `discount_code=${code}; path=/`;
    fetch(`/discount/${code}`);
    await updateCart();

    const checkImg = document.getElementById("checkImg");
    if (checkImg) checkImg.style.display = "inline";
  };

  const updateCart = async (opts) => {
    const userAddress = await passport.getAddress();
    console.log("[Credenza] updateCart — address:", userAddress);
    fetch("/cart/update.js", {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ note: userAddress, ...(opts || {}) }),
    }).catch((e) => console.error("[Credenza] updateCart error:", e));
  };

  passport.onLogin(() => {
    console.log("[Credenza] discountsScript — onLogin triggered");
    checkDiscounts();
  });
  if (passport.isLoggedIn) {
    console.log(
      "[Credenza] discountsScript — already logged in, checking discounts",
    );
    checkDiscounts();
  }
};

// ============================================================
// MEMBERSHIP
// ============================================================

export const membershipScript = (passport, membershipPackage) => {
  const checkMembership = async () => {
    const address = await passport.getAddress();
    console.log(
      "[Credenza] checkMembership — address:",
      address,
      "package:",
      membershipPackage,
    );
    const { meta, isMember } = await passport.checkMembership(
      address,
      membershipPackage,
    );
    console.log(
      "[Credenza] checkMembership — isMember:",
      isMember,
      "meta:",
      meta,
    );
    if (!meta) return;

    document.cookie = `discount_code=${meta}; path=/`;
    fetch(`/discount/${meta}`);
    await updateCart();
  };

  const updateCart = async (opts) => {
    const userAddress = await passport.getAddress();
    console.log("[Credenza] membership updateCart — address:", userAddress);
    fetch("/cart/update.js", {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ note: userAddress, ...(opts || {}) }),
    }).catch((e) => console.error("[Credenza] updateCart error:", e));
  };

  passport.on("LOGIN", () => {
    console.log("[Credenza] membershipScript — LOGIN triggered");
    checkMembership();
  });
  if (passport.isLoggedIn) {
    console.log(
      "[Credenza] membershipScript — already logged in, checking membership",
    );
    checkMembership();
  }
};

// ============================================================
// ERC-1155 NFT CHECK
// ============================================================

const checkNftOwnership = async (passport, nftConfig) => {
  try {
    const address = await passport.getAddress();
    console.log(
      "[Credenza] checkNftOwnership — address:",
      address,
      "contract:",
      nftConfig.contractAddress,
      "tokenId:",
      nftConfig.tokenId,
    );
    const provider = await passport.getWeb3Provider();
    const abi = [
      "function balanceOf(address account, uint256 id) view returns (uint256)",
    ];
    const contract = new ethers.Contract(
      nftConfig.contractAddress,
      abi,
      provider,
    );
    const balance = await contract.balanceOf(address, nftConfig.tokenId);
    console.log("[Credenza] checkNftOwnership — balance:", balance.toString());
    return balance.gt(0);
  } catch (e) {
    console.error("[Credenza] checkNftOwnership failed:", e?.message || e);
    return false;
  }
};

// ============================================================
// HIDDEN COLLECTION MODAL
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
      } catch (e) {
        btn.textContent = "Error";
        console.error("[Credenza] addToCart error:", e);
      }
    });
  });
};

export const hiddenCollectionScript = async (passport, config) => {
  const check = async () => {
    console.log("[Credenza] hiddenCollection — checking NFT ownership");
    const hasNft = await checkNftOwnership(passport, config.nft);
    if (!hasNft) {
      console.log("[Credenza] hiddenCollection — no NFT, skipping");
      return;
    }

    console.log(
      "[Credenza] hiddenCollection — fetching collection:",
      config.collectionHandle,
    );
    try {
      const res = await fetch(
        `/collections/${config.collectionHandle}/products.json`,
      );
      const { products } = await res.json();
      console.log(
        "[Credenza] hiddenCollection — products fetched:",
        products.length,
      );
      const mapped = products.map((p) => ({
        title: p.title,
        image: p.images[0]?.src,
        price: p.variants[0]?.price,
        variantId: p.variants[0]?.id,
      }));
      if (mapped.length) showModal(mapped);
    } catch (e) {
      console.error("[Credenza] hiddenCollection fetch error:", e);
    }
  };

  passport.on("LOGIN", () => {
    console.log("[Credenza] hiddenCollectionScript — LOGIN triggered");
    check();
  });
  if (passport.isLoggedIn) {
    console.log(
      "[Credenza] hiddenCollectionScript — already logged in, checking",
    );
    check();
  }
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
    console.log("[Credenza] discounts enabled");
    discountsScript(passport);
  }

  if (config.membership?.enabled) {
    console.log("[Credenza] membership enabled");
    membershipScript(passport, config.membership.package);
  }

  if (config.hiddenCollection?.enabled) {
    console.log("[Credenza] hiddenCollection enabled");
    hiddenCollectionScript(passport, config.hiddenCollection);
  }
};
