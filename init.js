import { showNavScript } from "./nav.js";
import { discountsScript } from "./discounts.js";
import { hiddenCollectionScript } from "./collection.js";

const CONFIG = window.credenzaConfig || {};

export const initPassport = async () => {
  window.passport = new window.CredenzaPassport({
    chainId: CONFIG.chainId,
    clientId: CONFIG.clientId,
  });
  await passport.init();
  return passport;
};

export { showNavScript };

export const credenzaShopify = (passport, config = CONFIG) => {
  if (config.discounts?.enabled) discountsScript(passport, config);
  if (config.hiddenCollection?.enabled) hiddenCollectionScript(passport, config);
};
