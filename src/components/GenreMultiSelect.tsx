"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";

export type GenreOption = { id: string; name: string; description: string };

type Props = {
  options: GenreOption[];
  value: string[]; // mảng id đã chọn
  onChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function GenreMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Chọn thể loại…",
  className,
  disabled = false,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(() => new Set(value), [value]);

  const toggle = (id: string) => {
    if (selected.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const remove = (id: string) => onChange(value.filter((v) => v !== id));
  const clearAll = () => onChange([]);

  // Lấy nhãn đã chọn để hiển thị gọn trong trigger
  const labels = React.useMemo(
    () =>
      value
        .map((id) => options.find((o) => o.id === id)?.name)
        .filter((x): x is string => Boolean(x)),
    [value, options]
  );

  const MAX_SHOW = 2; // số chip hiển thị trong trigger
  const shown = labels.slice(0, MAX_SHOW);
  const extra = labels.length - shown.length;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            aria-expanded={open}
            className="w-[320px] min-h-10 justify-start pr-8 overflow-hidden"
          >
            {labels.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
                {shown.map((name, idx) => (
                  <span
                    key={name + idx}
                    className="inline-flex items-center max-w-[120px] rounded-full bg-muted px-2 py-0.5 text-xs"
                    title={name}
                  >
                    <span className="truncate">{name}</span>
                    {/* Chặn mở popover khi bấm ✕ */}
                    <button
                      className="ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const id = value.find(
                          (v) => options.find((o) => o.id === v)?.name === name
                        );
                        if (id) remove(id);
                      }}
                      title="Bỏ"
                    >
                      <X className="h-3 w-3 opacity-70 hover:opacity-100" />
                    </button>
                  </span>
                ))}
                {extra > 0 && (
                  <span className="text-xs text-muted-foreground">
                    +{extra}
                  </span>
                )}
              </div>
            )}
            <ChevronsUpDown className="absolute right-2 h-4 w-4 opacity-50 pointer-events-none" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Tìm thể loại..." />
            <CommandList>
              <CommandEmpty>Không tìm thấy</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={opt.name}
                    onSelect={() => toggle(opt.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected.has(opt.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {opt.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>

          {value.length > 0 && (
            <div className="p-2 border-t bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={clearAll}
              >
                Xóa tất cả
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
