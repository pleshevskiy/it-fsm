# Examples

## Turnstile

An example of a simple mechanism that can be modeled by a state machine is a
turnstile. A turnstile, used to control access to subways and amusement park
rides, is a gate with three rotating arms at waist height, one across the
entryway. Initially the arms are locked, blocking the entry, preventing patrons
from passing through. Depositing a coin or token in a slot on the turnstile
unlocks the arms, allowing a single customer to push through. After the customer
passes through, the arms are locked again until another coin is inserted.

![Turnstile diagram](https://git.pleshevski.ru/pleshevskiy/it-fsm/src/branch/main/assets/turnstile.svg)

```sh
deno run ./examples/turnstile.ts
```
