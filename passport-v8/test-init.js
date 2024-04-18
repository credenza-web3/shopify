const $clientIdContainer = document.querySelector(`#credenza-client-id`);
const clientId = $clientIdContainer?.getAttribute("data-credenza-client-id");



export const initPassport = async (chainId = '137') => {
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