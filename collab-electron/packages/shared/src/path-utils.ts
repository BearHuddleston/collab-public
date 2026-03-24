const WINDOWS_DRIVE_RE = /^[A-Za-z]:[\\/]/;
const WINDOWS_DRIVE_ROOT_RE = /^[A-Za-z]:\/$/;

function trimTrailingSeparators(path: string): string {
  if (!path) return path;

  const portable = toPortablePath(path);
  if (portable === "/" || WINDOWS_DRIVE_ROOT_RE.test(portable)) {
    return portable;
  }

  return portable.replace(/\/+$/, "");
}

function fromPortablePath(
  path: string,
  windowsStyle: boolean,
): string {
  return windowsStyle ? path.replace(/\//g, "\\") : path;
}

export function toPortablePath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function isWindowsPath(path: string): boolean {
  return WINDOWS_DRIVE_RE.test(path) || path.includes("\\");
}

export function normalizePathForComparison(path: string): string {
  const trimmed = trimTrailingSeparators(path);
  return isWindowsPath(path) ? trimmed.toLowerCase() : trimmed;
}

export function isSameOrChildPath(
  parentPath: string,
  candidatePath: string,
): boolean {
  const parent = normalizePathForComparison(parentPath);
  const candidate = normalizePathForComparison(candidatePath);

  return candidate === parent || candidate.startsWith(`${parent}/`);
}

export function pathBasename(path: string): string {
  const trimmed = trimTrailingSeparators(path);
  const idx = trimmed.lastIndexOf("/");
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

export function pathDirname(path: string): string {
  const windowsStyle = isWindowsPath(path);
  const trimmed = trimTrailingSeparators(path);
  const idx = trimmed.lastIndexOf("/");

  if (idx === -1) return "";
  if (idx === 0) return fromPortablePath("/", windowsStyle);

  const head = trimmed.slice(0, idx);
  const dirname = head.length === 2 && /^[A-Za-z]:$/.test(head)
    ? `${head}/`
    : head;

  return fromPortablePath(dirname, windowsStyle);
}

export function joinPath(basePath: string, ...parts: string[]): string {
  const separator = isWindowsPath(basePath) ? "\\" : "/";
  let joined = basePath;

  for (const part of parts) {
    if (!part) continue;
    const cleanedPart = part.replace(/^[\\/]+/, "");

    if (!joined) {
      joined = cleanedPart;
      continue;
    }

    if (joined.endsWith("/") || joined.endsWith("\\")) {
      joined += cleanedPart;
    } else {
      joined += `${separator}${cleanedPart}`;
    }
  }

  return joined;
}

export function pathRelativeSuffix(
  parentPath: string,
  candidatePath: string,
): string | null {
  if (!isSameOrChildPath(parentPath, candidatePath)) {
    return null;
  }

  const parent = trimTrailingSeparators(parentPath);
  const candidate = trimTrailingSeparators(candidatePath);

  if (normalizePathForComparison(parent) === normalizePathForComparison(candidate)) {
    return "";
  }

  return toPortablePath(candidate).slice(toPortablePath(parent).length + 1);
}

export function replacePathPrefix(
  targetPath: string,
  oldPrefix: string,
  newPrefix: string,
): string {
  const suffix = pathRelativeSuffix(oldPrefix, targetPath);
  if (suffix === null) return targetPath;
  if (!suffix) return newPrefix;
  return joinPath(newPrefix, ...suffix.split("/"));
}
