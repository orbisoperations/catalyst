"use client";
import { useRouter } from "next/router";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  ChakraProvider,
  Alert,
  AlertIcon,
  Text,
  HStack,
} from "@chakra-ui/react";
import { AppContext, StepsDataContext } from "./AppState";
import { ErrorContext, errMsgArr } from "./ErrorState";
import ResponseContainer from "../ResponseContainer";
import IntroCard from "../section-cards/IntroCard";
interface GlobalContext {}
const GlobalContext = createContext<GlobalContext | undefined>(undefined);

type GlobalContextProps = {
  children: ReactNode;
};
export const GlobalProvider: React.FC<GlobalContextProps> = ({ children }) => {
  // const router = useRouter();
  const [isShowingResults, setIsShowingResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState(StepsDataContext);

  //Error context
  const [isErrVisible, setIsErrVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState(errMsgArr.genErr);

  function toggleShowing() {
    console.log(process.env.REACT_APP_AUTH_TOKEN);
    setIsShowingResults(!isShowingResults);
  }

  return (
    <ChakraProvider>
      <GlobalContext.Provider value={{}}>
        <ErrorContext.Provider
          value={{
            isErrVisible,
            setIsErrVisible,
            errorMessage,
            setErrorMessage,
          }}
        >
          <AppContext.Provider
            value={{
              isLoading,
              setIsLoading,
              isShowingResults,
              setIsShowingResults,
              currentStep,
              setCurrentStep,
              stepData,
              setStepData,
            }}
          >
              <ResponseContainer></ResponseContainer>
            {/* {isShowingResults ? (
            ) : (
              <HStack h="100svh" p="50px">
                <IntroCard />
              </HStack>
            )} */}

            {isErrVisible ? (
              <Alert status="error" pos="absolute" bottom="0" left="0">
                <AlertIcon />
                {errorMessage}
              </Alert>
            ) : null}
            {children}
          </AppContext.Provider>
        </ErrorContext.Provider>
      </GlobalContext.Provider>
    </ChakraProvider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
