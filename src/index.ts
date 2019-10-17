

export type Payload = Record<string, any>
export type StateType = string | number
export type ActionConfigMap = Record<string, StateType | IActionConfig>
export type ActionEvent = (event: string, fromState: string, toState: string,
                           payload: Payload) => Promise<any>


export interface IConfig {
    [key: string]: ActionEvent | ActionConfigMap
    onEnter: ActionEvent
    onLeave: ActionEvent
}

export interface IActionConfig {
    state: StateType
    onBeforeChange?: ActionEvent
    onChange?: ActionEvent
}


export class StateMachine {
    [key: string]: any;

    private _currentState: string;
    private _onEnter: ActionEvent;
    private _onLeave: ActionEvent;
    private _eventsByState: Record<string, Record<string, (payload: Payload) => any>> = {};
    private _statesByState: Record<string, string[]> = {};

    constructor(initial: StateType, config: IConfig) {
        this._currentState = initial.toString();

        for (let fromState in config) {
            if (['onEnter', 'onLeave'].includes(fromState)) {
                this._onEnter = config.onEnter;
                continue
            }

            this._statesByState[fromState] = [];

            let actions = config[fromState] as ActionConfigMap;
            for (let actionName in actions) {
                let action = actions[actionName];
                let actionConfig: IActionConfig = action.constructor === Object ?
                    action as IActionConfig
                    : { state: action as StateType };

                this._statesByState[fromState].push(actionConfig.state.toString());
                this._initChangeState(actionName, fromState, actionConfig.state.toString(), actionConfig);
            }
        }
    }

    private _initChangeState(eventName: string, fromState: string, toState: string, actionConfig: IActionConfig): void {
        if (!this._eventsByState[fromState]) {
            this._eventsByState[fromState] = {};
        }

        const { onBeforeChange, onChange } = actionConfig;

        this._eventsByState[fromState][eventName] = async (payload: Payload = {}) => {
            console.log(this._currentState, typeof this._currentState, fromState, typeof fromState);
            if (this._currentState !== fromState) {
                return;
            }

            this._onEnter && await this._onEnter(eventName, fromState, toState, payload);
            onBeforeChange && await onBeforeChange(eventName, fromState, toState, payload);
            this._currentState = toState;
            onChange && await onChange(eventName, fromState, toState, payload);
            this._onLeave && await this._onLeave(eventName, fromState, toState, payload)

            return this;
        };

        if (!this[eventName]) {
            this[eventName] = async (payload: Payload = {}) => {
                if (this._eventsByState[this._currentState]
                    && this._eventsByState[this._currentState][eventName]) {
                    return this._eventsByState[this._currentState][eventName](payload);
                }

                console.log(this._eventsByState, this._currentState, eventName)
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
