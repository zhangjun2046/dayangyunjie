/** 完成节点展示：处理人 + 跟进内容（存于 order_status_logs.remark JSON） */

export interface CompletionRecordPayload {
  handlerName: string;
  content: string;
}

export function encodeCompletionRemark(handlerName: string, content: string): string {
  return JSON.stringify({ handlerName, content } satisfies CompletionRecordPayload);
}

export function parseCompletionRemark(
  remark: string | null | undefined,
): CompletionRecordPayload | null {
  if (!remark?.trim()) return null;
  try {
    const parsed = JSON.parse(remark) as Partial<CompletionRecordPayload>;
    if (typeof parsed.handlerName === 'string' && typeof parsed.content === 'string') {
      return { handlerName: parsed.handlerName, content: parsed.content };
    }
  } catch {
    // 历史纯文本 remark
  }
  return { handlerName: '—', content: remark };
}
