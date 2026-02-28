import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80",
        secondary:
          "border-transparent bg-[#0A0A0A] text-[#EDEDED] hover:bg-[#1F1F1F]",
        destructive:
          "border-transparent bg-[#FF3366] text-white hover:bg-[#FF3366]/80",
        outline: "text-[#EDEDED] border-[#1F1F1F]",
        genuine: "border-transparent bg-[#00FF88] text-black",
        deepfake: "border-transparent bg-[#FF3366] text-white",
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