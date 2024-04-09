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
import { useState } from "react";
import { OrbisCard } from ".";
type OrbisTableProps = {
  headers?: (string | JSX.Element)[];
  rows?: (string | JSX.Element)[][];
  caption?: string;
  tableProps?: PropsOf<typeof Table>;
  containerProps?: PropsOf<typeof TableContainer>;
  enableHover?: boolean;
};
export const OrbisTable = (props: OrbisTableProps) => {
  const { headers, rows, caption, tableProps, enableHover, containerProps } =
    props;
  return (
    (rows && rows.length > 0) ?
      <TableContainer {...containerProps}>
        <Table variant={"simple"} {...tableProps}>
          
          {headers && <Thead>
            <Tr>
              {headers.map((header, i) => (
                <Th key={i}>{header}</Th>
              ))}
            </Tr>
          </Thead>}
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
                {row?.map((cell, j) => (
                  <Td key={j}>{cell}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
          <Tfoot>
            <Tr>
              {headers?.map((header, i) => (
                <Th key={i}>{header}</Th>
              ))}
            </Tr>
          </Tfoot>
          {caption && <TableCaption>{caption}</TableCaption>}
        </Table>

      </TableContainer> :
      <OrbisCard>
        No Content available
      </OrbisCard>

  );
};

export const SelectableTable = (
  props: OrbisTableProps & {
    handleChange: (rows: number[]) => void;
  }
) => {
  const { headers, rows, caption, tableProps, enableHover, containerProps } =
    props;
  const [selectableRows, setSelectableRows] = useState<number[]>([]);
  return (
    (rows && rows.length > 0) ? <TableContainer {...containerProps}>
      <Table variant={"simple"} {...tableProps}>
        {caption && <TableCaption>{caption}</TableCaption>}
        {headers && <Thead>
          <Tr>
            {headers.map((header, i) => (
              <Th key={i}>{header}</Th>
            ))}
          </Tr>
        </Thead>}
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
                  isChecked={selectableRows.includes(i)}
                  onChange={(e) => {
                    let tmpSelections = [...selectableRows];
                    let target = tmpSelections.findIndex(
                      (index) => index === i
                    );
                    if (target !== -1) {
                      tmpSelections = tmpSelections.filter(
                        (index) => index !== i
                      );
                      setSelectableRows(tmpSelections);
                    } else {
                      tmpSelections.push(i);
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
        {headers &&( 
          <Tfoot>
            <Tr>
              {headers.map((header, i) => (
                <Th key={i}>{header}</Th>
              ))}
            </Tr>
          </Tfoot>)
        }

      </Table>
    </TableContainer> :
      <OrbisCard>
        No Content available
      </OrbisCard>
  );
};
