## usage

```
<script type="module">
  import { initPassport } from 'https://cdn.jsdelivr.net/gh/credenza-web3/shopify/init.js';
  import { showNavScript } from 'https://cdn.jsdelivr.net/gh/credenza-web3/shopify/showNavigation.js';

  initPassport().then((passport) => {
    showNavScript(passport);
  });
</script>
```

or if we want to run only discounts script

```
initPassport().then((passport) => {
  discountsScript(passport);
});
```

we can also use them both

```
initPassport().then((passport) => {
  showNavScript(passport);
  discountsScript(passport);
});
```
