type StateTransitions<Context, StateName extends string> = WeakMap<
  State<Context, StateName>,
  WeakSet<State<Context, StateName>>
>;

type StateOrName<Context, StateName extends string> =
  | State<Context, StateName>
  | StateName;

export const _states = Symbol("states");
export const _stateTransitions = Symbol("state transitions");
export const _prevState = Symbol("previous state");
export const _currState = Symbol("current state");

export class StateMachineBuilder<Context, StateName extends string = string> {
  [_states]: Map<StateName, Events<Context, StateName>>;

  [_stateTransitions]: Array<[StateName, Array<StateName>]> | undefined;

  constructor() {
    this[_states] = new Map();
  }

  withTransitions(transitions: Array<[StateName, Array<StateName>]>) {
    this[_stateTransitions] = transitions;
    return this;
  }

  withStates(names: StateName[], actions?: Events<Context, StateName>) {
    names.forEach((name) => this.addStateUnchecked(name, actions));
    return this;
  }

  withState(name: StateName, actions?: Events<Context, StateName>) {
    this.addStateUnchecked(name, actions);
    return this;
  }

  private addStateUnchecked(
    name: StateName,
    actions?: Events<Context, StateName>,
  ) {
    const oldActions = this[_states].get(name);
    return this[_states].set(name, { ...oldActions, ...actions });
  }

  build(currentStateName: StateName) {
    const states = this.buildStates();
    const transitions = this.buildTransitions(states);
    const currState = validStateFromName(states, currentStateName);
    return new StateMachine<Context, StateName>(states, transitions, currState);
  }

  private buildStates() {
    return Array.from(this[_states].entries()).map((params) =>
      new State(...params)
    );
  }

  private buildTransitions(states: State<Context, StateName>[]) {
    const sourceTransitions = this[_stateTransitions] || [];

    return new WeakMap(
      sourceTransitions.map(([from, toStates]) => [
        validStateFromName(states, from),
        new WeakSet(toStates.map(validStateFromName.bind(null, states))),
      ]),
    );
  }
}

export class StateMachine<Context, StateName extends string = string> {
  [_states]: State<Context, StateName>[];

  [_stateTransitions]: StateTransitions<Context, StateName>;

  [_prevState]: State<Context, StateName> | undefined;

  [_currState]: State<Context, StateName>;

  constructor(
    states: State<Context, StateName>[],
    transitions: StateTransitions<Context, StateName>,
    currentState: State<Context, StateName>,
  ) {
    this[_states] = states;
    this[_stateTransitions] = transitions;
    this[_currState] = currentState;
  }

  async tryChangeState(
    state: StateOrName<Context, StateName>,
    context: Context,
  ) {
    const fromState = validState<Context, StateName>(this[_currState]);
    const toState = validNormalizedState(this[_states], state);

    if (
      !this.hasTransition(toState) ||
      !fromState.exit(fromState, toState, context)
    ) {
      throw new FsmError(
        `cannot change state from "${fromState.name}" to "${toState.name}"`,
      );
    }

    await toState.entry(fromState, toState, context);

    this[_prevState] = fromState;
    this[_currState] = toState;

    return this[_currState];
  }

  maybeChangeState(state: StateOrName<Context, StateName>, context: Context) {
    return this.tryChangeState(state, context).catch(() => null);
  }

  hasTransition(to: StateOrName<Context, StateName>) {
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

  allowedTransitionStateNames() {
    return this.allowedTransitionStates().map(String);
  }
}

const _stateName = Symbol("state name");
const _stateEvents = Symbol("state events");

interface Events<Context, StateName extends string> {
  beforeExit?(
    fromState: State<Context, StateName>,
    toState: State<Context, StateName>,
    context: Context,
  ): boolean;
  onEntry?(
    fromState: State<Context, StateName>,
    toState: State<Context, StateName>,
    context: Context,
  ): Promise<void> | void;
}

export class State<Context, StateName extends string = string> {
  [_stateEvents]: Events<Context, StateName>;

  [_stateName]: StateName;

  get name(): StateName {
    return this[_stateName];
  }

  constructor(name: StateName, events: Events<Context, StateName> = {}) {
    this[_stateName] = name;
    this[_stateEvents] = events;
  }

  async entry(
    fromState: State<Context, StateName>,
    toState: State<Context, StateName>,
    context: Context,
  ) {
    const event = this[_stateEvents].onEntry;
    if (isFn(event)) {
      await event(fromState, toState, context);
    }
  }

  exit(
    fromState: State<Context, StateName>,
    toState: State<Context, StateName>,
    context: Context,
  ) {
    const event = this[_stateEvents].beforeExit;
    return isFn(event) ? event(fromState, toState, context) : true;
  }

  toString() {
    return this.name;
  }

  toJSON() {
    return this.toString();
  }
}

function validNormalizedState<Context, StateName extends string>(
  states: State<Context, StateName>[],
  state: StateOrName<Context, StateName>,
) {
  return validState<Context, StateName>(normalizeState(states, state));
}

function normalizeState<Context, StateName extends string>(
  states: State<Context, StateName>[],
  state: StateOrName<Context, StateName>,
): State<Context, StateName> | undefined {
  return isStr(state) ? stateFromName(states, state) : state;
}

function validStateFromName<Context, StateName extends string>(
  states: State<Context, StateName>[],
  name: StateName,
) {
  return validState<Context, StateName>(stateFromName(states, name));
}

function stateFromName<Context, StateName extends string>(
  states: State<Context, StateName>[],
  name: StateName,
) {
  return states.find((state) => state.name === name);
}

function validState<Context, StateName extends string>(
  val: unknown,
): State<Context, StateName> {
  if (!isState<Context, StateName>(val)) {
    throw new TypeError("an instance of State class is expected");
  }
  return val;
}

function isState<Context, StateName extends string>(
  val: unknown,
): val is State<Context, StateName> {
  return val instanceof State;
}

function hasTransition<Context, StateName extends string>(
  transitions: StateTransitions<Context, StateName>,
  from: State<Context, StateName>,
  to: State<Context, StateName>,
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
