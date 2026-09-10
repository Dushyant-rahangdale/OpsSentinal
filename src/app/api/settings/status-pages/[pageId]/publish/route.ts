import { assertAdmin } from '@/lib/rbac';
import { jsonError, jsonOk } from '@/lib/api-response';
import { isAppError } from '@/lib/errors';
import { StatusPageAdminError } from '@/lib/status-pages/admin';
import { retryStatusPagePublication } from '@/lib/status-pages/publish-configuration';

/** Retry a publication that failed after its settings were already saved. */
export async function POST(_request: Request, context: { params: Promise<{ pageId: string }> }) {
  try {
    const actor = await assertAdmin();
    const { pageId } = await context.params;
    const publication = await retryStatusPagePublication(pageId, actor);
    return jsonOk({ success: true, publication }, 200);
  } catch (error) {
    if (error instanceof StatusPageAdminError) return jsonError(error.message, 404);
    if (isAppError(error)) return jsonError(error);
    return jsonError('Failed to republish the status page.', 500);
  }
}
