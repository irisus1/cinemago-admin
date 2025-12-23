import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, Minus } from "lucide-react"

export type CheckedState = boolean | "indeterminate"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "checked" | "onCheckedChange"> {
  checked?: CheckedState
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = checked === "indeterminate"
      }
    }, [checked])

    const composedRef = React.useCallback(
      (node: HTMLInputElement) => {
        inputRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
        }
      },
      [ref]
    )

    return (
      <div className="relative flex items-center">
        <input
          type="checkbox"
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground appearance-none cursor-pointer",
            className
          )}
          ref={composedRef}
          checked={checked === true}
          onChange={(e) => {
            onChange?.(e)
            onCheckedChange?.(e.target.checked)
          }}
          {...props}
        />
        <Check
          className={cn(
            "pointer-events-none absolute left-0 top-0 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 peer-checked:bg-black rounded-sm",
            className,
            "text-white peer-checked:text-white"
          )}
        />
        <Minus
          className={cn(
            "pointer-events-none absolute left-0 top-0 h-4 w-4 text-white opacity-0 peer-indeterminate:opacity-100 peer-indeterminate:bg-black rounded-sm",
            className,
            "text-white"
          )}
        />
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
