import './App.css'
import { SchemaEditor } from '@theguild/editor'

const initialSchema = 'type Query { foo: String }'


const MyEditor = (): React.ReactElement => {
	return <SchemaEditor schema={initialSchema} />
}

function App() {


  return (
			<div
				style={{
					width: "100%",
					height: "100vh",
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<MyEditor />
			</div>
	)
}

export default App
