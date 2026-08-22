import { LANGUAGES, useTranslation, type Language } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSwitcher({
  onChange,
  className,
}: {
  /** Called after the local language switch, e.g. to persist it server-side. */
  onChange?: (language: Language) => void;
  className?: string;
}) {
  const { language, setLanguage, t } = useTranslation();

  return (
    <Select
      value={language}
      onValueChange={(next) => {
        const lang = next as Language;
        setLanguage(lang);
        onChange?.(lang);
      }}
    >
      <SelectTrigger className={className ?? "w-full sm:w-56"} aria-label={t("language.label")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((entry) => (
          <SelectItem key={entry.code} value={entry.code}>
            {entry.nativeLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
