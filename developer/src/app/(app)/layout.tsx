import Layout from '../../components/layout/Layout'

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Layout>{children}</Layout>
}
