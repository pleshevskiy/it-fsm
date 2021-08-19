"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsmError = exports.State = exports.StateMachine = exports.StateMachineBuilder = exports._currState = exports._prevState = exports._stateTransitions = exports._states = void 0;
exports._states = Symbol("states");
exports._stateTransitions = Symbol("state transitions");
exports._prevState = Symbol("previous state");
exports._currState = Symbol("current state");
class StateMachineBuilder {
    constructor() {
        this[exports._states] = new Map();
    }
    withTransitions(transitions) {
        this[exports._stateTransitions] = transitions;
        return this;
    }
    withStates(names, actions) {
        names.forEach((name) => this.addStateUnchecked(name, actions));
        return this;
    }
    withState(name, actions) {
        this.addStateUnchecked(name, actions);
        return this;
    }
    addStateUnchecked(name, actions) {
        const oldActions = this[exports._states].get(name);
        return this[exports._states].set(name, Object.assign(Object.assign({}, oldActions), actions));
    }
    build(currentStateName) {
        const states = this.buildStates();
        const transitions = this.buildTransitions(states);
        const currState = validStateFromName(states, currentStateName);
        return new StateMachine(states, transitions, currState);
    }
    buildStates() {
        return Array.from(this[exports._states].entries()).map((params) => new State(...params));
    }
    buildTransitions(states) {
        const sourceTransitions = this[exports._stateTransitions] || [];
        return new WeakMap(sourceTransitions.map(([from, toStates]) => [
            validStateFromName(states, from),
            new WeakSet(toStates.map(validStateFromName.bind(null, states))),
        ]));
    }
}
exports.StateMachineBuilder = StateMachineBuilder;
class StateMachine {
    constructor(states, transitions, currentState) {
        this[exports._states] = states;
        this[exports._stateTransitions] = transitions;
        this[exports._currState] = currentState;
    }
    changeState(sourceState, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const fromState = validState(this[exports._currState]);
            const toState = validState(normalizeState(this[exports._states], sourceState));
            if (!this.hasTransition(toState) ||
                !fromState.exit(fromState, toState, context)) {
                throw new FsmError(`cannot change state from "${fromState.name}" to "${toState.name}"`);
            }
            yield toState.entry(fromState, toState, context);
            this[exports._currState] = toState;
            this[exports._prevState] = fromState;
        });
    }
    hasTransition(to) {
        return hasTransition(this[exports._stateTransitions], this[exports._currState], validState(normalizeState(this[exports._states], to)));
    }
    allowedTransitionStates() {
        const fromState = validState(this[exports._currState]);
        return this[exports._states].filter(hasTransition.bind(null, this[exports._stateTransitions], fromState));
    }
}
exports.StateMachine = StateMachine;
const _stateName = Symbol("state name");
const _stateActions = Symbol("state actions");
class State {
    constructor(name, actions = {}) {
        this[_stateName] = name;
        this[_stateActions] = actions;
    }
    get name() {
        return this[_stateName];
    }
    entry(fromState, toState, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const action = this[_stateActions].onEntry;
            if (isFn(action)) {
                yield action(fromState, toState, context);
            }
        });
    }
    exit(fromState, toState, context) {
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
exports.State = State;
function stateFromName(states, name) {
    return states.find((state) => state.name === name);
}
function validStateFromName(states, name) {
    return validState(stateFromName(states, name));
}
function normalizeState(states, state) {
    return isStr(state) ? stateFromName(states, state) : state;
}
function validState(val) {
    if (!isState(val)) {
        throw new TypeError("an instance of State class is expected");
    }
    return val;
}
function isState(val) {
    return val instanceof State;
}
function hasTransition(transitions, from, to) {
    var _a;
    return ((_a = transitions.get(from)) === null || _a === void 0 ? void 0 : _a.has(to)) || false;
}
function isStr(val) {
    return typeof val === "string";
}
// deno-lint-ignore ban-types
function isFn(val) {
    return typeof val === "function";
}
class FsmError extends Error {
}
exports.FsmError = FsmError;
