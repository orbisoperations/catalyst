import {
  FormControl,
  FormLabel,
  Grid,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Textarea,
  useDisclosure,
} from "@chakra-ui/react";
import { QuestionMarkCircleIcon } from "@heroicons/react/20/solid";
import { FormEvent } from "react";
import { HelpButton, OrbisButton } from ".";

export type ModalProps = {
  iconButton?: JSX.Element;
  button?: JSX.Element;
  title: string;
  body: JSX.Element;
  footer: JSX.Element;
  disclosure: ReturnType<typeof useDisclosure>;
};

export const GeneralModal = (props: ModalProps) => {
  const { isOpen, onOpen, onClose } = props.disclosure;
  return (
    <>
      {props.iconButton && (
        <OrbisButton variant={"ghost"} colorScheme="blue" onClick={onOpen}>
          {props.iconButton}
        </OrbisButton>
      )}
      {props.button}

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{props.title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>{props.body}</ModalBody>

          <ModalFooter>{props.footer}</ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export const HelpModal = () => {
  const disclosure = useDisclosure();
  const { onClose } = disclosure;

  const submitAction = (e: FormEvent<HTMLFormElement>) => {
    onClose();
  };

  return (
    <GeneralModal
      button={<HelpButton onClick={disclosure.onOpen} />}
      title="Feel free to reach out"
      body={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitAction(e);
          }}
        >
          <Grid gap={5}>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input placeholder="Email" rounded={"md"} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Message</FormLabel>
              <Textarea />
            </FormControl>
            <OrbisButton type="submit">Submit</OrbisButton>
          </Grid>
        </form>
      }
      disclosure={disclosure}
      footer={<></>}
    />
  );
};
