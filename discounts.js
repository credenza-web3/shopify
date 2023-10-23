const CHAIND_ID = '80001'
const passport = new window.CredenzaPassport({
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
})

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
  
  const $settings = document.querySelector(`#customSettings`);
  const rulesetId = $settings?.getAttribute("data-rulesetId");
  
  let code = null;
  if (rulesetId) {
    try {
      ({ discount: { code } } = await validateRulesetWithApi({ 
        chainId: CHAIND_ID, 
        passportId: { payload: timestamp, sig: signature, chainId: CHAIND_ID, scanType: "PASSPORT_ID" } ,
        rulesetId: rulesetId
      }))
    } catch (e) {
      console.log('validation ruleset error: ', e?.message || e)
    }
    
  }
  console.log(code);
  // set default code if no code is returned from the ruleset
  if (!code) {
    code = 'APESPASSPORT'
  }
    
  document.cookie = `discount_code=${code}; path=/`;
  fetch(`/discount/${code}`)

  await updateCart()

  const checkImg = document.getElementById('checkImg');
  checkImg.style.display="inline"
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


(async () => {
  await passport.init();

  passport.onLogin(({provider, opts}) => {
    console.log('logged in & checking')
    checkDiscounts();
  })

  if (passport.isLoggedIn){
    checkDiscounts();
  }
})();
