import React, {useEffect} from 'react';
import {
  Box,
  Card,
  CardBody,
  Flex,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr
} from '@chakra-ui/react';
import {ChevronLeftIcon, ChevronRightIcon, DeleteIcon, InfoIcon, MoonIcon} from '@chakra-ui/icons';
import {useQueryItems} from "@/components/query-items-list/context";
import {storage} from "@/app/storage";
import {QueryItem} from "@/components/contexts/AppState";

const QueryItemsListComponent: React.FC = () => {
  const {queryItems, dispatch} = useQueryItems();
  const [currentPage, setCurrentPage] = React.useState(1);
  const recordsPerPage = 10;

  useEffect(() => {

    // fetching in a dispatch is not good
    // thus we fetch the data in an effect and load it into the context
    (async () => {
      const keys = await storage.getKeys();
      const activeItems = await Promise.all(keys.map(async s => {
        const value = await storage.getItem(s.replace('state:', ''));
        return value as QueryItem
      }))
      dispatch({
        type: "load",
        payload: activeItems ?? []
      })
    })()
  }, []);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = queryItems.slice(indexOfFirstRecord, indexOfLastRecord);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
      <Card w="90%" h="100%" variant="filled">
        <CardBody display="flex" flexDirection="column" justifyContent="center">
          <Box overflow="auto" maxHeight="400px">
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>{queryItems.length ? "Name" : ""}</Th>
                    <Th>{queryItems.length ? "Actions" : ""}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {currentRecords.map((record, index) => (
                      <Tr key={index}>
                        <Td pointerEvents="none">{record.name}</Td>
                        <Td>
                          <IconButton
                              icon={<DeleteIcon/>}
                              aria-label="Delete Feed"
                              title="Delete Feed"
                              onClick={() => dispatch({
                                type: "delete",
                                id: record.id
                              })}
                          />
                          <IconButton
                              icon={<MoonIcon/>}
                              aria-label="Sleep"
                              title="Sleep Feed"
                              onClick={() => dispatch({
                                type: "sleep",
                                id: record.id
                              })}
                          />
                          <Popover>
                            <PopoverTrigger>
                              <IconButton
                                  icon={<InfoIcon/>}
                                  aria-label="Feed Details"
                                  title="Feed Details"
                              />
                            </PopoverTrigger>
                            <PopoverContent>
                              <PopoverArrow />
                              <PopoverCloseButton />
                              <PopoverBody
                                  w="fit"
                                  maxHeight={"25%"}
                                  overflow="auto"
                                  style={{
                                    textWrap: "wrap"
                                  }}
                              >
                                {record.value}
                              </PopoverBody>
                            </PopoverContent>
                          </Popover>
                        </Td>
                      </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
          <Flex justifyContent="space-between" alignItems="center" mt={4}>
            <IconButton
                icon={<ChevronLeftIcon/>}
                aria-label="Previous Page"
                onClick={() => paginate(currentPage - 1)}
                isDisabled={currentPage === 1}
            />
            <Text hidden={queryItems.length === 0}>
            Page {currentPage} of {Math.ceil(queryItems.length / recordsPerPage)}
            </Text>
            {/*Handle display when no data*/}
            <Text hidden={!(queryItems.length === 0)} textAlign='center' color="darkslategrey">
              No active data.
              <br></br>
              Active data will appear here when it is added...
            </Text>
            <IconButton
                icon={<ChevronRightIcon/>}
                aria-label="Next Page"
                onClick={() => paginate(currentPage + 1)}
                isDisabled={currentPage === Math.ceil(queryItems.length / recordsPerPage)}
            />
          </Flex>
        </CardBody>
      </Card>
  );
};

export default QueryItemsListComponent;