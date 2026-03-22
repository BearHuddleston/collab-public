const REMOTE_URL_RE = /^https?:\/\//;
const PASSTHROUGH_RE = /^(https?:\/\/|data:|collab-file:\/\/)/;

// Does not handle URLs with unescaped parentheses (rare for cover images).
const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\((\S+?)(?:\s+"[^"]*")?\)/;
const HTML_IMG_SRC_RE = /<img\s[^>]*?\bsrc=["']([^"']+)["'][^>]*?\/?>/i;

function toCollabFileUrl(absolutePath: string): string {
  return `collab-file://${encodeURIComponent(absolutePath).replace(/%2F/g, "/")}`;
}

function resolveImageRef(
  imageRef: string,
  notePath: string | undefined,
): string | null {
  if (PASSTHROUGH_RE.test(imageRef)) return imageRef;
  if (!notePath) return null;

  if (imageRef.startsWith("/")) {
    return toCollabFileUrl(imageRef);
  }

  const noteDir = notePath.slice(0, notePath.lastIndexOf("/"));
  const parts = `${noteDir}/${imageRef}`.split("/");
  const resolved: string[] = [];
  for (const seg of parts) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") {
      resolved.pop();
      continue;
    }
    resolved.push(seg);
  }
  return toCollabFileUrl("/" + resolved.join("/"));
}

/**
 * Extract a cover image URL from frontmatter or the first image in markdown.
 *
 * Checks frontmatter keys `cover_image` / `coverImage` first, then scans
 * for the first markdown image (`![](url)`) or HTML `<img src="url">`.
 * Remote URLs are returned as-is; local paths are resolved against the
 * note's directory and returned as `collab-file://` URLs.
 */
export function extractCoverImageUrl(
  text: string,
  frontmatter?: Record<string, unknown>,
  notePath?: string,
): string | null {
  if (frontmatter) {
    const candidate = frontmatter.cover_image ?? frontmatter.coverImage;
    if (typeof candidate === "string") {
      const resolved = resolveImageRef(candidate, notePath);
      if (resolved) return resolved;
    }
  }

  const mdMatch = text.match(MARKDOWN_IMAGE_RE);
  if (mdMatch?.[1]) {
    const resolved = resolveImageRef(mdMatch[1], notePath);
    if (resolved) return resolved;
  }

  const htmlMatch = text.match(HTML_IMG_SRC_RE);
  if (htmlMatch?.[1]) {
    const resolved = resolveImageRef(htmlMatch[1], notePath);
    if (resolved) return resolved;
  }

  return null;
}
