import React, { useEffect, useRef } from "react";
import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";
interface QueryProps  {
  mWidth?: string;
  mHeight?: string;
  useTheme?: string;
  state: [string, (arg: string) => void];
  defaultValue?: string
}
export default function QueryBox({mWidth='100%', mHeight='100%', useTheme='vs-dark', state, defaultValue}: QueryProps) {
    const [value, setValue] = state;
    const monaco = useMonaco();
    let handleInputChange = (value: string, e:any) => {
      setValue(value)
    }
    const editorRef = useRef<DiffEditor>(null);

  function handleEditorDidMount(editor: DiffEditor, monaco: Editor) {
    editorRef.current = editor;
  }
  
  useEffect(() => {
    setValue(defaultValue ?? "")
  }, [])
    return (
        <Editor
          className="rounded"
          defaultLanguage="graphql"
          defaultValue={defaultValue ?? ""}
          width={mWidth}
          height={mHeight}
          theme={useTheme ?? 'vs-dark'}
          max-height="300px"          
          onChange={handleInputChange}
          onMount={handleEditorDidMount}
        />
    )
  }