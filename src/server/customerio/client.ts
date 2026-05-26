import { TrackClient, RegionUS } from "customerio-node";

let _client: TrackClient | null = null;

function getClient(): TrackClient {
  if (_client) return _client;

  const siteId = process.env.CUSTOMERIO_SITE_ID;
  const apiKey = process.env.CUSTOMERIO_API_KEY;

  if (!siteId || !apiKey) {
    throw new Error("CUSTOMERIO_SITE_ID and CUSTOMERIO_API_KEY must be set");
  }

  _client = new TrackClient(siteId, apiKey, { region: RegionUS });
  return _client;
}

/**
 * Fire a user.signup event to Customer.io when a new user registers.
 */
export async function trackUserSignup(params: {
  userId: string;
  email: string;
  firstName: string;
  segment: "solo" | "clinic" | "hospital";
}) {
  const client = getClient();

  // Identify the user (creates or updates the profile)
  await client.identify(params.userId, {
    email: params.email,
    first_name: params.firstName,
    segment: params.segment,
    created_at: Math.floor(Date.now() / 1000),
  });

  // Track the signup event
  await client.track(params.userId, {
    name: "user.signup",
    data: {
      email: params.email,
      first_name: params.firstName,
      segment: params.segment,
    },
  });
}

/**
 * Sync activity metrics to a Customer.io user profile.
 */
export async function syncActivityMetrics(params: {
  userId: string;
  tasksCreatedCount: number;
  tasksCompletedCount: number;
  teamMembersCount: number;
}) {
  const client = getClient();

  await client.identify(params.userId, {
    tasks_created_count: params.tasksCreatedCount,
    tasks_completed_count: params.tasksCompletedCount,
    team_members_count: params.teamMembersCount,
  });
}
