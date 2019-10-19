import { StateMachine } from '../src/index'


describe('StateMachine', () => {
    let simpleIntFSM: StateMachine;
    let objectIntFSM: StateMachine;
    let simpleStrFSM: StateMachine;
    let objectStrFSM: StateMachine;

    enum IntStatus {
        PENDING = 1,
        ACTIVE = 2,
        ARCHIVED = 3,
        DELETED = 4,
    }

    enum StrStatus {
        PENDING = 'PENDING',
        ACTIVE = 'ACTIVE',
        ARCHIVED = 'ARCHIVED',
        DELETED = 'DELETED',
    }

    beforeAll(() => {
        const emptyHandler = async () => {};

        const onEnter = emptyHandler;
        const onLeave = emptyHandler;
        const onBeforeChange = emptyHandler;
        const onChange = emptyHandler;

        simpleIntFSM = new StateMachine(IntStatus.PENDING, {
            onEnter,
            onLeave,
            [IntStatus.PENDING]: {
                active: IntStatus.ACTIVE,
                delete: IntStatus.DELETED,
            },
            [IntStatus.ACTIVE]: {
                toDraft: IntStatus.PENDING,
                archive: IntStatus.ARCHIVED,
                doNothing: IntStatus.ACTIVE,
            }
        });

        objectIntFSM = new StateMachine(IntStatus.PENDING, {
            onEnter,
            onLeave,
            [IntStatus.PENDING]: {
                active: {
                    state: IntStatus.ACTIVE,
                    onBeforeChange,
                    onChange,
                },
                delete: {
                    state: IntStatus.DELETED,
                    onBeforeChange,
                    onChange,
                }
            },
            [IntStatus.ACTIVE]: {
                toDraft: {
                    state: IntStatus.PENDING,
                },
                archive: {
                    state: IntStatus.ARCHIVED,
                },
                doNothing: {
                    state: IntStatus.ACTIVE,
                    onBeforeChange,
                    onChange,
                },
            },
        });

        simpleStrFSM = new StateMachine(StrStatus.PENDING, {
            onEnter,
            onLeave,
            [StrStatus.PENDING]: {
                active: StrStatus.ACTIVE,
                delete: StrStatus.DELETED,
            },
            [StrStatus.ACTIVE]: {
                toDraft: StrStatus.PENDING,
                archive: StrStatus.ARCHIVED,
                doNothing: StrStatus.ACTIVE,
            }
        });

        objectStrFSM = new StateMachine(StrStatus.PENDING, {
            onEnter,
            onLeave,
            [StrStatus.PENDING]: {
                active: {
                    state: StrStatus.ACTIVE,
                    onBeforeChange,
                    onChange,
                },
                delete: {
                    state: StrStatus.DELETED,
                    onBeforeChange,
                    onChange
                }
            },
            [StrStatus.ACTIVE]: {
                toDraft: {
                    state: StrStatus.PENDING,
                },
                archive: {
                    state: StrStatus.ARCHIVED,
                },
                doNothing: {
                    state: StrStatus.ACTIVE,
                    onBeforeChange,
                    onChange,
                },
            },
        });
    });

    afterEach(() => {
        // @ts-ignore
        simpleIntFSM._currentState = IntStatus.PENDING;
        // @ts-ignore
        objectIntFSM._currentState = IntStatus.PENDING;
        // @ts-ignore
        simpleStrFSM._currentState = StrStatus.PENDING;
        // @ts-ignore
        objectStrFSM._currentState = StrStatus.PENDING;
    });

    describe('.getCurrentState', () => {
        describe('<IntStatus>', () => {
            it('should return initial int state for simple fsm model', () => {
                expect(simpleIntFSM.getCurrentState()).toBe(IntStatus.PENDING);
            });

            it('should return changed int state after action for simple fsm model', async () => {
                await simpleIntFSM.active();
                expect(simpleIntFSM.getCurrentState()).toBe(IntStatus.ACTIVE);
            });

            it('should return initial int state after action for simple fsm model if initial states equals next state', async () => {
                await simpleIntFSM.doNothing();
                expect(simpleIntFSM.getCurrentState()).toBe(IntStatus.PENDING);
            });


            it('should return initial int state for object fsm model', () => {
                expect(objectIntFSM.getCurrentState()).toBe(IntStatus.PENDING);
            });

            it('should return changed int state after action for object fsm model', async () => {
                await objectIntFSM.active();
                expect(objectIntFSM.getCurrentState()).toBe(IntStatus.ACTIVE);
            });

            it('should return initial int state after action for object fsm model if initial state equals next state', async () => {
                await objectIntFSM.doNothing();
                expect(objectIntFSM.getCurrentState()).toBe(IntStatus.PENDING);
            });
        });

        describe('<StrStatus>', () => {
            it('should return initial str state for simple fsm model', () => {
                expect(simpleStrFSM.getCurrentState()).toBe(StrStatus.PENDING);
            });

            it('should return changed str state after action for simple fsm model', async () => {
                await simpleStrFSM.active();
                expect(simpleStrFSM.getCurrentState()).toBe(StrStatus.ACTIVE);
            });

            it('should return initial str state after action for simple fsm model if initial states equals next state', async () => {
                await simpleStrFSM.doNothing();
                expect(simpleStrFSM.getCurrentState()).toBe(StrStatus.PENDING);
            });


            it('should return initial str state for object fsm model', () => {
                expect(objectStrFSM.getCurrentState()).toBe(StrStatus.PENDING);
            });

            it('should return changed str state after action for object fsm model', async () => {
                await objectStrFSM.active();
                expect(objectStrFSM.getCurrentState()).toBe(StrStatus.ACTIVE);
            });

            it('should return initial str state after action for object fsm model if initial state equals next state', async () => {
                await objectStrFSM.doNothing();
                expect(objectStrFSM.getCurrentState()).toBe(StrStatus.PENDING);
            });
        })
    });

    describe('.can', () => {
        describe('<IntStatus>', () => {
            it('should return true for simple fsm model', () => {
                expect(simpleIntFSM.can('active')).toBeTruthy();
            });

            it('should return false for simple fsm model if check undefined action', () => {
                expect(simpleIntFSM.can('archive')).toBeFalsy();
            });

            it('should return true after action for simple fsm model', async () => {
                await simpleIntFSM.active();
                expect(simpleIntFSM.can('archive')).toBeTruthy();
            });

            it('should return false after action for simple fsm model if check undefined action', async () => {
                await simpleIntFSM.active();
                expect(simpleIntFSM.can('active')).toBeFalsy();
            });

            it('should return false if config for state is not defined in simple fsm model', async () => {
                await simpleIntFSM.delete();
                expect(simpleIntFSM.can('active')).toBeFalsy();
            });


            it('should return true for object fsm model', () => {
                expect(objectIntFSM.can('active')).toBeTruthy();
            });

            it('should return false for object fsm model if check undefined action', () => {
                expect(objectIntFSM.can('archive')).toBeFalsy();
            });

            it('should return true after action for object fsm model', async () => {
                await objectIntFSM.active();
                expect(objectIntFSM.can('archive')).toBeTruthy();
            });

            it('should return false after action for object fsm model if check undefined action', async () => {
                await objectIntFSM.active();
                expect(objectIntFSM.can('active')).toBeFalsy();
            });

            it('should return false if config for state is not defined in object fsm model', async () => {
                await objectIntFSM.delete();
                expect(objectIntFSM.can('active')).toBeFalsy();
            });
        });

        describe('<StrStatus>', () => {
            it('should return true for simple fsm model', () => {
                expect(simpleStrFSM.can('active')).toBeTruthy();
            });

            it('should return false for simple fsm model if check undefined action', () => {
                expect(simpleStrFSM.can('archive')).toBeFalsy();
            });

            it('should return true after action for simple fsm model', async () => {
                await simpleStrFSM.active();
                expect(simpleStrFSM.can('archive')).toBeTruthy();
            });

            it('should return false after action for simple fsm model if check undefined action', async () => {
                await simpleStrFSM.active();
                expect(simpleStrFSM.can('active')).toBeFalsy();
            });

            it('should return false if config for state is not defined in simple fsm model', async () => {
                await simpleStrFSM.delete();
                expect(simpleStrFSM.can('active')).toBeFalsy();
            });


            it('should return true for object fsm model', () => {
                expect(objectStrFSM.can('active')).toBeTruthy();
            });

            it('should return false for object fsm model if check undefined action', () => {
                expect(objectStrFSM.can('archive')).toBeFalsy();
            });

            it('should return true after action for object fsm model', async () => {
                await objectStrFSM.active();
                expect(objectStrFSM.can('archive')).toBeTruthy();
            });

            it('should return false after action for object fsm model if check undefined action', async () => {
                await objectStrFSM.active();
                expect(objectStrFSM.can('active')).toBeFalsy();
            });

            it('should return false if config for state is not defined in object fsm model', async () => {
                await objectStrFSM.delete();
                expect(objectStrFSM.can('active')).toBeFalsy();
            });
        });
    })


    describe('.canToState', () => {
        describe('<IntStatus>', () => {
            it('should return true for simple fsm model', () => {
                expect(simpleIntFSM.canToState(IntStatus.ACTIVE)).toBeTruthy();
            });

            it('should return false for simple fsm model if check undefined state', () => {
                expect(simpleIntFSM.canToState(IntStatus.ARCHIVED)).toBeFalsy();
            });

            it('should return true after action for simple fsm model', async () => {
                await simpleIntFSM.active();
                expect(simpleIntFSM.canToState(IntStatus.ARCHIVED)).toBeTruthy();
            });

            it('should return false after action for simple fsm model if check undefined state', async () => {
                await simpleIntFSM.active();
                expect(simpleIntFSM.canToState(IntStatus.DELETED)).toBeFalsy();
            });

            it('should return false if config for state is not defined in simple fsm model', async () => {
                await simpleIntFSM.delete();
                expect(simpleIntFSM.canToState(IntStatus.ACTIVE)).toBeFalsy();
            });


            it('should return true for object fsm model', () => {
                expect(objectIntFSM.canToState(IntStatus.ACTIVE)).toBeTruthy();
            });

            it('should return false for object fsm model if check undefined action', () => {
                expect(objectIntFSM.canToState(IntStatus.ARCHIVED)).toBeFalsy();
            });

            it('should return true after action for object fsm model', async () => {
                await objectIntFSM.active();
                expect(objectIntFSM.canToState(IntStatus.ARCHIVED)).toBeTruthy();
            });

            it('should return false after action for object fsm model if check undefined state', async () => {
                await objectIntFSM.active();
                expect(objectIntFSM.canToState(IntStatus.DELETED)).toBeFalsy();
            });

            it('should return false if config for state is not defined in simple fsm model', async () => {
                await simpleIntFSM.delete();
                expect(simpleIntFSM.canToState(IntStatus.ACTIVE)).toBeFalsy();
            });
        });

        describe('<StrStatus>', () => {
            it('should return true for simple fsm model', () => {
                expect(simpleStrFSM.canToState(StrStatus.ACTIVE)).toBeTruthy();
            });

            it('should return false for simple fsm model if check undefined action', () => {
                expect(simpleStrFSM.canToState(StrStatus.ARCHIVED)).toBeFalsy();
            });

            it('should return true after action for simple fsm model', async () => {
                await simpleStrFSM.active();
                expect(simpleStrFSM.canToState(StrStatus.ARCHIVED)).toBeTruthy();
            });

            it('should return false after action for simple fsm model if check undefined state', async () => {
                await simpleStrFSM.active();
                expect(simpleStrFSM.canToState(StrStatus.DELETED)).toBeFalsy();
            });

            it('should return false if config for state is not defined in simple fsm model', async () => {
                await simpleStrFSM.delete();
                expect(simpleStrFSM.canToState(StrStatus.ACTIVE)).toBeFalsy();
            });


            it('should return true for object fsm model', () => {
                expect(objectStrFSM.canToState(StrStatus.ACTIVE)).toBeTruthy();
            });

            it('should return false for object fsm model if check undefined state', () => {
                expect(objectStrFSM.canToState(StrStatus.ARCHIVED)).toBeFalsy();
            });

            it('should return true after action for object fsm model', async () => {
                await objectStrFSM.active();
                expect(objectStrFSM.canToState(StrStatus.ARCHIVED)).toBeTruthy();
            });

            it('should return false after action for object fsm model if check undefined state', async () => {
                await objectStrFSM.active();
                expect(objectStrFSM.canToState(StrStatus.DELETED)).toBeFalsy();
            });

            it('should return false if config for state is not defined in simple fsm model', async () => {
                await simpleStrFSM.delete();
                expect(simpleStrFSM.canToState(StrStatus.ACTIVE)).toBeFalsy();
            });
        });
    })


});
