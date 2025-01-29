export const init = async (clientId) => {
  window.passport = new window.CredenzaPassport({
   suiNetwork: "mainnet",
    clientId,
    config: {
      auth: {
        credentials: true,
        email: false,
        phone: false,
        metamask: false,
        google: false,
        ticketmaster: false,
        zk: false
      }
    },
  });
  
  await passport.init();
  return passport;
};