# IT FSM

Simple finite state machine


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
