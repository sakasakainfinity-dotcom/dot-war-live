export function checkAdminRequest(request) {
  const adminToken = process.env.ADMIN_API_TOKEN;
  const providedToken = request.headers.get('x-admin-token');

  if (adminToken && providedToken === adminToken) {
    return { ok: true };
  }

  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';

  const originHost = safeHost(origin);
  const refererHost = safeHost(referer);
  const refererPath = safePath(referer);
  const sameOriginAdminReferer = refererHost && refererPath.startsWith('/admin') && (
    (originHost && originHost === refererHost) ||
    (!originHost && requestHost && requestHost === refererHost)
  );

  if (sameOriginAdminReferer) {
    return { ok: true };
  }

  return {
    ok: false,
    error: adminToken
      ? '管理者権限がありません（x-admin-token または /admin 由来の同一オリジンリクエストが必要です）'
      : '管理者権限がありません（/admin 由来の同一オリジンリクエストのみ許可）',
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
