import { isAbsolute, relative, resolve } from "node:path";
import { toPortablePath } from "@collab/shared/path-utils";

export function isSameOrChildNativePath(
  parentPath: string,
  candidatePath: string,
): boolean {
  const resolvedParent = resolve(parentPath);
  const resolvedCandidate = resolve(candidatePath);

  if (resolvedParent === resolvedCandidate) {
    return true;
  }

  const rel = relative(resolvedParent, resolvedCandidate);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

export function portableRelativePath(
  parentPath: string,
  candidatePath: string,
): string {
  return toPortablePath(relative(resolve(parentPath), resolve(candidatePath)));
}
