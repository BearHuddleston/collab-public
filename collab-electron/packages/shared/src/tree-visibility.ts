const EXCLUDED_TREE_DIRS = new Set([
	'.collaborator',
	'.claude',
]);

export function isTreeVisibleEntry(entry: {
	name: string;
	isDirectory: boolean;
}): boolean {
	if (
		entry.isDirectory &&
		EXCLUDED_TREE_DIRS.has(entry.name)
	) {
		return false;
	}

	return true;
}
