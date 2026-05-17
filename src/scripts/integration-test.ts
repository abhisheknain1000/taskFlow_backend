import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_BASE =
  process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

const DEMO_PASSWORD = 'Demo1234!';

type AuthResult = {
  token: string;
  user: { _id: string; email: string; role: string };
};

async function request(
  method: string,
  url: string,
  body?: unknown,
  token?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  return { ok: response.ok, status: response.status, data };
}

async function login(email: string): Promise<AuthResult> {
  const result = await request('POST', '/auth/login', {
    email,
    password: DEMO_PASSWORD,
  });

  if (!result.ok) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(result.data)}`);
  }

  return {
    token: result.data.token,
    user: result.data.user,
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log(`Testing API at ${API_BASE}`);

  const admin = await login('admin@demo.taskflow.com');
  const manager = await login('manager@demo.taskflow.com');
  const member = await login('member@demo.taskflow.com');

  const adminTasks = await request('GET', '/tasks', undefined, admin.token);
  const managerTasks = await request('GET', '/tasks', undefined, manager.token);
  const memberTasks = await request('GET', '/tasks', undefined, member.token);

  assert(adminTasks.ok, 'Admin tasks fetch failed');
  assert(managerTasks.ok, 'Manager tasks fetch failed');
  assert(memberTasks.ok, 'Member tasks fetch failed');

  const adminCount = adminTasks.data.results;
  const managerCount = managerTasks.data.results;
  const memberCount = memberTasks.data.results;

  assert(adminCount >= 3, `Expected admin to see >=3 tasks, got ${adminCount}`);
  assert(
    managerCount >= 2,
    `Expected manager to see admin+own tasks (>=2), got ${managerCount}`
  );
  assert(
    memberCount === 1,
    `Expected member to see exactly 1 manager-created task, got ${memberCount}`
  );

  const assignableForAdmin = await request(
    'GET',
    '/users/assignable',
    undefined,
    admin.token
  );
  assert(assignableForAdmin.ok, 'Assignable users (admin) failed');
  assert(
    assignableForAdmin.data.results >= 2,
    'Admin should see managers and members'
  );

  const projectsAdmin = await request(
    'GET',
    '/projects',
    undefined,
    admin.token
  );
  const projectsManager = await request(
    'GET',
    '/projects',
    undefined,
    manager.token
  );
  const projectsMember = await request(
    'GET',
    '/projects',
    undefined,
    member.token
  );

  assert(projectsAdmin.ok, 'Admin projects fetch failed');
  assert(projectsManager.ok, 'Manager projects fetch failed');
  assert(projectsMember.ok, 'Member projects fetch failed');
  assert(
    projectsAdmin.data.results >= 1,
    'Admin should see at least one project'
  );

  const memberTask = memberTasks.data.data[0];
  const memberStatusUpdate = await request(
    'PATCH',
    `/tasks/${memberTask._id}`,
    { status: 'completed' },
    member.token
  );
  assert(memberStatusUpdate.ok, 'Member status update failed');

  const memberInvalidStatus = await request(
    'PATCH',
    `/tasks/${memberTask._id}`,
    { status: 'in-progress' },
    member.token
  );
  assert(
    !memberInvalidStatus.ok,
    'Member should not set in-progress status'
  );

  const managerCreate = await request(
    'POST',
    '/tasks',
    {
      title: 'Integration test task',
      description: 'Created by manager during test',
      priority: 'medium',
      assignedTo: 'member@demo.taskflow.com',
    },
    manager.token
  );
  assert(managerCreate.ok, 'Manager task create failed');

  const managerAssignAdmin = await request(
    'POST',
    '/tasks',
    {
      title: 'Invalid assignment',
      assignedTo: 'admin@demo.taskflow.com',
    },
    manager.token
  );
  assert(
    !managerAssignAdmin.ok,
    'Manager should not assign tasks to admin'
  );

  console.log('All integration checks passed.');
}

run().catch((error) => {
  console.error('Integration test failed:', error.message);
  process.exit(1);
});
