export const showNavScript = async (passport) => {
  const renderLoginImageOrPassportNav = () => {
    const customerEmail = "{{ customer.email }}";
    const loginButton = document.querySelector('#login-button-image');
    if (customerEmail && !passport.isLoggedIn) {
      if (loginButton) loginButton.style.display="block";
    }

    if (passport.isLoggedIn) {
      if (loginButton) loginButton.style.display="none";
      passport.showNavigation({"left":"25px","bottom":"50px"});
    }
  } 

  passport.onLogin(() => {
    renderLoginImageOrPassportNav();
  });

  passport.onLogout(() => {
    renderLoginImageOrPassportNav();
  });

  renderLoginImageOrPassportNav();
};
