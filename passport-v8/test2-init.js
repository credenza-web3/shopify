const $clientIdContainer = document.querySelector(`#credenza-client-id`);
const clientId = $clientIdContainer?.getAttribute("data-credenza-client-id");

const DEFAULT_CHAIN_ID = '137';

export const initPassport = async (chainId = DEFAULT_CHAIN_ID) => {
  console.log(chainId, chainId.trim())
  if (!chainId.trim()) chainId = DEFAULT_CHAIN_ID;
  console.log(chainId)
  console.log('Passport is initiated on chain id: ', chainId)
  window.passport = new window.CredenzaPassport({
    env: "staging",
    chainId,
    clientId,
    config: {
      auth: {
        metamask: false,
        google: false,
        ticketmaster: false,
        passwordless: false
      }
    },
  });

  await passport.init();
  return passport;
};