import {
  PropsOf,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@chakra-ui/react";

export type OrbisTabsProps = {
  tabsProps?: PropsOf<typeof Tabs>;
  tabs?: string[];
  content?: JSX.Element[];
};
export const OrbisTabs = (props: OrbisTabsProps) => {
  return (
    <Tabs {...props.tabsProps}>
      {props.tabs && (
        <TabList>
          {props.tabs.map((tab, index) => (
            <Tab key={index}>{tab}</Tab>
          ))}
        </TabList>
      )}

      {props.content && (
        <TabPanels>
          {props.content.map((c, index) => {
            return <TabPanel key={index}>{c}</TabPanel>;
          })}
        </TabPanels>
      )}
    </Tabs>
  );
};
