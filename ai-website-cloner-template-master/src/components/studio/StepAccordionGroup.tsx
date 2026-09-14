"use client";

import { ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { InvitationDetail } from "@/types/studio";
import type { StepDefinition } from "./stepsConfig";

// Renders a handful of wizard steps as one page instead of one-step-per-page:
// each step is a fold (its own icon/label header + its question + its own
// Component), only the active one expanded. Navigation (Back/Next, the step
// counter, validation) stays entirely in StudioWizard -- this only changes
// how steps *look* while grouped, never how stepIndex advances.
export function StepAccordionGroup({
  steps,
  activeStepId,
  value,
  onChange,
  onSelect,
}: {
  steps: StepDefinition[];
  activeStepId: string;
  value: InvitationDetail;
  onChange: (patch: Partial<InvitationDetail>) => void;
  onSelect: (stepId: string) => void;
}) {
  return (
    <div className="divide-y divide-border">
      {steps.map((step) => {
        const isOpen = step.id === activeStepId;
        const StepIcon = step.icon;
        const StepComponent = step.Component;
        return (
          <div key={step.id}>
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start transition-colors hover:bg-gold/5"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    isOpen ? "bg-gold/10 text-gold" : "bg-background/5 text-muted-foreground"
                  )}
                >
                  <StepIcon className="size-4" />
                </span>
                <span className={cn("text-sm font-medium", isOpen ? "text-body-foreground" : "text-muted-foreground")}>
                  {step.label}
                </span>
              </span>
              <ChevronDownIcon
                className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-5">
                <p className="mb-4 text-sm font-medium text-foreground">{step.question}</p>
                <StepComponent value={value} onChange={onChange} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
