import { Card, CardBody, Text, Heading, Button, Stack } from "@chakra-ui/react";
import StepsBar from "../Stepper";
import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";
import { AppContext } from "../contexts/AppState";
import {useContext} from 'react';

export default function IntroCard() {

  const { setCurrentStep, currentStep, stepData, isLoading } = useContext(AppContext);
  
  const handleFetchData = () => {
      toNextStep();
      
    // Implement fetching data logic or other interactions here
    console.log("Fetching data...", currentStep);
  };

  const toNextStep =() =>{
    //Updates if the steps are within range
    setCurrentStep(currentStep + 1 < stepData.length ? currentStep + 1 : currentStep);
  };

    /*  
      1) Start at step 0 waiting for btn to be clicked
      2) When btn is clicked, call handleFetchData to update AppState/AppContext currentStep and use the query, isLoading is set to true
      3) Depending on reponse, show relevant final message 
        If OK: Continue to next step , ERROR: Change step 2 message (?) in AppState/AppContext to: Couldnt fetch data, try again. 
        Or just show the relevant error msg given
      
        Success:
      4) set AppState/AppContext isLoading to false
      4.5) Results component should be shown after a second with the loaded data in their respective cards

       Error:
      4) set AppState/AppContext isLoading to false
      4.5) Remain in the Intro card view with the Error on the loading part. When the button is clicked again, reset the context currentStep to 0
  */

  return (
    <Card w="100%" h="100%" textAlign="center" variant="filled">
      <CardBody
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <Heading size="xl">Search for data channel</Heading>
        <Text fontSize="lg" mb="16px">
          Enter a query to fetch some data from Catalyst
        </Text>
        <Editor
          className="rounded"
          defaultLanguage="javascript"
          defaultValue="// some comment"
          width="25%"
          height="300px"
          theme="vs-dark"
        />

        <StepsBar />
        
        <Button onClick={handleFetchData} colorScheme="blue" size="lg">Fetch data</Button>
      </CardBody>
    </Card>
  );
}
