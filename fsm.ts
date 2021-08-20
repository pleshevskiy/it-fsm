type StateTransitions<Context> = WeakMap<
  State<Context>,
  WeakSet<State<Context>>
>;

type StateName = string;
type StateOrName<Context> = State<Context> | StateName;

export const _states = Symbol("states");
export const _stateTransitions = Symbol("state transitions");
export const _prevState = Symbol("previous state");
export const _currState = Symbol("current state");

export class StateMachineBuilder<Context> {
  [_states]: Map<StateName, Actions<Context>>;

  [_stateTransitions]: Array<[StateName, Array<StateName>]> | undefined;

  constructor() {
    this[_states] = new Map();
  }

  withTransitions(transitions: Array<[StateName, Array<StateName>]>) {
    this[_stateTransitions] = transitions;
    return this;
  }

  withStates(names: StateName[], actions?: Actions<Context>) {
    names.forEach((name) => this.addStateUnchecked(name, actions));
    return this;
  }

  withState(name: StateName, actions?: Actions<Context>) {
    this.addStateUnchecked(name, actions);
    return this;
  }

  private addStateUnchecked(name: StateName, actions?: Actions<Context>) {
    const oldActions = this[_states].get(name);
    return this[_states].set(name, { ...oldActions, ...actions });
  }

  build(currentStateName: StateName) {
    const states = this.buildStates();
    const transitions = this.buildTransitions(states);
    const currState = validStateFromName(states, currentStateName);
    return new StateMachine(states, transitions, currState);
  }

  private buildStates() {
    return Array.from(this[_states].entries()).map((params) =>
      new State(...params)
    );
  }

  private buildTransitions(states: State<Context>[]) {
    const sourceTransitions = this[_stateTransitions] || [];

    return new WeakMap(
      sourceTransitions.map(([from, toStates]) => [
        validStateFromName(states, from),
        new WeakSet(toStates.map(validStateFromName.bind(null, states))),
      ]),
    );
  }
}

export class StateMachine<Context> {
  [_states]: State<Context>[];

  [_stateTransitions]: StateTransitions<Context>;

  [_prevState]: State<Context> | undefined;

  [_currState]: State<Context>;

  constructor(
    states: State<Context>[],
    transitions: StateTransitions<Context>,
    currentState: State<Context>,
  ) {
    this[_states] = states;
    this[_stateTransitions] = transitions;
    this[_currState] = currentState;
  }

  async changeState(sourceState: StateOrName<Context>, context?: Context) {
    const fromState = validState(this[_currState]);
    const toState = validNormalizedState(this[_states], sourceState);

    if (
      !this.hasTransition(toState) ||
      !fromState.exit(fromState, toState, context)
    ) {
      throw new FsmError(
        `cannot change state from "${fromState.name}" to "${toState.name}"`,
      );
    }

    await toState.entry(fromState, toState, context);

    this[_currState] = toState;
    this[_prevState] = fromState;
  }

  hasTransition(to: StateOrName<Context>) {
    return hasTransition(
      this[_stateTransitions],
      this[_currState],
      validNormalizedState(this[_states], to),
    );
  }

  allowedTransitionStates() {
    const fromState = validState(this[_currState]);
    return this[_states].filter(
      hasTransition.bind(null, this[_stateTransitions], fromState),
    );
  }
}

const _stateName = Symbol("state name");
const _stateActions = Symbol("state actions");

interface Actions<Context> {
  beforeExit?(
    fromState: State<Context>,
    toState: State<Context>,
    context?: Context,
  ): boolean;
  onEntry?(
    fromState: State<Context>,
    toState: State<Context>,
    context?: Context,
  ): Promise<void> | void;
}

export class State<Context> {
  [_stateActions]: Actions<Context>;

  [_stateName]: StateName;

  get name(): StateName {
    return this[_stateName];
  }

  constructor(name: StateName, actions: Actions<Context> = {}) {
    this[_stateName] = name;
    this[_stateActions] = actions;
  }

  async entry(
    fromState: State<Context>,
    toState: State<Context>,
    context?: Context,
  ) {
    const action = this[_stateActions].onEntry;
    if (isFn(action)) {
      await action(fromState, toState, context);
    }
  }

  exit(fromState: State<Context>, toState: State<Context>, context: Context) {
    const action = this[_stateActions].beforeExit;
    return isFn(action) ? action(fromState, toState, context) : true;
  }

  toString() {
    return this.name;
  }

  toJSON() {
    return this.toString();
  }
}

function validNormalizedState<Context>(
  states: State<Context>[],
  state: StateOrName<Context>,
) {
  return validState<Context>(normalizeState(states, state));
}

function normalizeState<Context>(
  states: State<Context>[],
  state: StateOrName<Context>,
): State<Context> | undefined {
  return isStr(state) ? stateFromName(states, state) : state;
}

function validStateFromName<Context>(
  states: State<Context>[],
  name: StateName,
) {
  return validState<Context>(stateFromName(states, name));
}

function stateFromName<Context>(states: State<Context>[], name: StateName) {
  return states.find((state) => state.name === name);
}

function validState<Context>(val: unknown): State<Context> {
  if (!isState<Context>(val)) {
    throw new TypeError("an instance of State class is expected");
  }
  return val;
}

function isState<Context>(val: unknown): val is State<Context> {
  return val instanceof State;
}

function hasTransition<Context>(
  transitions: StateTransitions<Context>,
  from: State<Context>,
  to: State<Context>,
) {
  return transitions.get(from)?.has(to) || false;
}

function isStr(val: unknown): val is string {
  return typeof val === "string";
}

// deno-lint-ignore ban-types
function isFn(val: unknown): val is Function {
  return typeof val === "function";
}

export class FsmError extends Error {}
