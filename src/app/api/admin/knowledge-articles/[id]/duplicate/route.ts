import { type NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidateKnowledgeArticles } from "@/lib/help/knowledge-article-admin";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function duplicateSlug(base: string): string {
  const suffix = "-copy";
  if (base.endsWith(suffix)) return `${base}-2`;
  return `${base}${suffix}`;
}

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApiUser();
  if (response) return response;

  const { id } = await context.params;
  const source = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!source) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  let slug = duplicateSlug(source.slug);
  let attempt = 2;
  while (await prisma.knowledgeArticle.findUnique({ where: { slug } })) {
    slug = `${source.slug}-copy-${attempt}`;
    attempt += 1;
  }

  try {
    const article = await prisma.knowledgeArticle.create({
      data: {
        slug,
        title: `${source.title} (Copy)`,
        shortDescription: source.shortDescription,
        audience: source.audience,
        category: source.category,
        visibility: source.visibility,
        keywords: source.keywords,
        relatedWebsitePages: source.relatedWebsitePages,
        relatedFeatures: source.relatedFeatures,
        relatedArticleIds: source.relatedArticleIds,
        whoThisIsFor: source.whoThisIsFor,
        whatThisHelpsYouDo: source.whatThisHelpsYouDo,
        beforeYouStart: source.beforeYouStart,
        stepByStepInstructions: source.stepByStepInstructions as Prisma.InputJsonValue,
        whatHappensNext: source.whatHappensNext,
        frequentlyAskedQuestions: source.frequentlyAskedQuestions as Prisma.InputJsonValue,
        articleBody: source.articleBody,
        chatbotSummary: source.chatbotSummary,
        chatbotKeywords: source.chatbotKeywords,
        sortOrder: source.sortOrder + 1,
        featured: false,
        popular: false,
        published: false,
        lastReviewedAt: source.lastReviewedAt,
        createdByUserId: user!.id,
        updatedByUserId: user!.id,
      },
    });
    revalidateKnowledgeArticles();
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Could not duplicate — slug conflict." },
        { status: 409 },
      );
    }
    throw error;
  }
}
