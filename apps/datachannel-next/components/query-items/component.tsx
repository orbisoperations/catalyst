import {useContext, useEffect} from "react";
import {Card, CardBody, Heading} from "@chakra-ui/react";
import {QueryItemsContext} from "@/components/query-items/context";

export default function QueryItemsComponent() {

  const {queryItems} = useContext(QueryItemsContext);

  useEffect(() => {
    console.log('query items', queryItems)
  }, [queryItems]);

  return (
      <Card w="100%" h="100%" variant="filled">
        <CardBody display="flex" flexDirection="column" justifyContent="center">
          <Heading size="lg">List of stuff</Heading>
          {queryItems.map((item: any) => (<div>{item.name}</div>))}
        </CardBody>
      </Card>
  );
}