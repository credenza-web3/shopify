const $clientIdContainer = document.querySelector(`#credenza-client-id`);
const clientId = $clientIdContainer?.getAttribute("data-credenza-client-id");

const DEFAULT_CHAIN_ID = '137';

export const initPassport = async (chainId = DEFAULT_CHAIN_ID) => {
  if (!chainId.trim()) chainId = DEFAULT_CHAIN_ID;
  console.log('Passport is initiated on chain id: ', chainId)
  window.passport = new window.CredenzaPassport({
    chainId,
    clientId,
    config: {
      auth: {
        credentials: false,
        email: true,
        phone: false,
        metamask: false,
        google: false,
        ticketmaster: false,
      }
    },
  });

  await passport.init();
  return passport;
};