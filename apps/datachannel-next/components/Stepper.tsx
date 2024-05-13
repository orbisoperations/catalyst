import {
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  useSteps,
  Stack,
  Flex,
  Text
} from '@chakra-ui/react'
import { useEffect, useContext } from "react";
import { AppContext } from "./contexts/AppState";

export default function StepsBar() {
  const { stepData, currentStep, setCurrentStep } = useContext(AppContext);

  const { activeStep, setActiveStep } = useSteps({
    index: currentStep,
    count: stepData.length,
  });

  useEffect(() => {
    setActiveStep(currentStep);
  }, [currentStep, setActiveStep]);

  const steps = stepData;
  const activeStepText = stepData[activeStep].description;

  return (
    <Stack w="30%" my="30px" mx="auto">
      <Stepper size="sm" index={activeStep} gap="0">
        {steps.map((step, index) => (
          <Step key={index} gap="0">
            <StepIndicator>
              <StepStatus
                complete={<StepIcon />}
                incomplete={<StepNumber />}
                active={<StepNumber />}
              />
            </StepIndicator>
            <StepSeparator _horizontal={{ ml: "0" }} />
          </Step>
        ))}
      </Stepper>
      <Flex direction="column">
        <Text>Step {activeStep + 1}:</Text>
        <Text>
          <b>{activeStepText}</b>
        </Text>
      </Flex>
    </Stack>
  );
}
