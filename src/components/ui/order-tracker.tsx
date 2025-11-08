
"use client";

import { cn } from "@/lib/utils";
import { Check, Package, Rocket, CircleDashed } from "lucide-react";

type OrderStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled';

interface OrderTrackerProps {
  status: OrderStatus;
}

const steps = [
  { status: 'pending' as OrderStatus, label: 'Order Placed', icon: Check },
  { status: 'shipped' as OrderStatus, label: 'Shipped', icon: Package },
  { status: 'delivered' as OrderStatus, label: 'Delivered', icon: Rocket },
];

export function OrderTracker({ status }: OrderTrackerProps) {
  const currentStepIndex = steps.findIndex(step => step.status === status);

  if (status === 'cancelled') {
    return (
        <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg text-destructive">
            <CircleDashed className="h-6 w-6" />
            <span className="font-semibold">This order has been cancelled.</span>
        </div>
    )
  }

  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const isActive = index <= currentStepIndex;
        return (
          <React.Fragment key={step.status}>
            <div className="flex flex-col items-center gap-2 z-10">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  isActive ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <p className={cn(
                "text-xs text-center font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-1 bg-muted -mx-4 relative">
                <div className={cn(
                    "absolute top-0 left-0 h-full bg-primary transition-all duration-500",
                    currentStepIndex > index ? "w-full" : "w-0"
                )} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
