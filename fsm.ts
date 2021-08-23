type StateTransitions<Ctx, SN extends string> = WeakMap<
  State<Ctx, SN>,
  WeakSet<State<Ctx, SN>>
>;

type StateOrName<Ctx, SN extends string> =
  | State<Ctx, SN>
  | SN;

type SourceTransitions<SN extends string> = Array<[SN, Array<SN>]>;
type SourceNamedTransitions<SN extends string> = Array<
  [SN, Record<string, SN>]
>;
type SourceActions<SN extends string> = Record<string, Array<[SN, SN]>>;

export const _states = Symbol("states");
const _transitions = Symbol("transitions");
const _actions = Symbol("actions");
const _prevState = Symbol("previous state");
const _currState = Symbol("current state");

export class StateMachineBuilder<Ctx, SN extends string = string> {
  [_states]: Map<SN, Events<Ctx, SN>>;

  [_transitions]: SourceTransitions<SN> | undefined;

  [_actions]: SourceActions<SN> | undefined;

  constructor() {
    this[_states] = new Map();
  }

  withTransitions(
    sourceTransitions: SourceTransitions<SN> | SourceNamedTransitions<SN>,
  ) {
    const [t, a] =
      (sourceTransitions as Array<[SN, Array<SN> | Record<string, SN>]>)
        .reduce(
          ([transitions, actions], [fromState, sources]) => {
            const toStates = Array.isArray(sources)
              ? sources
              : Object.values(sources);
            transitions.push([fromState, toStates]);

            if (!Array.isArray(sources)) {
              Object.entries(sources).forEach(([actionName, toState]) => {
                const actionTransitions = actions[actionName] || [];
                actions[actionName] = [
                  ...actionTransitions,
                  [fromState, toState],
                ];
              });
            }

            return [transitions, actions];
          },
          [[], {}] as [SourceTransitions<SN>, SourceActions<SN>],
        );

    this[_transitions] = t;
    this[_actions] = a;
    return this;
  }

  withStates(names: SN[], actions?: Events<Ctx, SN>) {
    names.forEach((name) => this.addStateUnchecked(name, actions));
    return this;
  }

  withState(name: SN, actions?: Events<Ctx, SN>) {
    this.addStateUnchecked(name, actions);
    return this;
  }

  private addStateUnchecked(
    name: SN,
    actions?: Events<Ctx, SN>,
  ) {
    const oldActions = this[_states].get(name);
    return this[_states].set(name, { ...oldActions, ...actions });
  }

  build(currentStateName: SN) {
    const states = this.buildStates();
    const transitions = this.buildTransitions(states);
    const actions = this.buildActions(states);
    const currState = validStateFromName(states, currentStateName);
    return new StateMachine<Ctx, SN>(currState, states, {
      transitions,
      actions,
    });
  }

  private buildStates() {
    return Array.from(this[_states].entries())
      .map((params) => new State(...params));
  }

  private buildTransitions(states: State<Ctx, SN>[]) {
    const sourceTransitions = this[_transitions];
    if (!sourceTransitions) return undefined;

    return new WeakMap(
      sourceTransitions.map(([from, toStates]) => [
        validStateFromName(states, from),
        new WeakSet(toStates.map(validStateFromName.bind(null, states))),
      ]),
    );
  }

  private buildActions(states: State<Ctx, SN>[]): Actions<Ctx, SN> | undefined {
    const actions = this[_actions];
    if (!actions) return undefined;
    return new Map(
      Object.entries(actions).map(([actionName, variants]) => [
        actionName,
        variants.map(([fromState, toState]) => [
          validStateFromName(states, fromState),
          validStateFromName(states, toState),
        ]),
      ]),
    );
  }
}

interface StateMachineOpts<Ctx, SN extends string> {
  transitions?: StateTransitions<Ctx, SN>;
  actions?: Actions<Ctx, SN>;
}

type Actions<Ctx, SN extends string> = Map<
  string,
  Array<[State<Ctx, SN>, State<Ctx, SN>]>
>;

export class StateMachine<Ctx, SN extends string = string> {
  [_states]: State<Ctx, SN>[];

