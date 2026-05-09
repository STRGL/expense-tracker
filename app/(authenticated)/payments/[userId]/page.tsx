export const dynamic = "force-dynamic"

import PersonPayments from "@/components/payments/PersonPayments"

export default async function PersonPaymentsPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  return <PersonPayments userId={userId} />
}
