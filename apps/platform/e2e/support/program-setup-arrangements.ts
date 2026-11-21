import type pg from "pg";

const CLEAR_GOAL = `
  update app.client_profiles set primary_goal = null where client_id = $1
`;

export async function clearGoalOnProfile(
  pool: pg.Pool,
  clientId: string,
): Promise<void> {
  await pool.query(CLEAR_GOAL, [clientId]);
}
