## Credenza Shopify Integration

Connects Credenza Passport to a Shopify theme. Gates discounts and hidden collections behind NFT ownership, ruleset validation, or membership checks.

---

## Setup

In `layout/theme.liquid` before `</body>`:

```html
<!-- 1. Credenza Passport -->
<script src="https://cdn.jsdelivr.net/npm/@credenza3/passport-evm/dist/passport.umd.js" defer></script>
<!-- 2. Config and init -->
<script>
  window.shopifyCustomer = { email: "{{ customer.email }}" };
  window.credenzaConfig = {
    chainId: "84532",
    clientId: "YOUR_CLIENT_ID",

    discounts: {
      enabled: false,
      defaultCode: "FALLBACK_CODE",
      gate: {
        type: "ruleset",
        rulesetId: "YOUR_RULESET_ID"
      }
    },

    hiddenCollection: {
      enabled: false,
      collectionHandle: "your-collection-handle",
      storefrontToken: "YOUR_STOREFRONT_TOKEN",
      gate: {
        type: "nft",
        contractAddress: "0x...",
        tokenId: "1"
      }
    }
  };
</script>

<script type="module">
  import { initPassport, showNavScript, credenzaShopify } from 'https://cdn.jsdelivr.net/gh/credenza-web3/shopify@v3/init.js';

  initPassport().then((passport) => {
    showNavScript(passport);
    credenzaShopify(passport);
  });
</script>
```

---

## Gate types

`gate` is used in both `discounts` and `hiddenCollection` to define who gets access.

### `type: "nft"` — ERC-1155 token ownership

```js
gate: {
  type: "nft",
  contractAddress: "0x...",
  tokenId: "1"
}
```

### `type: "ruleset"` — Credenza API validation

Returns a discount code from the ruleset response.

```js
gate: {
  type: "ruleset",
  rulesetId: "YOUR_RULESET_ID"
}
```

### `type: "membership"` — membership package check

Returns a discount code from `meta`.

```js
gate: {
  type: "membership",
  membershipPackage: "0x..."
}
```

---

## Features

### `discounts`

On login, runs the gate check. If passed — applies a discount code (from gate response or `defaultCode`) via cookie and `/discount/{code}`, then updates the cart.

```js
discounts: {
  enabled: true,
  defaultCode: "FALLBACK",  // used if gate returns no code
  gate: { type: "ruleset", rulesetId: "..." }
}
```

Supported gate types: `ruleset`, `membership`.

### `hiddenCollection`

On login, runs the gate check. If passed — fetches collection products via Shopify Storefront API and shows a modal. Modal is shown once per session.

```js
hiddenCollection: {
  enabled: true,
  collectionHandle: "members-only",
  storefrontToken: "YOUR_STOREFRONT_TOKEN",
  gate: { type: "nft", contractAddress: "0x...", tokenId: "1" }
}
```

Supported gate types: `nft`, `ruleset`, `membership`.

To hide the collection from the `/collections/` page, add to the collections loop in `sections/main-list-collections.liquid`:

```liquid
{% if collection.handle == settings.credenza_hidden_collection %}
  {% continue %}
{% endif %}
```

And add to `config/settings_schema.json`:

```json
{
  "name": "Credenza",
  "settings": [
    {
      "type": "text",
      "id": "credenza_hidden_collection",
      "label": "Hidden collection handle"
    }
  ]
}
```

-
