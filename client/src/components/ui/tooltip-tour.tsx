import React, { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/use-local-storage';

// Define the shape of a tour step
export interface TourStep {
  target: string;
  title: string;
  content: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

// Context to manage the tour state
interface TourContextProps {
  currentTour: string | null;
  startTour: (tourId: string) => void;
  endTour: () => void;
  registerTour: (tourId: string, steps: TourStep[]) => void;
  completedTours: string[];
  resetTours: () => void;
}

const TourContext = createContext<TourContextProps | undefined>(undefined);

// Provider component for the tour context
export function TourProvider({ children }: { children: ReactNode }) {
  const [currentTour, setCurrentTour] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tours, setTours] = useState<Record<string, TourStep[]>>({});
  const [completedTours, setCompletedTours] = useLocalStorage<string[]>('completed-tours', []);
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });
  const isMobile = useMediaQuery('(max-width: 640px)');

  // Register a new tour
  const registerTour = useCallback((tourId: string, steps: TourStep[]) => {
    setTours(prev => ({ ...prev, [tourId]: steps }));
  }, []);

  // Start a tour
  const startTour = useCallback((tourId: string) => {
    if (tours[tourId]) {
      setCurrentTour(tourId);
      setCurrentStepIndex(0);
      setTourSteps(tours[tourId]);
    }
  }, [tours]);

  // End the current tour
  const endTour = useCallback(() => {
    if (currentTour) {
      setCompletedTours(prev => [...prev, currentTour]);
    }
    setCurrentTour(null);
  }, [currentTour, setCompletedTours]);

  // Reset all tours
  const resetTours = useCallback(() => {
    setCompletedTours([]);
  }, [setCompletedTours]);

  // Update tooltip position when step changes
  useEffect(() => {
    if (!currentTour || !tourSteps.length) return;

    const currentStep = tourSteps[currentStepIndex];
    if (!currentStep) return;

    const targetElement = document.querySelector(currentStep.target);
    if (!targetElement) return;

    const targetRect = targetElement.getBoundingClientRect();
    const placement = currentStep.placement || 'bottom';
    
    // Highlight the target element
    targetElement.classList.add('tour-highlight');
    
    // Calculate tooltip position based on placement
    const tooltipElement = document.getElementById('tooltip-container');
    const tooltipWidth = tooltipElement?.offsetWidth || 300;
    const tooltipHeight = tooltipElement?.offsetHeight || 200;
    
    setTooltipSize({ width: tooltipWidth, height: tooltipHeight });
    
    let top = 0;
    let left = 0;
    
    if (placement === 'top') {
      top = targetRect.top - tooltipHeight - 10;
      left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
    } else if (placement === 'bottom') {
      top = targetRect.bottom + 10;
      left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
    } else if (placement === 'left') {
      top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
      left = targetRect.left - tooltipWidth - 10;
    } else if (placement === 'right') {
      top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
      left = targetRect.right + 10;
    }
    
    // Adjust if outside of viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left < 20) left = 20;
    if (left + tooltipWidth > viewportWidth - 20) left = viewportWidth - tooltipWidth - 20;
    if (top < 20) top = 20;
    if (top + tooltipHeight > viewportHeight - 20) top = viewportHeight - tooltipHeight - 20;
    
    // Position tooltip
    setTooltipPosition({ top, left });
    
    // Clean up highlight on unmount
    return () => {
      targetElement.classList.remove('tour-highlight');
    };
  }, [currentTour, currentStepIndex, tourSteps, isMobile]);

  // Handle next step
  const handleNext = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      endTour();
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Render the tooltip if a tour is active
  const renderTooltip = () => {
    if (!currentTour || !tourSteps.length) return null;

    const currentStep = tourSteps[currentStepIndex];
    if (!currentStep) return null;

    return (
      <div
        id="tooltip-container"
        className="fixed z-50 bg-white rounded-lg shadow-lg p-4 border border-gray-200 w-80 transition-all duration-300"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-lg">{currentStep.title}</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full" 
            onClick={endTour}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mb-4">{currentStep.content}</div>
        <div className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className={cn(currentStepIndex === 0 && "opacity-50 cursor-not-allowed")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleNext}
          >
            {currentStepIndex < tourSteps.length - 1 ? (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              'Finish'
            )}
          </Button>
        </div>
        <div className="text-center text-xs text-gray-500 mt-2">
          {currentStepIndex + 1} / {tourSteps.length}
        </div>
      </div>
    );
  };

  return (
    <TourContext.Provider
      value={{
        currentTour,
        startTour,
        endTour,
        registerTour,
        completedTours,
        resetTours
      }}
    >
      {children}
      {renderTooltip()}
      {/* Add a background overlay when tour is active */}
      {currentTour && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={(e) => e.target === e.currentTarget && endTour()} />
      )}
    </TourContext.Provider>
  );
}

// Hook to access the tour context
export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

// Component to create and trigger a tour
interface TourProps {
  id: string;
  steps: TourStep[];
  autoStart?: boolean;
  skipIfCompleted?: boolean;
  children?: ReactNode;
}

export function Tour({ 
  id, 
  steps, 
  autoStart = false, 
  skipIfCompleted = true,
  children 
}: TourProps) {
  const { registerTour, startTour, completedTours } = useTour();
  
  useEffect(() => {
    registerTour(id, steps);
    
    if (autoStart && (!skipIfCompleted || !completedTours.includes(id))) {
      // Small delay to ensure the DOM elements are ready
      const timer = setTimeout(() => {
        startTour(id);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [id, steps, registerTour, startTour, autoStart, skipIfCompleted, completedTours]);
  
  return <>{children}</>;
}

// Add a trigger button component
interface TourTriggerProps {
  tourId: string;
  children: ReactNode;
}

export function TourTrigger({ tourId, children }: TourTriggerProps) {
  const { startTour } = useTour();
  
  return (
    <div onClick={() => startTour(tourId)} className="cursor-pointer">
      {children}
    </div>
  );
}