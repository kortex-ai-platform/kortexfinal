import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export function LangSwitcher() {
  const { lang, setLang } = useT();
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5">
      <Button
        size="sm"
        variant={lang === "en" ? "default" : "ghost"}
        className="h-7 px-2 text-xs"
        onClick={() => setLang("en")}
      >
        EN
      </Button>
      <Button
        size="sm"
        variant={lang === "bn" ? "default" : "ghost"}
        className="h-7 px-2 text-xs"
        onClick={() => setLang("bn")}
      >
        বাং
      </Button>
    </div>
  );
}