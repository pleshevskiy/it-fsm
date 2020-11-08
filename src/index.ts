import cloneDeep from 'lodash.clonedeep';

export type Payload = Record<string, any>
export type StateType = string | number
export type ActionConfigMap = Record<string, StateType | IActionConfig>
export type ActionEvent = (event: string, fromState: StateType, toState: StateType,
                           payload: Payload) => Promise<any>


export interface IConfig {
    [key: string]: undefined | ActionEvent | ActionConfigMap;
    onEnter?: ActionEvent;
    onLeave?: ActionEvent;
}

export interface IActionConfig {
    state: StateType;
    onBeforeChange?: ActionEvent;
    onChange?: ActionEvent;
}


export class StateMachine {
    [key: string]: any;

    private _currentState: StateType;
    private _onEnter?: ActionEvent;
    private _onLeave?: ActionEvent;
    private _eventsByState = new Map<StateType, Record<string, (payload: Payload) => any>>();
    private _statesByState = new Map<StateType, StateType[]>();

    constructor(initial: StateType, config: IConfig) {
        this._currentState = initial;

        for (let fromStateKey in config) {
            if (['onEnter', 'onLeave'].includes(fromStateKey)) {
                this._onEnter = config.onEnter;
                continue
            }

            const fromState: StateType = /^\d+$/.test(fromStateKey) ?
                parseInt(fromStateKey, 10)
                : fromStateKey;

            const statesOfState: StateType[] = [];

            let actions = config[fromStateKey] as ActionConfigMap;
            for (let actionName in actions) {
                let action = actions[actionName];
                let actionConfig: IActionConfig = action.constructor === Object ?
                    action as IActionConfig
                    : { state: action as StateType };

                statesOfState.push(actionConfig.state);
                this._statesByState.set(fromState, statesOfState);

                this._initChangeState(actionName, fromState, actionConfig.state, actionConfig);
            }
        }
    }


    private _initChangeState(eventName: string, fromState: StateType, toState: StateType, actionConfig: IActionConfig): void {
        const { onBeforeChange, onChange } = actionConfig;
        const _runEvent = async (method?: ActionEvent, payload: Payload = {}): Promise<void> => {
            if (method) {
                await method(eventName, fromState, toState, payload);
            }
        };

        const events = this._eventsByState.get(fromState) ?? {};
        events[eventName] = async (sourcePayload: Payload = {}) => {
            const payload = cloneDeep(sourcePayload);
            await _runEvent(this._onEnter, payload);
            await _runEvent(onBeforeChange, payload);
            this._currentState = toState;
            await _runEvent(onChange, payload);
            await _runEvent(this._onLeave, payload);

            return this;
        };

        this._eventsByState.set(fromState, events);

        if (!this[eventName]) {
            this[eventName] = async (payload: Payload = {}) => {
                const events = this._eventsByState.get(this._currentState);
                if (events && events[eventName]) {
                    return events[eventName](payload);
                }
            }
        }
    }

    public getCurrentState(): StateType {
        return this._currentState;
    }

    public can(eventName: string): boolean {
        return this.getAvailableActions().includes(eventName);
    }

    public canToState(stateName: StateType) {
        return this.getAvailableStates().includes(stateName);
    }

    public getAvailableStates(): StateType[] {
        return this._statesByState.get(this._currentState) ?? []
    }

    public getAvailableActions(): string[] {
        return Object.keys(this._eventsByState.get(this._currentState) ?? {});
    }
}
