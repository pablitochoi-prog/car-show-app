import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getHelpCategoryLabel } from "@/lib/help/help-categories";
import type { HelpArticle } from "@/lib/help/help-types";
import { HelpAudienceBadge } from "./help-audience-badge";

type Props = {
  article: HelpArticle;
};

export function HelpArticleCard({ article }: Props) {
  return (
    <Link href={`/help/${article.slug}`} className="block h-full">
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <HelpAudienceBadge audience={article.audience} />
            <span className="text-xs text-muted-foreground">
              {getHelpCategoryLabel(article.category)}
            </span>
          </div>
          <CardTitle className="text-base decoration-transparent group-hover/card:decoration-current">
            {article.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{article.shortDescription}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
