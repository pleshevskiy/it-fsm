import { StateMachineBuilder } from "../fsm.ts";

const [locked, unlocked] = ["locked", "unlocked"] as const;

const smbTurnstile = new StateMachineBuilder()
  .withStates([locked, unlocked])
  .withTransitions([
    [locked, { coin: unlocked }],
    [unlocked, { push: locked }],
  ]);

async function main() {
  const sm = smbTurnstile.build(locked);

  function logCurrentState() {
    console.log('current state', JSON.stringify(sm.currentState.name))
  }

  logCurrentState()
  await sm.trigger('coin', {})
  logCurrentState()
  await sm.trigger('push', {})
  logCurrentState()
  await sm.trigger('push', {})
  logCurrentState()
}

if (import.meta.main) {
  main();
}
