import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home
})

function Home() {
  return (
    <main>
      <h1>investment-helper admin</h1>
      <p>Basic admin scaffold is ready.</p>
      <ul>
        <li>Monitor ingestion health</li>
        <li>Inspect queue and polling status</li>
        <li>Review subscription counts</li>
      </ul>
    </main>
  )
}
