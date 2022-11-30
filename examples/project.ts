import { StateMachine, StateMachineBuilder } from "../fsm.ts";

enum ProjectStatus {
  Pending = "pending",
  Active = "active",
  Completed = "completed",
  Archived = "archived",
}

interface ProjectStateMachineContext {
  projectService: ProjectService;
  projectId: Project["id"];
}

const smbProject = new StateMachineBuilder<
  ProjectStateMachineContext,
  ProjectStatus
>()
  .withStates(
    [ProjectStatus.Pending, ProjectStatus.Archived, ProjectStatus.Completed],
    {
      async onEntry(_from, to, { projectService, projectId }) {
        await projectService.updateProject(projectId, { status: to.name });
      },
    },
  )
  .withState(
    ProjectStatus.Active,
    {
      async onEntry(_from, _to, { projectService, projectId }) {
        await projectService.activateProject(projectId);
      },
    },
  )
  .withTransitions([
    [ProjectStatus.Pending, [ProjectStatus.Active, ProjectStatus.Archived]],
    [ProjectStatus.Active, [ProjectStatus.Completed]],
    [ProjectStatus.Archived, [ProjectStatus.Pending]],
  ]);

async function main() {
  await prepareExampleEnv();

  const projectService = new ProjectService();

  async function firstProjectPath() {
    const project = await projectService.getProject(1);
    const smProject = smbProject.build(project.status);

    const projectId = project.id;
    const context = { projectService, projectId };

    await logProject("[project 1] initial", projectId);
    logAllowedStates(smProject);

    await smProject.tryChangeState(ProjectStatus.Active, context);
    await logProject("[project 1] after activation", projectId);
    logAllowedStates(smProject);

    await smProject.tryChangeState(ProjectStatus.Completed, context);
    await logProject("[project 1] after completed", projectId);
    logAllowedStates(smProject);
  }

  async function secondProjectPath() {
    const project = await projectService.getProject(2);
    const smProject = smbProject.build(project.status);

    const projectId = project.id;
    const context = { projectService, projectId };

    await logProject("[project 2] initial", projectId);
    logAllowedStates(smProject);

    await smProject.tryChangeState(ProjectStatus.Archived, context);
    await logProject("[project 2] after activation", projectId);
    logAllowedStates(smProject);
  }

  async function logProject(message: string, projectId: number) {
    console.log(message, await projectService.getProject(projectId));
  }

  function logAllowedStates<C, N extends string>(sm: StateMachine<C, N>) {
    console.log("[fsm] transitions", sm.allowedTransitionStateNames());
  }

  await firstProjectPath();
  console.log("---------");
  await secondProjectPath();
}

async function prepareExampleEnv() {
  const projectService = new ProjectService();

  await projectService.createProject({ name: "my first project" });
  await projectService.createProject({ name: "my second project" });
}

class ProjectService {
  private readonly projectStorage = new ProjectStorage();

  createProject(insertData: CreateProjectData) {
    return this.projectStorage.createProject(insertData);
  }

  updateProject(id: Project["id"], patchData: UpdateProjectData) {
    return this.projectStorage.updateProject(id, patchData);
  }

  async activateProject(id: Project["id"]) {
    const project = await this.getProject(id);

    await this.projectStorage.updateProject(
      project.id,
      { status: ProjectStatus.Active },
    );
  }

  async getProject(id: Project["id"]) {
    const project = await this.getProjectUnchecked(id);
    if (!project) throw new Error("Project does not exist");
    return project;
  }

  getProjectUnchecked(id: Project["id"]) {
    return this.projectStorage.getProject(id);
  }
}

interface CreateProjectData {
  name: string;
}

interface UpdateProjectData {
  name?: string;
  status?: ProjectStatus;
}

class ProjectStorage {
  createProject(insertData: CreateProjectData) {
    return randomDebounced(() => {
      const createdData: Project = {
        ...insertData,
        id: genProjectId(),
        status: ProjectStatus.Pending,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      _projectStore.set(createdData.id, createdData);
      return createdData;
    });
  }

  updateProject(id: Project["id"], patchData: UpdateProjectData) {
    return randomDebounced(() => {
      const currentData = _projectStore.get(id);
      if (!currentData) return null;

      const updatedData: Project = {
        ...currentData,
        ...patchData,
        updatedAt: new Date(),
      };

      if (
        currentData.activatedAt == null &&
        patchData.status === ProjectStatus.Active
      ) {
        updatedData.activatedAt = new Date();
      }

      _projectStore.set(id, updatedData);
      return updatedData;
    });
  }

  getProject(id: Project["id"]) {
    return randomDebounced(() => _projectStore.get(id));
  }
}

interface Project {
  id: number;
  name: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
}

function genProjectId() {
  return _projectStore.size + 1;
}

const _projectStore = new Map<Project["id"], Project>();

function randomDebounced<T>(fn: () => T): Promise<T> {
  return debounced(fn, randomWaitMs());
}

function debounced<T>(fn: () => T, wait: number): Promise<T> {
  return delay(wait).then(fn);
}

function delay(wait: number) {
  return new Promise((resolve) => setTimeout(resolve, wait));
}

function randomWaitMs() {
  return Math.round(Math.random() * 1000) + 1000;
}

if (import.meta.main) {
  await main();
}
