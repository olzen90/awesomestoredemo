const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export function sitePath(path: string) {
	if (!path || /^(?:[a-z]+:|\/\/|#)/i.test(path)) return path;
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	if (!basePath || basePath === "/") return normalizedPath;
	if (normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`)) return normalizedPath;
	return `${basePath}${normalizedPath}`;
}
