import { redirect } from 'next/navigation';

export default function WarehouseRootPage() {
  redirect('/dashboard/warehouse/inbound');
}
