export interface AuthorizationInput {
  actorLogin: string;
  authorAssociation: string;
  repositoryOwner: string;
  /** Comma-separated logins explicitly approved to trigger this workflow, beyond the owner. */
  approvedActors?: string;
}

/** Repo owner or an explicitly approved actor may trigger the write workflow; nobody else. */
export function isAuthorized({
  actorLogin,
  authorAssociation,
  repositoryOwner,
  approvedActors,
}: AuthorizationInput): boolean {
  if (authorAssociation === "OWNER") return true;
  if (actorLogin.toLowerCase() === repositoryOwner.toLowerCase()) return true;

  const approvedList = (approvedActors ?? "")
    .split(",")
    .map((login) => login.trim().toLowerCase())
    .filter((login) => login.length > 0);

  return approvedList.includes(actorLogin.toLowerCase());
}
