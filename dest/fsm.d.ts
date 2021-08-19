declare type StateTransitions<Context> = WeakMap<State<Context>, WeakSet<State<Context>>>;
export declare const _states: unique symbol;
export declare const _stateTransitions: unique symbol;
export declare const _prevState: unique symbol;
export declare const _currState: unique symbol;
export declare class StateMachineBuilder<Context> {
    [_states]: Map<string, Actions<Context>>;
    [_stateTransitions]: Array<[string, Array<string>]> | undefined;
    constructor();
    withTransitions(transitions: Array<[string, Array<string>]>): this;
    withStates(names: string[], actions?: Actions<Context>): this;
    withState(name: string, actions?: Actions<Context>): this;
    private addStateUnchecked;
    build(currentStateName: string): StateMachine<unknown>;
    private buildStates;
    private buildTransitions;
}
export declare class StateMachine<Context> {
    [_states]: State<Context>[];
    [_stateTransitions]: StateTransitions<Context>;
    [_prevState]: State<Context> | undefined;
    [_currState]: State<Context>;
    constructor(states: State<Context>[], transitions: StateTransitions<Context>, currentState: State<Context>);
    changeState(sourceState: string | State<Context>, context?: Context): Promise<void>;
    hasTransition(to: string | State<Context>): boolean;
    allowedTransitionStates(): State<Context>[];
}
declare const _stateName: unique symbol;
declare const _stateActions: unique symbol;
interface Actions<Context> {
    beforeExit?(fromState: State<Context>, toState: State<Context>, context: Context): boolean;
    onEntry?(fromState: State<Context>, toState: State<Context>, context: Context): Promise<void> | void;
}
export declare class State<Context> {
    [_stateActions]: Actions<Context>;
    [_stateName]: string;
    get name(): string;
    constructor(name: string, actions?: Actions<Context>);
    entry(fromState: State<Context>, toState: State<Context>, context: Context): Promise<void>;
    exit(fromState: State<Context>, toState: State<Context>, context: Context): boolean;
    toString(): string;
    toJSON(): string;
}
export declare class FsmError extends Error {
}
export {};
