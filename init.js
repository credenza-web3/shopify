const CHAIND_ID = '80001';
window.passport = new window.CredenzaPassport({
  env: 'staging',
  chainId: CHAIND_ID,
  config: {
    metamask: {
      disabled: true,
    },
    magic: {
      disabled: false,
    },
  },
});

export const initPassport = async () => {
  await passport.init();
  return passport;
};
