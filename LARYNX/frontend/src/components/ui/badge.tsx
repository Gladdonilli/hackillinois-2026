import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#38BDF8] text-black hover:bg-[#38BDF8]/80",
        secondary:
          "border-transparent bg-surface text-[#E4E4E7] hover:bg-surface-elevated",
        destructive:
          "border-transparent bg-[#DC2626] text-white hover:bg-[#DC2626]/80",
        outline: "text-[#E4E4E7] border-surface-elevated",
        genuine: "border-transparent bg-[#2DD4BF] text-black",
        deepfake: "border-transparent bg-[#DC2626] text-white animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }