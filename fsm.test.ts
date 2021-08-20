import {
  assertEquals,
  assertThrows,
  assertThrowsAsync,
} from "https://deno.land/std@0.105.0/testing/asserts.ts";
import * as fsm from "./fsm.ts";

enum ProjectStatus {
  Pending = "pending",
  Active = "active",
  Completed = "completed",
  Archived = "archive",
}

Deno.test("should add states separately in builder", function () {
  const smb = new fsm.StateMachineBuilder()
    .withState(ProjectStatus.Pending)
    .withState(ProjectStatus.Active)
    .withState(ProjectStatus.Completed)
    .withState(ProjectStatus.Archived);

  const states = smb[fsm._states];

  assertEquals(states.size, 4);
  assertEquals(Array.from(states.keys()), [
    ProjectStatus.Pending,
    ProjectStatus.Active,
    ProjectStatus.Completed,
    ProjectStatus.Archived,
  ]);
});

Deno.test("should bulk add states in builder", function () {
  const stateNames = Object.values(ProjectStatus);
  const smb = new fsm.StateMachineBuilder()
    .withStates(stateNames);

  const states = smb[fsm._states];

  assertEquals(states.size, 4);
  assertEquals(Array.from(states.keys()), stateNames);
});

Deno.test("should build without transitions", function () {
  const sm = new fsm.StateMachineBuilder()
    .withState(ProjectStatus.Pending)
    .build(ProjectStatus.Pending);

  assertEquals(sm.allowedTransitionStates(), []);
});

Deno.test("should build base state machine", function () {
  const sm = new fsm.StateMachineBuilder()
    .withStates(Object.values(ProjectStatus))
    .withTransitions([
      [ProjectStatus.Pending, [ProjectStatus.Active, ProjectStatus.Archived]],
    ])
    .build(ProjectStatus.Pending);

  const [, active, , archived] = sm[fsm._states];

  assertEquals(sm.allowedTransitionStates(), [active, archived]);
});

Deno.test("should change state", async function () {
  const sm = new fsm.StateMachineBuilder()
    .withStates(Object.values(ProjectStatus))
    .withTransitions([
      [ProjectStatus.Pending, [ProjectStatus.Active, ProjectStatus.Archived]],
      [ProjectStatus.Active, [ProjectStatus.Completed]],
    ])
    .build(ProjectStatus.Pending);

  const [, active, completed, archived] = sm[fsm._states];

  assertEquals(sm.allowedTransitionStates(), [active, archived]);

  await sm.changeState(ProjectStatus.Active);
  assertEquals(sm.allowedTransitionStates(), [completed]);

  await sm.changeState(ProjectStatus.Completed);
  assertEquals(sm.allowedTransitionStates(), []);
});

Deno.test("should trigger state actions", async function () {
  const sm = new fsm.StateMachineBuilder()
    .withStates(
      Object.values(ProjectStatus),
      {
        onEntry(fromState, toState) {
          console.log(`changing from ${fromState} to ${toState}`);
        },
        beforeExit(fromState, toState) {
          console.log(`before changing from ${fromState} to ${toState}`);
          return true;
        },
      },
    )
    .withTransitions([
      [ProjectStatus.Pending, [ProjectStatus.Active, ProjectStatus.Archived]],
      [ProjectStatus.Active, [ProjectStatus.Completed]],
    ])
    .build(ProjectStatus.Pending);

  const [, active, completed, archived] = sm[fsm._states];

  assertEquals(sm.allowedTransitionStates(), [active, archived]);

  await sm.changeState(ProjectStatus.Active);
  assertEquals(sm.allowedTransitionStates(), [completed]);

  await sm.changeState(ProjectStatus.Completed);
  assertEquals(sm.allowedTransitionStates(), []);
});

Deno.test("should stringify state", function () {
  const pending = new fsm.State(ProjectStatus.Pending);
  const active = new fsm.State(ProjectStatus.Active);

  assertEquals(pending.toString(), ProjectStatus.Pending);
  assertEquals(
    [pending, active].join(),
    `${ProjectStatus.Pending},${ProjectStatus.Active}`,
  );
  assertEquals(JSON.stringify({ pending }), '{"pending":"pending"}');
});

Deno.test("should throw type error if state doesn't exist", () => {
  assertThrows(
    () => new fsm.StateMachineBuilder().build(ProjectStatus.Pending),
    TypeError,
    "an instance of State class is expected",
  );
});

Deno.test("should throw error if transition to the state doesn't exist", () => {
  const sm = new fsm.StateMachineBuilder()
    .withStates(Object.values(ProjectStatus))
    .build(ProjectStatus.Pending);
  assertThrowsAsync(
    () => sm.changeState(ProjectStatus.Active),
    fsm.FsmError,
    `cannot change state from "${ProjectStatus.Pending}" to "${ProjectStatus.Active}"`,
  );
});

Deno.test("should throw error if beforeExit action returns false", () => {
  const sm = new fsm.StateMachineBuilder()
    .withStates(
      Object.values(ProjectStatus),
      { beforeExit: () => false },
    )
    .withTransitions([
      [ProjectStatus.Pending, [ProjectStatus.Active]],
    ])
    .build(ProjectStatus.Pending);
  assertThrowsAsync(
    () => sm.changeState(ProjectStatus.Active),
    fsm.FsmError,
    `cannot change state from "${ProjectStatus.Pending}" to "${ProjectStatus.Active}"`,
  );
});

Deno.test("should reuse one builder for many entities", () => {
  const statuses = Object.values(ProjectStatus);
  const transitions: Array<[string, Array<string>]> = [
    [ProjectStatus.Pending, [ProjectStatus.Active, ProjectStatus.Archived]],
    [ProjectStatus.Active, [ProjectStatus.Completed]],
  ];

  const smb = new fsm.StateMachineBuilder()
    .withStates(statuses)
    .withTransitions(transitions);

  function expectedAllowedStates(status: ProjectStatus) {
    return transitions.find(([s]) => s === status)?.[1] || [];
  }

  for (const status of statuses) {
    const sm = smb.build(status);
    assertEquals(
      sm.allowedTransitionStates().map(String),
      expectedAllowedStates(status),
    );
  }
});
