# IT FSM

[![ci](https://github.com/icetemple/it-fsm/actions/workflows/ci.yml/badge.svg)](https://github.com/icetemple/it-fsm/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/icetemple/it-fsm/badge.svg?branch=master)](https://coveralls.io/github/icetemple/it-fsm?branch=master)

Simple finite state machine

### Installation

`npm install --save it-fsm`

### Usage

```ts
import { StateMachineBuilder } from "it-fsm";

enum ProjectStatus {
  Pending = "pending",
  Active = "active",
  Completed = "completed",
  Archived = "archive",
}

const smbProject = new StateMachineBuilder()
  .withStates(Object.values(ProjectStatus))
  .withTransitions([
    [ProjectStatus.Pending, [ProjectStatus.Active, ProjectStatus.Archived]],
    [ProjectStatus.Active, [ProjectStatus.Completed]],
  ]);

async function main() {
  const project1 = { id: 1, status: ProjectStatus.Pending };
  const project2 = { id: 2, status: ProjectStatus.Completed };

  // Build FSM with current project status
  const smForProject1 = smbProject.build(project1.status);
  const smForProject2 = smbProject.build(project2.status);

  console.log(smForProject2.allowedTransitionStates()); // []

  console.log(smForProject1.allowedTransitionStates()); // [active, archived]
  await smForProject1.changeState(ProjectStatus.Active);

  console.log(smForProject1.allowedTransitionStates()); // [completed]
  await smForProject1.changeState(ProjectStatus.Completed);

  console.log(smForProject1.allowedTransitionStates()); // []
}

main();

```
