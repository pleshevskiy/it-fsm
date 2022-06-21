# IT FSM

[![ci](https://github.com/icetemple/it-fsm/actions/workflows/ci.yml/badge.svg)](https://github.com/icetemple/it-fsm/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/icetemple/it-fsm/badge.svg?branch=master)](https://coveralls.io/github/icetemple/it-fsm?branch=master)

Simple full-featured finite state machine for your project

# Why it-fsm?

- 🚯 333 LOC - 0 dependencies
- 🍒 Sophisticated object-oriented design

# Getting started

```ts
import { StateMachineBuilder } from "it-fsm";

const [locked, unlocked] = ["locked", "unlocked"] as const;

const sm = new StateMachineBuilder()
  .withStates([locked, unlocked])
  .withTransitions([
    [locked, { coin: unlocked }],
    [unlocked, { push: locked }],
  ])
  .build(locked);
```

You can find the full example in the [examples](./examples/) folder.

# Installation

if you use the [Deno](https://deno.land), just add following to your
`import_map.json`

```json
{
  "imports": {
    "it-fsm": "https://git.pleshevski.ru/pleshevskiy/it-fsm/src/commit/c182728810e9fabcb6bb2b3091bbeabf439bef2d/fsm.ts"
  }
}
```

or you can use branch
`https://git.pleshevski.ru/pleshevskiy/paren/raw/branch/main/`

> **Note**: Use always a specific commit instead of branch

If you use the Node.js or in a browser as ES module, you may need to install it
as follows, and additionally you can add import maps for client side.

`npm install --save it-fsm`

# License

GNU General Public License v3.0 or later

See [COPYING](./COPYING) to see the full text.
