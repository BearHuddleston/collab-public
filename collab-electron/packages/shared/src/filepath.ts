/**
 * Split a filepath into a muted parent prefix and a visible name.
 * The parent shows the last two directory segments (or fewer if the
 * path is short) so the user gets context without a full absolute path.
 */
export function splitFilepath(path: string): {
  parent: string;
  name: string;
} {
  const parts = path.split("/");
  const name = parts.pop() || path;
  const parent = parts.length > 0 ? parts.join("/") + "/" : "";
  return { parent, name };
}
