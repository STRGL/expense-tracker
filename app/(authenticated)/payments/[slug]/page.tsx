export const dynamic = "force-dynamic"

import PersonPayments from "@/components/payments/PersonPayments"

export default async function PersonPaymentsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <PersonPayments slug={slug} />
}
