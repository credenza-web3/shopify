export const discountsScript = (passport) => {
  const validateRulesetWithApi = async (opts) => {
    const apiUrl = `https://api.testnets.credenza.online`
    const result = await fetch(`${apiUrl}/discounts/rulesets/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${passport.accessToken}`
      },
      body: JSON.stringify({
        ruleSetId: opts.rulesetId,
        passportId: opts.passportId
      })
    })
    if (!result.ok) return;
    return await result.json()
  }
  
  const checkDiscounts = async () => {
    const timestamp = String(new Date().getTime())
    const providerObj = await passport.getWeb3Provider()
    const signer = await providerObj.getSigner()
    const signature = await signer.signMessage(timestamp)
    
    const $rulesetIdContainer = document.querySelector(`#credenza-ruleset-id`);
    const rulesetId = $rulesetIdContainer?.getAttribute("data-credenza-ruleset-id");

    const $defaultCodeContainer = document.querySelector(`#credenza-default-code`);
    const defaultCode = $defaultCodeContainer?.getAttribute("data-credenza-default-code") || "";
    
    let code = null;
    if (rulesetId) {
      try {
        ({ discount: { code } } = await validateRulesetWithApi({ 
          chainId: passport.chainId, 
          passportId: { date: timestamp, sig: signature, chainId: passport.chainId, scanType: "PASSPORT_ID" } ,
          rulesetId: rulesetId
        }))
      } catch (e) {
        console.log('validation ruleset error: ', e?.message || e)
      }
      
    }
    console.log(code);
    // set default code if no code is returned from the ruleset
    if (!code) {
      code = defaultCode
    }
      
    document.cookie = `discount_code=${code}; path=/`;
    fetch(`/discount/${code}`)
  
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
    checkDiscounts();
  })
  
  if (passport.isLoggedIn){
    checkDiscounts();
  }
}
