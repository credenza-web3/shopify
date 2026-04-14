## usage

```
<script type="module">
  import { initPassport, credenzaShopify, showNavScript } from 'https://cdn.jsdelivr.net/gh/credenza-web3/shopify/init.js';

  initPassport().then((passport) => {
    showNavScript(passport);
    credenzaShopify(passport);
  });
</script>
```
