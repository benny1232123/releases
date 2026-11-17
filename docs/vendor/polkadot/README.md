# Vendored wallet libraries for the claim page

The claim page (`docs/claim.html`) loads these three files from this site, never from a CDN, so a visit sends nothing to a third party.

| File | Package | Licence |
|---|---|---|
| `bundle-polkadot-util.js` | `@polkadot/util` 14.0.3 | Apache-2.0 |
| `bundle-polkadot-util-crypto.js` | `@polkadot/util-crypto` 14.0.3 | Apache-2.0 |
| `bundle-polkadot-extension-dapp.js` | `@polkadot/extension-dapp` 0.64.1 | Apache-2.0 |

Each file is byte-for-byte the one in the npm package (`npm pack <package>@<version>`), and the same file cdn.jsdelivr.net served before. `claim.html` keeps the `integrity` (SHA-384) attribute for each, so the browser refuses a changed file:

```
bundle-polkadot-util.js            sha384-VqvFgkO/E6mXTxumDtVf6INKhwFfOH+1md0eGhXID+h/Il9BDJHk2rF7zJaKbEJa
bundle-polkadot-util-crypto.js     sha384-7+Zbf8RFroMun8ExBMXiymbq8cn5gfjfa9epqHP6X0Ex5yWA2DLrfJj4QaMJ04Qd
bundle-polkadot-extension-dapp.js  sha384-5DCC5PKTSQSr+cI2ewWZoyr23dcChpol7x82U8jaX92zyQJ3t657R3dTG61YcBmA
```

Check: `openssl dgst -sha384 -binary <file> | openssl base64 -A`. `LICENSE` is the Apache License 2.0 text shipped in all three packages.
