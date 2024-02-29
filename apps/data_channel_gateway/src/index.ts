import { Hono } from 'hono'

const endpoints: {endpoint: string}[] = [
  {
    endpoint: "http://localhost:4001"
  },
  {
    endpoint: "http://localhost:4002"
  }
]

const app = new Hono()

app.get('/', (c) => {
  return c.json(endpoints)
})

export default app
