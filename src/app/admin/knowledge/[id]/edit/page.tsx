import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminKnowledgeArticleEditor } from "@/components/admin/admin-knowledge-article-editor";
import { knowledgeArticleToFormDefaults } from "@/lib/help/knowledge-article-admin";

type Props = { params: Promise<{ id: string }> };

export default async function AdminKnowledgeEditPage({ params }: Props) {
  const { id } = await params;
  const article = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin/knowledge"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Knowledge Repository
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Edit article</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {article.slug}
        </p>
      </div>
      <AdminKnowledgeArticleEditor
        mode="edit"
        articleId={article.id}
        initial={knowledgeArticleToFormDefaults(article)}
      />
    </div>
  );
}
