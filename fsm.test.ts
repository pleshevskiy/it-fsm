/**
 * Copyright (C) 2019, Dmitriy Pleshevskiy <dmitriy@pleshevski.ru>
 *
 * it-fsm is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * it-fsm is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with it-fsm.  If not, see <https://www.gnu.org/licenses/>.
 */

import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.165.0/testing/asserts.ts";
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

  await sm.tryChangeState(ProjectStatus.Active, null);
  assertEquals(sm.allowedTransitionStates(), [completed]);

  await sm.tryChangeState(ProjectStatus.Completed, null);
  assertEquals(sm.allowedTransitionStates(), []);
});

Deno.test("should trigger state actions", async function () {
  const triggeredTimes = {
    beforeExit: 0,
    onEntry: 0,
  };

  const sm = new fsm.StateMachineBuilder()
    .withStates(
      Object.values(ProjectStatus),
      {
        onEntry() {
          triggeredTimes.onEntry += 1;
        },
        beforeExit() {
          triggeredTimes.beforeExit += 1;
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

  assertEquals(triggeredTimes, { beforeExit: 0, onEntry: 0 });
  assertEquals(sm.allowedTransitionStates(), [active, archived]);
  assertEquals(
    sm.allowedTransitionStateNames(),
    [ProjectStatus.Active, ProjectStatus.Archived],
  );

  await sm.tryChangeState(ProjectStatus.Active, null);
  assertEquals(triggeredTimes, { beforeExit: 1, onEntry: 1 });
  assertEquals(sm.allowedTransitionStates(), [completed]);
  assertEquals(sm.allowedTransitionStateNames(), [ProjectStatus.Completed]);

  await sm.tryChangeState(ProjectStatus.Completed, null);
  assertEquals(triggeredTimes, { beforeExit: 2, onEntry: 2 });
  assertEquals(sm.allowedTransitionStates(), []);
  assertEquals(sm.allowedTransitionStateNames(), []);
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
  assertRejects(
    () => sm.tryChangeState(ProjectStatus.Active, null),
    fsm.FsmError,
    `cannot change state from "${ProjectStatus.Pending}" to "${ProjectStatus.Active}"`,
  );
});

Deno.test("should return null if transition to the state doesn't exist", async () => {
  const sm = new fsm.StateMachineBuilder()
    .withStates(Object.values(ProjectStatus))
    .build(ProjectStatus.Pending);
  assertEquals(
    await sm.maybeChangeState(ProjectStatus.Active, null),
    null,
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
  assertRejects(
    () => sm.tryChangeState(ProjectStatus.Active, null),
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

Deno.test("should trigger builded transition actions", async () => {
  const states = ["locked", "unlocked"] as const;
  const [locked, unlocked] = states;

  const sm = new fsm.StateMachineBuilder()
    .withStates([locked, unlocked])
    .withTransitions([
      [locked, { coin: unlocked }],
      [unlocked, { push: locked }],
    ])
    .build(locked);

  const [lockedState, unlockedState] = sm[fsm._states];

  assertEquals(await sm.trigger("coin", {}), unlockedState);
  assertEquals(await sm.trigger("coin", {}), unlockedState);

  assertEquals(await sm.trigger("push", {}), lockedState);
  assertEquals(await sm.trigger("push", {}), lockedState);
});
