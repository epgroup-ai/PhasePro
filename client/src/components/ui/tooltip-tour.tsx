import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { useIsMobile } from "../../hooks/use-media-query";
import { Button } from "./button";
import { ChevronRight, X } from "lucide-react";
import { useLocalStorage } from "../../hooks/use-local-storage";

export interface TourStep {
  target: string;
  title: string;
  content: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface TourContextProps {
  currentTour: string | null;
  startTour: (tourId: string) => void;
  endTour: () => void;
  registerTour: (tourId: string, steps: TourStep[]) => void;
  completedTours: string[];
  resetTours: () => void;
}

const TourContext = createContext<TourContextProps | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const [currentTour, setCurrentTour] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [tours, setTours] = useState<Record<string, TourStep[]>>({});
  const [completedTours, setCompletedTours] = useLocalStorage<string[]>('completed-tours', []);
  const [activeElement, setActiveElement] = useState<Element | null>(null);
  
  // When the current tour changes, reset the step to 0
  useEffect(() => {
    setCurrentStep(0);
  }, [currentTour]);
  
  // When the current tour or step changes, find the target element
  useEffect(() => {
    if (!currentTour) {
      setActiveElement(null);
      return;
    }
    
    const steps = tours[currentTour];
    if (!steps || !steps[currentStep]) {
      return;
    }
    
    const targetSelector = steps[currentStep].target;
    const element = document.querySelector(targetSelector);
    
    if (element) {
      // Remove highlight from any previously highlighted element
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
      });
      
      // Add highlight to current element
      element.classList.add('tour-highlight');
      setActiveElement(element);
      
      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    return () => {
      // Clean up highlight on unmount
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
      });
    };
  }, [currentTour, currentStep, tours]);
  
  const registerTour = (tourId: string, steps: TourStep[]) => {
    setTours(prev => ({ ...prev, [tourId]: steps }));
  };
  
  const startTour = (tourId: string) => {
    if (tours[tourId]) {
      setCurrentTour(tourId);
      setCurrentStep(0);
    } else {
      console.warn(`Tour "${tourId}" not found`);
    }
  };
  
  const endTour = () => {
    if (currentTour) {
      setCompletedTours((prev: string[]) => {
        if (!prev.includes(currentTour)) {
          return [...prev, currentTour];
        }
        return prev;
      });
    }
    setCurrentTour(null);
  };
  
  const goToNextStep = () => {
    if (!currentTour) return;
    
    const steps = tours[currentTour];
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev: number) => prev + 1);
    } else {
      endTour();
    }
  };
  
  const goToPreviousStep = () => {
    if (!currentTour || currentStep === 0) return;
    setCurrentStep((prev: number) => prev - 1);
  };
  
  const resetTours = () => {
    setCompletedTours([]);
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
      
      {/* Tour tooltip */}
      {currentTour && activeElement && tours[currentTour] && tours[currentTour][currentStep] && (
        <TooltipProvider>
          <Tooltip open={true}>
            <TooltipTrigger asChild>
              <span className="hidden" />
            </TooltipTrigger>
            <TooltipContent
              side={tours[currentTour][currentStep].placement || 'bottom'}
              align="center"
              className="w-80 p-0 border-2 border-primary/20"
              sideOffset={5}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{tours[currentTour][currentStep].title}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={endTour}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  {tours[currentTour][currentStep].content}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Step {currentStep + 1} of {tours[currentTour].length}
                  </div>
                  <div className="flex space-x-2">
                    {currentStep > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousStep}
                      >
                        Back
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={goToNextStep}
                    >
                      {currentStep < tours[currentTour].length - 1 ? (
                        <>
                          Next <ChevronRight className="ml-1 h-3 w-3" />
                        </>
                      ) : (
                        'Done'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

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
  const isMobile = useIsMobile();
  
  useEffect(() => {
    registerTour(id, steps);
    
    // Auto-start the tour if enabled and not completed
    if (autoStart && !(skipIfCompleted && completedTours.includes(id))) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startTour(id);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [id, steps, registerTour, startTour, autoStart, skipIfCompleted, completedTours]);
  
  return <>{children}</>;
}

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