/**
 * GitHub/GitLab Integration Handler
 * Transforms GitHub/GitLab webhook events to standard event format
 */

export type GitHubEvent = {
  action?: string;
  repository?: {
    name: string;
    full_name: string;
    html_url: string;
  };
  workflow_run?: {
    id: number;
    name: string;
    status: 'queued' | 'in_progress' | 'completed' | 'requested';
    conclusion?: 'success' | 'failure' | 'cancelled' | 'timed_out';
    html_url: string;
  };
  check_run?: {
    id: number;
    name: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion?: 'success' | 'failure' | 'cancelled' | 'timed_out';
    html_url: string;
  };
  deployment?: {
    id: number;
    environment: string;
    state: 'pending' | 'success' | 'failure' | 'error';
  };
  // GitLab format
  object_kind?: string;
  project?: {
    name: string;
    path_with_namespace: string;
    web_url: string;
  };
  build_status?: string;
  status?: string;
  ref?: string;
  commit?: {
    message: string;
  };
};

export function transformGitHubToEvent(payload: GitHubEvent): {
  event_action: 'trigger' | 'resolve';
  dedup_key: string;
  payload: {
    summary: string;
    source: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    custom_details: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
} {
  // Handle GitHub Actions workflow_run
  if (payload.workflow_run) {
    const workflow = payload.workflow_run;
    const isFailure =
      workflow.conclusion === 'failure' ||
      workflow.conclusion === 'cancelled' ||
      workflow.conclusion === 'timed_out';
    const isResolved = workflow.status === 'completed' && workflow.conclusion === 'success';

    return {
      event_action: isResolved ? 'resolve' : isFailure ? 'trigger' : 'resolve',
      dedup_key: `github-${workflow.id}`,
      payload: {
        summary: `Workflow failed: ${workflow.name}`,
        source: `GitHub${payload.repository ? ` - ${payload.repository.full_name}` : ''}`,
        severity: isFailure ? 'critical' : 'info',
        custom_details: {
          action: payload.action,
          repository: payload.repository,
          workflow_run: {
            id: workflow.id,
            name: workflow.name,
            status: workflow.status,
            conclusion: workflow.conclusion,
            html_url: workflow.html_url,
          },
        },
      },
    };
  }

  // Handle GitHub check_run
  if (payload.check_run) {
    const check = payload.check_run;
    const isFailure =
      check.conclusion === 'failure' ||
      check.conclusion === 'cancelled' ||
      check.conclusion === 'timed_out';
    const isResolved = check.status === 'completed' && check.conclusion === 'success';

    return {
      event_action: isResolved ? 'resolve' : isFailure ? 'trigger' : 'resolve',
      dedup_key: `github-${check.id}`,
      payload: {
        summary: `Check failed: ${check.name}`,
        source: `GitHub${payload.repository ? ` - ${payload.repository.full_name}` : ''}`,
        severity: isFailure ? 'critical' : 'info',
        custom_details: {
          action: payload.action,
          repository: payload.repository,
          check_run: {
            id: check.id,
            name: check.name,
            status: check.status,
            conclusion: check.conclusion,
            html_url: check.html_url,
          },
        },
      },
    };
  }

  // Handle GitHub deployment
  if (payload.deployment) {
    const deployment = payload.deployment;
    const isFailure = deployment.state === 'failure' || deployment.state === 'error';
    const isResolved = deployment.state === 'success';

    return {
      event_action: isResolved ? 'resolve' : isFailure ? 'trigger' : 'resolve',
      dedup_key: `github-deployment-${deployment.id}`,
      payload: {
        summary: `Deployment ${deployment.state}: ${deployment.environment}`,
        source: `GitHub${payload.repository ? ` - ${payload.repository.full_name}` : ''}`,
        severity: isFailure ? 'critical' : 'info',
        custom_details: {
          action: payload.action,
          repository: payload.repository,
          deployment: {
            id: deployment.id,
            environment: deployment.environment,
            state: deployment.state,
          },
        },
      },
    };
  }

  // Handle GitLab CI/CD
  if (payload.object_kind === 'build' || payload.build_status) {
    const isFailure = payload.build_status === 'failed' || payload.status === 'failed';
    const isResolved = payload.build_status === 'success' || payload.status === 'success';

    return {
      event_action: isResolved ? 'resolve' : isFailure ? 'trigger' : 'resolve',
      dedup_key: `gitlab-${payload.ref || Date.now()}`,
      payload: {
        summary: `Build ${payload.build_status || payload.status}: ${payload.ref || 'unknown'}`,
        source: `GitLab${payload.project ? ` - ${payload.project.path_with_namespace}` : ''}`,
        severity: isFailure ? 'error' : 'info',
        custom_details: {
          object_kind: payload.object_kind,
          project: payload.project,
          build_status: payload.build_status,
          status: payload.status,
          ref: payload.ref,
          commit: payload.commit,
        },
      },
    };
  }

  throw new Error('Invalid GitHub/GitLab payload: unknown format');
}
