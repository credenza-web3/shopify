import { checkGate } from "./gate.js";

const updateCart = async (passport) => {
  const address = await passport.getAddress();
  fetch("/cart/update.js", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ note: address }),
  }).catch(() => {});
};

export const discountsScript = (passport, config) => {
  const run = async () => {
    const { allowed, code: gateCode } = await checkGate(passport, config.discounts.gate);
    if (!allowed) return;

    const code = gateCode || config.discounts.defaultCode || "";
    if (code) {
      document.cookie = `discount_code=${code}; path=/`;
      fetch(`/discount/${code}`);
    }

    await updateCart(passport);

    const checkImg = document.getElementById("checkImg");
    if (checkImg) checkImg.style.display = "inline";
  };

  passport.on("LOGIN", run);
  if (passport.isLoggedIn) run();
};
