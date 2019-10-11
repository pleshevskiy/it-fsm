

export type Payload = Record<string, any>
export type SystemEvent = (event: string, fromState: string, toState: string,
                           payload: Payload) => Promise<any>


export interface StateEvents {
    [key: string]: string
}



export class StateMachine {
    [key: string]: any;

    private _currentState: string;
    private _onEnter: SystemEvent;
    private _eventsByState: Record<string, Record<string, (payload: Payload) => any>> = {};
    private _statesByState: Record<string, string[]> = {};

    constructor(initial: string, config: Record<string, StateEvents | SystemEvent>) {
        this._currentState = initial;

        for (let fromState in config) {
            if (fromState === 'onEnter') {
                this._onEnter = config.onEnter as SystemEvent;
                continue
            }

            this._statesByState[fromState] = [];

            let events = config[fromState] as StateEvents;
            for (let eventName in events) {
                let toState: string = events[eventName];
                this._statesByState[fromState].push(toState);
                this._initChangeState(eventName, fromState, toState)
            }
        }
    }

    private _initChangeState(eventName: string, fromState: string, toState: string): void {
        if (!this._eventsByState[fromState]) {
            this._eventsByState[fromState] = {};
        }

        this._eventsByState[fromState][eventName] = async (payload: Payload = {}) => {
            if (this._currentState !== fromState) {
                return;
            }

            await this._onEnter(eventName, fromState, toState, payload);
            this._currentState = toState;
            return this;
        };

        if (!this[eventName]) {
            this[eventName] = async (payload: Payload = {}) => {
                if (this._eventsByState[this._currentState]
                    && this._eventsByState[this._currentState][eventName]) {
                    return this._eventsByState[this._currentState][eventName](payload);
                }
            }
        }
    }

    public getCurrentState(): string {
        return this._currentState;
    }

    public can(eventName: string): boolean {
        const events = this._eventsByState[this._currentState];
        if (!events) {
            return false;
        }

        return Object.keys(events).includes(eventName);
    }

    public canToState(stateName: string) {
        const states = this._statesByState[this._currentState];
        if (!states) {
            return false;
        }

        return states.includes(stateName);
    }
}
