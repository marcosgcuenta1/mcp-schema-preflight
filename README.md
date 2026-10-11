# MCP Schema Preflight

A small local checker for a `tools/list` JSON result or JSON-RPC result envelope. The free browser demo and CLI inspect object roots, flag unusual root property names for review, report root composition, and measure compact JSON characters and UTF-8 bytes. Root `anyOf`/`oneOf` are information, not errors. Inputs are limited to 1 MiB and 200 tools.

This is limited static analysis: it does not connect to servers, resolve remote references, inspect nested property names, fully validate JSON Schema, or prove MCP client compatibility. Unusual names are conservative warnings, not universally invalid. A `nextCursor` means only the supplied page was checked. There are no automatic repairs or external dependencies.

[Open the free demo](https://marcosgcuenta1.itch.io/mcp-schema-preflight), or download this repository and open `index.html` directly in a desktop browser. Input stays local; the demo makes no network requests. Use only data you are permitted to process or share.

With Node.js 18 or newer, without installing packages:

```sh
node tests.js
node cli.js fixtures/before.json
node cli.js fixtures/after.json
```

Optional report exports: `node cli.js fixtures/before.json --json report.json --html report.html`. The CLI leaves input files unchanged and can overwrite explicitly named report outputs. If you edit `core.js` or `demo-template.html`, run `node build-demo.js` to regenerate the standalone demo and artificial reports.

The artificial before/after example changes `ids[]` to `ids`, the required field, and the matching handler together. Existing regression tests preserve ID order and duplicates and reject mismatched names. These are local handler tests; callers and real target clients require separate testing. The fixtures are original examples, not customer work.

Developed and operated with AI assistance. No customer outcomes or client compatibility are claimed. Redistribution is permitted under the existing [sample licence](LICENSE.txt); preserve the licence and AI disclosure. No third-party code or data is bundled.

## Optional $29 pilot repair

One reproducible schema/handler mismatch in a public Node.js MCP repository: diagnosis, a minimal patch, verification instructions and a regression test, with one revision within the agreed scope. Scope and payment method must be agreed before work begins; no payment availability or compatibility guarantee is implied.

[Open a public scope request](https://github.com/marcosgcuenta1/mcp-schema-preflight/issues/new?template=scope-request.yml) with a public repository URL, minimal reproduction, expected and observed behavior, and a fictional or anonymized sample. Never include credentials, secrets, personal data or private repository material. Opening an issue does not accept an engagement or create a purchase, payment request or service agreement.
