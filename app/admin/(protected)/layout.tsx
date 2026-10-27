export const dynamic='force-dynamic';
import {redirect} from 'next/navigation';import AdminShell from '../../../components/admin/AdminShell';import {isAdmin} from '../../../lib/neon/server';
export default async function ProtectedLayout({children}:{children:React.ReactNode}){if(!await isAdmin())redirect('/admin/login/');return <AdminShell authenticated>{children}</AdminShell>}
