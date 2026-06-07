/** Display ID for admin list, e.g. KA-00001 */
export function formatKnowledgeArticleNumber(articleNumber: number): string {
  return `KA-${String(articleNumber).padStart(5, "0")}`;
}
