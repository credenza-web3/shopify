const CHAIND_ID = '80001';

const $clientIdContainer = document.querySelector(`#credenza-client-id`);
const clientId = $clientIdContainer?.getAttribute("data-credenza-client-id");

window.passport = new window.CredenzaPassport({
  env: "staging",
  chainId: CHAIND_ID,
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

export const initPassport = async () => {
  await passport.init();
  return passport;
};