export const showNavScript = (passport) => {
  const render = () => {
    const customerEmail = window.shopifyCustomer?.email;
    if (customerEmail) {
      passport.showNavigation({ left: "25px", bottom: "50px" });
    }
  };
  render();
};
