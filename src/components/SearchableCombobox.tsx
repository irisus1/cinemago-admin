"use client";

import * as React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

export type SelectOption = {
  value: string;
  label: string;
  meta?: string;
};

type Props = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  widthClass?: string;
};

export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  searchPlaceholder = "Tìm...",
  className,
  disabled = false,
  widthClass = "w-[260px]",
}: Props) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  const displayLabel = selected
    ? selected.meta
      ? `${selected.label} - ${selected.meta}`
      : selected.label
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            "h-10 justify-between border border-gray-400 rounded-lg",
            "bg-gray-100 hover:bg-gray-100",
            widthClass,
            className,
          )}
        >
          {displayLabel ? (
            <span className="truncate">{displayLabel}</span>
          ) : (
            <span className="text-muted-foreground truncate">
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className={cn("p-0", widthClass)} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>Không tìm thấy kết quả phù hợp</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const rowLabel = opt.meta
                  ? `${opt.label} - ${opt.meta}`
                  : opt.label;

                return (
                  <CommandItem
                    key={opt.value}
                    value={rowLabel}
                    onSelect={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        opt.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{rowLabel}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
