import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
      </div>
      <Card className="rounded-2xl border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Construction className="h-7 w-7" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold">{t("comingSoon")}</div>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {description ?? t("comingSoonDesc")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}