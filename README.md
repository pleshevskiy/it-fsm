# IT FSM

Simple finite state machine

[![Build Status](https://travis-ci.com/icetemple/npm-it-fsm.svg?branch=master)](https://travis-ci.com/icetemple/npm-it-fsm)
[![Coverage Status](https://coveralls.io/repos/github/icetemple/npm-it-fsm/badge.svg?branch=master)](https://coveralls.io/github/icetemple/npm-it-fsm?branch=master)


### Installation

`npm install --save it-fsm`



### Usage

```javascript
import { StateMachine } from 'it-fsm';

const fsm = new StateMachine('TODO', {
  TODO: {
    complete: 'COMPLETE'
  }
})


if (fsm.can('complete')) {
  fsm.complete().then(() => {
    
  })
}
// or
if (fsm.canToState('COMPLETE')) {
  fsm.complete().then(() => {
    
  });
}
```
