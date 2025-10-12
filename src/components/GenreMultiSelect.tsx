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

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            aria-expanded={open}
            className="w-[320px] justify-between"
          >
            {value.length ? `${value.length} thể loại đã chọn` : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
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
      {/* chips đã chọn */}
      <div
        className="w-[320px] h-10 rounded-md border bg-muted/30 px-2
                flex items-center gap-2 overflow-x-auto whitespace-nowrap"
      >
        {value.length != 0 ? (
          value.map((id) => {
            const opt = options.find((o) => o.id === id);
            if (!opt) return null;
            return (
              <Badge
                key={id}
                variant="secondary"
                className="px-2 py-1 rounded-full"
              >
                {opt.name}
                <button className="ml-1" onClick={() => remove(id)} title="Bỏ">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })
        ) : (
          <span className="text-sm text-muted-foreground">
            Chưa chọn thể loại
          </span>
        )}
      </div>
    </div>
  );
}
