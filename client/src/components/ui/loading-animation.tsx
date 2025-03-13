import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingAnimationProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  text?: string;
  showSpinner?: boolean;
  variant?: "default" | "processing";
}

export function LoadingAnimation({
  className,
  size = "md",
  text = "Loading...",
  showSpinner = true,
  variant = "default",
  ...props
}: LoadingAnimationProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const spinnerSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-4 text-center",
        className
      )}
      {...props}
    >
      {showSpinner && (
        <div className="relative mb-3">
          <Loader2
            className={cn(
              "animate-spin text-primary",
              spinnerSizes[size]
            )}
          />
        </div>
      )}

      {text && (
        <div className={cn("font-medium", sizeClasses[size])}>
          {text}
        </div>
      )}

      {variant === "processing" && (
        <div className="w-full max-w-xs mt-4">
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">
            Extracting and processing data...
          </div>
        </div>
      )}
    </div>
  );
}

interface ProcessingStepProps {
  step: string;
  currentStep?: boolean;
  completed?: boolean;
}

export function ProcessingStep({ 
  step, 
  currentStep = false, 
  completed = false 
}: ProcessingStepProps) {
  return (
    <div className={cn(
      "flex items-center py-2 px-3 rounded-md mb-2",
      currentStep ? "bg-primary/10 border border-primary/20" : "",
      completed ? "text-green-600" : ""
    )}>
      <div className="mr-3">
        {completed ? (
          <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : currentStep ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <div className="h-5 w-5 rounded-full bg-gray-100"></div>
        )}
      </div>
      <div className={cn(
        "text-sm",
        currentStep ? "font-medium" : "",
        completed ? "line-through opacity-70" : ""
      )}>
        {step}
      </div>
    </div>
  );
}

export function EnquiryProcessingAnimation() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const steps = [
    "Extracting document data",
    "Analyzing product specifications",
    "Identifying requirements",
    "Calculating costs",
    "Finalizing enquiry details"
  ];

  React.useEffect(() => {
    // Simulate progress through steps for demo purposes
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
    
    // Simulate progress bar movement independently for smoother animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // Calculate target progress based on current step (each step is worth 20%)
        const targetProgress = (currentStep / (steps.length - 1)) * 100;
        
        // If we're close to the target, move exactly to it
        if (prev >= targetProgress - 2) {
          return targetProgress;
        }
        
        // Otherwise move smoothly towards it
        return prev + 0.5;
      });
    }, 50);
    
    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [currentStep, steps.length]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="mb-4 flex items-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        <h3 className="text-lg font-medium">Processing Enquiry</h3>
        <div className="ml-auto text-sm text-gray-500">{Math.round(progress)}%</div>
      </div>
      
      <div className="space-y-1 mb-4">
        {steps.map((step, index) => (
          <ProcessingStep 
            key={step}
            step={step}
            currentStep={index === currentStep}
            completed={index < currentStep}
          />
        ))}
      </div>
      
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-150 ease-in-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="mt-2 text-xs text-gray-500 text-center">
        This may take up to 60 seconds
      </div>
      
      <div className="mt-4 flex justify-center space-x-1">
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
}