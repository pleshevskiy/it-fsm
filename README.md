# IT FSM

[![ci](https://github.com/icetemple/it-fsm/actions/workflows/ci.yml/badge.svg)](https://github.com/icetemple/it-fsm/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/icetemple/it-fsm/badge.svg?branch=master)](https://coveralls.io/github/icetemple/it-fsm?branch=master)

Simple full-featured finite state machine for your project

### Why it-fsm?

- 🚯 333 LOC - 0 dependencies
- 🍒 Sophisticated object-oriented design


### Getting started

```ts
import { StateMachineBuilder } from "it-fsm";

const [locked, unlocked] = ['locked', 'unlocked'] as const;

const sm = new StateMachineBuilder()
  .withStates([locked, unlocked])
  .withTransitions([
    [locked, { coin: unlocked }],
    [unlocked, { push: locked }],
  ])
  .build(locked);
```

or with deno

```ts
import { StateMachineBuilder } from "https://raw.githubusercontent.com/icetemple/it-fsm/master/fsm.ts";

// ...
```

You can find the full example in the examples folder.

### Install

If you want to use it in Node.js or the browser, you may need to install it as follows

`npm install --save it-fsm`
