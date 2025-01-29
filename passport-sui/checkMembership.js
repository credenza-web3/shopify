export const membershipScript = (passport, membershipPackage) => {
  const checkMembership = async () => {
    let { meta, isMember } = await passport.checkMembership(await passport.getAddress(), membershipPackage);
    if(!meta) return
    document.cookie = `discount_code=${meta}; path=/`;
    fetch(`/discount/${meta}`)
  
    await updateCart()
  }
  
  const updateCart = async (opts) => {
    const userAddress = await passport.getAddress()
  
    const params = {
      method: "post",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      //make sure to serialize your JSON body
      body: JSON.stringify({
        'note': userAddress,
        ...(opts ? opts : {})
      })
    }
  
    fetch('/cart/update.js', params).then(response => {
      console.log(response.body)
    })
    .catch((error) => {
      console.error('Error:', error);
    });
  }
  
  passport.on("LOGIN", () => {
    console.log('logged in & checking')
    checkMembership();
  })
  
  if (passport.isLoggedIn){
    checkMembership();
  }
}