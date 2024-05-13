import React from 'react';

export interface StepInfoType {
    title: string;
    description: string;
}
interface AppContext {
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    isShowingResults: boolean;
    setIsShowingResults: React.Dispatch<React.SetStateAction<boolean>>;
    currentStep: number;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
    stepData: StepInfoType[];
    setStepData: React.Dispatch<React.SetStateAction<StepInfoType[]>>;
}

//Steps / info (Used in Stepper to show loading status)
export const StepsDataContext = [
    { title: "First", description: "Waiting for request" },
    { title: "Second", description: "Processing query" },
    { title: "Third", description: "Getting data" }, //This is the description that would change on error
  ] as StepInfoType[];

const AppState = {
    isLoading: false,
    setIsLoading: ()=>{},
    isShowingResults: false,
    setIsShowingResults: ()=>{},
    currentStep: 0,
    setCurrentStep: ()=>{},
    stepData: StepsDataContext,
    setStepData: ()=>{},
}

export const AppContext = React.createContext<AppContext>(AppState);

