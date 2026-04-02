export function checkAdminRequest(request) {
  const adminToken = process.env.ADMIN_API_TOKEN;
  const providedToken = request.headers.get('x-admin-token');

  if (adminToken && providedToken === adminToken) {
    return { ok: true };
  }

  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';

  const originHost = safeHost(origin);
  const refererHost = safeHost(referer);
  const refererPath = safePath(referer);

  if (originHost && refererHost && originHost === refererHost && refererPath.startsWith('/admin')) {
    return { ok: true };
  }

  return {
    ok: false,
    error: adminToken
      ? '管理者権限がありません（x-admin-token または /admin 由来のリクエストが必要です）'
      : '管理者権限がありません（/admin 由来のリクエストのみ許可）',
  };
}

function safeHost(value) {
  try {
    return new URL(value).host;
  } catch {
    return '';
  }
}

function safePath(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return '';
  }
}
