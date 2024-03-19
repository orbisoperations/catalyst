import {
  Checkbox,
  PropsOf,
  Table,
  TableCaption,
  TableContainer,
  Tbody,
  Td,
  Tfoot,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { Dispatch, SetStateAction, useState } from "react";
type OrbisTableProps = {
  headers: (string | JSX.Element)[];
  rows: (string | JSX.Element)[][];
  caption?: string;
  tableProps?: PropsOf<typeof Table>;
  containerProps?: PropsOf<typeof TableContainer>;
  enableHover?: boolean;
};
export const OrbisTable = (props: OrbisTableProps) => {
  const { headers, rows, caption, tableProps, enableHover, containerProps } =
    props;
  return (
    <TableContainer {...containerProps}>
      <Table variant={"simple"} {...tableProps}>
        <TableCaption>{caption}</TableCaption>
        <Thead>
          <Tr>
            {headers.map((header, i) => (
              <Th key={i}>{header}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, i) => (
            <Tr
              key={i}
              _hover={
                enableHover
                  ? {
                    bg: "gray.100",
                  }
                  : {}
              }
            >
              {row.map((cell, j) => (
                <Td key={j}>{cell}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
        <Tfoot>
          <Tr>
            {headers.map((header, i) => (
              <Th key={i}>{header}</Th>
            ))}
          </Tr>
        </Tfoot>
      </Table>
    </TableContainer>
  );
};


export const SelectableTable = (props: OrbisTableProps & {
  handleChange: (rows: number[]) => void;
}) => {
  const { headers, rows, caption, tableProps, enableHover, containerProps } =
    props;
  const [selectableRows, setSelectableRows] = useState<number[]>([])
  return (
    <TableContainer {...containerProps}>
      {selectableRows.length}
      <Table variant={"simple"} {...tableProps}>
        <TableCaption>{caption}</TableCaption>
        <Thead>
          <Tr>
            {headers.map((header, i) => (
              <Th key={i}>{header}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, i) => (
            <Tr
              key={i}
              _hover={
                enableHover
                  ? {
                    bg: "gray.100",
                  }
                  : {}
              }
            >
              <Td>
                <Checkbox
                  onChange={(e) => {
                    console.log(i, 'selected')
                    let tmpSelections = [...selectableRows];
                    let target = tmpSelections.findIndex(index => index === i);
                    console.log(target, 'selected')
                    if (target !== -1) {
                      console.log('removing')
                      tmpSelections = tmpSelections.filter(index => index !== i);
                      setSelectableRows(tmpSelections);
                    }
                    else {
                      console.log('adding')
                      tmpSelections.push(i)
                      setSelectableRows(tmpSelections);
                    }
                    props.handleChange(tmpSelections);

                  }}
                />
              </Td>
              {row.map((cell, j) => (
                <Td key={j}>{cell}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
        <Tfoot>
          <Tr>
            {headers.map((header, i) => (
              <Th key={i}>{header}</Th>
            ))}
          </Tr>
        </Tfoot>
      </Table>
    </TableContainer>
  );

}