  [_transitions]: StateTransitions<Ctx, SN>;

  [_actions]: Actions<Ctx, SN>;

  [_prevState]: State<Ctx, SN> | undefined;

  [_currState]: State<Ctx, SN>;

  get currentState() {
    return this[_currState];
  }

  constructor(
    currentState: State<Ctx, SN>,
    states: State<Ctx, SN>[],
    { transitions, actions }: StateMachineOpts<Ctx, SN>,
  ) {
    this[_currState] = currentState;
    this[_states] = states;
    this[_transitions] = transitions || new Map();
    this[_actions] = actions || new Map();
  }

  async tryChangeState(
    state: StateOrName<Ctx, SN>,
    context: Ctx,
  ) {
    const fromState = validState<Ctx, SN>(this.currentState);
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

  maybeChangeState(state: StateOrName<Ctx, SN>, context: Ctx) {
    return this.tryChangeState(state, context).catch(() => null);
  }

  hasTransition(to: StateOrName<Ctx, SN>) {
    return hasTransition(
      this[_transitions],
      this[_currState],
      validNormalizedState(this[_states], to),
    );
  }

  allowedTransitionStates() {
    return this[_states].filter(
      hasTransition.bind(null, this[_transitions], this[_currState]),
    );
  }

  allowedTransitionStateNames() {
    return this.allowedTransitionStates().map(String);
  }

  trigger(actionName: string, context: Ctx) {
    const currState = this[_currState];

    const variants = this[_actions]?.get(actionName);
    if (!variants) return currState;

    const [, toState] =
      variants.find(([fromState]) => fromState === currState) || [];
    if (!toState) return currState;

    return this.tryChangeState(toState, context);
  }
}

const _stateName = Symbol("state name");
const _stateEvents = Symbol("state events");

interface Events<Ctx, SN extends string> {
  beforeExit?(
    fromState: State<Ctx, SN>,
    toState: State<Ctx, SN>,
    context: Ctx,
  ): boolean;
  onEntry?(
    fromState: State<Ctx, SN>,
    toState: State<Ctx, SN>,
    context: Ctx,
  ): Promise<void> | void;
}

export class State<Ctx, SN extends string = string> {
  [_stateEvents]: Events<Ctx, SN>;

  [_stateName]: SN;

  get name(): SN {
    return this[_stateName];
  }

  constructor(name: SN, events: Events<Ctx, SN> = {}) {
    this[_stateName] = name;
    this[_stateEvents] = events;
  }

  async entry(
    fromState: State<Ctx, SN>,
    toState: State<Ctx, SN>,
    context: Ctx,
  ) {
    const event = this[_stateEvents].onEntry;
    if (isFn(event)) {
      await event(fromState, toState, context);
    }
  }

  exit(fromState: State<Ctx, SN>, toState: State<Ctx, SN>, context: Ctx) {
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

function validNormalizedState<Ctx, SN extends string>(
  states: State<Ctx, SN>[],
  state: StateOrName<Ctx, SN>,
) {
  return validState<Ctx, SN>(normalizeState(states, state));
}

function normalizeState<Ctx, SN extends string>(
  states: State<Ctx, SN>[],
  state: StateOrName<Ctx, SN>,
): State<Ctx, SN> | undefined {
  return isStr(state) ? stateFromName(states, state) : state;
}

function validStateFromName<Ctx, SN extends string>(
  states: State<Ctx, SN>[],
  name: SN,
) {
  return validState<Ctx, SN>(stateFromName(states, name));
}

function stateFromName<Ctx, SN extends string>(
  states: State<Ctx, SN>[],
  name: SN,
) {
  return states.find((state) => state.name === name);
}

function validState<Ctx, SN extends string>(val: unknown): State<Ctx, SN> {
  if (!isState<Ctx, SN>(val)) {
    throw new TypeError("an instance of State class is expected");
  }
  return val;
}

function isState<Ctx, SN extends string>(val: unknown): val is State<Ctx, SN> {
  return val instanceof State;
}

function hasTransition<Ctx, SN extends string>(
  transitions: StateTransitions<Ctx, SN>,
  from: State<Ctx, SN>,
  to: State<Ctx, SN>,
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
