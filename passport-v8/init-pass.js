const CHAIND_ID = '80001';
window.passport = new window.CredenzaPassport({
  env: "staging",
  chainId: CHAIND_ID,
  clientId: "{{ settings.credenza_client_id }}",
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