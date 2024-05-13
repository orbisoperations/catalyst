"use client";
import React, {createContext, ReactNode, useContext, useState,} from "react";
import {Alert, AlertIcon, ChakraProvider,} from "@chakra-ui/react";
import {AppContext, StepsDataContext} from "./AppState";
import {errMsgArr, ErrorContext} from "./ErrorState";
import Home from "../Home";

interface GlobalContext {
}

const GlobalContext = createContext<GlobalContext | undefined>(undefined);

type GlobalContextProps = {
  children: ReactNode;
};
export const GlobalProvider: React.FC<GlobalContextProps> = ({children}) => {
  // const router = useRouter();
  const [isShowingResults, setIsShowingResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState(StepsDataContext);
  const [activeQueryList, setActiveQueryList] = useState(StepsDataContext);

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
                <Home/>
              {/*<ResponseContainer></ResponseContainer>*/}
              {/* {isShowingResults ? (
            ) : (
              <HStack h="100svh" p="50px">
                <IntroCard />
              </HStack>
            )} */}

              {isErrVisible ? (
                  <Alert status="error" pos="absolute" bottom="0" left="0">
                    <AlertIcon/>
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
